jest.mock('../auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SessionGuard } from '../guards/session.guard';
import { TestSessionGuard } from '../test/test-session.guard';
import { FeedbackService } from './feedback.service';
import { TicketsController } from './tickets.controller';

describe('TicketsController', () => {
  let controller: TicketsController;
  const feedback = {
    createTicket: jest.fn(),
    list: jest.fn(),
    stats: jest.fn(),
    similar: jest.fn(),
    getById: jest.fn(),
    listComments: jest.fn(),
    updateStatus: jest.fn(),
    addComment: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }])],
      controllers: [TicketsController],
      providers: [{ provide: FeedbackService, useValue: feedback }],
    })
      .overrideGuard(SessionGuard)
      .useClass(TestSessionGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = moduleRef.get(TicketsController);
  });

  it('create delegates to service', async () => {
    feedback.createTicket.mockResolvedValue({ id: '1', status: 'new' });
    const body = { customer_email: 'a@b.com', description: '1234567890' };
    await expect(controller.create(body)).resolves.toEqual({
      id: '1',
      status: 'new',
    });
    expect(feedback.createTicket).toHaveBeenCalledWith(body);
  });

  it('list passes query and user id', async () => {
    feedback.list.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    const query = { page: '1' };
    await controller.list(query, {
      session: { user: { id: 'uid', role: 'admin' } },
    } as never);
    expect(feedback.list).toHaveBeenCalledWith(query, 'uid');
  });

  it('stats passes query and user id', async () => {
    feedback.stats.mockResolvedValue({
      total: 0,
      byStatus: {
        new: 0,
        triaged: 0,
        claimed: 0,
        in_progress: 0,
        resolved: 0,
        rejected: 0,
      },
    });
    const query = { knowledgeOnly: 'true' };
    await controller.stats(query, {
      session: { user: { id: 'uid', role: 'admin' } },
    } as never);
    expect(feedback.stats).toHaveBeenCalledWith(query, 'uid');
  });

  it('similar delegates', async () => {
    feedback.similar.mockResolvedValue({ items: [] });
    await expect(controller.similar('x')).resolves.toEqual({ items: [] });
    expect(feedback.similar).toHaveBeenCalledWith('x');
  });

  it('getOne delegates', async () => {
    feedback.getById.mockResolvedValue({ id: '1' });
    await expect(controller.getOne('1')).resolves.toEqual({ id: '1' });
  });

  it('comments delegates', async () => {
    feedback.listComments.mockResolvedValue({ items: [] });
    await expect(controller.comments('1')).resolves.toEqual({ items: [] });
    expect(feedback.listComments).toHaveBeenCalledWith('1');
  });

  it('patch delegates', async () => {
    feedback.updateStatus.mockResolvedValue({});
    const req = { session: { user: { id: 'u' } } } as never;
    await controller.patch('id', { status: 'triaged' }, req);
    expect(feedback.updateStatus).toHaveBeenCalledWith(
      'id',
      { status: 'triaged' },
      req,
    );
  });

  it('comment delegates', async () => {
    feedback.addComment.mockResolvedValue({ id: 'c' });
    const req = { session: { user: { id: 'u' } } } as never;
    await controller.comment('id', { body: 'hi' }, req);
    expect(feedback.addComment).toHaveBeenCalledWith('id', { body: 'hi' }, req);
  });
});
