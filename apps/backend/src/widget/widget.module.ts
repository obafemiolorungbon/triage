import { Module } from '@nestjs/common';
import { FeedbackModule } from '../feedback/feedback.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { WidgetController } from './widget.controller';
import { WidgetService } from './widget.service';

@Module({
  imports: [FeedbackModule, PrismaModule, StorageModule],
  controllers: [WidgetController],
  providers: [WidgetService],
})
export class WidgetModule {}
