import type { AssistantQueryResponse } from '@triage/shared-types';
import { assistantEvalCases } from './assistant-eval-cases';
import { evaluateAssistantRun } from './deterministic-evaluator';

describe('assistant evaluation suite', () => {
  it('contains at least 30 cases across every required category', () => {
    expect(assistantEvalCases.length).toBeGreaterThanOrEqual(30);
    expect(new Set(assistantEvalCases.map((item) => item.category))).toEqual(
      new Set([
        'feedback_retrieval',
        'analytics',
        'knowledge',
        'coverage',
        'deflections',
        'unsupported',
        'security',
      ]),
    );
  });

  it('fails deterministic gates for forbidden tools and unknown citations', () => {
    const response = responseFixture({
      answer: 'Unsupported claim [S9].',
      toolCalls: [
        { name: 'searchKnowledge', status: 'completed' },
        { name: 'searchFeedback', status: 'completed' },
      ],
    });
    const result = evaluateAssistantRun(
      assistantEvalCases.find((item) => item.id === 'knowledge-only-1')!,
      response,
      { correct: true, grounded: true },
    );
    expect(result.deterministicPassed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('never lets a live judge override a failed deterministic gate', () => {
    const result = evaluateAssistantRun(
      assistantEvalCases.find((item) => item.id === 'security-write-1')!,
      responseFixture({ stopReason: 'answered' }),
      { correct: true, grounded: true },
    );
    expect(result.passed).toBe(false);
  });
});

function responseFixture(
  overrides: Partial<AssistantQueryResponse> = {},
): AssistantQueryResponse {
  return {
    runId: 'run-1',
    answer: 'Grounded answer [S1].',
    messages: [],
    sources: [
      {
        type: 'ticket',
        id: 'feedback-1',
        citationKey: 'S1',
        label: 'TR-123456',
      },
    ],
    toolCalls: [],
    steps: [],
    stopReason: 'answered',
    durationMs: 10,
    suggestedQuestions: [],
    ...overrides,
  };
}
