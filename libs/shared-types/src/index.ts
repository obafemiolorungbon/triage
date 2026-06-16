import { z } from 'zod';

export const escalationTierSchema = z.enum([
  'none',
  'watch',
  'expedite',
  'critical',
]);
export type EscalationTier = z.infer<typeof escalationTierSchema>;

export const externalIssueProviderSchema = z.enum(['linear', 'jira']);
export type ExternalIssueProvider = z.infer<typeof externalIssueProviderSchema>;

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

export const widgetSubmissionTypeSchema = z.enum([
  'bug',
  'idea',
  'question',
  'praise',
  'custom',
]);
export type WidgetSubmissionType = z.infer<typeof widgetSubmissionTypeSchema>;

export const surveyModeSchema = z.enum(['none', 'csat', 'nps', 'thumbs']);
export type SurveyMode = z.infer<typeof surveyModeSchema>;

export const surveyScaleSchema = z.enum(['csat_5', 'nps_10', 'thumbs']);
export type SurveyScale = z.infer<typeof surveyScaleSchema>;

export const feedbackSeveritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
]);
export type FeedbackSeverity = z.infer<typeof feedbackSeveritySchema>;

export const deflectionOutcomeSchema = z.enum([
  'searched',
  'answered',
  'solved',
  'submitted',
  'abandoned',
]);
export type DeflectionOutcome = z.infer<typeof deflectionOutcomeSchema>;

export const widgetFieldKindSchema = z.enum([
  'text',
  'textarea',
  'email',
  'url',
  'number',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'rating',
  'file',
]);
export type WidgetFieldKind = z.infer<typeof widgetFieldKindSchema>;

export const widgetFieldTargetSchema = z.enum([
  'user',
  'metadata',
  'message',
  'title',
  'category',
  'severity',
]);
export type WidgetFieldTarget = z.infer<typeof widgetFieldTargetSchema>;

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
  widgetId: z.string().optional(),
  submissionType: widgetSubmissionTypeSchema.optional(),
  severity: feedbackSeveritySchema.optional(),
  userContext: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  consent: z.unknown().optional(),
  source: z
    .object({
      url: z.string().url().optional(),
      title: z.string().max(500).optional(),
    })
    .optional(),
});
export type CreateTicketBody = z.infer<typeof createTicketBodySchema>;

export const patchTicketBodySchema = z.object({
  status: feedbackStatusSchema,
});
export type PatchTicketBody = z.infer<typeof patchTicketBodySchema>;

export const triageResultSchema = z.object({
  cleanedText: z.string(),
  category: feedbackCategorySchema,
  sentiment: feedbackSentimentSchema,
  knowledgeGap: z.boolean(),
  suggestedTags: z.array(z.string()).default([]),
  issueTitle: z.string().max(180).optional(),
  issueBody: z.string().optional(),
});
export type TriageResult = z.infer<typeof triageResultSchema>;

export const noiseFilterResultSchema = z.object({
  isNoise: z.boolean(),
  reason: z.string(),
});
export type NoiseFilterResult = z.infer<typeof noiseFilterResultSchema>;

export const feedbackListQuerySchema = z.object({
  status: feedbackStatusSchema.optional(),
  escalationTier: escalationTierSchema.optional(),
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

export const widgetUserSchema = z.record(z.unknown()).optional();
export const widgetMetadataSchema = z.record(z.unknown()).optional();

export const widgetFieldSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(160),
  kind: widgetFieldKindSchema,
  required: z.boolean().default(false),
  placeholder: z.string().max(300).optional().nullable(),
  helpText: z.string().max(500).optional().nullable(),
  validation: z.unknown().optional().nullable(),
  options: z.unknown().optional().nullable(),
  visibleWhen: z.unknown().optional().nullable(),
  target: widgetFieldTargetSchema.default('metadata'),
  order: z.number().int().min(0).default(0),
});
export type WidgetFieldInput = z.infer<typeof widgetFieldSchema>;

export const widgetVariantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
  weight: z.number().int().min(0).max(100).default(100),
  brandColor: z.string().max(40).optional().nullable(),
  launcherLabel: z.string().max(80).optional().nullable(),
  enabled: z.boolean().default(true),
});
export type WidgetVariantInput = z.infer<typeof widgetVariantSchema>;

