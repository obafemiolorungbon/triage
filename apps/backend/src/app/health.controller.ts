import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Public } from '../decorators/public.decorator';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  async ready() {
    const redisUrl = this.config.get('REDIS_URL', { infer: true });
    const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      await redis.ping();
      return { status: 'ready', database: true, redis: true };
    } finally {
      redis.disconnect();
    }
  }
}
