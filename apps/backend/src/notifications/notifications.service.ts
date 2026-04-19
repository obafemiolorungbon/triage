import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.client.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  markRead(userId: string, ids: string[]) {
    if (!ids.length) return { updated: 0 };
    return this.prisma.client.notification.updateMany({
      where: { userId, id: { in: ids } },
      data: { read: true },
    });
  }
}
