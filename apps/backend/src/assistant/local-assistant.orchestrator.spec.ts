import { LocalAssistantOrchestrator } from './local-assistant.orchestrator';
import type { AssistantRunInput, AssistantRunTrace } from './assistant.types';

describe('LocalAssistantOrchestrator', () => {
  const source = {
    type: 'ticket' as const,
    id: 'feedback-1',
    citationKey: 'S1',
    label: 'TR-123456',
    excerpt: 'Transfers fail after approval.',
  };

  function input(message = 'What are customers reporting?'): AssistantRunInput {
    return {
      message,
      history: [],
      context: {
        runId: 'run-1',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: 'agent',
        startedAt: Date.now(),
        abortSignal: new AbortController().signal,
      },
      budget: {
        maxSteps: 4,
        maxToolCalls: 6,
        maxDurationMs: 30_000,
        maxEvidenceCharacters: 24_000,
        maxSources: 16,
      },
    };
  }

  function trace(sources = [source]): AssistantRunTrace {
    return {
      toolCalls: [],
      steps: [],
      sources,
      duplicateCall: false,
      toolCallLimitReached: false,
      toolFailure: false,
    };
  }

  function setup(options?: {
    enabled?: boolean;
    text?: string;
    sources?: (typeof source)[];
    repair?: string;
  }) {
    const runTrace = trace(options?.sources ?? [source]);
    const ai = {
      isEnabled: jest.fn().mockReturnValue(options?.enabled ?? true),
      generateAgentResponse: jest.fn().mockResolvedValue({
        text: options?.text ?? 'Customers report transfer failures [S1].',
        finishReason: 'stop',
        steps: [{}],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      }),
      generateTextResponse: jest
        .fn()
        .mockResolvedValue(options?.repair ?? 'Repaired answer [S1].'),
    };
    const registry = {
      create: jest.fn().mockReturnValue({
        tools: {},
        trace: runTrace,
        setCurrentStep: jest.fn(),
      }),
    };
    return {
      orchestrator: new LocalAssistantOrchestrator(
        ai as never,
        registry as never,
      ),
      ai,
    };
  }

  it('refuses write requests before model execution', async () => {
    const { orchestrator, ai } = setup();
    const result = await orchestrator.run(input('Resolve ticket TR-123456'));
    expect(result.stopReason).toBe('read_only_refusal');
    expect(ai.generateAgentResponse).not.toHaveBeenCalled();
  });

  it('returns a configured-state response without model execution', async () => {
    const { orchestrator, ai } = setup({ enabled: false });
    const result = await orchestrator.run(input());
    expect(result.stopReason).toBe('not_configured');
    expect(ai.generateAgentResponse).not.toHaveBeenCalled();
  });

  it('returns cited evidence and structured run metadata', async () => {
    const { orchestrator } = setup();
    const result = await orchestrator.run(input());
    expect(result).toMatchObject({
      runId: 'run-1',
      stopReason: 'answered',
      answer: expect.stringContaining('[S1]'),
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });
  });

  it('records multiple model steps', async () => {
    const runTrace = trace();
    const ai = {
      isEnabled: jest.fn().mockReturnValue(true),
      generateAgentResponse: jest.fn().mockImplementation(async (options) => {
        await options.onStepFinish({
          finishReason: 'tool-calls',
          usage: { promptTokens: 4, completionTokens: 2 },
        });
        await options.onStepFinish({
          finishReason: 'stop',
          usage: { promptTokens: 5, completionTokens: 3 },
        });
        return {
          text: 'Grounded result [S1].',
          finishReason: 'stop',
          steps: [{}, {}],
          usage: { promptTokens: 9, completionTokens: 5, totalTokens: 14 },
        };
      }),
      generateTextResponse: jest.fn(),
    };
    const registry = {
      create: jest.fn().mockReturnValue({
        tools: {},
        trace: runTrace,
        setCurrentStep: jest.fn(),
      }),
    };
    const orchestrator = new LocalAssistantOrchestrator(
      ai as never,
      registry as never,
    );

    const result = await orchestrator.run(input());
    expect(result.steps).toHaveLength(2);
    expect(result.steps.map((step) => step.finishReason)).toEqual([
      'tool-calls',
      'stop',
    ]);
  });

  it('uses one citation-repair call for an uncited draft', async () => {
    const { orchestrator, ai } = setup({ text: 'Customers report failures.' });
    const result = await orchestrator.run(input());
    expect(ai.generateTextResponse).toHaveBeenCalledTimes(1);
    expect(result.answer).toBe('Repaired answer [S1].');
  });

  it('accepts grouped citations without unnecessary repair', async () => {
    const secondSource = {
      ...source,
      id: 'feedback-2',
      citationKey: 'S2',
      label: 'TR-654321',
    };
    const { orchestrator, ai } = setup({
      text: 'Billing and login are tied as the top issues [S1, S2].',
      sources: [source, secondSource],
    });

    const result = await orchestrator.run(input());

    expect(result.stopReason).toBe('answered');
    expect(ai.generateTextResponse).not.toHaveBeenCalled();
  });

  it('asks the model for direct answers and natural calendar filters', async () => {
    const { orchestrator, ai } = setup();
    await orchestrator.run(
      input('What are the top unresolved issues this week?'),
    );

    const system = ai.generateAgentResponse.mock.calls[0][0].system;
    expect(system).toContain(
      'For unresolved, open, or current tickets, use resolution=open',
    );
    expect(system).toContain('Do not narrate tool calls');
  });

  it('abstains when citation repair still invents an unknown key', async () => {
    const { orchestrator } = setup({
      text: 'Customers report failures [S9].',
      repair: 'Still unsupported [S9].',
    });
    const result = await orchestrator.run(input());
    expect(result.stopReason).toBe('model_failure');
    expect(result.answer).toContain('reliably tied');
  });

  it('abstains when the run gathered no evidence', async () => {
    const { orchestrator } = setup({ sources: [] });
    const result = await orchestrator.run(input());
    expect(result.stopReason).toBe('no_evidence');
  });
});
