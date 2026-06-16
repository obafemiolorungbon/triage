import { createOpenAI } from '@ai-sdk/openai';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateObject,
  generateText,
  jsonSchema,
  type CoreMessage,
  type GenerateTextOnStepFinishCallback,
  type ToolCallRepairFunction,
  type ToolSet,
} from 'ai';
import {
  noiseFilterResultSchema,
  triageResultSchema,
  type NoiseFilterResult,
  type TriageResult,
} from '@triage/shared-types';
import type { Env } from '../config/env.schema';
import { spamPrompt, triagePrompt } from './prompts';
import { recoverToolArguments } from './tool-call-repair';

export type TriageOptions = {
  industryContext?: string;
  companyContext?: string;
};

export type KnowledgeChunk = {
  title: string;
  slug: string;
  body: string;
};

async function withRetries<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

/**
 * Single entrypoint for both AI phases (cheap spam filter + main triage model).
 * Centralises OpenRouter wiring, retries, and prompt construction so the
 * intake and triage workers both read from the same source of truth.
 */
@Injectable()
export class AiService {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<Env, true>,
  ) {}

  isEnabled(): boolean {
    return Boolean(this.config.get('OPENROUTER_API_KEY', { infer: true }));
  }

  getMainModelName(): string {
    return (
      this.config.get('OPENROUTER_MODEL_MAIN', { infer: true }) ||
      'openai/gpt-4o'
    );
  }

  getFilterModelName(): string {
    return (
      this.config.get('OPENROUTER_MODEL_FILTER', { infer: true }) ||
      'openai/gpt-4o-mini'
    );
  }

  getEmbeddingModelName(): string {
    return (
      this.config.get('OPENROUTER_MODEL_EMBEDDING', { infer: true }) ||
      'openai/text-embedding-3-small'
    );
  }

  getIndustryContext(): string {
    return (
      this.config.get('OPENROUTER_INDUSTRY_CONTEXT', { infer: true }) ?? ''
    );
  }

  async classifySpam(text: string): Promise<NoiseFilterResult> {
    const { object } = await withRetries(() =>
      generateObject({
        model: this.openrouter()(this.getFilterModelName()),
        schema: noiseFilterResultSchema,
        prompt: spamPrompt(text),
      }),
    );
    return object;
  }

  async triageTicket(
    text: string,
    opts: TriageOptions = {},
  ): Promise<TriageResult> {
    const industryContext = opts.industryContext ?? this.getIndustryContext();
    const companyContext = opts.companyContext;
    const { object } = await withRetries(() =>
      generateObject({
        model: this.openrouter()(this.getMainModelName()),
        schema: triageResultSchema,
        prompt: triagePrompt(text, { industryContext, companyContext }),
      }),
    );
    return object;
  }

  async embedText(text: string): Promise<number[] | null> {
    if (!this.isEnabled()) return null;
    const response = await withRetries(() =>
      fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.get('OPENROUTER_API_KEY', {
            infer: true,
          })}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.getEmbeddingModelName(),
          input: text.slice(0, 8_000),
        }),
      }),
    );
    if (!response.ok) {
      throw new Error(`OpenRouter embeddings failed: ${response.status}`);
    }
    const json = (await response.json()) as {
      data?: { embedding?: number[] }[];
    };
    return json.data?.[0]?.embedding ?? null;
  }

  async answerFromKnowledge(query: string, chunks: KnowledgeChunk[]) {
    if (!this.isEnabled()) {
      const first = chunks[0];
      return first
        ? `I found a relevant article: "${first.title}". ${first.body.slice(0, 320)}`
        : 'I could not find a relevant knowledge base article yet.';
    }
    const context = chunks
      .map(
        (chunk, index) =>
          `[${index + 1}] ${chunk.title} (${chunk.slug})\n${chunk.body.slice(0, 1_500)}`,
      )
      .join('\n\n');
    const { text } = await withRetries(() =>
      generateText({
        model: this.openrouter()(this.getFilterModelName()),
        prompt: [
          'Answer the customer using only the supplied knowledge base excerpts.',
          'Keep it concise, practical, and include bracket citations like [1].',
          'If the excerpts do not answer the question, say so and suggest submitting feedback.',
          '',
          `Question:\n${query}`,
          '',
          `Knowledge base excerpts:\n${context || 'No excerpts available.'}`,
        ].join('\n'),
      }),
    );
    return text;
  }

  async generateTextResponse(
    prompt: string,
    opts: { model?: 'main' | 'filter' } = {},
  ) {
    if (!this.isEnabled()) {
      throw new Error(
        'OPENROUTER_API_KEY is not configured; guard callers with AiService.isEnabled()',
      );
    }
    const modelName =
      opts.model === 'filter'
        ? this.getFilterModelName()
        : this.getMainModelName();
    const { text } = await withRetries(() =>
      generateText({
        model: this.openrouter()(modelName),
        prompt,
      }),
    );
    return text;
  }

  async generateAgentResponse<TOOLS extends ToolSet>(opts: {
    system: string;
    messages: CoreMessage[];
    tools: TOOLS;
    maxSteps: number;
    abortSignal?: AbortSignal;
    onStepFinish?: GenerateTextOnStepFinishCallback<TOOLS>;
  }) {
    if (!this.isEnabled()) {
      throw new Error(
        'OPENROUTER_API_KEY is not configured; guard callers with AiService.isEnabled()',
      );
    }
    const repairToolCall = this.createToolCallRepair<TOOLS>(opts.abortSignal);
    return withRetries(() =>
      generateText({
        model: this.openrouter()(this.getMainModelName()),
        system: opts.system,
        messages: opts.messages,
        tools: opts.tools,
        maxSteps: opts.maxSteps,
        abortSignal: opts.abortSignal,
        onStepFinish: opts.onStepFinish,
        experimental_repairToolCall: repairToolCall,
      }),
    );
  }

  private createToolCallRepair<TOOLS extends ToolSet>(
    abortSignal?: AbortSignal,
  ): ToolCallRepairFunction<TOOLS> {
    let repairsRemaining = 1;
    return async ({ toolCall, tools, parameterSchema, error }) => {
      if (repairsRemaining <= 0 || abortSignal?.aborted) return null;
      repairsRemaining -= 1;
      const selectedTool = tools[toolCall.toolName];
      if (!selectedTool) return null;

      const recovered = recoverToolArguments(
        toolCall.args,
        selectedTool.parameters,
      );
      if (recovered !== null) {
        return { ...toolCall, args: JSON.stringify(recovered) };
      }

      const schema = parameterSchema({ toolName: toolCall.toolName });
      const { object } = await generateObject({
        model: this.openrouter()(this.getFilterModelName()),
        schema: jsonSchema(schema),
        abortSignal,
        prompt: [
          'Repair arguments for one declared tool call.',
          'Return only an object that conforms exactly to the supplied schema.',
          'Remove undeclared fields, duplicated fields, and malformed fragments.',
          'Preserve the clear user intent. Do not invent filters.',
          '',
          `Tool: ${toolCall.toolName}`,
          `Schema: ${JSON.stringify(schema)}`,
          `Invalid arguments: ${toolCall.args}`,
          `Validation error: ${error.message}`,
        ].join('\n'),
      });
      return { ...toolCall, args: JSON.stringify(object) };
    };
  }

  private openrouter() {
    const apiKey = this.config.get('OPENROUTER_API_KEY', { infer: true });
    if (!apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY is not configured; guard callers with AiService.isEnabled()',
      );
    }
    return createOpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }
}
