import {
  analyzeFeedbackInputSchema,
  searchDeflectionsInputSchema,
  searchFeedbackInputSchema,
  searchKnowledgeInputSchema,
} from './assistant-tool-schemas';

describe('assistant tool schemas', () => {
  it('applies bounded defaults to search tools', () => {
    expect(
      searchFeedbackInputSchema.parse({ query: 'payments' }),
    ).toMatchObject({
      order: 'relevance',
      limit: 8,
    });
    expect(searchKnowledgeInputSchema.parse({ query: 'refunds' }).limit).toBe(
      5,
    );
    expect(searchDeflectionsInputSchema.parse({})).toMatchObject({
      outcomes: ['submitted', 'abandoned'],
      limit: 8,
    });
  });

  it('limits analytics to two controlled groupings', () => {
    expect(
      analyzeFeedbackInputSchema.safeParse({
        groupBy: ['status', 'category', 'sentiment'],
      }).success,
    ).toBe(false);
    expect(
      analyzeFeedbackInputSchema.parse({ groupBy: ['week', 'severity'] }),
    ).toMatchObject({ groupBy: ['week', 'severity'] });
  });

  it('rejects invalid dates and oversized result requests', () => {
    expect(
      searchFeedbackInputSchema.safeParse({
        dateFrom: 'last week',
        limit: 100,
      }).success,
    ).toBe(false);
  });

  it('accepts a bounded relative recency filter', () => {
    expect(searchFeedbackInputSchema.parse({ withinDays: 7 })).toMatchObject({
      withinDays: 7,
    });
    expect(
      searchFeedbackInputSchema.safeParse({ withinDays: 366 }).success,
    ).toBe(false);
  });

  it('supports natural unresolved and calendar-period filters', () => {
    expect(
      analyzeFeedbackInputSchema.parse({
        resolution: 'open',
        period: 'this_week',
        groupBy: ['category'],
      }),
    ).toMatchObject({
      resolution: 'open',
      period: 'this_week',
      groupBy: ['category'],
    });
  });
});
