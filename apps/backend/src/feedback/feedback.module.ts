import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { NotificationModule } from '../notification/notification.module';
import { FeedbackService } from './feedback.service';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [QueueModule, NotificationModule],
  controllers: [TicketsController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
