import type { PrismaService } from '../prisma/prisma.service';

/** Minimal Prisma client mock for unit tests; override `jest.fn` return values per test. */
export function createPrismaMock(): {
  client: Record<string, unknown>;
  service: Pick<PrismaService, 'client'>;
} {
  const client = {
    feedback: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    feedbackTriageRun: {
      create: jest.fn(),
    },
    comment: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]),
  };

  return {
    client,
    service: { client: client as unknown as PrismaService['client'] },
  };
}
