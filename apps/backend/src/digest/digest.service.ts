import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import type { Env } from '../config/env.schema';

@Injectable()
export class DigestService {
  private readonly log = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: NotificationService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async dailyDigest() {
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    const agents = await this.prisma.client.user.findMany({
      where: { role: { in: ['agent', 'admin'] } },
    });
    const open = await this.prisma.client.feedback.count({
      where: { status: { notIn: ['resolved', 'rejected'] } },
    });
    this.log.log(`Daily digest: ${open} open tickets`);
    for (const u of agents) {
      await this.mail.sendPlain({
        to: u.email,
        subject: 'Daily triage digest',
        text: `Good morning ${u.name}. There are ${open} open feedback items in the queue.`,
      });
    }
  }
}
