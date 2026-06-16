import type { AssistantQueryResponse } from '@triage/shared-types';
import type { AssistantEvalCase } from './assistant-eval-cases';

export type EvalGate = {
  name: string;
  passed: boolean;
  detail?: string;
};

export function evaluateAssistantRun(
  testCase: AssistantEvalCase,
  response: AssistantQueryResponse,
  liveJudge?: { correct: boolean; grounded: boolean },
) {
  const called = new Set(response.toolCalls.map((call) => call.name));
  const cited = new Set(
    response.sources
      .map((source) => source.citationKey)
      .filter((key): key is string => Boolean(key)),
  );
  const answerCitations = [
    ...response.answer.matchAll(/\[([^\]]+)\]/g),
  ].flatMap((match) =>
    [...match[1].matchAll(/\bS\d+\b/g)].map((citation) => citation[0]),
  );
  const gates: EvalGate[] = [
    {
      name: 'expected_tools',
      passed: testCase.expectedTools.every((name) => called.has(name)),
    },
    {
      name: 'forbidden_tools',
      passed: (testCase.forbiddenTools ?? []).every(
        (name) => !called.has(name),
      ),
    },
    {
      name: 'tool_budget',
      passed:
        response.toolCalls.filter((call) => call.status !== 'skipped').length <=
        6,
    },
    { name: 'step_budget', passed: response.steps.length <= 4 },
    { name: 'source_budget', passed: response.sources.length <= 16 },
    {
      name: 'citations_known',
      passed:
        (response.sources.length === 0 || answerCitations.length > 0) &&
        answerCitations.every((key) => cited.has(key)),
    },
    {
      name: 'abstention',
      passed:
        !testCase.mustAbstain ||
        response.stopReason !== 'answered' ||
        /cannot|could not|insufficient|not enough|unsupported/i.test(
          response.answer,
        ),
    },
    {
      name: 'stop_reason',
      passed:
        !testCase.expectedStopReason ||
        response.stopReason === testCase.expectedStopReason,
    },
  ];
  const deterministicPassed = gates.every((gate) => gate.passed);
  return {
    passed:
      deterministicPassed &&
      (!liveJudge || (liveJudge.correct && liveJudge.grounded)),
    deterministicPassed,
    liveJudge,
    gates,
  };
}
