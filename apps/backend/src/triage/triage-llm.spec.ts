import { noiseFilterResultSchema, triageResultSchema } from '@triage/shared-types';

describe('triage schemas', () => {
  it('parses noise filter output', () => {
    expect(
      noiseFilterResultSchema.parse({
        isNoise: false,
        reason: 'Actionable product feedback',
      }),
    ).toEqual({
      isNoise: false,
      reason: 'Actionable product feedback',
    });
  });

  it('parses triage output', () => {
    const v = triageResultSchema.parse({
      cleanedText: 'Hello',
      category: 'bugs',
      priority: 'high',
      sentiment: 'negative',
      knowledgeGap: true,
      suggestedTags: ['checkout'],
    });
    expect(v.priority).toBe('high');
  });
});
