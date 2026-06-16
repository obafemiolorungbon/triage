import { Injectable } from '@nestjs/common';
import { tool, type ToolSet } from 'ai';
import type { AssistantSource, AssistantToolCall } from '@triage/shared-types';
import {
  analyzeFeedbackInputSchema,
  getFeedbackDetailsInputSchema,
  searchDeflectionsInputSchema,
  searchFeedbackInputSchema,
  searchKnowledgeInputSchema,
} from './assistant-tool-schemas';
import { AssistantToolsService } from './assistant-tools.service';
import type {
  AssistantRunBudget,
  AssistantRunContext,
  AssistantRunTrace,
  AssistantToolResult,
} from './assistant.types';

@Injectable()
export class AssistantToolRegistry {
  constructor(private readonly service: AssistantToolsService) {}

  create(context: AssistantRunContext, budget: AssistantRunBudget) {
    const trace: AssistantRunTrace = {
      toolCalls: [],
      steps: [],
      sources: [],
      duplicateCall: false,
      toolCallLimitReached: false,
      toolFailure: false,
    };
    const seenCalls = new Set<string>();
    const sourceKeys = new Map<string, string>();
    let evidenceCharacters = 0;
    let currentStep = 1;
    let executions = 0;

    const execute = async (
      name: string,
      input: unknown,
      run: () => Promise<AssistantToolResult>,
    ) => {
      const startedAt = Date.now();
      const fingerprint = `${name}:${stableStringify(input)}`;
      if (seenCalls.has(fingerprint)) {
        trace.duplicateCall = true;
        const call = toolCall(name, 'skipped', input, currentStep, startedAt, {
          summary:
            'Skipped duplicate tool call; it would not produce new evidence.',
        });
        trace.toolCalls.push(call);
        return {
          summary: call.summary,
          sources: [],
          data: { skipped: true, reason: 'duplicate_tool_call' },
        };
      }
      if (executions >= budget.maxToolCalls) {
        trace.toolCallLimitReached = true;
        const call = toolCall(name, 'skipped', input, currentStep, startedAt, {
          summary: 'Skipped because the run tool-call budget was exhausted.',
        });
        trace.toolCalls.push(call);
        return {
          summary: call.summary,
          sources: [],
          data: { skipped: true, reason: 'tool_call_limit' },
        };
      }

      seenCalls.add(fingerprint);
      executions += 1;
      try {
        const result = await runWithinBudget(run, context, budget);
        const bounded = boundResult(result);
        const sources: AssistantSource[] = [];
        for (const source of bounded.sources) {
          const identity = `${source.type}:${source.id}`;
          let citationKey = sourceKeys.get(identity);
          if (!citationKey) {
            const sourceCharacters =
              (source.excerpt?.length ?? 0) + source.label.length;
            if (
              trace.sources.length >= budget.maxSources ||
              evidenceCharacters + sourceCharacters >
                budget.maxEvidenceCharacters
            ) {
              continue;
            }
            citationKey = `S${trace.sources.length + 1}`;
            sourceKeys.set(identity, citationKey);
            const cited = { ...source, citationKey };
            trace.sources.push(cited);
            evidenceCharacters += sourceCharacters;
          }
          if (citationKey) sources.push({ ...source, citationKey });
        }
        const data = truncateData(
          bounded.data,
          Math.max(0, budget.maxEvidenceCharacters - evidenceCharacters),
        );
        evidenceCharacters += serializedLength(data);
        const output = { ...bounded, sources, data };
        trace.toolCalls.push(
          toolCall(name, 'completed', input, currentStep, startedAt, {
            summary: output.summary,
            sourceCount: sources.length,
          }),
        );
        return output;
      } catch (error) {
        trace.toolFailure = true;
        const summary =
          error instanceof Error ? error.message : 'Tool execution failed.';
        trace.toolCalls.push(
          toolCall(name, 'failed', input, currentStep, startedAt, {
            summary,
            sourceCount: 0,
          }),
        );
        return {
          summary: `Tool failed: ${summary}`,
          sources: [],
          data: { failed: true },
        };
      }
    };

    const tools = {
      searchFeedback: tool({
        description:
          'Search customer feedback using semantic and exact-text relevance plus deterministic filters. Use for complaints, recent reports, matching tickets, and examples. For unresolved or current tickets, set resolution=open. Prefer period for today, this week, the last seven days, or this month. Use analyzeFeedback instead for counts or grouped totals.',
        parameters: searchFeedbackInputSchema,
        execute: (input) =>
          execute('searchFeedback', input, () =>
            this.service.searchFeedback(context, input),
          ),
      }),
      getFeedbackDetails: tool({
        description:
          'Load detailed context for one feedback record identified by a database id or TR- short id. Use after the user or searchFeedback identifies a specific record.',
        parameters: getFeedbackDetailsInputSchema,
        execute: (input) =>
          execute('getFeedbackDetails', input, () =>
            this.service.getFeedbackDetails(context, input),
          ),
      }),
      analyzeFeedback: tool({
        description:
          'Calculate deterministic counts and grouped feedback analytics. Use for how-many, most common, recurring, distribution, comparison, trend, category, status, sentiment, severity, or escalation questions. For unresolved or current tickets, set resolution=open. Prefer period for relative calendar dates. Group by category for common or recurring issue types. This tool has no relevance or newest ordering field. Never estimate totals from search results.',
        parameters: analyzeFeedbackInputSchema,
        execute: (input) =>
          execute('analyzeFeedback', input, () =>
            this.service.analyzeFeedback(context, input),
          ),
      }),
      searchKnowledge: tool({
        description:
          'Search published help-center and knowledge-base articles using hybrid semantic and exact-text retrieval. Use for documented guidance or to compare documentation coverage with customer feedback.',
        parameters: searchKnowledgeInputSchema,
        execute: (input) =>
          execute('searchKnowledge', input, () =>
            this.service.searchKnowledge(context, input),
          ),
      }),
      searchDeflections: tool({
        description:
          'Search widget knowledge-search behavior, especially submitted or abandoned searches that may indicate unresolved customer needs. This is behavioral evidence, not help-article content.',
        parameters: searchDeflectionsInputSchema,
        execute: (input) =>
          execute('searchDeflections', input, () =>
            this.service.searchDeflections(context, input),
          ),
      }),
    } satisfies ToolSet;

    return {
      tools,
      trace,
      setCurrentStep(step: number) {
        currentStep = step;
      },
    };
  }
}

