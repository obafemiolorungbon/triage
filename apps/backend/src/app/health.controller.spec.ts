jest.mock('ioredis', () =>
  jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn(),
  })),
);

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import type { Env } from '../config/env.schema';

describe('HealthController', () => {
  it('check returns ok', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { client: { $queryRaw: jest.fn() } },
        },
        {
          provide: ConfigService,
          useValue: { get: () => 'redis://localhost' },
        },
      ],
    }).compile();
    const c = moduleRef.get(HealthController);
    expect(c.check()).toEqual({ status: 'ok' });
  });

  it('ready pings database and redis', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            client: { $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]) },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (_k: keyof Env) => 'redis://localhost:6379',
          } as ConfigService<Env, true>,
        },
      ],
    }).compile();
    const c = moduleRef.get(HealthController);
    await expect(c.ready()).resolves.toEqual({
      status: 'ready',
      database: true,
      redis: true,
    });
  });
});
