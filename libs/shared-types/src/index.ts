import { z } from 'zod';

export const feedbackPrioritySchema = z.enum(['low', 'med', 'high', 'urgent']);
export type FeedbackPriority = z.infer<typeof feedbackPrioritySchema>;

export const feedbackSentimentSchema = z.enum([
  'negative',
  'neutral',
  'positive',
]);
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

/**
 * Bounded set of categories the triage model is allowed to emit. Keep in sync
 * with the prompt in `apps/backend/src/ai/prompts.ts` and any UI filters.
 */
export const feedbackCategorySchema = z.enum([
  'bug',
  'feature_request',
  'billing',
  'account',
  'performance',
  'security',
  'how_to',
  'other',
]);
export type FeedbackCategory = z.infer<typeof feedbackCategorySchema>;

export const createTicketBodySchema = z.object({
  customer_email: z.string().email(),
  description: z.string().min(10).max(20_000),
  title: z.string().max(500).optional(),
});
export type CreateTicketBody = z.infer<typeof createTicketBodySchema>;

export const patchTicketBodySchema = z.object({
  status: feedbackStatusSchema,
});
export type PatchTicketBody = z.infer<typeof patchTicketBodySchema>;

export const triageResultSchema = z.object({
  cleanedText: z.string(),
  category: feedbackCategorySchema,
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
