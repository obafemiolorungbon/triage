import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { AiService } from '../ai/ai.service';
import { EscalationService } from '../escalation/escalation.service';
import { ExternalIssuesService } from '../external-issues/external-issues.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  FEEDBACK_INDEX_QUEUE,
  TRIAGE_QUEUE,
  type FeedbackIndexJobData,
  type TriageJobData,
} from '../queue/triage.constants';
import { SettingsService } from '../settings/settings.service';

@Processor(TRIAGE_QUEUE)
export class TriageProcessor extends WorkerHost {
  private readonly log = new Logger(TriageProcessor.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AiService)
    private readonly ai: AiService,
    @Inject(NotificationService)
    private readonly notifications: NotificationService,
    @Inject(SettingsService)
    private readonly settings: SettingsService,
    @Inject(EscalationService)
    private readonly escalation: EscalationService,
    @Inject(ExternalIssuesService)
    private readonly externalIssues: ExternalIssuesService,
    @InjectQueue(FEEDBACK_INDEX_QUEUE)
    private readonly feedbackIndexQueue: Queue<FeedbackIndexJobData>,
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
      const workspace = await this.settings.getWorkspace();
      const industryContext =
        workspace.industry || this.ai.getIndustryContext() || undefined;
      const companyContext = await this.settings.getCompanyPromptContext();
      const triage = await this.ai.triageTicket(fb.rawText, {
        industryContext,
        companyContext,
      });
      const evaluated = await this.escalation.evaluate({
        metadata: fb.metadata as Record<string, unknown> | null,
        userContext: fb.userContext as Record<string, unknown> | null,
      });

      await this.prisma.client.$transaction([
        this.prisma.client.feedbackTriageRun.create({
          data: {
            feedbackId,
            model: this.ai.getMainModelName(),
            cleanedText: triage.cleanedText,
            category: triage.category,
            sentiment: triage.sentiment,
            knowledgeGap: triage.knowledgeGap,
            suggestedTags: triage.suggestedTags,
            escalationTier: evaluated.escalationTier,
            escalationReason: evaluated.escalationReason,
            issueTitle: triage.issueTitle,
            issueBody: triage.issueBody,
            industryContext: industryContext ?? null,
          },
        }),
        this.prisma.client.feedback.update({
          where: { id: feedbackId },
          data: {
            cleanedText: triage.cleanedText,
            category: triage.category,
            sentiment: triage.sentiment,
            knowledgeGap: triage.knowledgeGap,
            escalationTier: evaluated.escalationTier,
            escalationReason: evaluated.escalationReason,
            status: 'triaged',
            triagedAt: new Date(),
          },
        }),
      ]);

      await this.notifications.notifyFeedbackTriaged({
        to: fb.submitterEmail,
        feedbackId,
        category: triage.category,
        escalationTier: evaluated.escalationTier,
      });

      if (
        workspace.autoCreateCritical &&
        evaluated.escalationTier === 'critical'
      ) {
        await this.externalIssues.createForFeedback({
          feedbackId,
          provider: workspace.autoCreateProvider,
          creationMode: 'automatic',
          draft: { title: triage.issueTitle, body: triage.issueBody },
        });
      }

      const admins = await this.prisma.client.user.findMany({
        where: { role: 'admin' },
      });
      for (const u of admins) {
        await this.prisma.client.notification.create({
          data: {
            userId: u.id,
            title: 'Feedback triaged',
            body: `${feedbackId} - ${triage.category} (${evaluated.escalationTier})`,
          },
        });
      }
      await this.enqueueIndex(feedbackId);
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
    const fb = await this.prisma.client.feedback.findUnique({
      where: { id: feedbackId },
    });
    const evaluated = await this.escalation.evaluate({
      metadata: fb?.metadata as Record<string, unknown> | null,
      userContext: fb?.userContext as Record<string, unknown> | null,
    });
    const workspace = await this.settings.getWorkspace();
    await this.prisma.client.feedback.update({
      where: { id: feedbackId },
      data: {
        cleanedText: rawText,
        category: 'other',
        escalationTier: evaluated.escalationTier,
        escalationReason: evaluated.escalationReason,
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
      escalationTier: evaluated.escalationTier,
    });
    if (
      workspace.autoCreateCritical &&
      evaluated.escalationTier === 'critical'
    ) {
      await this.externalIssues.createForFeedback({
        feedbackId,
        provider: workspace.autoCreateProvider,
        creationMode: 'automatic',
      });
    }
    await this.enqueueIndex(feedbackId);
  }

  private async enqueueIndex(feedbackId: string) {
    await this.feedbackIndexQueue.add(
      'index-feedback',
      { feedbackId },
      {
        jobId: `feedback-index-${feedbackId}`,
        attempts: 4,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }
}
