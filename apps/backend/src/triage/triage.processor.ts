import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiService } from '../ai/ai.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TRIAGE_QUEUE, type TriageJobData } from '../queue/triage.constants';

/**
 * Triage phase: runs the main model on feedback that already passed the spam
 * filter. Persists a `FeedbackTriageRun` audit row and mirrors the latest
 * values onto the denormalised `Feedback` columns used by list/Kanban views.
 */
@Processor(TRIAGE_QUEUE)
export class TriageProcessor extends WorkerHost {
  private readonly log = new Logger(TriageProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly notifications: NotificationService,
  ) {
    super();
  }

  async process(job: Job<TriageJobData>): Promise<void> {
    const { feedbackId } = job.data;
    const fb = await this.prisma.client.feedback.findUnique({
      where: { id: feedbackId },
    });
    if (!fb) {
      this.log.warn(`Feedback ${feedbackId} not found`);
      return;
    }

    if (!this.ai.isEnabled()) {
      await this.applyFallbackTriage(feedbackId, fb.rawText, fb.submitterEmail);
      return;
    }

    try {
      const industryContext = this.ai.getIndustryContext() || undefined;
      const triage = await this.ai.triageTicket(fb.rawText, {
        industryContext,
      });

      await this.prisma.client.$transaction([
        this.prisma.client.feedbackTriageRun.create({
          data: {
            feedbackId,
            model: this.ai.getMainModelName(),
            cleanedText: triage.cleanedText,
            category: triage.category,
            priority: triage.priority,
            sentiment: triage.sentiment,
            knowledgeGap: triage.knowledgeGap,
            suggestedTags: triage.suggestedTags,
            industryContext: industryContext ?? null,
          },
        }),
        this.prisma.client.feedback.update({
          where: { id: feedbackId },
          data: {
            cleanedText: triage.cleanedText,
            category: triage.category,
            priority: triage.priority,
            sentiment: triage.sentiment,
            knowledgeGap: triage.knowledgeGap,
            status: 'triaged',
            triagedAt: new Date(),
          },
        }),
      ]);

      await this.notifications.notifyFeedbackTriaged({
        to: fb.submitterEmail,
        feedbackId,
        category: triage.category,
        priority: triage.priority,
      });

      if (triage.priority === 'urgent') {
        await this.notifications.postSlack(
          `Urgent triaged feedback ${feedbackId}: ${triage.category}`,
        );
      }

      const admins = await this.prisma.client.user.findMany({
        where: { role: 'admin' },
      });
      for (const u of admins) {
        await this.prisma.client.notification.create({
          data: {
            userId: u.id,
            title: 'Feedback triaged',
            body: `${feedbackId} — ${triage.category} (${triage.priority})`,
          },
        });
      }
    } catch (e) {
      this.log.error(`Triage failed for ${feedbackId}`, e as Error);
      throw e;
    }
  }

  private async applyFallbackTriage(
    feedbackId: string,
    rawText: string,
    submitterEmail: string,
  ): Promise<void> {
    await this.prisma.client.feedback.update({
      where: { id: feedbackId },
      data: {
        cleanedText: rawText,
        category: 'other',
        priority: 'low',
        sentiment: 'neutral',
        knowledgeGap: false,
        status: 'triaged',
        triagedAt: new Date(),
      },
    });
    await this.notifications.notifyFeedbackTriaged({
      to: submitterEmail,
      feedbackId,
      category: 'other',
      priority: 'low',
    });
  }
}
