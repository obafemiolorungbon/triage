import { Inject, Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';

const RRF_K = 60;

export type RetrievalMode = 'hybrid' | 'lexical' | 'vector';

export type FeedbackSearchFilters = {
  status?: string;
  resolution?: 'open' | 'closed';
  sentiment?: string;
  category?: string;
  escalationTier?: string;
  severity?: string;
  submissionType?: string;
  knowledgeGap?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
};

export type FeedbackSearchResult = {
  feedbackId: string;
  shortId: string;
  rawText: string;
  cleanedText: string | null;
  status: string;
  sentiment: string | null;
  category: string | null;
  escalationTier: string;
  severity: string | null;
  submissionType: string | null;
  knowledgeGap: boolean;
  createdAt: Date;
  lexicalScore?: number;
  vectorScore?: number;
  fusedScore: number;
};

export type KnowledgeSearchResult = {
  chunkId: string;
  articleId: string;
  slug: string;
  title: string;
  heading: string | null;
  body: string;
  lexicalScore?: number;
  vectorScore?: number;
  fusedScore: number;
};

type RankedFeedbackRow = Omit<
  FeedbackSearchResult,
  'lexicalScore' | 'vectorScore' | 'fusedScore'
> & { score: number };

type RankedKnowledgeRow = Omit<
  KnowledgeSearchResult,
  'lexicalScore' | 'vectorScore' | 'fusedScore'
> & { score: number };

@Injectable()
export class HybridRetrievalService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AiService)
    private readonly ai: AiService,
  ) {}

  async searchFeedback(input: {
    workspaceId: string;
    query?: string;
    filters?: FeedbackSearchFilters;
    limit: number;
    order?: 'relevance' | 'newest';
    mode?: RetrievalMode;
  }): Promise<FeedbackSearchResult[]> {
    const query = input.query?.trim() ?? '';
    const filters = input.filters ?? {};
    if (!query) {
      return this.recentFeedback(input.workspaceId, filters, input.limit);
    }

    const candidateLimit = Math.max(20, input.limit * 4);
    const mode = input.mode ?? 'hybrid';
    const lexical =
      mode === 'vector'
        ? []
        : await this.lexicalFeedback(
            input.workspaceId,
            query,
            filters,
            candidateLimit,
          );
    const embedding =
      mode === 'lexical' ? null : await this.safeEmbedding(query);
    const vector = embedding
      ? await this.vectorFeedback(
          input.workspaceId,
          embedding,
          filters,
          candidateLimit,
        )
      : [];
    const fused = fuseRankings(lexical, vector, 'feedbackId');
    const ordered =
      input.order === 'newest'
        ? fused.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
        : fused;
    return ordered.slice(0, input.limit);
  }

  async searchKnowledge(input: {
    workspaceId: string;
    query: string;
    limit: number;
    mode?: RetrievalMode;
  }): Promise<KnowledgeSearchResult[]> {
    const query = input.query.trim();
    if (!query) return [];
    const candidateLimit = Math.max(20, input.limit * 4);
    const mode = input.mode ?? 'hybrid';
    const lexical =
      mode === 'vector'
        ? []
        : await this.lexicalKnowledge(input.workspaceId, query, candidateLimit);
    const embedding =
      mode === 'lexical' ? null : await this.safeEmbedding(query);
    const vector = embedding
      ? await this.vectorKnowledge(input.workspaceId, embedding, candidateLimit)
      : [];
    return fuseRankings(lexical, vector, 'chunkId').slice(0, input.limit);
  }

  private async recentFeedback(
    workspaceId: string,
    filters: FeedbackSearchFilters,
    limit: number,
  ): Promise<FeedbackSearchResult[]> {
    const sql = buildFeedbackSqlFilters(workspaceId, filters, 1);
    const rows = await this.prisma.client.$queryRawUnsafe<RankedFeedbackRow[]>(
      `
      SELECT
        f.id AS "feedbackId",
        f."shortId",
        f."rawText",
        f."cleanedText",
        f.status::text,
        f.sentiment::text,
        f.category,
        f."escalationTier"::text,
        f.severity::text,
        f."submissionType"::text,
        f."knowledgeGap",
        f."createdAt",
        1::float AS score
      FROM "feedback_search_document" d
      JOIN "feedback" f ON f.id = d."feedbackId"
      WHERE ${sql.clause}
      ORDER BY f."createdAt" DESC
      LIMIT $${sql.values.length + 1}
      `,
      ...sql.values,
      limit,
    );
    return rows.map((row) => ({ ...row, fusedScore: row.score }));
  }

  private async lexicalFeedback(
    workspaceId: string,
    query: string,
    filters: FeedbackSearchFilters,
    limit: number,
  ) {
    const sql = buildFeedbackSqlFilters(workspaceId, filters, 2);
    return this.prisma.client.$queryRawUnsafe<RankedFeedbackRow[]>(
      `
      SELECT
        f.id AS "feedbackId",
        f."shortId",
        f."rawText",
        f."cleanedText",
        f.status::text,
        f.sentiment::text,
        f.category,
        f."escalationTier"::text,
        f.severity::text,
        f."submissionType"::text,
        f."knowledgeGap",
        f."createdAt",
        ts_rank_cd(
          d."searchVector",
          websearch_to_tsquery('simple', $1)
        )::float AS score
      FROM "feedback_search_document" d
      JOIN "feedback" f ON f.id = d."feedbackId"
      WHERE d."searchVector" @@ websearch_to_tsquery('simple', $1)
        AND ${sql.clause}
      ORDER BY score DESC, f."createdAt" DESC
      LIMIT $${sql.values.length + 2}
      `,
      query,
      ...sql.values,
      limit,
    );
  }

  private async vectorFeedback(
    workspaceId: string,
    embedding: number[],
    filters: FeedbackSearchFilters,
    limit: number,
  ) {
    const sql = buildFeedbackSqlFilters(workspaceId, filters, 2);
    return this.prisma.client.$queryRawUnsafe<RankedFeedbackRow[]>(
      `
      SELECT
        f.id AS "feedbackId",
        f."shortId",
        f."rawText",
        f."cleanedText",
        f.status::text,
        f.sentiment::text,
        f.category,
        f."escalationTier"::text,
        f.severity::text,
        f."submissionType"::text,
        f."knowledgeGap",
        f."createdAt",
        (1 - (d.embedding <=> $1::vector))::float AS score
      FROM "feedback_search_document" d
      JOIN "feedback" f ON f.id = d."feedbackId"
      WHERE d.embedding IS NOT NULL
        AND ${sql.clause}
      ORDER BY d.embedding <=> $1::vector
      LIMIT $${sql.values.length + 2}
      `,
      toVectorLiteral(embedding),
      ...sql.values,
      limit,
    );
  }

  private async lexicalKnowledge(
    workspaceId: string,
    query: string,
    limit: number,
  ) {
    return this.prisma.client.$queryRawUnsafe<RankedKnowledgeRow[]>(
      `
      SELECT
        c.id AS "chunkId",
        a.id AS "articleId",
        a.slug,
        a.title,
        c.heading,
        c.body,
        ts_rank_cd(
          c."searchVector",
          websearch_to_tsquery('simple', $2)
        )::float AS score
      FROM "kb_chunk" c
      JOIN "kb_article" a ON a.id = c."articleId"
      WHERE c."workspaceId" = $1
        AND a.published = true
        AND c."searchVector" @@ websearch_to_tsquery('simple', $2)
      ORDER BY score DESC, c."order" ASC
      LIMIT $3
      `,
      workspaceId,
      query,
      limit,
    );
  }

  private async vectorKnowledge(
    workspaceId: string,
    embedding: number[],
    limit: number,
  ) {
    return this.prisma.client.$queryRawUnsafe<RankedKnowledgeRow[]>(
      `
      SELECT
        c.id AS "chunkId",
        a.id AS "articleId",
        a.slug,
        a.title,
        c.heading,
        c.body,
        (1 - (c.embedding <=> $2::vector))::float AS score
      FROM "kb_chunk" c
      JOIN "kb_article" a ON a.id = c."articleId"
      WHERE c."workspaceId" = $1
        AND a.published = true
        AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> $2::vector
      LIMIT $3
      `,
      workspaceId,
      toVectorLiteral(embedding),
      limit,
    );
  }

  private async safeEmbedding(text: string) {
    try {
      return await this.ai.embedText(text);
    } catch {
      return null;
    }
  }
}