export const widgetSuccessAnimationSchema = z.enum([
  'none',
  'check',
  'thumbs-up',
]);
export type WidgetSuccessAnimation = z.infer<
  typeof widgetSuccessAnimationSchema
>;

export const widgetThemeSchema = z.object({
  logoUrl: z.string().url().optional().nullable(),
  surfaceColor: z.string().min(3).max(40).default('#0A0A0B'),
  textColor: z.string().min(3).max(40).default('#FAF7F1'),
  fontFamily: z.string().min(1).max(160).default('system'),
  borderRadius: z.string().min(1).max(40).default('18px'),
  shadow: z.string().min(1).max(80).default('soft'),
  launcherIcon: z.string().min(1).max(300).default('message-circle'),
  launcherLabel: z.string().min(1).max(80).default('Feedback'),
  darkMode: z.enum(['auto', 'light', 'dark']).default('auto'),
  poweredBy: z.boolean().default(true),
  successAnimation: widgetSuccessAnimationSchema.default('check'),
  customCss: z.string().max(10_000).optional().nullable(),
});
export type WidgetThemeInput = z.infer<typeof widgetThemeSchema>;

export const widgetSurveySubmissionSchema = z.object({
  score: z.number().int().min(0).max(10),
  scale: surveyScaleSchema,
  comment: z.string().max(2_000).optional(),
});
export type WidgetSurveySubmission = z.infer<
  typeof widgetSurveySubmissionSchema
>;

export const widgetAttachmentSubmissionSchema = z.object({
  storageKey: z.string().min(1).max(1_000),
  mimeType: z.string().min(1).max(200),
  fileName: z.string().max(500).optional(),
  sizeBytes: z.number().int().positive().max(50_000_000),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type WidgetAttachmentSubmission = z.infer<
  typeof widgetAttachmentSubmissionSchema
>;

export const widgetUploadUrlBodySchema = z.object({
  widgetKey: z.string().min(1),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive().max(50_000_000),
});
export type WidgetUploadUrlBody = z.infer<typeof widgetUploadUrlBodySchema>;

export const widgetFeedbackBodySchema = z.object({
  widgetKey: z.string().min(1),
  type: widgetSubmissionTypeSchema.optional(),
  title: z.string().max(500).optional(),
  message: z.string().min(10).max(20_000).optional(),
  fields: z.record(z.unknown()).optional(),
  user: widgetUserSchema,
  metadata: widgetMetadataSchema,
  userHash: z.string().max(256).optional(),
  website: z.string().max(500).optional(),
  consentAccepted: z.boolean().optional(),
  source: z
    .object({
      url: z.string().url().optional(),
      title: z.string().max(500).optional(),
    })
    .optional(),
  attachments: z.array(widgetAttachmentSubmissionSchema).default([]),
  survey: widgetSurveySubmissionSchema.optional(),
});
export type WidgetFeedbackBody = z.infer<typeof widgetFeedbackBodySchema>;

export const widgetSurveyBodySchema = z.object({
  widgetKey: z.string().min(1),
  feedbackId: z.string().optional(),
  survey: widgetSurveySubmissionSchema,
});
export type WidgetSurveyBody = z.infer<typeof widgetSurveyBodySchema>;

export const escalationOperatorSchema = z.enum([
  'equals',
  'contains',
  'exists',
  'numeric_gte',
]);
export type EscalationOperator = z.infer<typeof escalationOperatorSchema>;

export const escalationRuleSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(120),
  field: z.string().min(1).max(120),
  operator: escalationOperatorSchema,
  value: z.string().optional(),
  tier: escalationTierSchema,
  reason: z.string().min(1).max(500),
  enabled: z.boolean().default(true),
});
export type EscalationRuleInput = z.infer<typeof escalationRuleSchema>;

export const workspaceConfigSchema = z.object({
  companyName: z.string().min(1).max(160),
  productDescription: z.string().max(5_000).default(''),
  industry: z.string().max(300).default('general SaaS'),
  supportContext: z.string().max(10_000).default(''),
  escalationGuidance: z.string().max(10_000).default(''),
  aiContextNotes: z.string().max(10_000).default(''),
  autoCreateCritical: z.boolean().default(false),
  autoCreateProvider: externalIssueProviderSchema.default('linear'),
});
export type WorkspaceConfigInput = z.infer<typeof workspaceConfigSchema>;

