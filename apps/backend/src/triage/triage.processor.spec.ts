import { TriageProcessor } from './triage.processor';
import { createPrismaMock } from '../test/prisma.mock';

describe('TriageProcessor', () => {
  let processor: TriageProcessor;
  let prisma: ReturnType<typeof createPrismaMock>;
  const ai = {
    isEnabled: jest.fn(),
    getIndustryContext: jest.fn(),
    triageTicket: jest.fn(),
    getMainModelName: jest.fn().mockReturnValue('openai/gpt-4o'),
  };
  const notifications = {
    notifyFeedbackTriaged: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    processor = new TriageProcessor(
      prisma.service as never,
      ai as never,
      notifications as never,
    );
  });

  const job = (feedbackId: string) =>
    ({ data: { feedbackId } }) as Parameters<TriageProcessor['process']>[0];

  it('returns early when feedback missing', async () => {
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(null);
    await processor.process(job('missing'));
    expect(notifications.notifyFeedbackTriaged).not.toHaveBeenCalled();
  });

  it('applies fallback when AI disabled', async () => {
    ai.isEnabled.mockReturnValue(false);
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue({
      id: 'f1',
      rawText: 'hello',
      submitterEmail: 'e@e.com',
    });
    prisma.client.feedback.update = jest.fn().mockResolvedValue({});
    await processor.process(job('f1'));
    expect(prisma.client.feedback.update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: expect.objectContaining({
        status: 'triaged',
        category: 'other',
        priority: 'low',
        sentiment: 'neutral',
      }),
    });
    expect(notifications.notifyFeedbackTriaged).toHaveBeenCalledWith({
      to: 'e@e.com',
      feedbackId: 'f1',
      category: 'other',
      priority: 'low',
    });
  });

  it('stores null industryContext when AI returns empty context', async () => {
    ai.isEnabled.mockReturnValue(true);
    ai.getIndustryContext.mockReturnValue('');
    ai.triageTicket.mockResolvedValue({
      cleanedText: 'clean',
      category: 'other',
      priority: 'low',
      sentiment: 'neutral',
      knowledgeGap: false,
      suggestedTags: [],
    });
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue({
      id: 'f1',
      rawText: 'raw',
      submitterEmail: 'u@u.com',
    });
    prisma.client.user.findMany = jest.fn().mockResolvedValue([]);
    prisma.client.notification.create = jest.fn().mockResolvedValue({});
    await processor.process(job('f1'));
    expect(prisma.client.feedbackTriageRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        industryContext: null,
      }),
    });
  });

  it('runs full triage when AI enabled', async () => {
    ai.isEnabled.mockReturnValue(true);
    ai.getIndustryContext.mockReturnValue('ctx');
    ai.triageTicket.mockResolvedValue({
      cleanedText: 'clean',
      category: 'bug',
      priority: 'high',
      sentiment: 'negative',
      knowledgeGap: true,
      suggestedTags: ['a'],
    });
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue({
      id: 'f1',
      rawText: 'raw',
      submitterEmail: 'u@u.com',
    });
    prisma.client.user.findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'admin1' }]);
    prisma.client.notification.create = jest.fn().mockResolvedValue({});
    await processor.process(job('f1'));
    expect(prisma.client.$transaction).toHaveBeenCalled();
    expect(notifications.notifyFeedbackTriaged).toHaveBeenCalledWith({
      to: 'u@u.com',
      feedbackId: 'f1',
      category: 'bug',
      priority: 'high',
    });
    expect(prisma.client.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'admin1',
        title: 'Feedback triaged',
      }),
    });
  });

  it('rethrows when triage fails', async () => {
    ai.isEnabled.mockReturnValue(true);
    ai.triageTicket.mockRejectedValue(new Error('boom'));
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue({
      id: 'f1',
      rawText: 'raw',
      submitterEmail: 'u@u.com',
    });
    await expect(processor.process(job('f1'))).rejects.toThrow('boom');
  });
});
