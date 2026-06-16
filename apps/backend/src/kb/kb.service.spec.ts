import { KbService } from './kb.service';

describe('KbService imports', () => {
  function setup() {
    const prisma = {
      client: {
        workspace: {
          findUnique: jest.fn().mockResolvedValue({ id: 'ws-1' }),
        },
        kbArticle: {
          findMany: jest.fn(),
          findUnique: jest.fn().mockResolvedValue(null),
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'created-1' }),
          update: jest.fn().mockResolvedValue({ id: 'updated-1' }),
          delete: jest.fn(),
        },
        kbChunk: {
          deleteMany: jest.fn(),
          create: jest.fn(),
        },
        deflection: {
          create: jest.fn(),
        },
        widget: {
          findUnique: jest.fn(),
        },
        $queryRawUnsafe: jest.fn(),
        $executeRawUnsafe: jest.fn(),
      },
    };
    const ai = { embedText: jest.fn().mockRejectedValue(new Error('off')) };
    const retrieval = { searchKnowledge: jest.fn().mockResolvedValue([]) };
    const service = new KbService(
      prisma as never,
      ai as never,
      retrieval as never,
    );
    const reindex = jest
      .spyOn(
        service as unknown as { reindexArticle: (id: string) => Promise<void> },
        'reindexArticle',
      )
      .mockResolvedValue(undefined);
    return { service, prisma, reindex };
  }

  it('previews imports without writing articles', async () => {
    const { service, prisma } = setup();

    const result = await service.previewImport({
      provider: 'zendesk',
      payload: {
        articles: [
          {
            id: 1,
            title: 'Useful article',
            body: '<p>This imported article has enough useful content.</p>',
            draft: false,
          },
          {
            id: 2,
            title: 'Bad article',
            body: '<p>short</p>',
          },
        ],
      },
    });

    expect(result).toMatchObject({
      provider: 'zendesk',
      total: 2,
      valid: 1,
      skipped: 1,
      creates: 1,
      updates: 0,
    });
    expect(prisma.client.kbArticle.create).not.toHaveBeenCalled();
    expect(prisma.client.kbArticle.update).not.toHaveBeenCalled();
  });

  it('updates by source identity and reindexes the article', async () => {
    const { service, prisma, reindex } = setup();
    prisma.client.kbArticle.findFirst.mockResolvedValueOnce({
      id: 'article-1',
      slug: 'old-title',
    });

    const result = await service.importArticles({
      provider: 'intercom',
      payload: [
        {
          id: 'ic-1',
          title: 'New title',
          body: '<p>This article came from Intercom and should update.</p>',
          state: 'published',
          url: 'https://intercom.test/articles/ic-1',
        },
      ],
    });

    expect(result).toMatchObject({
      imported: 1,
      creates: 0,
      updates: 1,
    });
    expect(prisma.client.kbArticle.update).toHaveBeenCalledWith({
      where: { id: 'article-1' },
      data: expect.objectContaining({
        slug: 'new-title',
        title: 'New title',
        published: true,
        sourceProvider: 'intercom',
        sourceId: 'ic-1',
        sourceUrl: 'https://intercom.test/articles/ic-1',
      }),
    });
    expect(reindex).toHaveBeenCalledWith('updated-1');
  });

  it('suffixes a slug when a different sourced article already owns it', async () => {
    const { service, prisma } = setup();
    prisma.client.kbArticle.findUnique
      .mockResolvedValueOnce({ id: 'other-article' })
      .mockResolvedValueOnce(null);

    const result = await service.previewImport({
      provider: 'freshdesk',
      payload: [
        {
          id: 88,
          title: 'Duplicate title',
          description:
            '<p>This Freshdesk solution has enough imported content to index.</p>',
          status: 2,
        },
      ],
    });

    expect(result.items[0]).toMatchObject({
      action: 'create',
      slug: 'duplicate-title-2',
    });
  });
});
