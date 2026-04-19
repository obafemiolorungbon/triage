import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { runTriagePipeline, type TriageClientConfig } from './triage-llm';
import type { Env } from '../config/env.schema';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TRIAGE_QUEUE, type TriageJobData } from '../queue/triage.constants';

@Processor(TRIAGE_QUEUE)
export class TriageProcessor extends WorkerHost {
  private readonly log = new Logger(TriageProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
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

    const apiKey = this.config.get('OPENROUTER_API_KEY', { infer: true });
    const triageCfg: TriageClientConfig = {
      apiKey: apiKey || 'disabled',
      filterModel: this.config.get('OPENROUTER_MODEL_FILTER', { infer: true }),
      mainModel: this.config.get('OPENROUTER_MODEL_MAIN', { infer: true }),
    };

    try {
      if (!apiKey) {
        await this.prisma.client.feedback.update({
          where: { id: feedbackId },
          data: {
            cleanedText: fb.rawText,
            category: 'uncategorized',
            priority: 'low',
            sentiment: 'neutral',
            knowledgeGap: false,
            status: 'triaged',
            triagedAt: new Date(),
          },
        });
        await this.notifications.notifyFeedbackTriaged({
          to: fb.submitterEmail,
          feedbackId,
          category: 'uncategorized',
          priority: 'low',
        });
        return;
      }

      const result = await runTriagePipeline(triageCfg, fb.rawText);
      if (result.kind === 'rejected') {
        await this.prisma.client.feedback.update({
          where: { id: feedbackId },
          data: {
            status: 'rejected',
            isNoise: true,
            triagedAt: new Date(),
          },
        });
        return;
      }
      const { triage } = result;
      await this.prisma.client.feedback.update({
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
      });

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
}
