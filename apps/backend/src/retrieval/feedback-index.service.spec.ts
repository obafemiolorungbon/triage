import { FeedbackIndexService } from './feedback-index.service';
import { createPrismaMock } from '../test/prisma.mock';

describe('FeedbackIndexService', () => {
  function feedback() {
    return {
      id: 'feedback-1',
      rawText: 'Transfer failed',
      cleanedText: 'Transfer fails after approval',
      category: 'transactions',
      sentiment: 'negative',
      severity: 'high',
      escalationReason: 'Multiple affected users',
      metadata: {
        plan: 'enterprise',
        browser: 'Chrome',
        privateToken: 'must-not-index',
      },
      widget: { workspaceId: 'workspace-1' },
    };
  }

  it('writes lexical content before attempting an embedding', async () => {
    const prisma = createPrismaMock();
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(feedback());
    const lexicalUpsert = jest
      .fn()
      .mockResolvedValue([{ hasCurrentEmbedding: false }]);
    prisma.client.$queryRawUnsafe = lexicalUpsert;
    const execute = jest.fn();
    prisma.client.$executeRawUnsafe = execute;
    const ai = {
      embedText: jest.fn().mockRejectedValue(new Error('provider down')),
      getEmbeddingModelName: jest.fn(),
    };
    const service = new FeedbackIndexService(
      prisma.service as never,
      ai as never,
      { getWorkspace: jest.fn() } as never,
    );

    await expect(service.indexFeedback('feedback-1')).rejects.toThrow(
      'provider down',
    );
    expect(lexicalUpsert).toHaveBeenCalledTimes(1);
    const [, , workspaceId, searchText] = lexicalUpsert.mock.calls[0];
    expect(workspaceId).toBe('workspace-1');
    expect(searchText).toContain('Transfer fails after approval');
    expect(searchText).toContain('plan: enterprise');
    expect(searchText).not.toContain('must-not-index');
    expect(execute).not.toHaveBeenCalled();
  });

  it('updates the vector only after a successful lexical upsert', async () => {
    const prisma = createPrismaMock();
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(feedback());
    prisma.client.$queryRawUnsafe = jest
      .fn()
      .mockResolvedValue([{ hasCurrentEmbedding: false }]);
    const execute = jest.fn().mockResolvedValue(1);
    prisma.client.$executeRawUnsafe = execute;
    const service = new FeedbackIndexService(
      prisma.service as never,
      {
        embedText: jest.fn().mockResolvedValue([0.1, 0.2]),
        getEmbeddingModelName: jest.fn().mockReturnValue('embedding-model'),
      } as never,
      { getWorkspace: jest.fn() } as never,
    );

    await expect(service.indexFeedback('feedback-1')).resolves.toEqual({
      feedbackId: 'feedback-1',
      embedded: true,
      reusedEmbedding: false,
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toContain('UPDATE');
    expect(execute.mock.calls[0][3]).toBe('embedding-model');
  });

  it('reuses a current embedding for an unchanged content hash and model', async () => {
    const prisma = createPrismaMock();
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(feedback());
    prisma.client.$queryRawUnsafe = jest
      .fn()
      .mockResolvedValue([{ hasCurrentEmbedding: true }]);
    const ai = {
      embedText: jest.fn(),
      getEmbeddingModelName: jest.fn().mockReturnValue('embedding-model'),
    };
    const service = new FeedbackIndexService(
      prisma.service as never,
      ai as never,
      { getWorkspace: jest.fn() } as never,
    );

    await expect(service.indexFeedback('feedback-1')).resolves.toEqual({
      feedbackId: 'feedback-1',
      embedded: true,
      reusedEmbedding: true,
    });
    expect(ai.embedText).not.toHaveBeenCalled();
  });

  it('backfills existing feedback idempotently through the same index path', async () => {
    const prisma = createPrismaMock();
    prisma.client.feedback.findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const service = new FeedbackIndexService(
      prisma.service as never,
      {} as never,
      {} as never,
    );
    const indexFeedback = jest
      .spyOn(service, 'indexFeedback')
      .mockResolvedValue({
        feedbackId: 'a',
        embedded: false,
        reusedEmbedding: false,
      });

    await service.backfill();
    expect(indexFeedback.mock.calls).toEqual([['a'], ['b']]);
  });

  it('continues the backfill after an individual indexing failure', async () => {
    const prisma = createPrismaMock();
    prisma.client.feedback.findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const service = new FeedbackIndexService(
      prisma.service as never,
      {} as never,
      {} as never,
    );
    jest
      .spyOn(service, 'indexFeedback')
      .mockRejectedValueOnce(new Error('provider down'))
      .mockResolvedValueOnce({
        feedbackId: 'b',
        embedded: true,
        reusedEmbedding: false,
      });

    await expect(service.backfill()).resolves.toEqual([
      expect.objectContaining({
        feedbackId: 'a',
        embedded: false,
        error: 'provider down',
      }),
      expect.objectContaining({ feedbackId: 'b', embedded: true }),
    ]);
  });
});
