import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HybridRetrievalService } from '../retrieval/hybrid-retrieval.service';
import type {
  AnalyzeFeedbackInput,
  GetFeedbackDetailsInput,
  SearchDeflectionsInput,
  SearchFeedbackInput,
  SearchKnowledgeInput,
} from './assistant-tool-schemas';
import type {
  AssistantRunContext,
  AssistantToolResult,
} from './assistant.types';

const GROUP_EXPRESSIONS = {
  status: 'f.status::text',
  category: `coalesce(f.category, 'unclassified')`,
  escalation: 'f."escalationTier"::text',
  sentiment: `coalesce(f.sentiment::text, 'unknown')`,
  severity: `coalesce(f.severity::text, 'unknown')`,
  submissionType: `coalesce(f."submissionType"::text, 'unknown')`,
  day: `to_char(date_trunc('day', f."createdAt"), 'YYYY-MM-DD')`,
  week: `to_char(date_trunc('week', f."createdAt"), 'YYYY-MM-DD')`,
} as const;

@Injectable()
export class AssistantToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retrieval: HybridRetrievalService,
  ) {}

  async searchFeedback(
    context: AssistantRunContext,
    input: SearchFeedbackInput,
  ): Promise<AssistantToolResult> {
    const results = await this.retrieval.searchFeedback({
      workspaceId: context.workspaceId,
      query: input.query,
      filters: toRetrievalFilters(input),
      limit: input.limit,
      order: input.order,
    });
    return {
      summary: `Found ${results.length} feedback record${results.length === 1 ? '' : 's'}.`,
      sources: results.map((item) => ({
        type: 'ticket',
        id: item.feedbackId,
        label: item.shortId,
        href: `/dashboard/${item.feedbackId}`,
        excerpt: snippet(item.cleanedText || item.rawText),
        score: item.fusedScore,
        lexicalScore: item.lexicalScore,
        vectorScore: item.vectorScore,
      })),
      data: results.map((item) => ({
        id: item.feedbackId,
        shortId: item.shortId,
        status: item.status,
        sentiment: item.sentiment,
        category: item.category,
        escalationTier: item.escalationTier,
        severity: item.severity,
        submissionType: item.submissionType,
        knowledgeGap: item.knowledgeGap,
        createdAt: item.createdAt,
        text: snippet(item.cleanedText || item.rawText, 600),
        retrieval: {
          fusedScore: item.fusedScore,
          lexicalScore: item.lexicalScore,
          vectorScore: item.vectorScore,
        },
      })),
    };
  }

  async getFeedbackDetails(
    context: AssistantRunContext,
    input: GetFeedbackDetailsInput,
  ): Promise<AssistantToolResult> {
    const ticket = await this.prisma.client.feedback.findFirst({
      where: {
        AND: [
          {
            OR: [
              { id: input.feedbackId },
              { shortId: input.feedbackId.toUpperCase() },
            ],
          },
          workspaceFeedbackScope(context.workspaceId),
        ],
      },
      include: {
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
        },
        triageRuns: { orderBy: { createdAt: 'desc' }, take: 3 },
        externalIssueLinks: true,
        attachments: { orderBy: { createdAt: 'asc' } },
        surveys: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });
    if (!ticket) {
      return {
        summary: `Feedback ${input.feedbackId} was not found in this workspace.`,
        sources: [],
        data: null,
      };
    }

    const sources = [
      {
        type: 'ticket' as const,
        id: ticket.id,
        label: ticket.shortId,
        href: `/dashboard/${ticket.id}`,
        excerpt: snippet(ticket.cleanedText || ticket.rawText),
      },
      ...ticket.comments.map((comment) => ({
        type: 'comment' as const,
        id: comment.id,
        label: `Comment on ${ticket.shortId}`,
        href: `/dashboard/${ticket.id}`,
        excerpt: snippet(comment.body),
      })),
      ...ticket.triageRuns.map((run) => ({
        type: 'triage_run' as const,
        id: run.id,
        label: `Triage run for ${ticket.shortId}`,
        href: `/dashboard/${ticket.id}`,
        excerpt: snippet(run.issueBody || run.cleanedText),
      })),
      ...ticket.externalIssueLinks.map((link) => ({
        type: 'external_issue' as const,
        id: link.id,
        label: `${link.provider} ${link.externalKey ?? link.externalId}`,
        href: link.externalUrl,
        excerpt: link.creationMode,
      })),
    ];

    return {
      summary: `Loaded details for ${ticket.shortId}.`,
      sources,
      data: {
        id: ticket.id,
        shortId: ticket.shortId,
        status: ticket.status,
        category: ticket.category,
        sentiment: ticket.sentiment,
        severity: ticket.severity,
        escalationTier: ticket.escalationTier,
        escalationReason: ticket.escalationReason,
        knowledgeGap: ticket.knowledgeGap,
        createdAt: ticket.createdAt,
        triagedAt: ticket.triagedAt,
        resolvedAt: ticket.resolvedAt,
        text: snippet(ticket.cleanedText || ticket.rawText, 2_000),
        comments: ticket.comments.map((comment) => ({
          id: comment.id,
          author: comment.author.name || comment.author.email,
          body: snippet(comment.body, 800),
          createdAt: comment.createdAt,
        })),
        triageRuns: ticket.triageRuns.map((run) => ({
          id: run.id,
          model: run.model,
          category: run.category,
          sentiment: run.sentiment,
          knowledgeGap: run.knowledgeGap,
          issueTitle: run.issueTitle,
          issueBody: snippet(run.issueBody, 1_000),
          createdAt: run.createdAt,
        })),
        attachments: ticket.attachments.map((attachment) => ({
          id: attachment.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        })),
        surveys: ticket.surveys.map((survey) => ({
          id: survey.id,
          score: survey.score,
          scale: survey.scale,
          comment: snippet(survey.comment, 500),
          createdAt: survey.createdAt,
        })),
        externalIssues: ticket.externalIssueLinks.map((link) => ({
          provider: link.provider,
          key: link.externalKey,
          url: link.externalUrl,
        })),
      },
    };
  }

  async analyzeFeedback(
    context: AssistantRunContext,
    input: AnalyzeFeedbackInput,
  ): Promise<AssistantToolResult> {
    const filters = buildAnalyticsFilters(context.workspaceId, input);
    const groups = input.groupBy.map((group) => GROUP_EXPRESSIONS[group]);
    const select = groups.length
      ? groups
          .map((expression, index) => `${expression} AS "group${index + 1}"`)
          .join(', ')
      : `'all' AS "group1"`;
    const groupBy = groups.length ? `GROUP BY ${groups.join(', ')}` : '';
    const orderBy = groups.length ? `ORDER BY count DESC, "group1" ASC` : '';
    const rows = await this.prisma.client.$queryRawUnsafe<
      Array<{ group1: string; group2?: string; count: number }>
    >(
      `
      SELECT ${select}, count(*)::int AS count
      FROM "feedback" f
      LEFT JOIN "widget" w ON w.id = f."widgetId"
      WHERE ${filters.clause}
      ${groupBy}
      ${orderBy}
      `,
      ...filters.values,
    );
    const total = rows.reduce((sum, row) => sum + Number(row.count), 0);
    const sourceId = createHash('sha1')
      .update(JSON.stringify(input))
      .digest('hex')
      .slice(0, 12);
    const data = {
      total,
      groupBy: input.groupBy,
      rows: rows.map((row) => ({ ...row, count: Number(row.count) })),
    };
    const evidence = describeAnalytics(input, data);
    return {
      summary: evidence,
      sources: [
        {
          type: 'analytics',
          id: `feedback-analysis-${sourceId}`,
          label: analyticsLabel(input),
          excerpt: evidence,
        },
      ],
      data,
    };
  }

  async searchKnowledge(
    context: AssistantRunContext,
    input: SearchKnowledgeInput,
  ): Promise<AssistantToolResult> {
    const items = await this.retrieval.searchKnowledge({
      workspaceId: context.workspaceId,
      query: input.query,
      limit: input.limit,
    });
    return {
      summary: `Found ${items.length} knowledge match${items.length === 1 ? '' : 'es'}.`,
      sources: items.map((item) => ({
        type: 'kb_chunk',
        id: item.chunkId,
        label: item.heading ? `${item.title}: ${item.heading}` : item.title,
        href: '/dashboard/kb',
        excerpt: snippet(item.body),
        score: item.fusedScore,
        lexicalScore: item.lexicalScore,
        vectorScore: item.vectorScore,
      })),
      data: items.map((item) => ({
        articleId: item.articleId,
        chunkId: item.chunkId,
        slug: item.slug,
        title: item.title,
        heading: item.heading,
        body: snippet(item.body, 1_500),
        retrieval: {
          fusedScore: item.fusedScore,
          lexicalScore: item.lexicalScore,
          vectorScore: item.vectorScore,
        },
      })),
    };
  }

  async searchDeflections(
    context: AssistantRunContext,
    input: SearchDeflectionsInput,
  ): Promise<AssistantToolResult> {
    const where: Prisma.DeflectionWhereInput = {
      workspaceId: context.workspaceId,
      outcome: { in: input.outcomes },
    };
    if (input.query) {
      where.query = { contains: input.query, mode: 'insensitive' };
    }
    const createdAt = dateRange(input);
    if (createdAt) where.createdAt = createdAt;
    const deflections = await this.prisma.client.deflection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: input.limit,
    });
    return {
      summary: `Found ${deflections.length} deflection event${deflections.length === 1 ? '' : 's'}.`,
      sources: deflections.map((deflection) => ({
        type: 'deflection',
        id: deflection.id,
        label: `Deflection ${deflection.outcome}`,
        excerpt: snippet(deflection.query),
        score: deflection.score ?? undefined,
      })),
      data: deflections.map((deflection) => ({
        id: deflection.id,
        query: snippet(deflection.query, 600),
        outcome: deflection.outcome,
        articleId: deflection.articleId,
        score: deflection.score,
        createdAt: deflection.createdAt,
      })),
    };
  }
}