export const widgetConfigSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  allowedOrigins: z.array(z.string().min(1).max(300)).default([]),
  devMode: z.boolean().default(false),
  identityVerificationRequired: z.boolean().default(false),
  rateLimitPerMinute: z.number().int().min(1).max(1_000).default(30),
  configRateLimitPerMinute: z.number().int().min(1).max(5_000).default(120),
  requireConsent: z.boolean().default(false),
  privacyPolicyUrl: z.string().url().optional().nullable(),
  consentText: z
    .string()
    .min(1)
    .max(500)
    .default('I agree to be contacted about this feedback.'),
  brandColor: z.string().min(3).max(40),
  accentColor: z.string().min(3).max(40),
  position: z.string().min(1).max(80),
  size: z.string().min(1).max(40),
  title: z.string().min(1).max(160),
  description: z.string().max(500),
  successMessage: z.string().min(1).max(300),
  enabledUserFields: z.array(z.string().min(1)).default([]),
  requiredUserFields: z.array(z.string().min(1)).default([]),
  enabledMetadataKeys: z.array(z.string().min(1)).default([]),
  maxAttachmentBytes: z
    .number()
    .int()
    .positive()
    .max(50_000_000)
    .default(10_485_760),
  allowedMimeTypes: z
    .array(z.string().min(1).max(200))
    .default(['image/png', 'image/jpeg', 'image/webp']),
  maxAttachmentsPerSubmit: z.number().int().min(0).max(10).default(3),
  enabledTypes: z
    .array(widgetSubmissionTypeSchema)
    .default(['bug', 'idea', 'question']),
  surveyMode: surveyModeSchema.default('none'),
  fields: z.array(widgetFieldSchema).default([]),
  variants: z.array(widgetVariantSchema).default([]),
  theme: widgetThemeSchema.partial().optional(),
  pageRules: z.unknown().optional().nullable(),
  audienceRules: z.unknown().optional().nullable(),
  triggerConfig: z.unknown().optional().nullable(),
  inlineEnabled: z.boolean().default(true),
});
export type WidgetConfigInput = z.infer<typeof widgetConfigSchema>;

export const createWidgetSchema = widgetConfigSchema.extend({
  name: z.string().min(1).max(120),
});
export type CreateWidgetInput = z.infer<typeof createWidgetSchema>;

export const patchWidgetSchema = widgetConfigSchema.partial().extend({
  archivedAt: z.string().datetime().nullable().optional(),
});
export type PatchWidgetInput = z.infer<typeof patchWidgetSchema>;

export const externalIssueCreateBodySchema = z.object({
  provider: externalIssueProviderSchema,
});
export type ExternalIssueCreateBody = z.infer<
  typeof externalIssueCreateBodySchema
>;

export const kbArticleBodySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a URL-safe slug'),
  title: z.string().min(1).max(220),
  body: z.string().min(20).max(100_000),
  published: z.boolean().default(false),
});
export type KbArticleBody = z.infer<typeof kbArticleBodySchema>;

export const kbImportProviderSchema = z.enum([
  'zendesk',
  'intercom',
  'freshdesk',
]);
export type KbImportProvider = z.infer<typeof kbImportProviderSchema>;

export const kbImportBodySchema = z.object({
  provider: kbImportProviderSchema,
  payload: z.unknown(),
});
export type KbImportBody = z.infer<typeof kbImportBodySchema>;

export const kbImportPreviewItemSchema = z.object({
  index: z.number(),
  valid: z.boolean(),
  action: z.enum(['create', 'update', 'skip']),
  slug: z.string().optional(),
  title: z.string().optional(),
  published: z.boolean().optional(),
  sourceId: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourceLocale: z.string().optional(),
  sourcePath: z.string().optional(),
  error: z.string().optional(),
});
export type KbImportPreviewItem = z.infer<typeof kbImportPreviewItemSchema>;

