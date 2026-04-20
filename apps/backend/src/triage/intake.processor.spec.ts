import { IntakeProcessor } from './intake.processor';
import { createPrismaMock } from '../test/prisma.mock';

describe('IntakeProcessor', () => {
  let processor: IntakeProcessor;
  let prisma: ReturnType<typeof createPrismaMock>;
  const ai = { isEnabled: jest.fn(), classifySpam: jest.fn() };
  const triageAdd = jest.fn().mockResolvedValue(undefined);
  const triageQueue = { add: triageAdd };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    processor = new IntakeProcessor(
      prisma.service as never,
      ai as never,
      triageQueue as never,
    );
  });

  const job = (feedbackId: string) =>
    ({ data: { feedbackId } }) as Parameters<IntakeProcessor['process']>[0];

  it('returns early when feedback missing', async () => {
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue(null);
    await processor.process(job('x'));
    expect(triageAdd).not.toHaveBeenCalled();
  });

  it('forwards to triage when AI disabled', async () => {
    ai.isEnabled.mockReturnValue(false);
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue({
      id: 'f1',
      rawText: 'text',
    });
    await processor.process(job('f1'));
    expect(triageAdd).toHaveBeenCalledWith('triage', { feedbackId: 'f1' });
  });

  it('marks spam and does not enqueue triage', async () => {
    ai.isEnabled.mockReturnValue(true);
    ai.classifySpam.mockResolvedValue({ isNoise: true, reason: 'spam' });
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue({
      id: 'f1',
      rawText: 'buy pills',
    });
    prisma.client.feedback.update = jest.fn().mockResolvedValue({});
    await processor.process(job('f1'));
    expect(prisma.client.feedback.update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: expect.objectContaining({
        status: 'rejected',
        isNoise: true,
      }),
    });
    expect(triageAdd).not.toHaveBeenCalled();
  });

  it('enqueues triage when not noise', async () => {
    ai.isEnabled.mockReturnValue(true);
    ai.classifySpam.mockResolvedValue({ isNoise: false, reason: 'ok' });
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue({
      id: 'f1',
      rawText: 'bug',
    });
    await processor.process(job('f1'));
    expect(triageAdd).toHaveBeenCalledWith('triage', { feedbackId: 'f1' });
  });

  it('rethrows on classify failure', async () => {
    ai.isEnabled.mockReturnValue(true);
    ai.classifySpam.mockRejectedValue(new Error('fail'));
    prisma.client.feedback.findUnique = jest.fn().mockResolvedValue({
      id: 'f1',
      rawText: 'x',
    });
    await expect(processor.process(job('f1'))).rejects.toThrow('fail');
  });
});
