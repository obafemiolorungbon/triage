import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { NotificationModule } from '../notification/notification.module';
import { EscalationModule } from '../escalation/escalation.module';
import { ExternalIssuesModule } from '../external-issues/external-issues.module';
import { StorageModule } from '../storage/storage.module';
import { FeedbackService } from './feedback.service';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [
    QueueModule,
    NotificationModule,
    EscalationModule,
    ExternalIssuesModule,
    StorageModule,
  ],
  controllers: [TicketsController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
