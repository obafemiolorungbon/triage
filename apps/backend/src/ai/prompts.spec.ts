import { spamPrompt, triagePrompt } from './prompts';

describe('prompts', () => {
  it('spamPrompt includes raw text', () => {
    expect(spamPrompt('hello world')).toContain('hello world');
    expect(spamPrompt('hello world')).toContain('spam/noise');
  });

  it('triagePrompt includes industry and feedback', () => {
    const p = triagePrompt('ticket body', { industryContext: 'payments' });
    expect(p).toContain('payments');
    expect(p).toContain('ticket body');
    expect(p).toContain('category');
  });

  it('triagePrompt falls back industry when empty', () => {
    const p = triagePrompt('x', { industryContext: '  ' });
    expect(p).toContain('general SaaS');
  });
});
