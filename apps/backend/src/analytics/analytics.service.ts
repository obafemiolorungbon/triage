import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [byStatus, byCategory, urgentOpen] = await Promise.all([
      this.prisma.client.feedback.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.client.feedback.groupBy({
        by: ['category'],
        where: { category: { not: null } },
        _count: { id: true },
      }),
      this.prisma.client.feedback.count({
        where: { priority: 'urgent', status: { notIn: ['resolved', 'rejected'] } },
      }),
    ]);
    return { byStatus, byCategory, urgentOpen };
  }
}
