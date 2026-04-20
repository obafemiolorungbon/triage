jest.mock('@triage/db', () => ({
  prisma: {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

import { Test } from '@nestjs/testing';
import { prisma } from '@triage/db';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects on init and disconnects on destroy', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    const svc = moduleRef.get(PrismaService);
    await svc.onModuleInit();
    await svc.onModuleDestroy();
    expect(prisma.$connect).toHaveBeenCalled();
    expect(prisma.$disconnect).toHaveBeenCalled();
  });
});
