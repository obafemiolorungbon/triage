import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Feedback, FeedbackStatus } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import {
  createTicketBodySchema,
  feedbackListQuerySchema,
  addCommentBodySchema,
  patchTicketBodySchema,
} from '@triage/shared-types';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TRIAGE_QUEUE, type TriageJobData } from '../queue/triage.constants';
import type { AuthedRequest } from '../guards/session.guard';

/** Agent-allowed status transitions when not using dedicated claim/resolve paths. */
const AGENT_TRANSITIONS: Record<FeedbackStatus, FeedbackStatus[]> = {
  new: ['triaged', 'in_progress', 'rejected'],
  triaged: ['in_progress', 'rejected'],
  claimed: ['in_progress', 'triaged'],
  in_progress: ['triaged', 'claimed'],
  resolved: [],
  rejected: [],
};

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(TRIAGE_QUEUE) private readonly triageQueue: Queue<TriageJobData>,
    private readonly events: EventsGateway,
  ) {}

  async createTicket(body: unknown) {
    const parsed = createTicketBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const { customer_email, description, title } = parsed.data;
    const rawText = title?.trim()
      ? `${title.trim()}\n\n${description}`
      : description;
    const fb = await this.prisma.client.feedback.create({
      data: {
        submitterEmail: customer_email,
        rawText,
        status: 'new',
      },
    });
    await this.triageQueue.add('triage', { feedbackId: fb.id });
    return { id: fb.id, status: fb.status };
  }

  async list(query: Record<string, string | string[] | undefined>, userId: string) {
    const q = feedbackListQuerySchema.safeParse({
      ...Object.fromEntries(
        Object.entries(query).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
      ),
      assignedMe: query.assignedMe,
    });
    if (!q.success) {
      throw new BadRequestException(q.error.flatten());
    }
    const {
      page,
      pageSize,
      status,
      priority,
      category,
      q: search,
      assignedMe,
      noiseOnly,
      knowledgeOnly,
    } = q.data;
    const where: Prisma.FeedbackWhereInput = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (noiseOnly) where.isNoise = true;
    if (knowledgeOnly) where.knowledgeGap = true;
    if (assignedMe) where.assignedAgentId = userId;
    if (search) {
      where.OR = [
        { rawText: { contains: search, mode: 'insensitive' } },
        { cleanedText: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.client.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.feedback.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getById(id: string) {
    const fb = await this.prisma.client.feedback.findUnique({ where: { id } });
    if (!fb) throw new NotFoundException();
    return fb;
  }

  async updateStatus(id: string, body: unknown, req: AuthedRequest) {
    const parsed = patchTicketBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const next = parsed.data.status;
    const userId = req.session?.user.id;
    if (!userId) throw new ForbiddenException();
    const fb = await this.getById(id);
    if (fb.status === next) return fb;

    const role = (req.session?.user as { role?: string }).role;
    const isAdmin = role === 'admin';

    if (next === 'claimed') {
      return this.applyClaim(id, fb, userId);
    }
    if (next === 'resolved') {
      return this.applyResolve(id, fb, userId, isAdmin);
    }

    if (!isAdmin) {
      if (fb.status === 'resolved' || fb.status === 'rejected') {
        throw new BadRequestException('Cannot change status of a closed ticket');
      }
      const allowed = AGENT_TRANSITIONS[fb.status];
      if (!allowed.includes(next)) {
        throw new BadRequestException(
          `Cannot move ticket from "${fb.status}" to "${next}"`,
        );
      }
    }

    const data = this.buildGenericStatusUpdate(fb, next, userId);
    const updated = await this.prisma.client.feedback.update({
      where: { id },
      data,
    });
    await this.prisma.client.auditLog.create({
      data: {
        actorId: userId,
        feedbackId: id,
        action: 'status_change',
        before: fb as object,
        after: updated as object,
      },
    });
    this.events.emitFeedbackEvent({ type: 'updated', feedbackId: id });
    return updated;
  }

  private buildGenericStatusUpdate(
    fb: { status: FeedbackStatus; assignedAgentId: string | null },
    next: FeedbackStatus,
    userId: string,
  ): Prisma.FeedbackUpdateInput {
    const data: Prisma.FeedbackUpdateInput = { status: next };
    if (next === 'in_progress' && !fb.assignedAgentId) {
      data.assignedAgent = { connect: { id: userId } };
    }
    if (next === 'triaged' || next === 'new') {
      data.assignedAgent = { disconnect: true };
    }
    if (next === 'rejected') {
      data.resolvedAt = null;
    }
    if (next !== 'resolved' && fb.status === 'resolved') {
      data.resolvedAt = null;
    }
    return data;
  }

  private async applyClaim(id: string, fb: Feedback, userId: string) {
    if (fb.status === 'resolved' || fb.status === 'rejected') {
      throw new BadRequestException('Cannot claim closed ticket');
    }
    if (fb.status === 'claimed' && fb.assignedAgentId === userId) {
      return fb;
    }
    const updated = await this.prisma.client.feedback.update({
      where: { id },
      data: {
        assignedAgent: { connect: { id: userId } },
        status: 'claimed',
      },
    });
    await this.prisma.client.auditLog.create({
      data: {
        actorId: userId,
        feedbackId: id,
        action: 'claim',
        before: fb as object,
        after: updated as object,
      },
    });
    this.events.emitFeedbackEvent({ type: 'claimed', feedbackId: id });
    return updated;
  }

  private async applyResolve(
    id: string,
    fb: Feedback,
    userId: string,
    isAdmin: boolean,
  ) {
    if (fb.assignedAgentId && fb.assignedAgentId !== userId && !isAdmin) {
      throw new ForbiddenException('Not assigned to you');
    }
    const updated = await this.prisma.client.feedback.update({
      where: { id },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
    await this.prisma.client.auditLog.create({
      data: {
        actorId: userId,
        feedbackId: id,
        action: 'resolve',
        before: fb as object,
        after: updated as object,
      },
    });
    this.events.emitFeedbackEvent({ type: 'updated', feedbackId: id });
    return updated;
  }

  async addComment(id: string, body: unknown, req: AuthedRequest) {
    const userId = req.session?.user.id;
    if (!userId) throw new ForbiddenException();
    const parsed = addCommentBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    await this.getById(id);
    const c = await this.prisma.client.comment.create({
      data: {
        feedbackId: id,
        authorId: userId,
        body: parsed.data.body,
      },
    });
    return { id: c.id, createdAt: c.createdAt };
  }

  async similar(_id: string) {
    return { items: [] as { id: string; score: number }[] };
  }
}
