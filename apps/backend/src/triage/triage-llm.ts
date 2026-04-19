import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import {
  noiseFilterResultSchema,
  triageResultSchema,
  type NoiseFilterResult,
  type TriageResult,
} from '@triage/shared-types';

export type TriageClientConfig = {
  apiKey: string;
  filterModel: string;
  mainModel: string;
};

function openRouterModels(config: TriageClientConfig) {
  const client = createOpenAI({
    apiKey: config.apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  });
  return {
    filter: client(config.filterModel),
    main: client(config.mainModel),
  };
}

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

export async function filterNoise(
  config: TriageClientConfig,
  text: string,
): Promise<NoiseFilterResult> {
  const { filter } = openRouterModels(config);
  const { object } = await withRetries(() =>
    generateObject({
      model: filter,
      schema: noiseFilterResultSchema,
      prompt: `Classify whether the following user feedback is spam/noise (not actionable product feedback). Be conservative: genuine bug reports, complaints, and feature requests are NOT noise.\n\n---\n${text}\n---`,
    }),
  );
  return object;
}

export async function triageFeedback(
  config: TriageClientConfig,
  text: string,
  opts?: { industry?: string },
): Promise<TriageResult> {
  const { main } = openRouterModels(config);
  const industry = opts?.industry ?? 'general SaaS';
  const { object } = await withRetries(() =>
    generateObject({
      model: main,
      schema: triageResultSchema,
      prompt: `You triage customer support feedback for ${industry}. Infer category (short label), priority, sentiment, whether this reveals a knowledge-base gap, cleaned text (fix typos, keep meaning), and a few suggested tags.\n\nFeedback:\n---\n${text}\n---`,
    }),
  );
  return object;
}

export async function runTriagePipeline(
  config: TriageClientConfig,
  rawText: string,
  opts?: { industry?: string },
): Promise<
  | { kind: 'rejected'; noise: NoiseFilterResult }
  | { kind: 'triaged'; noise: NoiseFilterResult; triage: TriageResult }
> {
  const noise = await filterNoise(config, rawText);
  if (noise.isNoise) {
    return { kind: 'rejected', noise };
  }
  const triage = await triageFeedback(config, rawText, opts);
  return { kind: 'triaged', noise, triage };
}
