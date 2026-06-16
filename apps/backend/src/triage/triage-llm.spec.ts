import {
  feedbackCategorySchema,
  noiseFilterResultSchema,
  triageResultSchema,
} from '@triage/shared-types';

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

  it('parses triage output with a bounded category', () => {
    const v = triageResultSchema.parse({
      cleanedText: 'Hello',
      category: 'bug',
      sentiment: 'negative',
      knowledgeGap: true,
      suggestedTags: ['checkout'],
    });
    expect(v.category).toBe('bug');
  });

  it('rejects categories outside the enum', () => {
    expect(() =>
      triageResultSchema.parse({
        cleanedText: 'x',
        category: 'not-a-real-category',
        sentiment: 'neutral',
        knowledgeGap: false,
        suggestedTags: [],
      }),
    ).toThrow();
    expect(feedbackCategorySchema.options).toContain('bug');
  });
});
