import { AssistantToolRegistry } from './assistant-tool-registry';

describe('AssistantToolRegistry', () => {
  const context = {
    runId: 'run-1',
    workspaceId: 'workspace-1',
    role: 'agent' as const,
    startedAt: Date.now(),
    abortSignal: new AbortController().signal,
  };
  const budget = {
    maxSteps: 4,
    maxToolCalls: 1,
    maxDurationMs: 30_000_000,
    maxEvidenceCharacters: 500,
    maxSources: 1,
  };

  function execute(tool: unknown, input: unknown) {
    return (
      tool as { execute: (value: unknown, options: unknown) => unknown }
    ).execute(input, {});
  }

  it('prevents duplicate normalized calls and assigns run citation keys', async () => {
    const service = {
      searchFeedback: jest.fn().mockResolvedValue({
        summary: 'one result',
        sources: [
          { type: 'ticket', id: 'f1', label: 'TR-1', excerpt: 'Failure' },
        ],
        data: [{ id: 'f1' }],
      }),
    };
    const registry = new AssistantToolRegistry(service as never).create(
      context,
      { ...budget, maxToolCalls: 6 },
    );

    const first = await execute(registry.tools.searchFeedback, {
      query: 'payments',
      order: 'relevance',
      limit: 8,
    });
    const second = await execute(registry.tools.searchFeedback, {
      limit: 8,
      order: 'relevance',
      query: 'payments',
    });

    expect(first).toMatchObject({
      sources: [{ citationKey: 'S1' }],
    });
    expect(second).toMatchObject({
      data: { skipped: true, reason: 'duplicate_tool_call' },
    });
    expect(service.searchFeedback).toHaveBeenCalledTimes(1);
    expect(registry.trace.duplicateCall).toBe(true);
  });

  it('enforces total execution and source budgets', async () => {
    const service = {
      searchFeedback: jest.fn().mockResolvedValue({
        summary: 'two results',
        sources: [
          { type: 'ticket', id: 'f1', label: 'TR-1', excerpt: 'First' },
          { type: 'ticket', id: 'f2', label: 'TR-2', excerpt: 'Second' },
        ],
        data: [],
      }),
      searchKnowledge: jest.fn(),
    };
    const registry = new AssistantToolRegistry(service as never).create(
      context,
      budget,
    );

    const first = await execute(registry.tools.searchFeedback, {
      query: 'payments',
      order: 'relevance',
      limit: 8,
    });
    const second = await execute(registry.tools.searchKnowledge, {
      query: 'payments',
      limit: 5,
    });

    expect(first).toMatchObject({ sources: [{ id: 'f1' }] });
    expect(registry.trace.sources).toHaveLength(1);
    expect(second).toMatchObject({
      data: { skipped: true, reason: 'tool_call_limit' },
    });
  });

  it('converts an individual tool failure into a traceable result', async () => {
    const service = {
      searchFeedback: jest.fn().mockRejectedValue(new Error('database down')),
    };
    const registry = new AssistantToolRegistry(service as never).create(
      context,
      budget,
    );
    const result = await execute(registry.tools.searchFeedback, {
      query: 'payments',
      order: 'relevance',
      limit: 8,
    });
    expect(result).toMatchObject({ data: { failed: true } });
    expect(registry.trace.toolFailure).toBe(true);
    expect(registry.trace.toolCalls[0]).toMatchObject({ status: 'failed' });
  });

  it('does not start a tool after the run is aborted', async () => {
    const service = { searchFeedback: jest.fn() };
    const abortController = new AbortController();
    abortController.abort();
    const registry = new AssistantToolRegistry(service as never).create(
      { ...context, abortSignal: abortController.signal },
      budget,
    );
    const result = await execute(registry.tools.searchFeedback, {
      query: 'payments',
      order: 'relevance',
      limit: 8,
    });
    expect(result).toMatchObject({ data: { failed: true } });
    expect(service.searchFeedback).not.toHaveBeenCalled();
  });
});
