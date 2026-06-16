import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { FeedbackIndexService } from './feedback-index.service';
import { HybridRetrievalService } from './hybrid-retrieval.service';

@Module({
  imports: [AiModule, PrismaModule, SettingsModule],
  providers: [FeedbackIndexService, HybridRetrievalService],
  exports: [FeedbackIndexService, HybridRetrievalService],
})
export class RetrievalModule {}
