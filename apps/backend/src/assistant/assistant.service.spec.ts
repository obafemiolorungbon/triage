import { BadRequestException } from '@nestjs/common';
import { AssistantService } from './assistant.service';

describe('AssistantService', () => {
  const run = jest.fn().mockResolvedValue({ answer: 'ok' });
  const settings = {
    getWorkspace: jest.fn().mockResolvedValue({ id: 'workspace-1' }),
  };
  const config = {
    get: jest.fn().mockReturnValue(120_000),
  };
  const service = new AssistantService(
    { run } as never,
    settings as never,
    config as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects invalid requests before resolving workspace context', async () => {
    await expect(
      service.query({ message: '' }, { role: 'agent' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(settings.getWorkspace).not.toHaveBeenCalled();
  });

  it('supplies application-controlled context and fixed run budgets', async () => {
    await service.query(
      {
        message: 'What is urgent?',
        history: [{ role: 'user', content: 'Previous question' }],
        maxToolCalls: 6,
      },
      { userId: 'user-1', role: 'admin' },
    );

    expect(run).toHaveBeenCalledWith({
      message: 'What is urgent?',
      history: [{ role: 'user', content: 'Previous question' }],
      context: expect.objectContaining({
        runId: expect.any(String),
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: 'admin',
        startedAt: expect.any(Number),
        abortSignal: expect.any(AbortSignal),
      }),
      budget: {
        maxSteps: 4,
        maxToolCalls: 6,
        maxDurationMs: 120_000,
        maxEvidenceCharacters: 24_000,
        maxSources: 16,
      },
    });
  });

  it('uses the configured duration for both the run budget and abort signal', async () => {
    jest.useFakeTimers();
    config.get.mockReturnValueOnce(45_000);
    run.mockImplementationOnce(
      ({ context }: { context: { abortSignal: AbortSignal } }) =>
        new Promise((resolve) => {
          context.abortSignal.addEventListener(
            'abort',
            () => resolve({ answer: 'timed out' }),
            { once: true },
          );
        }),
    );

    try {
      const resultPromise = service.query(
        { message: 'What is urgent?', maxToolCalls: 6 },
        { role: 'agent' },
      );
      await Promise.resolve();
      await Promise.resolve();

      expect(run).toHaveBeenCalledWith(
        expect.objectContaining({
          budget: expect.objectContaining({ maxDurationMs: 45_000 }),
        }),
      );

      jest.advanceTimersByTime(44_999);
      const signal = run.mock.calls[0][0].context.abortSignal as AbortSignal;
      expect(signal.aborted).toBe(false);

      jest.advanceTimersByTime(1);
      await expect(resultPromise).resolves.toEqual({ answer: 'timed out' });
      expect(signal.aborted).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
