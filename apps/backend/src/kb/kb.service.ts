import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  deflectionEventBodySchema,
  kbAnswerBodySchema,
  kbArticleBodySchema,
  kbImportBodySchema,
  kbSearchBodySchema,
} from '@triage/shared-types';
import type { Prisma } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { HybridRetrievalService } from '../retrieval/hybrid-retrieval.service';
import { normalizeKbImport, type NormalizedKbImportArticle } from './kb-import';

type SearchRow = {
  chunkId: string;
  articleId: string;
  slug: string;
  title: string;
  heading: string | null;
  body: string;
  score: number;
};

type PlannedKbImportArticle =
  | (NormalizedKbImportArticle & {
      valid: true;
      action: 'create' | 'update';
      articleId?: string;
    })
  | {
      index: number;
      valid: false;
      action: 'skip';
      title?: string;
      sourceId?: string;
      error: string;
    };

type KbImportPlan = {
  provider: 'zendesk' | 'intercom' | 'freshdesk';
  total: number;
  planned: PlannedKbImportArticle[];
};

@Injectable()
export class KbService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly retrieval: HybridRetrievalService,
  ) {}

  async listArticles() {
    const workspace = await this.defaultWorkspace();
    return this.prisma.client.kbArticle.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        body: true,
        published: true,
        sourceProvider: true,
        sourceId: true,
        sourceUrl: true,
        sourceLocale: true,
        sourceUpdatedAt: true,
        sourcePath: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { chunks: true } },
      },
    });
  }

  async getArticle(id: string) {
    const article = await this.prisma.client.kbArticle.findUnique({
      where: { id },
      include: { chunks: { orderBy: { order: 'asc' } } },
    });
    if (!article) throw new NotFoundException('Knowledge article not found');
    return article;
  }

  async createArticle(body: unknown) {
    const parsed = kbArticleBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const workspace = await this.defaultWorkspace();
    const article = await this.prisma.client.kbArticle.create({
      data: {
        workspaceId: workspace.id,
        slug: parsed.data.slug,
        title: parsed.data.title,
        body: parsed.data.body,
        published: parsed.data.published,
      },
    });
    await this.reindexArticle(article.id);
    return this.getArticle(article.id);
  }

  async updateArticle(id: string, body: unknown) {
    const parsed = kbArticleBodySchema.partial().safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    await this.getArticle(id);
    await this.prisma.client.kbArticle.update({
      where: { id },
      data: parsed.data,
    });
    await this.reindexArticle(id);
    return this.getArticle(id);
  }

  async previewImport(body: unknown) {
    const parsed = kbImportBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const plan = await this.planImport(
      parsed.data.provider,
      parsed.data.payload,
    );
    return toImportResult(plan);
  }

  async importArticles(body: unknown) {
    const parsed = kbImportBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const plan = await this.planImport(
      parsed.data.provider,
      parsed.data.payload,
    );
    const workspace = await this.defaultWorkspace();
    let imported = 0;

    for (const item of plan.planned) {
      if (item.action === 'skip') continue;
      const data = {
        slug: item.slug,
        title: item.title,
        body: item.body,
        published: item.published,
        sourceProvider: item.provider,
        sourceId: item.sourceId ?? null,
        sourceUrl: item.sourceUrl ?? null,
        sourceLocale: item.sourceLocale ?? null,
        sourceUpdatedAt: item.sourceUpdatedAt ?? null,
        sourcePath: item.sourcePath ?? null,
      };
      const article =
        item.action === 'update' && item.articleId
          ? await this.prisma.client.kbArticle.update({
              where: { id: item.articleId },
              data,
            })
          : await this.prisma.client.kbArticle.create({
              data: {
                ...data,
                workspaceId: workspace.id,
              },
            });
      await this.reindexArticle(article.id);
      imported += 1;
    }

    return {
      ...toImportResult(plan),
      imported,
    };
  }

  async deleteArticle(id: string) {
    await this.getArticle(id);
    return this.prisma.client.kbArticle.delete({ where: { id } });
  }

  async publicSearch(body: unknown) {
    const parsed = kbSearchBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const widget = await this.widgetByKey(parsed.data.widgetKey);
    const items = await this.searchPublished({
      workspaceId: widget.workspaceId,
      query: parsed.data.query,
      limit: parsed.data.limit,
    });
    await this.logDeflection({
      widgetId: widget.id,
      workspaceId: widget.workspaceId,
      query: parsed.data.query,
      outcome: 'searched',
      articleId: items[0]?.articleId,
      score: items[0]?.score,
      metadata: parsed.data.metadata,
    });
    return { items };
  }

  async publicAnswer(body: unknown) {
    const parsed = kbAnswerBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const widget = await this.widgetByKey(parsed.data.widgetKey);
    const items = await this.searchPublished({
      workspaceId: widget.workspaceId,
      query: parsed.data.query,
      limit: parsed.data.limit,
    });
    const answer = await this.ai.answerFromKnowledge(
      parsed.data.query,
      items.map((item) => ({
        title: item.title,
        slug: item.slug,
        body: item.body,
      })),
    );
    await this.logDeflection({
      widgetId: widget.id,
      workspaceId: widget.workspaceId,
      query: parsed.data.query,
      outcome: 'answered',
      articleId: items[0]?.articleId,
      score: items[0]?.score,
      metadata: parsed.data.metadata,
    });
    return { answer, citations: items };
  }

  async recordEvent(body: unknown) {
    const parsed = deflectionEventBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const widget = await this.widgetByKey(parsed.data.widgetKey);
    await this.logDeflection({
      workspaceId: widget.workspaceId,
      widgetId: widget.id,
      query: parsed.data.query,
      outcome: parsed.data.outcome,
      articleId: parsed.data.articleId,
      score: parsed.data.score,
      metadata: parsed.data.metadata,
    });
    return { ok: true };
  }

  private async reindexArticle(articleId: string) {
    const article = await this.prisma.client.kbArticle.findUnique({
      where: { id: articleId },
    });
    if (!article) throw new NotFoundException('Knowledge article not found');
    const chunks = splitArticle(article.body);
    await this.prisma.client.kbChunk.deleteMany({ where: { articleId } });
    for (const [index, chunk] of chunks.entries()) {
      const text = `${article.title}\n${chunk.heading ?? ''}\n${chunk.body}`;
      const embedding = await this.safeEmbedding(text);
      if (embedding) {
        await this.insertVectorChunk({
          articleId,
          workspaceId: article.workspaceId,
          heading: chunk.heading,
          body: chunk.body,
          order: index,
          embedding,
        });
      } else {
        await this.prisma.client.kbChunk.create({
          data: {
            articleId,
            workspaceId: article.workspaceId,
            heading: chunk.heading,
            body: chunk.body,
            order: index,
          },
        });
      }
    }
  }

  private async searchPublished(input: {
    workspaceId: string;
    query: string;
    limit: number;
  }): Promise<SearchRow[]> {
    const items = await this.retrieval.searchKnowledge(input);
    return items.map((item) => ({
      chunkId: item.chunkId,
      articleId: item.articleId,
      slug: item.slug,
      title: item.title,
      heading: item.heading,
      body: item.body,
      score: item.fusedScore,
    }));
  }

  private async safeEmbedding(text: string) {
    try {
      return await this.ai.embedText(text);
    } catch {
      return null;
    }
  }

  private async insertVectorChunk(input: {
    articleId: string;
    workspaceId: string;
    heading?: string;
    body: string;
    order: number;
    embedding: number[];
  }) {
    await this.prisma.client.$executeRawUnsafe(
      `
      INSERT INTO "kb_chunk"
        ("id", "articleId", "workspaceId", "heading", "body", "order", "embedding")
      VALUES
        ($1, $2, $3, $4, $5, $6, $7::vector)
      `,
      randomUUID(),
      input.articleId,
      input.workspaceId,
      input.heading ?? null,
      input.body,
      input.order,
      toVectorLiteral(input.embedding),
    );
  }

  private async widgetByKey(widgetKey: string) {
    const widget = await this.prisma.client.widget.findUnique({
      where: { widgetKey },
      select: { id: true, workspaceId: true, archivedAt: true },
    });
    if (!widget || widget.archivedAt)
      throw new BadRequestException('Invalid widget key');
    return widget;
  }

  private async defaultWorkspace() {
    const workspace = await this.prisma.client.workspace.findUnique({
      where: { slug: 'default' },
    });
    if (!workspace)
      throw new NotFoundException('Default workspace is not configured');
    return workspace;
  }

  private async planImport(
    provider: 'zendesk' | 'intercom' | 'freshdesk',
    payload: unknown,
  ): Promise<KbImportPlan> {
    const workspace = await this.defaultWorkspace();
    const normalized = normalizeKbImport(provider, payload);
    const planned: PlannedKbImportArticle[] = [];
    const reservedSlugs = new Set<string>();
    const seenSourceKeys = new Set<string>();

    for (const error of normalized.errors) {
      planned.push({
        index: error.index,
        action: 'skip',
        valid: false,
        error: error.error,
      });
    }

    for (const article of normalized.articles) {
      if (article.sourceId) {
        const sourceKey = `${article.provider}:${article.sourceId}`;
        if (seenSourceKeys.has(sourceKey)) {
          planned.push({
            index: article.index,
            action: 'skip',
            valid: false,
            title: article.title,
            sourceId: article.sourceId,
            error: 'Duplicate source article in import payload',
          });
          continue;
        }
        seenSourceKeys.add(sourceKey);
      }

      const existing = await this.findExistingImportTarget(
        workspace.id,
        article,
      );
      const slug = await this.availableImportSlug({
        workspaceId: workspace.id,
        baseSlug: article.slug,
        articleId: existing?.id,
        reservedSlugs,
      });
      reservedSlugs.add(slug);
      planned.push({
        ...article,
        slug,
        valid: true,
        action: existing ? 'update' : 'create',
        articleId: existing?.id,
      });
    }

    planned.sort((a, b) => a.index - b.index);
    return {
      provider,
      total: normalized.total,
      planned,
    };
  }

  private async findExistingImportTarget(
    workspaceId: string,
    article: NormalizedKbImportArticle,
  ) {
    if (article.sourceId) {
      return this.prisma.client.kbArticle.findFirst({
        where: {
          workspaceId,
          sourceProvider: article.provider,
          sourceId: article.sourceId,
        },
        select: { id: true, slug: true },
      });
    }

    return this.prisma.client.kbArticle.findUnique({
      where: { workspaceId_slug: { workspaceId, slug: article.slug } },
      select: { id: true, slug: true },
    });
  }

  private async availableImportSlug(input: {
    workspaceId: string;
    baseSlug: string;
    articleId?: string;
    reservedSlugs: Set<string>;
  }) {
    let candidate = input.baseSlug;
    let suffix = 2;
    while (true) {
      const reserved = input.reservedSlugs.has(candidate);
      const existing = await this.prisma.client.kbArticle.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId: input.workspaceId,
            slug: candidate,
          },
        },
        select: { id: true },
      });
      if (!reserved && (!existing || existing.id === input.articleId)) {
        return candidate;
      }
      const suffixText = `-${suffix++}`;
      candidate = `${input.baseSlug.slice(0, 160 - suffixText.length).replace(/-+$/g, '')}${suffixText}`;
    }
  }

  private async logDeflection(input: {
    workspaceId: string;
    widgetId: string;
    query: string;
    outcome: 'searched' | 'answered' | 'solved' | 'submitted' | 'abandoned';
    articleId?: string;
    score?: number;
    metadata?: Record<string, unknown>;
  }) {
    await this.prisma.client.deflection.create({
      data: {
        workspaceId: input.workspaceId,
        widgetId: input.widgetId,
        query: input.query,
        outcome: input.outcome,
        articleId: input.articleId,
        score: input.score,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue,
      },
    });
  }
}

