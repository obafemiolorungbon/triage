import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { KbController } from './kb.controller';
import { KbService } from './kb.service';

@Module({
  imports: [AiModule, PrismaModule, RetrievalModule],
  controllers: [KbController],
  providers: [KbService],
  exports: [KbService],
})
export class KbModule {}
