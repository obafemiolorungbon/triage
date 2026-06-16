import { AssistantToolsService } from './assistant-tools.service';
import { createPrismaMock } from '../test/prisma.mock';

describe('AssistantToolsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let retrieval: {
    searchFeedback: jest.Mock;
    searchKnowledge: jest.Mock;
  };
  let service: AssistantToolsService;
  const context = {
    runId: 'run-1',
    workspaceId: 'workspace-1',
    userId: 'user-1',
    role: 'agent' as const,
    startedAt: Date.now(),
    abortSignal: new AbortController().signal,
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    retrieval = {
      searchFeedback: jest.fn(),
      searchKnowledge: jest.fn(),
    };
    service = new AssistantToolsService(
      prisma.service as never,
      retrieval as never,
    );
  });

  it('searchFeedback delegates tenant-scoped hybrid retrieval', async () => {
    retrieval.searchFeedback.mockResolvedValue([
      {
        feedbackId: 'feedback-1',
        shortId: 'TR-123456',
        rawText: 'Transfers fail after approval',
        cleanedText: null,
        status: 'new',
        sentiment: 'negative',
        category: 'transactions',
        escalationTier: 'critical',
        severity: 'high',
        submissionType: 'bug',
        knowledgeGap: false,
        createdAt: new Date('2026-06-01'),
        lexicalScore: 0.8,
        fusedScore: 0.03,
      },
    ]);

    const result = await service.searchFeedback(context, {
      query: 'transaction complaints',
      sentiment: 'negative',
      order: 'newest',
      limit: 8,
    });

    expect(retrieval.searchFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        query: 'transaction complaints',
        filters: expect.objectContaining({ sentiment: 'negative' }),
      }),
    );
    expect(result.sources[0]).toMatchObject({
      type: 'ticket',
      id: 'feedback-1',
      lexicalScore: 0.8,
    });
  });

  it('hydrates a feedback record only inside the run workspace', async () => {
    prisma.client.feedback.findFirst = jest.fn().mockResolvedValue(null);
    const result = await service.getFeedbackDetails(context, {
      feedbackId: 'TR-123456',
    });

    expect(prisma.client.feedback.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            expect.objectContaining({ OR: expect.any(Array) }),
            {
              OR: [
                { widget: { workspaceId: 'workspace-1' } },
                { widgetId: null },
              ],
            },
          ],
        },
      }),
    );
    expect(result.sources).toEqual([]);
  });

  it('uses controlled relational aggregation for grouped analytics', async () => {
    prisma.client.$queryRawUnsafe = jest
      .fn()
      .mockResolvedValue([{ group1: 'negative', count: 3 }]);

    const result = await service.analyzeFeedback(context, {
      sentiment: 'negative',
      groupBy: ['sentiment'],
    });

    const [sql, workspaceId, sentiment] = (
      prisma.client.$queryRawUnsafe as jest.Mock
    ).mock.calls[0];
    expect(sql).toContain('GROUP BY');
    expect(sql).toContain('f.sentiment::text');
    expect(workspaceId).toBe('workspace-1');
    expect(sentiment).toBe('negative');
    expect(result.data).toMatchObject({ total: 3 });
  });

  it('expresses unresolved calendar analytics as readable evidence', async () => {
    prisma.client.$queryRawUnsafe = jest.fn().mockResolvedValue([
      { group1: 'billing', count: 2 },
      { group1: 'login', count: 1 },
    ]);

    const result = await service.analyzeFeedback(context, {
      resolution: 'open',
      period: 'this_week',
      groupBy: ['category'],
    });

    const [sql] = (prisma.client.$queryRawUnsafe as jest.Mock).mock.calls[0];
    expect(sql).toContain(
      `f.status::text IN ('new', 'triaged', 'claimed', 'in_progress')`,
    );
    expect(result.summary).toBe(
      '3 feedback records matched for open feedback, this week. Breakdown: category=billing: 2; category=login: 1.',
    );
    expect(result.sources[0]).toMatchObject({
      label: 'Feedback analytics by category',
      excerpt: result.summary,
    });
  });

  it('returns a direct no-match analytics statement', async () => {
    prisma.client.$queryRawUnsafe = jest.fn().mockResolvedValue([]);

    const result = await service.analyzeFeedback(context, {
      resolution: 'open',
      period: 'this_week',
      groupBy: ['category'],
    });

    expect(result.summary).toBe(
      'No feedback records matched for open feedback, this week.',
    );
    expect(result.sources).toHaveLength(1);
  });

  it('keeps knowledge retrieval separate from feedback retrieval', async () => {
    retrieval.searchKnowledge.mockResolvedValue([]);
    await service.searchKnowledge(context, {
      query: 'refund policy',
      limit: 5,
    });
    expect(retrieval.searchKnowledge).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      query: 'refund policy',
      limit: 5,
    });
    expect(retrieval.searchFeedback).not.toHaveBeenCalled();
  });

  it('defaults deflection evidence to submitted and abandoned behavior', async () => {
    prisma.client.deflection.findMany = jest.fn().mockResolvedValue([]);
    await service.searchDeflections(context, {
      outcomes: ['submitted', 'abandoned'],
      limit: 8,
    });
    expect(prisma.client.deflection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId: 'workspace-1',
          outcome: { in: ['submitted', 'abandoned'] },
        },
      }),
    );
  });
});
