import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  FEEDBACK_INDEX_QUEUE,
  type FeedbackIndexJobData,
} from '../queue/triage.constants';
import { FeedbackIndexService } from './feedback-index.service';

@Processor(FEEDBACK_INDEX_QUEUE)
export class FeedbackIndexProcessor extends WorkerHost {
  constructor(
    @Inject(FeedbackIndexService)
    private readonly indexer: FeedbackIndexService,
  ) {
    super();
  }

  async process(job: Job<FeedbackIndexJobData>) {
    return this.indexer.indexFeedback(job.data.feedbackId);
  }
}
