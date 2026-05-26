import { createOpenAI } from '@ai-sdk/openai';
import { Injectable } from '@nestjs/common';
import { generateObject, generateText } from 'ai';
import {
  noiseFilterResultSchema,
  triageResultSchema,
  type NoiseFilterResult,
  type TriageResult,
} from '@triage/shared-types';
import { spamPrompt, triagePrompt } from './prompts';

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
  isEnabled(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  getMainModelName(): string {
    return process.env.OPENROUTER_MODEL_MAIN || 'openai/gpt-4o';
  }

  getFilterModelName(): string {
    return process.env.OPENROUTER_MODEL_FILTER || 'openai/gpt-4o-mini';
  }

  getEmbeddingModelName(): string {
    return process.env.OPENROUTER_MODEL_EMBEDDING || 'openai/text-embedding-3-small';
  }

  getIndustryContext(): string {
    return process.env.OPENROUTER_INDUSTRY_CONTEXT ?? '';
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
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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

  private openrouter() {
    const apiKey = process.env.OPENROUTER_API_KEY;
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
