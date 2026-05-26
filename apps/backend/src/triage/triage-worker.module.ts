import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiModule } from '../ai/ai.module';
import type { Env } from '../config/env.schema';
import { EnvConfigModule } from '../config/config.module';
import { EscalationModule } from '../escalation/escalation.module';
import { ExternalIssuesModule } from '../external-issues/external-issues.module';
import { NotificationModule } from '../notification/notification.module';
import { PrismaModule } from '../prisma/prisma.module';
import { INTAKE_QUEUE, TRIAGE_QUEUE } from '../queue/triage.constants';
import { SettingsService } from '../settings/settings.service';
import { IntakeProcessor } from './intake.processor';
import { TriageProcessor } from './triage.processor';

@Module({
  imports: [
    EnvConfigModule,
    PrismaModule,
    NotificationModule,
    AiModule,
    EscalationModule,
    ExternalIssuesModule,
    BullModule.forRootAsync({
      imports: [EnvConfigModule],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: {
          url: config.get('REDIS_URL', { infer: true }),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: INTAKE_QUEUE }, { name: TRIAGE_QUEUE }),
  ],
  providers: [IntakeProcessor, TriageProcessor, SettingsService],
})
export class TriageWorkerModule {}