function toolCall(
  name: string,
  status: AssistantToolCall['status'],
  input: unknown,
  step: number,
  startedAt: number,
  details: Pick<AssistantToolCall, 'summary' | 'sourceCount'>,
): AssistantToolCall {
  return {
    name,
    status,
    input,
    step,
    durationMs: Date.now() - startedAt,
    ...details,
  };
}

function boundResult(result: AssistantToolResult): AssistantToolResult {
  return {
    summary: result.summary.slice(0, 500),
    sources: result.sources.map((source) => ({
      ...source,
      label: source.label.slice(0, 220),
      excerpt: source.excerpt?.slice(0, 1_500),
    })),
    data: result.data,
  };
}

function truncateData(value: unknown, remaining: number) {
  const max = Math.min(12_000, remaining);
  if (max <= 0) return { truncated: true };
  const json = stableStringify(value);
  if (json.length <= max) return value;
  return { truncated: true, preview: json.slice(0, Math.max(0, max - 40)) };
}

function serializedLength(value: unknown) {
  return stableStringify(value).length;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

async function runWithinBudget<T>(
  run: () => Promise<T>,
  context: AssistantRunContext,
  budget: AssistantRunBudget,
): Promise<T> {
  const remaining = Math.max(
    0,
    budget.maxDurationMs - (Date.now() - context.startedAt),
  );
  if (remaining === 0 || context.abortSignal.aborted) {
    throw new Error('Assistant run time budget exhausted.');
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error('Assistant tool execution timed out.')),
      remaining,
    );
    timeout.unref?.();
    onAbort = () => reject(new Error('Assistant run was aborted.'));
    context.abortSignal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([run(), deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (onAbort) context.abortSignal.removeEventListener('abort', onAbort);
  }
}
