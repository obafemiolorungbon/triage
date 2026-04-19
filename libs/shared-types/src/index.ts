import { z } from 'zod';

export const feedbackPrioritySchema = z.enum(['low', 'med', 'high', 'urgent']);
export type FeedbackPriority = z.infer<typeof feedbackPrioritySchema>;

export const feedbackSentimentSchema = z.enum(['negative', 'neutral', 'positive']);
export type FeedbackSentiment = z.infer<typeof feedbackSentimentSchema>;

export const feedbackStatusSchema = z.enum([
  'new',
  'triaged',
  'claimed',
  'in_progress',
  'resolved',
  'rejected',
]);
export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;

export const staffRoleSchema = z.enum(['admin', 'agent']);
export type StaffRole = z.infer<typeof staffRoleSchema>;

export const createFeedbackBodySchema = z.object({
  submitterEmail: z.string().email(),
  rawText: z.string().min(10).max(20_000),
});
export type CreateFeedbackBody = z.infer<typeof createFeedbackBodySchema>;

export const triageResultSchema = z.object({
  cleanedText: z.string(),
  category: z.string(),
  priority: feedbackPrioritySchema,
  sentiment: feedbackSentimentSchema,
  knowledgeGap: z.boolean(),
  suggestedTags: z.array(z.string()).default([]),
});
export type TriageResult = z.infer<typeof triageResultSchema>;

export const noiseFilterResultSchema = z.object({
  isNoise: z.boolean(),
  reason: z.string(),
});
export type NoiseFilterResult = z.infer<typeof noiseFilterResultSchema>;

export const feedbackListQuerySchema = z.object({
  status: feedbackStatusSchema.optional(),
  priority: feedbackPrioritySchema.optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  assignedMe: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  noiseOnly: z.coerce.boolean().optional(),
  knowledgeOnly: z.coerce.boolean().optional(),
});
export type FeedbackListQuery = z.infer<typeof feedbackListQuerySchema>;

export const addCommentBodySchema = z.object({
  body: z.string().min(1).max(10_000),
});
export type AddCommentBody = z.infer<typeof addCommentBodySchema>;
