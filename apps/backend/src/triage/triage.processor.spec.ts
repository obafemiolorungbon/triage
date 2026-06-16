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
  const settings = {
    getWorkspace: jest.fn().mockResolvedValue({
      id: 'workspace-1',
      industry: '',
      autoCreateCritical: false,
      autoCreateProvider: 'linear',
    }),
    getCompanyPromptContext: jest.fn().mockResolvedValue('Company: Triage'),
  };
  const escalation = {
    evaluate: jest.fn().mockResolvedValue({
      escalationTier: 'none',
      escalationReason: null,
    }),
  };
  const externalIssues = {
    createForFeedback: jest.fn().mockResolvedValue(undefined),
  };
  const indexQueue = {
    add: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    processor = new TriageProcessor(
      prisma.service as never,
      ai as never,
      notifications as never,
      settings as never,
      escalation as never,
      externalIssues as never,
      indexQueue as never,
    );
  });

  const job = (feedbackId: string) =>
    ({ data: { feedbackId } }) as Parameters<TriageProcessor['process']>[0];

  it('returns early when feedback is missing', async () => {
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(null);
    await processor.process(job('missing'));
    expect(indexQueue.add).not.toHaveBeenCalled();
  });

  it('indexes the deterministic fallback after triage completes', async () => {
    ai.isEnabled.mockReturnValue(false);
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue({
      id: 'f1',
      rawText: 'hello',
      submitterEmail: 'e@e.com',
      metadata: null,
      userContext: null,
    });
    prisma.client.feedback.update = jest.fn().mockResolvedValue({});

    await processor.process(job('f1'));

    expect(prisma.client.feedback.update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: expect.objectContaining({
        status: 'triaged',
        category: 'other',
        sentiment: 'neutral',
      }),
    });
    expect(indexQueue.add).toHaveBeenCalledWith(
      'index-feedback',
      { feedbackId: 'f1' },
      expect.objectContaining({
        attempts: 4,
        backoff: { type: 'exponential', delay: 2_000 },
      }),
    );
  });

  it('runs AI triage then queues indexing', async () => {
    ai.isEnabled.mockReturnValue(true);
    ai.getIndustryContext.mockReturnValue('support');
    ai.triageTicket.mockResolvedValue({
      cleanedText: 'clean',
      category: 'bug',
      priority: 'high',
      sentiment: 'negative',
      knowledgeGap: true,
      suggestedTags: ['payments'],
    });
    escalation.evaluate.mockResolvedValue({
      escalationTier: 'critical',
      escalationReason: 'Many affected users',
    });
    settings.getWorkspace.mockResolvedValue({
      id: 'workspace-1',
      industry: '',
      autoCreateCritical: false,
      autoCreateProvider: 'linear',
    });
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue({
      id: 'f1',
      rawText: 'raw',
      submitterEmail: 'u@u.com',
      metadata: null,
      userContext: null,
    });
    prisma.client.user.findMany = jest.fn().mockResolvedValue([]);

    await processor.process(job('f1'));

    expect(prisma.client.$transaction).toHaveBeenCalled();
    expect(notifications.notifyFeedbackTriaged).toHaveBeenCalledWith({
      to: 'u@u.com',
      feedbackId: 'f1',
      category: 'bug',
      escalationTier: 'critical',
    });
    expect(indexQueue.add).toHaveBeenCalledTimes(1);
  });

  it('does not queue indexing when triage fails', async () => {
    ai.isEnabled.mockReturnValue(true);
    ai.triageTicket.mockRejectedValue(new Error('boom'));
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue({
      id: 'f1',
      rawText: 'raw',
      submitterEmail: 'u@u.com',
      metadata: null,
      userContext: null,
    });
    await expect(processor.process(job('f1'))).rejects.toThrow('boom');
    expect(indexQueue.add).not.toHaveBeenCalled();
  });
});
