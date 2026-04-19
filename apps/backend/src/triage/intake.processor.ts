import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  INTAKE_QUEUE,
  TRIAGE_QUEUE,
  type IntakeJobData,
  type TriageJobData,
} from '../queue/triage.constants';

/**
 * Intake phase: runs the cheap spam classifier. Spam feedback is marked as
 * rejected + noisy and never reaches the main triage queue. Clean feedback is
 * forwarded to the triage queue for the main model. When the AI is disabled
 * (no API key) we skip straight to triage, which applies its own fallback.
 */
@Processor(INTAKE_QUEUE)
export class IntakeProcessor extends WorkerHost {
  private readonly log = new Logger(IntakeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    @InjectQueue(TRIAGE_QUEUE)
    private readonly triageQueue: Queue<TriageJobData>,
  ) {
    super();
  }

  async process(job: Job<IntakeJobData>): Promise<void> {
    const { feedbackId } = job.data;
    const fb = await this.prisma.client.feedback.findUnique({
      where: { id: feedbackId },
    });
    if (!fb) {
      this.log.warn(`Feedback ${feedbackId} not found`);
      return;
    }

    if (!this.ai.isEnabled()) {
      await this.triageQueue.add('triage', { feedbackId });
      return;
    }

    try {
      const noise = await this.ai.classifySpam(fb.rawText);
      if (noise.isNoise) {
        await this.prisma.client.feedback.update({
          where: { id: feedbackId },
          data: {
            status: 'rejected',
            isNoise: true,
            triagedAt: new Date(),
          },
        });
        this.log.log(
          `Feedback ${feedbackId} classified as spam: ${noise.reason}`,
        );
        return;
      }
      await this.triageQueue.add('triage', { feedbackId });
    } catch (e) {
      this.log.error(`Intake failed for ${feedbackId}`, e as Error);
      throw e;
    }
  }
}