function toRetrievalFilters(input: SearchFeedbackInput) {
  return {
    status: input.status,
    resolution: input.resolution,
    sentiment: input.sentiment,
    category: input.category,
    escalationTier: input.escalationTier,
    severity: input.severity,
    submissionType: input.submissionType,
    knowledgeGap: input.knowledgeGap,
    dateFrom: effectiveDateFrom(input),
    dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
  };
}

function workspaceFeedbackScope(
  workspaceId: string,
): Prisma.FeedbackWhereInput {
  return {
    OR: [{ widget: { workspaceId } }, { widgetId: null }],
  };
}

function buildAnalyticsFilters(
  workspaceId: string,
  input: AnalyzeFeedbackInput,
) {
  const clauses = ['(w."workspaceId" = $1 OR f."widgetId" IS NULL)'];
  const values: unknown[] = [workspaceId];
  const add = (clause: string, value: unknown) => {
    values.push(value);
    clauses.push(clause.replace('?', `$${values.length}`));
  };
  if (input.status) add('f.status::text = ?', input.status);
  if (input.resolution === 'open') {
    clauses.push(
      `f.status::text IN ('new', 'triaged', 'claimed', 'in_progress')`,
    );
  }
  if (input.resolution === 'closed') {
    clauses.push(`f.status::text IN ('resolved', 'rejected')`);
  }
  if (input.sentiment) add('f.sentiment::text = ?', input.sentiment);
  if (input.category) add('f.category = ?', input.category);
  if (input.escalationTier) {
    add('f."escalationTier"::text = ?', input.escalationTier);
  }
  if (input.severity) add('f.severity::text = ?', input.severity);
  if (input.submissionType) {
    add('f."submissionType"::text = ?', input.submissionType);
  }
  if (typeof input.knowledgeGap === 'boolean') {
    add('f."knowledgeGap" = ?', input.knowledgeGap);
  }
  const dateFrom = effectiveDateFrom(input);
  if (dateFrom) add('f."createdAt" >= ?', dateFrom);
  if (input.dateTo) add('f."createdAt" <= ?', new Date(input.dateTo));
  return { clause: clauses.join(' AND '), values };
}

