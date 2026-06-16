import { z } from 'zod';

const optionalDate = z.string().datetime().optional();
const limit = (max: number, fallback: number) =>
  z.number().int().min(1).max(max).default(fallback);

export const feedbackFilterSchema = z.object({
  status: z
    .enum(['new', 'triaged', 'claimed', 'in_progress', 'resolved', 'rejected'])
    .optional(),
  resolution: z
    .enum(['open', 'closed'])
    .optional()
    .describe(
      'Use open for unresolved/current work and closed for resolved or rejected feedback.',
    ),
  sentiment: z.enum(['negative', 'neutral', 'positive']).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  escalationTier: z.enum(['none', 'watch', 'expedite', 'critical']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  submissionType: z
    .enum(['bug', 'idea', 'question', 'praise', 'custom'])
    .optional(),
  knowledgeGap: z.boolean().optional(),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  withinDays: z.number().int().min(1).max(365).optional(),
  period: z
    .enum(['today', 'this_week', 'last_7_days', 'this_month'])
    .optional()
    .describe(
      'Calendar-aware shortcut for relative dates. Prefer this over calculating dates.',
    ),
});

export const searchFeedbackInputSchema = feedbackFilterSchema.extend({
  query: z.string().trim().min(1).max(2_000).optional(),
  order: z.enum(['relevance', 'newest']).default('relevance'),
  limit: limit(12, 8),
});
export type SearchFeedbackInput = z.infer<typeof searchFeedbackInputSchema>;

export const getFeedbackDetailsInputSchema = z.object({
  feedbackId: z.string().trim().min(1).max(120),
});
export type GetFeedbackDetailsInput = z.infer<
  typeof getFeedbackDetailsInputSchema
>;

export const feedbackGroupingSchema = z.enum([
  'status',
  'category',
  'escalation',
  'sentiment',
  'severity',
  'submissionType',
  'day',
  'week',
]);

export const analyzeFeedbackInputSchema = feedbackFilterSchema.extend({
  groupBy: z.array(feedbackGroupingSchema).max(2).default([]),
});
export type AnalyzeFeedbackInput = z.infer<typeof analyzeFeedbackInputSchema>;

export const searchKnowledgeInputSchema = z.object({
  query: z.string().trim().min(1).max(2_000),
  limit: limit(8, 5),
});
export type SearchKnowledgeInput = z.infer<typeof searchKnowledgeInputSchema>;

export const searchDeflectionsInputSchema = z.object({
  query: z.string().trim().min(1).max(2_000).optional(),
  outcomes: z
    .array(z.enum(['searched', 'answered', 'solved', 'submitted', 'abandoned']))
    .min(1)
    .max(5)
    .default(['submitted', 'abandoned']),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  limit: limit(12, 8),
});
export type SearchDeflectionsInput = z.infer<
  typeof searchDeflectionsInputSchema
>;
