import { Module } from '@nestjs/common';
import { FeedbackModule } from '../feedback/feedback.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { WidgetController } from './widget.controller';
import { WidgetPublicGuard } from './widget-public.guard';
import { WidgetRateLimitService } from './widget-rate-limit.service';
import { WidgetService } from './widget.service';

@Module({
  imports: [FeedbackModule, PrismaModule, StorageModule],
  controllers: [WidgetController],
  providers: [WidgetService, WidgetPublicGuard, WidgetRateLimitService],
})
export class WidgetModule {}
