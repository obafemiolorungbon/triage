import { createOpenAI } from '@ai-sdk/openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateObject } from 'ai';
import {
  noiseFilterResultSchema,
  triageResultSchema,
  type NoiseFilterResult,
  type TriageResult,
} from '@triage/shared-types';
import type { Env } from '../config/env.schema';
import { spamPrompt, triagePrompt } from './prompts';

export type TriageOptions = {
  /** Tenant- or env-provided industry blurb inlined into the prompt. */
  industryContext?: string;
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
  private readonly log = new Logger(AiService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  isEnabled(): boolean {
    return Boolean(this.config.get('OPENROUTER_API_KEY', { infer: true }));
  }

  getMainModelName(): string {
    return this.config.get('OPENROUTER_MODEL_MAIN', { infer: true });
  }

  getFilterModelName(): string {
    return this.config.get('OPENROUTER_MODEL_FILTER', { infer: true });
  }

  getIndustryContext(): string {
    return this.config.get('OPENROUTER_INDUSTRY_CONTEXT', { infer: true }) ?? '';
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
    const { object } = await withRetries(() =>
      generateObject({
        model: this.openrouter()(this.getMainModelName()),
        schema: triageResultSchema,
        prompt: triagePrompt(text, { industryContext }),
      }),
    );
    return object;
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