function buildFeedbackSqlFilters(
  workspaceId: string,
  filters: FeedbackSearchFilters,
  firstParameter: number,
) {
  const clauses = [`d."workspaceId" = $${firstParameter}`];
  const values: unknown[] = [workspaceId];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    clauses.push(sql.replace('?', `$${firstParameter + values.length - 1}`));
  };

  if (filters.status) add('f.status::text = ?', filters.status);
  if (filters.resolution === 'open') {
    clauses.push(
      `f.status::text IN ('new', 'triaged', 'claimed', 'in_progress')`,
    );
  }
  if (filters.resolution === 'closed') {
    clauses.push(`f.status::text IN ('resolved', 'rejected')`);
  }
  if (filters.sentiment) add('f.sentiment::text = ?', filters.sentiment);
  if (filters.category) add('f.category = ?', filters.category);
  if (filters.escalationTier) {
    add('f."escalationTier"::text = ?', filters.escalationTier);
  }
  if (filters.severity) add('f.severity::text = ?', filters.severity);
  if (filters.submissionType) {
    add('f."submissionType"::text = ?', filters.submissionType);
  }
  if (typeof filters.knowledgeGap === 'boolean') {
    add('f."knowledgeGap" = ?', filters.knowledgeGap);
  }
  if (filters.dateFrom) add('f."createdAt" >= ?', filters.dateFrom);
  if (filters.dateTo) add('f."createdAt" <= ?', filters.dateTo);
  return { clause: clauses.join(' AND '), values };
}

export function fuseRankings<T extends { score: number }, K extends keyof T>(
  lexical: T[],
  vector: T[],
  key: K,
): Array<
  Omit<T, 'score'> & {
    lexicalScore?: number;
    vectorScore?: number;
    fusedScore: number;
  }
> {
  type Fused = Omit<T, 'score'> & {
    lexicalScore?: number;
    vectorScore?: number;
    fusedScore: number;
  };
  const merged = new Map<T[K], Fused>();

  const add = (rows: T[], kind: 'lexicalScore' | 'vectorScore') => {
    rows.forEach((row, index) => {
      const { score, ...item } = row;
      const existing: Fused =
        merged.get(row[key]) ??
        ({
          ...(item as Omit<T, 'score'>),
          fusedScore: 0,
        } as Fused);
      if (kind === 'lexicalScore') existing.lexicalScore = score;
      else existing.vectorScore = score;
      existing.fusedScore += 1 / (RRF_K + index + 1);
      merged.set(row[key], existing);
    });
  };

  add(lexical, 'lexicalScore');
  add(vector, 'vectorScore');
  return [...merged.values()].sort((a, b) => b.fusedScore - a.fusedScore);
}

function toVectorLiteral(values: number[]) {
  return `[${values.map((value) => Number(value).toFixed(8)).join(',')}]`;
}
