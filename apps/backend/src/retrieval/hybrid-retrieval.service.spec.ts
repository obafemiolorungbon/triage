import {
  HybridRetrievalService,
  fuseRankings,
} from './hybrid-retrieval.service';
import { createPrismaMock } from '../test/prisma.mock';

describe('HybridRetrievalService', () => {
  it('uses reciprocal-rank fusion without requiring comparable raw scores', () => {
    const lexical = [
      { id: 'a', score: 0.9, value: 'A' },
      { id: 'b', score: 0.8, value: 'B' },
    ];
    const vector = [
      { id: 'b', score: 0.51, value: 'B' },
      { id: 'c', score: 0.99, value: 'C' },
    ];

    const result = fuseRankings(lexical, vector, 'id');
    expect(result[0]).toMatchObject({
      id: 'b',
      lexicalScore: 0.8,
      vectorScore: 0.51,
    });
    expect(result[0].fusedScore).toBeGreaterThan(result[1].fusedScore);
  });

  it('falls back to lexical feedback retrieval when embedding fails', async () => {
    const prisma = createPrismaMock();
    prisma.client.$queryRawUnsafe = jest.fn().mockResolvedValue([
      {
        feedbackId: 'feedback-1',
        shortId: 'TR-123456',
        rawText: 'Transaction reversed',
        cleanedText: null,
        status: 'new',
        sentiment: 'negative',
        category: 'transactions',
        escalationTier: 'watch',
        severity: 'medium',
        submissionType: 'bug',
        knowledgeGap: false,
        createdAt: new Date(),
        score: 0.7,
      },
    ]);
    const service = new HybridRetrievalService(
      prisma.service as never,
      {
        embedText: jest
          .fn()
          .mockRejectedValue(new Error('embedding unavailable')),
      } as never,
    );

    const result = await service.searchFeedback({
      workspaceId: 'workspace-1',
      query: 'reversed transaction',
      filters: { sentiment: 'negative' },
      limit: 5,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      feedbackId: 'feedback-1',
      lexicalScore: 0.7,
    });
    expect(result[0].vectorScore).toBeUndefined();
    const [sql, query, workspaceId, sentiment, limit] = (
      prisma.client.$queryRawUnsafe as jest.Mock
    ).mock.calls[0];
    expect(sql).toContain('d."workspaceId" = $2');
    expect(query).toBe('reversed transaction');
    expect(workspaceId).toBe('workspace-1');
    expect(sentiment).toBe('negative');
    expect(limit).toBe(20);
  });

  it('applies publication and workspace filters before KB ranking', async () => {
    const prisma = createPrismaMock();
    prisma.client.$queryRawUnsafe = jest.fn().mockResolvedValue([]);
    const service = new HybridRetrievalService(
      prisma.service as never,
      {
        embedText: jest.fn().mockResolvedValue(null),
      } as never,
    );

    await service.searchKnowledge({
      workspaceId: 'workspace-2',
      query: 'refund policy',
      limit: 5,
    });

    const [sql, workspaceId] = (prisma.client.$queryRawUnsafe as jest.Mock).mock
      .calls[0];
    expect(sql).toContain('c."workspaceId" = $1');
    expect(sql).toContain('a.published = true');
    expect(workspaceId).toBe('workspace-2');
  });

  it('applies unresolved status scope before feedback ranking', async () => {
    const prisma = createPrismaMock();
    prisma.client.$queryRawUnsafe = jest.fn().mockResolvedValue([]);
    const service = new HybridRetrievalService(
      prisma.service as never,
      { embedText: jest.fn() } as never,
    );

    await service.searchFeedback({
      workspaceId: 'workspace-1',
      filters: { resolution: 'open' },
      limit: 5,
    });

    const [sql] = (prisma.client.$queryRawUnsafe as jest.Mock).mock.calls[0];
    expect(sql).toContain(
      `f.status::text IN ('new', 'triaged', 'claimed', 'in_progress')`,
    );
  });
});
