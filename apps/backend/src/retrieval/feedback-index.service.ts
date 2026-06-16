import { createHash } from 'crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const INDEXED_METADATA_KEYS = [
  'plan',
  'environment',
  'browser',
  'affectedUsers',
  'productArea',
];

@Injectable()
export class FeedbackIndexService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AiService)
    private readonly ai: AiService,
    @Inject(SettingsService)
    private readonly settings: SettingsService,
  ) {}

  async indexFeedback(feedbackId: string) {
    const feedback = await this.prisma.client.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        widget: { select: { workspaceId: true } },
      },
    });
    if (!feedback) throw new NotFoundException('Feedback not found');
    const workspaceId =
      feedback.widget?.workspaceId ?? (await this.settings.getWorkspace()).id;
    const searchText = buildFeedbackSearchText(feedback);
    const contentHash = createHash('sha256').update(searchText).digest('hex');
    const indexedAt = new Date();
    const embeddingModel = this.ai.getEmbeddingModelName();

    const [state] = await this.prisma.client.$queryRawUnsafe<
      Array<{ hasCurrentEmbedding: boolean }>
    >(
      `
      INSERT INTO "feedback_search_document"
        ("feedbackId", "workspaceId", "searchText", "contentHash", "indexedAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $5)
      ON CONFLICT ("feedbackId") DO UPDATE SET
        "workspaceId" = EXCLUDED."workspaceId",
        "searchText" = EXCLUDED."searchText",
        "contentHash" = EXCLUDED."contentHash",
        "indexedAt" = EXCLUDED."indexedAt",
        "updatedAt" = EXCLUDED."updatedAt",
        "embedding" = CASE
          WHEN "feedback_search_document"."contentHash" = EXCLUDED."contentHash"
            THEN "feedback_search_document"."embedding"
          ELSE NULL
        END,
        "embeddingModel" = CASE
          WHEN "feedback_search_document"."contentHash" = EXCLUDED."contentHash"
            THEN "feedback_search_document"."embeddingModel"
          ELSE NULL
        END,
        "embeddedAt" = CASE
          WHEN "feedback_search_document"."contentHash" = EXCLUDED."contentHash"
            THEN "feedback_search_document"."embeddedAt"
          ELSE NULL
        END
      RETURNING (
        "embedding" IS NOT NULL
        AND "embeddingModel" = $6
      ) AS "hasCurrentEmbedding"
      `,
      feedback.id,
      workspaceId,
      searchText,
      contentHash,
      indexedAt,
      embeddingModel,
    );

    if (state?.hasCurrentEmbedding) {
      return { feedbackId, embedded: true, reusedEmbedding: true };
    }
    const embedding = await this.ai.embedText(searchText);
    if (!embedding) {
      return { feedbackId, embedded: false, reusedEmbedding: false };
    }
    await this.prisma.client.$executeRawUnsafe(
      `
      UPDATE "feedback_search_document"
      SET
        "embedding" = $2::vector,
        "embeddingModel" = $3,
        "embeddedAt" = $4,
        "updatedAt" = $4
      WHERE "feedbackId" = $1
        AND "contentHash" = $5
      `,
      feedback.id,
      toVectorLiteral(embedding),
      embeddingModel,
      new Date(),
      contentHash,
    );
    return { feedbackId, embedded: true, reusedEmbedding: false };
  }

  async backfill() {
    const feedback = await this.prisma.client.feedback.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    const results = [];
    for (const item of feedback) {
      try {
        results.push(await this.indexFeedback(item.id));
      } catch (error) {
        results.push({
          feedbackId: item.id,
          embedded: false,
          reusedEmbedding: false,
          error: error instanceof Error ? error.message : 'Indexing failed',
        });
      }
    }
    return results;
  }
}

function buildFeedbackSearchText(feedback: {
  rawText: string;
  cleanedText: string | null;
  category: string | null;
  sentiment: string | null;
  severity: string | null;
  escalationReason: string | null;
  metadata: unknown;
}) {
  const metadata = asRecord(feedback.metadata);
  const selectedMetadata = INDEXED_METADATA_KEYS.flatMap((key) => {
    const value = metadata?.[key];
    return typeof value === 'string' || typeof value === 'number'
      ? [`${key}: ${String(value)}`]
      : [];
  });
  return [
    feedback.cleanedText || feedback.rawText,
    `Original: ${feedback.rawText}`,
    feedback.category && `Category: ${feedback.category}`,
    feedback.sentiment && `Sentiment: ${feedback.sentiment}`,
    feedback.severity && `Severity: ${feedback.severity}`,
    feedback.escalationReason &&
      `Escalation reason: ${feedback.escalationReason}`,
    ...selectedMetadata,
  ]
    .filter(Boolean)
    .join('\n');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toVectorLiteral(values: number[]) {
  return `[${values.map((value) => Number(value).toFixed(8)).join(',')}]`;
}
