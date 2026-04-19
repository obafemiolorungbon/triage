import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { EnvConfigModule } from '../config/config.module';
import { NotificationModule } from '../notification/notification.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TRIAGE_QUEUE } from '../queue/triage.constants';
import { TriageProcessor } from './triage.processor';

@Module({
  imports: [
    EnvConfigModule,
    PrismaModule,
    NotificationModule,
    BullModule.forRootAsync({
      imports: [EnvConfigModule],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: {
          url: config.get('REDIS_URL', { infer: true }),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: TRIAGE_QUEUE }),
  ],
  providers: [TriageProcessor],
})
export class TriageWorkerModule {}