function splitArticle(markdown: string) {
  const sections: { heading?: string; body: string }[] = [];
  let heading: string | undefined;
  let body: string[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (match && body.join('\n').trim()) {
      sections.push({ heading, body: body.join('\n').trim() });
      heading = match[2].trim();
      body = [];
      continue;
    }
    if (match) {
      heading = match[2].trim();
      continue;
    }
    body.push(line);
  }
  if (body.join('\n').trim()) {
    sections.push({ heading, body: body.join('\n').trim() });
  }
  return sections.length ? sections : [{ body: markdown.trim() }];
}

function toVectorLiteral(values: number[]) {
  return `[${values.map((value) => Number(value).toFixed(8)).join(',')}]`;
}

function toImportResult(plan: KbImportPlan) {
  const validItems = plan.planned.filter((item) => item.valid);
  const skippedItems = plan.planned.filter((item) => !item.valid);
  return {
    provider: plan.provider,
    total: plan.total,
    valid: validItems.length,
    skipped: skippedItems.length,
    creates: validItems.filter((item) => item.action === 'create').length,
    updates: validItems.filter((item) => item.action === 'update').length,
    items: plan.planned.map((item) => ({
      index: item.index,
      valid: item.valid,
      action: item.action,
      slug: item.valid ? item.slug : undefined,
      title: item.title,
      published: item.valid ? item.published : undefined,
      sourceId: item.sourceId,
      sourceUrl: item.valid ? item.sourceUrl : undefined,
      sourceLocale: item.valid ? item.sourceLocale : undefined,
      sourcePath: item.valid ? item.sourcePath : undefined,
      error: item.valid ? undefined : item.error,
    })),
  };
}
