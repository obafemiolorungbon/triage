import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EscalationService } from './escalation.service';

@Module({
  imports: [PrismaModule],
  providers: [EscalationService],
  exports: [EscalationService],
})
export class EscalationModule {}
