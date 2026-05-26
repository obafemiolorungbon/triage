import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { KbController } from './kb.controller';
import { KbService } from './kb.service';

@Module({
  imports: [AiModule, PrismaModule],
  controllers: [KbController],
  providers: [KbService],
  exports: [KbService],
})
export class KbModule {}
