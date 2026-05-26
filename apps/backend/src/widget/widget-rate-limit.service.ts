import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../config/env.schema';

@Injectable()
export class WidgetRateLimitService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.redis = new Redis(this.config.get('REDIS_URL', { infer: true }), {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    this.redis.on('error', () => undefined);
  }

  async hit(input: {
    widgetKey: string;
    clientIp: string;
    bucket: 'config' | 'submit';
    limit: number;
  }) {
    const safeLimit = Math.max(1, input.limit);
    const key = [
      'widget',
      'rl',
      input.bucket,
      input.widgetKey,
      input.clientIp || 'unknown',
      Math.floor(Date.now() / 60_000),
    ].join(':');

    let count: number;
    try {
      count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, 70);
    } catch {
      throw new ServiceUnavailableException('Widget rate limit is unavailable');
    }

    if (count > safeLimit) {
      throw new HttpException('Too many widget requests', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
