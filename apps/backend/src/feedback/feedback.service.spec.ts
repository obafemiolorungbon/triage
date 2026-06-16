import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import type { Feedback, FeedbackStatus } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { EscalationService } from '../escalation/escalation.service';
import { ExternalIssuesService } from '../external-issues/external-issues.service';
import { INTAKE_QUEUE } from '../queue/triage.constants';
import { StorageService } from '../storage/storage.service';
import { createPrismaMock } from '../test/prisma.mock';

function fb(partial: Partial<Feedback> & { status: FeedbackStatus }): Feedback {
  return {
    id: 'id-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    submitterEmail: 'c@d.com',
    rawText: 'raw',
    cleanedText: null,
    status: partial.status,
    priority: null,
    category: null,
    sentiment: null,
    knowledgeGap: false,
    isNoise: false,
    triagedAt: null,
    resolvedAt: null,
    assignedAgentId: null,
    ...partial,
  } as Feedback;
}

describe('FeedbackService', () => {
  let service: FeedbackService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let intakeAdd: jest.Mock;
  let emitFeedbackEvent: jest.Mock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    intakeAdd = jest.fn().mockResolvedValue(undefined);
    emitFeedbackEvent = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: prisma.service },
        {
          provide: getQueueToken(INTAKE_QUEUE),
          useValue: { add: intakeAdd },
        },
        {
          provide: EventsGateway,
          useValue: { emitFeedbackEvent },
        },
        {
          provide: EscalationService,
          useValue: {
            evaluate: jest.fn().mockResolvedValue({
              escalationTier: 'none',
              escalationReason: null,
            }),
          },
        },
        {
          provide: ExternalIssuesService,
          useValue: { createForFeedback: jest.fn() },
        },
        {
          provide: StorageService,
          useValue: { createDownloadUrl: jest.fn() },
        },
      ],
    }).compile();
    service = moduleRef.get(FeedbackService);
  });

  const authed = (role: 'admin' | 'agent' = 'agent', id = 'u1') =>
    ({
      session: { user: { id, role } },
    }) as Parameters<FeedbackService['updateStatus']>[2];

  describe('createTicket', () => {
    it('creates feedback and enqueues intake', async () => {
      prisma.client.feedback.create = jest.fn().mockResolvedValue({
        id: 'new-id',
        status: 'new',
      });
      const out = await service.createTicket({
        customer_email: 'a@b.com',
        description: '1234567890',
        title: '  Title  ',
      });
      expect(out).toEqual({ id: 'new-id', status: 'new' });
      expect(prisma.client.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          submitterEmail: 'a@b.com',
          rawText: 'Title\n\n1234567890',
          shortId: expect.stringMatching(/^TR-[A-F0-9]{6}$/),
          escalationTier: 'none',
          escalationReason: null,
          status: 'new',
        }),
      });
      expect(intakeAdd).toHaveBeenCalledWith('intake', {
        feedbackId: 'new-id',
      });
    });

    it('throws BadRequestException on invalid body', async () => {
      await expect(
        service.createTicket({ customer_email: 'bad', description: 'short' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('list', () => {
    it('returns paginated items', async () => {
      prisma.client.feedback.findMany = jest.fn().mockResolvedValue([]);
      prisma.client.feedback.count = jest.fn().mockResolvedValue(0);
      const out = await service.list({}, 'u1');
      expect(out).toMatchObject({ items: [], total: 0, page: 1, pageSize: 20 });
    });

    it('applies filters', async () => {
      prisma.client.feedback.findMany = jest.fn().mockResolvedValue([]);
      prisma.client.feedback.count = jest.fn().mockResolvedValue(0);
      await service.list(
        {
          status: 'new',
          priority: 'high',
          category: 'bug',
          q: 'x',
          assignedMe: 'true',
          noiseOnly: '1',
          knowledgeOnly: 'yes',
          page: '2',
          pageSize: '10',
        },
        'agent-1',
      );
      expect(prisma.client.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'new',
            category: 'bug',
            isNoise: true,
            knowledgeGap: true,
            assignedAgentId: 'agent-1',
            OR: expect.any(Array),
          }),
          skip: 10,
          take: 10,
        }),
      );
    });

    it('throws on invalid query', async () => {
      await expect(
        service.list({ status: 'nope' }, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns status stats for the full filtered result set', async () => {
      prisma.client.feedback.count = jest.fn().mockResolvedValue(3);
      prisma.client.feedback.groupBy = jest.fn().mockResolvedValue([
        { status: 'new', _count: { _all: 2 } },
        { status: 'resolved', _count: { _all: 1 } },
      ]);

      const out = await service.stats({ knowledgeOnly: 'true' }, 'u1');

      expect(out).toEqual({
        total: 3,
        byStatus: {
          new: 2,
          triaged: 0,
          claimed: 0,
          in_progress: 0,
          resolved: 1,
          rejected: 0,
        },
      });
      expect(prisma.client.feedback.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { knowledgeGap: true },
        _count: { _all: true },
      });
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('listComments', () => {
    it('throws NotFoundException when ticket is missing', async () => {
      prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(null);
      await expect(service.listComments('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('fetches comments by feedback id', async () => {
      prisma.client.feedback.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 'fid' });
      prisma.client.comment.findMany = jest.fn().mockResolvedValue([
        {
          id: 'c1',
          feedbackId: 'fid',
          authorId: 'u1',
          body: 'note',
          createdAt: new Date('2020-01-01'),
          author: { id: 'u1', name: 'Agent', email: 'agent@example.com' },
        },
      ]);

      const out = await service.listComments('fid');

      expect(out.items).toHaveLength(1);
      expect(prisma.client.comment.findMany).toHaveBeenCalledWith({
        where: { feedbackId: 'fid' },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      });
    });
  });

  describe('updateStatus', () => {
    it('throws BadRequestException when body invalid', async () => {
      await expect(
        service.updateStatus('id', { status: 'nope' }, authed()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ForbiddenException without user id', async () => {
      await expect(
        service.updateStatus('id', { status: 'triaged' }, {
          session: undefined,
        } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns unchanged when status already matches', async () => {
      const row = fb({ status: 'new' });
      prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(row);
      const out = await service.updateStatus('id', { status: 'new' }, authed());
      expect(out).toBe(row);
      expect(prisma.client.feedback.update).not.toHaveBeenCalled();
    });

    it('routes to applyClaim for claimed', async () => {
      const row = fb({ status: 'new' });
      prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(row);
      const updated = fb({ status: 'claimed', assignedAgentId: 'u1' });
      prisma.client.feedback.update = jest.fn().mockResolvedValue(updated);
      prisma.client.auditLog.create = jest.fn().mockResolvedValue({});
      const out = await service.updateStatus(
        'id',
        { status: 'claimed' },
        authed(),
      );
      expect(out.status).toBe('claimed');
      expect(emitFeedbackEvent).toHaveBeenCalledWith({
        type: 'claimed',
        feedbackId: 'id',
      });
    });

    it('applyClaim noop when already claimed by same user', async () => {
      const row = fb({ status: 'claimed', assignedAgentId: 'u1' });
      prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(row);
      const out = await service.updateStatus(
        'id',
        { status: 'claimed' },
        authed(),
      );
      expect(out).toBe(row);
      expect(prisma.client.feedback.update).not.toHaveBeenCalled();
    });

    it('applyResolve allows agent when ticket has no assignee', async () => {
      const row = fb({ status: 'triaged', assignedAgentId: null });
      prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(row);
      prisma.client.feedback.update = jest
        .fn()
        .mockResolvedValue(fb({ status: 'resolved' }));
      prisma.client.auditLog.create = jest.fn().mockResolvedValue({});
      await service.updateStatus('id', { status: 'resolved' }, authed('agent'));
      expect(prisma.client.feedback.update).toHaveBeenCalled();
    });

    it('applyClaim rejects closed ticket', async () => {
      prisma.client.feedback.findUnique = jest
        .fn()
        .mockResolvedValue(fb({ status: 'resolved' }));
      await expect(
        service.updateStatus('id', { status: 'claimed' }, authed()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('routes to applyResolve', async () => {
      const row = fb({ status: 'in_progress', assignedAgentId: 'u1' });
      prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(row);
      prisma.client.feedback.update = jest
        .fn()
        .mockResolvedValue(fb({ status: 'resolved' }));
      prisma.client.auditLog.create = jest.fn().mockResolvedValue({});
      await service.updateStatus('id', { status: 'resolved' }, authed());
      expect(emitFeedbackEvent).toHaveBeenCalledWith({
        type: 'updated',
        feedbackId: 'id',
      });
    });

    it('applyResolve forbids non-assignee non-admin', async () => {
      const row = fb({ status: 'in_progress', assignedAgentId: 'other' });
      prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(row);
      await expect(
        service.updateStatus('id', { status: 'resolved' }, authed('agent')),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('applyResolve allows admin when not assignee', async () => {
      const row = fb({ status: 'in_progress', assignedAgentId: 'other' });
      prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(row);
      prisma.client.feedback.update = jest
        .fn()
        .mockResolvedValue(fb({ status: 'resolved' }));
      prisma.client.auditLog.create = jest.fn().mockResolvedValue({});
      await service.updateStatus('id', { status: 'resolved' }, authed('admin'));
      expect(prisma.client.feedback.update).toHaveBeenCalled();
    });

    it('agent cannot reopen closed ticket', async () => {
      prisma.client.feedback.findUnique = jest
        .fn()
        .mockResolvedValue(fb({ status: 'resolved' }));
      await expect(
        service.updateStatus('id', { status: 'triaged' }, authed('agent')),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('admin can change generic status from resolved', async () => {
      prisma.client.feedback.findUnique = jest
        .fn()
        .mockResolvedValue(fb({ status: 'resolved' }));
      const updated = fb({ status: 'triaged' });
      prisma.client.feedback.update = jest.fn().mockResolvedValue(updated);
      prisma.client.auditLog.create = jest.fn().mockResolvedValue({});
      await service.updateStatus('id', { status: 'triaged' }, authed('admin'));
      expect(prisma.client.feedback.update).toHaveBeenCalled();
    });

    it('agent allowed transition new -> triaged', async () => {
      prisma.client.feedback.findUnique = jest
        .fn()
        .mockResolvedValue(fb({ status: 'new' }));
      prisma.client.feedback.update = jest
        .fn()
        .mockResolvedValue(fb({ status: 'triaged' }));
      prisma.client.auditLog.create = jest.fn().mockResolvedValue({});
      await service.updateStatus('id', { status: 'triaged' }, authed('agent'));
      expect(prisma.client.auditLog.create).toHaveBeenCalled();
    });

    it('agent blocked on invalid transition', async () => {
      prisma.client.feedback.findUnique = jest
        .fn()
        .mockResolvedValue(fb({ status: 'triaged' }));
      await expect(
        service.updateStatus('id', { status: 'new' }, authed('agent')),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('new -> in_progress connects assignee when unassigned', async () => {
      prisma.client.feedback.findUnique = jest
        .fn()
        .mockResolvedValue(fb({ status: 'new', assignedAgentId: null }));
      prisma.client.feedback.update = jest
        .fn()
        .mockResolvedValue(
          fb({ status: 'in_progress', assignedAgentId: 'u1' }),
        );
      prisma.client.auditLog.create = jest.fn().mockResolvedValue({});
      await service.updateStatus('id', { status: 'in_progress' }, authed());
      expect(prisma.client.feedback.update).toHaveBeenCalledWith({
        where: { id: 'id' },
        data: expect.objectContaining({
          status: 'in_progress',
          assignedAgent: { connect: { id: 'u1' } },
        }),
      });
    });

    it('in_progress -> triaged disconnects assignee', async () => {
      prisma.client.feedback.findUnique = jest
        .fn()
        .mockResolvedValue(
          fb({ status: 'in_progress', assignedAgentId: 'u1' }),
        );
      prisma.client.feedback.update = jest
        .fn()
        .mockResolvedValue(fb({ status: 'triaged', assignedAgentId: null }));
      prisma.client.auditLog.create = jest.fn().mockResolvedValue({});
      await service.updateStatus('id', { status: 'triaged' }, authed());
      expect(prisma.client.feedback.update).toHaveBeenCalledWith({
        where: { id: 'id' },
        data: expect.objectContaining({
          status: 'triaged',
          assignedAgent: { disconnect: true },
        }),
      });
    });

    it('agent can reject from new', async () => {
      prisma.client.feedback.findUnique = jest
        .fn()
        .mockResolvedValue(fb({ status: 'new' }));
      prisma.client.feedback.update = jest
        .fn()
        .mockResolvedValue(fb({ status: 'rejected' }));
      prisma.client.auditLog.create = jest.fn().mockResolvedValue({});
      await service.updateStatus('id', { status: 'rejected' }, authed('agent'));
      expect(prisma.client.feedback.update).toHaveBeenCalledWith({
        where: { id: 'id' },
        data: expect.objectContaining({
          status: 'rejected',
          resolvedAt: null,
        }),
      });
    });

    it('admin reopen from resolved clears resolvedAt on next status', async () => {
      prisma.client.feedback.findUnique = jest
        .fn()
        .mockResolvedValue(fb({ status: 'resolved', resolvedAt: new Date() }));
      prisma.client.feedback.update = jest
        .fn()
        .mockResolvedValue(fb({ status: 'new' }));
      prisma.client.auditLog.create = jest.fn().mockResolvedValue({});
      await service.updateStatus('id', { status: 'new' }, authed('admin'));
      expect(prisma.client.feedback.update).toHaveBeenCalledWith({
        where: { id: 'id' },
        data: expect.objectContaining({
          status: 'new',
          resolvedAt: null,
        }),
      });
    });
  });

  describe('addComment', () => {
    it('throws Forbidden without user', async () => {
      await expect(
        service.addComment('id', { body: 'hello' }, {
          session: undefined,
        } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequest on invalid body', async () => {
      await expect(
        service.addComment('id', { body: '' }, authed()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates comment', async () => {
      prisma.client.feedback.findUnique = jest
        .fn()
        .mockResolvedValue(fb({ status: 'new' }));
      prisma.client.comment.create = jest.fn().mockResolvedValue({
        id: 'c1',
        createdAt: new Date('2020-01-01'),
      });
      const out = await service.addComment('fid', { body: 'note' }, authed());
      expect(out.id).toBe('c1');
    });
  });

  describe('similar', () => {
    it('returns empty items', async () => {
      await expect(service.similar('x')).resolves.toEqual({ items: [] });
    });
  });
});