function effectiveDateFrom(input: {
  dateFrom?: string;
  withinDays?: number;
  period?: 'today' | 'this_week' | 'last_7_days' | 'this_month';
}) {
  const explicit = input.dateFrom ? new Date(input.dateFrom) : undefined;
  const relative = input.withinDays
    ? new Date(Date.now() - input.withinDays * 24 * 60 * 60 * 1_000)
    : undefined;
  const period = input.period ? periodStart(input.period) : undefined;
  return [explicit, relative, period]
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];
}

function dateRange(input: { dateFrom?: string; dateTo?: string }) {
  if (!input.dateFrom && !input.dateTo) return null;
  return {
    ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
    ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
  };
}

function snippet(value: string | null | undefined, max = 280) {
  const clean = (value ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}...`;
}

function periodStart(
  period: 'today' | 'this_week' | 'last_7_days' | 'this_month',
) {
  const now = new Date();
  if (period === 'last_7_days') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
  }
  if (period === 'today') {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
  if (period === 'this_month') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  const day = now.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday,
    ),
  );
}

function analyticsLabel(input: AnalyzeFeedbackInput) {
  const grouping = input.groupBy.length
    ? ` by ${input.groupBy.join(' and ')}`
    : '';
  return `Feedback analytics${grouping}`;
}

function describeAnalytics(
  input: AnalyzeFeedbackInput,
  data: {
    total: number;
    groupBy: AnalyzeFeedbackInput['groupBy'];
    rows: Array<{ group1: string; group2?: string; count: number }>;
  },
) {
  const scope = describeAnalyticsScope(input);
  if (data.total === 0) {
    return `No feedback records matched${scope}.`;
  }
  if (data.groupBy.length === 0) {
    return `${data.total} feedback record${data.total === 1 ? '' : 's'} matched${scope}.`;
  }
  const groups = data.rows
    .map((row) => {
      const labels = [
        `${data.groupBy[0]}=${row.group1}`,
        ...(data.groupBy[1] && row.group2
          ? [`${data.groupBy[1]}=${row.group2}`]
          : []),
      ];
      return `${labels.join(', ')}: ${row.count}`;
    })
    .join('; ');
  return `${data.total} feedback record${data.total === 1 ? '' : 's'} matched${scope}. Breakdown: ${groups}.`;
}

function describeAnalyticsScope(input: AnalyzeFeedbackInput) {
  const filters: string[] = [];
  if (input.resolution) filters.push(`${input.resolution} feedback`);
  if (input.status) filters.push(`status ${input.status}`);
  if (input.category) filters.push(`category ${input.category}`);
  if (input.sentiment) filters.push(`${input.sentiment} sentiment`);
  if (input.severity) filters.push(`${input.severity} severity`);
  if (input.escalationTier) {
    filters.push(`${input.escalationTier} escalation`);
  }
  if (input.submissionType) filters.push(`${input.submissionType} submissions`);
  if (typeof input.knowledgeGap === 'boolean') {
    filters.push(input.knowledgeGap ? 'knowledge gaps' : 'non-knowledge gaps');
  }
  if (input.period) filters.push(input.period.replaceAll('_', ' '));
  else if (input.withinDays) filters.push(`the last ${input.withinDays} days`);
  else if (input.dateFrom || input.dateTo) filters.push('the requested dates');
  return filters.length ? ` for ${filters.join(', ')}` : '';
}
