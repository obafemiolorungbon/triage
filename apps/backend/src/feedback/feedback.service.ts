import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { randomBytes } from 'crypto';
import type { Feedback, FeedbackStatus } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import {
  createTicketBodySchema,
  externalIssueCreateBodySchema,
  feedbackListQuerySchema,
  addCommentBodySchema,
  patchTicketBodySchema,
  widgetFeedbackBodySchema,
  type WidgetAttachmentSubmission,
  type WidgetFeedbackBody,
  type WidgetSurveySubmission,
  type WidgetSubmissionType,
  type FeedbackSeverity,
} from '@triage/shared-types';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { INTAKE_QUEUE, type IntakeJobData } from '../queue/triage.constants';
import type { AuthedRequest } from '../guards/session.guard';
import { EscalationService } from '../escalation/escalation.service';
import { ExternalIssuesService } from '../external-issues/external-issues.service';
import { StorageService } from '../storage/storage.service';

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
    @InjectQueue(INTAKE_QUEUE) private readonly intakeQueue: Queue<IntakeJobData>,
    private readonly events: EventsGateway,
    private readonly escalation: EscalationService,
    private readonly externalIssues: ExternalIssuesService,
    private readonly storage: StorageService,
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
    const evaluated = await this.escalation.evaluate({
      metadata: parsed.data.metadata,
      userContext: parsed.data.userContext,
    });
    const fb = await this.prisma.client.feedback.create({
      data: {
        submitterEmail: customer_email,
        ...(parsed.data.widgetId
          ? { widget: { connect: { id: parsed.data.widgetId } } }
          : {}),
        submissionType: parsed.data.submissionType,
        severity: parsed.data.severity,
        rawText,
        shortId: await this.nextShortId(),
        userContext: (parsed.data.userContext ?? undefined) as Prisma.InputJsonValue,
        metadata: (parsed.data.metadata ?? undefined) as Prisma.InputJsonValue,
        consent: (parsed.data.consent ?? undefined) as Prisma.InputJsonValue,
        sourceUrl: parsed.data.source?.url,
        sourceTitle: parsed.data.source?.title,
        escalationTier: evaluated.escalationTier,
        escalationReason: evaluated.escalationReason,
        status: 'new',
      },
    });
    await this.intakeQueue.add('intake', { feedbackId: fb.id });
    return { id: fb.id, shortId: fb.shortId, status: fb.status };
  }

  async createWidgetTicket(
    body: unknown,
    widgetId: string,
    consent?: Prisma.InputJsonValue,
  ) {
    const parsed = widgetFeedbackBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const routed = await this.routeWidgetFields(widgetId, parsed.data);
    const email = this.pickEmail(routed.user) ?? 'anonymous@widget.local';
    return this.createTicket({
      customer_email: email,
      title: routed.title,
      description: routed.message,
      widgetId,
      submissionType: routed.submissionType,
      severity: routed.severity,
      userContext: routed.user,
      metadata: routed.metadata,
      consent,
      source: parsed.data.source,
    }).then(async (ticket) => {
      await this.createAttachments(ticket.id, widgetId, parsed.data.attachments);
      if (parsed.data.survey) {
        await this.createSurvey(ticket.id, widgetId, parsed.data.survey);
      }
      return ticket;
    });
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
      escalationTier,
      category,
      q: search,
      assignedMe,
      noiseOnly,
      knowledgeOnly,
    } = q.data;
    const where: Prisma.FeedbackWhereInput = {};
    if (status) where.status = status;
    if (escalationTier) where.escalationTier = escalationTier;
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
    const fb = await this.prisma.client.feedback.findUnique({
      where: { id },
      include: {
        externalIssueLinks: true,
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!fb) throw new NotFoundException();
    return fb;
  }

  async listComments(id: string) {
    const fb = await this.prisma.client.feedback.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!fb) throw new NotFoundException();
    const items = await this.prisma.client.comment.findMany({
      where: { feedbackId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
    return { items };
  }

  async createAttachmentDownloadUrl(feedbackId: string, attachmentId: string) {
    const attachment = await this.prisma.client.attachment.findFirst({
      where: { id: attachmentId, feedbackId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return {
      url: await this.storage.createDownloadUrl(
        attachment.storageKey,
        attachment.fileName,
      ),
    };
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
      const allowed = AGENT_TRANSITIONS[fb.status as FeedbackStatus];
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

  async similar(id: string) {
    if (!id) return { items: [] as { id: string; score: number }[] };
    return { items: [] as { id: string; score: number }[] };
  }

  async createExternalIssue(id: string, body: unknown, req: AuthedRequest) {
    const parsed = externalIssueCreateBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    await this.getById(id);
    const link = await this.externalIssues.createForFeedback({
      feedbackId: id,
      provider: parsed.data.provider,
      creationMode: 'manual',
    });
    await this.prisma.client.auditLog.create({
      data: {
        actorId: req.session?.user.id,
        feedbackId: id,
        action: `external_issue_${parsed.data.provider}`,
        after: link as object,
      },
    });
    this.events.emitFeedbackEvent({ type: 'updated', feedbackId: id });
    return { link };
  }

  private pickEmail(user: Record<string, unknown> | undefined) {
    const value = user?.email ?? user?.customer_email;
    if (typeof value !== 'string') return null;
    return value.includes('@') ? value : null;
  }

  private async createAttachments(
    feedbackId: string,
    widgetId: string,
    attachments: WidgetAttachmentSubmission[],
  ) {
    if (attachments.length === 0) return;
    await this.prisma.client.attachment.createMany({
      data: attachments.map((attachment) => ({
        feedbackId,
        widgetId,
        kind: 'image',
        mimeType: attachment.mimeType,
        fileName: attachment.fileName,
        sizeBytes: attachment.sizeBytes,
        storageKey: attachment.storageKey,
        width: attachment.width,
        height: attachment.height,
      })),
    });
  }

  private async createSurvey(
    feedbackId: string,
    widgetId: string,
    survey: WidgetSurveySubmission,
  ) {
    await this.prisma.client.survey.create({
      data: {
        feedbackId,
        widgetId,
        score: survey.score,
        scale: survey.scale,
        comment: survey.comment,
      },
    });
  }

  private async routeWidgetFields(widgetId: string, data: WidgetFeedbackBody) {
    const widget = await this.prisma.client.widget.findUnique({
      where: { id: widgetId },
      select: {
        enabledTypes: true,
        fields: { orderBy: { order: 'asc' } },
      },
    });
    const fields = data.fields ?? {};
    const user: Record<string, unknown> = { ...(data.user ?? {}) };
    const metadata: Record<string, unknown> = { ...(data.metadata ?? {}) };
    const submissionType =
      data.type ?? widget?.enabledTypes[0] ?? ('bug' as WidgetSubmissionType);
    let title = data.title;
    let message = data.message;
    let severity: FeedbackSeverity | undefined;

    if (widget && !widget.enabledTypes.includes(submissionType)) {
      throw new BadRequestException('Submission type is not enabled for this widget');
    }

    for (const field of widget?.fields ?? []) {
      const value = fields[field.key];
      if (field.required && this.isEmptyFieldValue(value)) {
        throw new BadRequestException(`${field.label} is required`);
      }
      if (this.isEmptyFieldValue(value)) continue;
      if (field.target === 'title') title = String(value);
      if (field.target === 'message') message = String(value);
      if (field.target === 'user') user[field.key] = value;
      if (field.target === 'metadata') metadata[field.key] = value;
      if (field.target === 'category') metadata.category = String(value);
      if (field.target === 'severity') {
        const next = String(value).toLowerCase();
        if (['low', 'medium', 'high', 'critical'].includes(next)) {
          severity = next as FeedbackSeverity;
          metadata.severity = severity;
        }
      }
    }

    metadata.submissionType = submissionType;
    if (!severity && typeof metadata.severity === 'string') {
      const value = metadata.severity.toLowerCase();
      if (['low', 'medium', 'high', 'critical'].includes(value)) {
        severity = value as FeedbackSeverity;
      }
    }
    if (!message || message.trim().length < 10) {
      throw new BadRequestException('Feedback must be at least 10 characters');
    }
    return {
      title,
      message,
      user,
      metadata,
      submissionType,
      severity,
    };
  }

  private isEmptyFieldValue(value: unknown) {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }

  private async nextShortId() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const value = `TR-${randomBytes(4).toString('hex').slice(0, 6).toUpperCase()}`;
      const existing = await this.prisma.client.feedback.findUnique({
        where: { shortId: value },
        select: { id: true },
      });
      if (!existing) return value;
    }
    throw new BadRequestException('Could not allocate ticket reference');
  }
}
