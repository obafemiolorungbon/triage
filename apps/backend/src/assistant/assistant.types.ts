import type {
  AssistantMessage,
  AssistantQueryResponse,
  AssistantSource,
  AssistantStepTrace,
  AssistantStopReason,
  AssistantToolCall,
  StaffRole,
} from '@triage/shared-types';

export type AssistantRunBudget = {
  maxSteps: number;
  maxToolCalls: number;
  maxDurationMs: number;
  maxEvidenceCharacters: number;
  maxSources: number;
};

export type AssistantRunContext = {
  runId: string;
  workspaceId: string;
  userId?: string;
  role: StaffRole;
  startedAt: number;
  abortSignal: AbortSignal;
};

export type AssistantRunInput = {
  message: string;
  history: AssistantMessage[];
  context: AssistantRunContext;
  budget: AssistantRunBudget;
};

export interface AssistantOrchestrator {
  run(input: AssistantRunInput): Promise<AssistantQueryResponse>;
}

export type AssistantToolResult = {
  summary: string;
  sources: AssistantSource[];
  data: unknown;
};

export type AssistantRunTrace = {
  toolCalls: AssistantToolCall[];
  steps: AssistantStepTrace[];
  sources: AssistantSource[];
  duplicateCall: boolean;
  toolCallLimitReached: boolean;
  toolFailure: boolean;
};

export type AssistantRunCompletion = {
  answer: string;
  stopReason: AssistantStopReason;
};