export const kbImportResultSchema = z.object({
  provider: kbImportProviderSchema,
  total: z.number(),
  valid: z.number(),
  skipped: z.number(),
  creates: z.number(),
  updates: z.number(),
  imported: z.number().optional(),
  items: z.array(kbImportPreviewItemSchema),
});
export type KbImportResult = z.infer<typeof kbImportResultSchema>;

export const kbSearchBodySchema = z.object({
  widgetKey: z.string().min(1),
  query: z.string().min(3).max(2_000),
  limit: z.number().int().min(1).max(5).default(3),
  metadata: z.record(z.unknown()).optional(),
});
export type KbSearchBody = z.infer<typeof kbSearchBodySchema>;

export const kbAnswerBodySchema = kbSearchBodySchema.extend({
  limit: z.number().int().min(1).max(5).default(3),
});
export type KbAnswerBody = z.infer<typeof kbAnswerBodySchema>;

export const deflectionEventBodySchema = z.object({
  widgetKey: z.string().min(1),
  query: z.string().min(1).max(2_000),
  outcome: deflectionOutcomeSchema,
  articleId: z.string().optional(),
  score: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type DeflectionEventBody = z.infer<typeof deflectionEventBodySchema>;

export const assistantMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(20_000),
  createdAt: z.string().optional(),
});
export type AssistantMessage = z.infer<typeof assistantMessageSchema>;

export const assistantSourceSchema = z.object({
  type: z.enum([
    'ticket',
    'comment',
    'triage_run',
    'kb_article',
    'kb_chunk',
    'deflection',
    'analytics',
    'external_issue',
    'widget',
    'survey',
  ]),
  id: z.string(),
  citationKey: z
    .string()
    .regex(/^S\d+$/)
    .optional(),
  label: z.string(),
  href: z.string().optional(),
  excerpt: z.string().optional(),
  score: z.number().optional(),
  lexicalScore: z.number().optional(),
  vectorScore: z.number().optional(),
});
export type AssistantSource = z.infer<typeof assistantSourceSchema>;

export const assistantToolCallSchema = z.object({
  name: z.string(),
  status: z.enum(['completed', 'skipped', 'failed']),
  input: z.unknown().optional(),
  summary: z.string().optional(),
  sourceCount: z.number().int().min(0).optional(),
  durationMs: z.number().int().min(0).optional(),
  step: z.number().int().min(1).optional(),
});
export type AssistantToolCall = z.infer<typeof assistantToolCallSchema>;

export const assistantStopReasonSchema = z.enum([
  'answered',
  'no_evidence',
  'step_limit',
  'tool_call_limit',
  'duplicate_tool_call',
  'timeout',
  'tool_failure',
  'model_failure',
  'read_only_refusal',
  'not_configured',
]);
export type AssistantStopReason = z.infer<typeof assistantStopReasonSchema>;

export const assistantStepTraceSchema = z.object({
  step: z.number().int().min(1),
  finishReason: z.string(),
  toolCalls: z.array(assistantToolCallSchema),
  sourceIds: z.array(z.string()),
  durationMs: z.number().int().min(0),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
});
export type AssistantStepTrace = z.infer<typeof assistantStepTraceSchema>;

export const assistantQueryBodySchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  history: z.array(assistantMessageSchema).max(20).optional(),
  maxToolCalls: z.number().int().min(1).max(6).default(6),
});
export type AssistantQueryBody = z.infer<typeof assistantQueryBodySchema>;

export const assistantQueryResponseSchema = z.object({
  runId: z.string(),
  answer: z.string(),
  messages: z.array(assistantMessageSchema),
  sources: z.array(assistantSourceSchema),
  toolCalls: z.array(assistantToolCallSchema),
  steps: z.array(assistantStepTraceSchema),
  stopReason: assistantStopReasonSchema,
  durationMs: z.number().int().min(0),
  usage: z
    .object({
      inputTokens: z.number().int().min(0).optional(),
      outputTokens: z.number().int().min(0).optional(),
      totalTokens: z.number().int().min(0).optional(),
    })
    .optional(),
  suggestedQuestions: z.array(z.string()),
});
export type AssistantQueryResponse = z.infer<
  typeof assistantQueryResponseSchema
>;
