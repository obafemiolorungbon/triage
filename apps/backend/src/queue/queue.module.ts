import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { EnvConfigModule } from '../config/config.module';
import { TRIAGE_QUEUE } from './triage.constants';

@Module({
  imports: [
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
  exports: [BullModule],
})
export class QueueModule {}
