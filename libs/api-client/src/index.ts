import { z } from 'zod';

const ticketSchema = z.object({
  id: z.string(),
  shortId: z.string(),
  widgetId: z.string().nullable().optional(),
  submitterEmail: z.string(),
  rawText: z.string(),
  cleanedText: z.string().nullable(),
  submissionType: z
    .enum(['bug', 'idea', 'question', 'praise', 'custom'])
    .nullable()
    .optional(),
  category: z.string().nullable(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).nullable().optional(),
  escalationTier: z.enum(['none', 'watch', 'expedite', 'critical']),
  escalationReason: z.string().nullable(),
  sentiment: z.enum(['negative', 'neutral', 'positive']).nullable(),
  status: z.enum([
    'new',
    'triaged',
    'claimed',
    'in_progress',
    'resolved',
    'rejected',
  ]),
  isNoise: z.boolean(),
  knowledgeGap: z.boolean(),
  userContext: z.unknown().nullable().optional(),
  metadata: z.unknown().nullable().optional(),
  consent: z.unknown().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  sourceTitle: z.string().nullable().optional(),
  assignedAgentId: z.string().nullable(),
  createdAt: z.string(),
  triagedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  externalIssueLinks: z
    .array(
      z.object({
        id: z.string(),
        provider: z.enum(['linear', 'jira']),
        externalId: z.string(),
        externalKey: z.string().nullable(),
        externalUrl: z.string(),
        creationMode: z.enum(['manual', 'automatic']),
        createdAt: z.string(),
      }),
    )
    .optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        feedbackId: z.string(),
        widgetId: z.string(),
        kind: z.enum(['image']),
        mimeType: z.string(),
        fileName: z.string().nullable(),
        sizeBytes: z.number(),
        storageKey: z.string(),
        width: z.number().nullable(),
        height: z.number().nullable(),
        createdAt: z.string(),
      }),
    )
    .optional(),
});

/** Single ticket row - same shape as API `Feedback` JSON. */
export type TicketDto = z.infer<typeof ticketSchema>;
export type TicketStatus = TicketDto['status'];
export type EscalationTier = TicketDto['escalationTier'];
export type ExternalIssueProvider = 'linear' | 'jira';

const ticketCommentSchema = z.object({
  id: z.string(),
  feedbackId: z.string(),
  authorId: z.string(),
  body: z.string(),
  createdAt: z.string(),
  author: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    })
    .optional(),
});

export type TicketCommentDto = z.infer<typeof ticketCommentSchema>;

const ticketCommentsResponseSchema = z.object({
  items: z.array(ticketCommentSchema),
});

const listResponseSchema = z.object({
  items: z.array(ticketSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type TicketListResponse = z.infer<typeof listResponseSchema>;

const ticketStatsResponseSchema = z.object({
  total: z.number(),
  byStatus: z.object({
    new: z.number(),
    triaged: z.number(),
    claimed: z.number(),
    in_progress: z.number(),
    resolved: z.number(),
    rejected: z.number(),
  }),
});

export type TicketStatsResponse = z.infer<typeof ticketStatsResponseSchema>;

const similarResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      score: z.number(),
    }),
  ),
});

const widgetSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  widgetKey: z.string(),
  widgetSecret: z.string(),
  archivedAt: z.string().nullable(),
  allowedOrigins: z.array(z.string()),
  devMode: z.boolean(),
  identityVerificationRequired: z.boolean(),
  rateLimitPerMinute: z.number(),
  configRateLimitPerMinute: z.number(),
  requireConsent: z.boolean(),
  privacyPolicyUrl: z.string().nullable().optional(),
  consentText: z.string(),
  brandColor: z.string(),
  accentColor: z.string(),
  position: z.string(),
  size: z.string(),
  title: z.string(),
  description: z.string(),
  successMessage: z.string(),
  enabledUserFields: z.array(z.string()),
  requiredUserFields: z.array(z.string()),
  enabledMetadataKeys: z.array(z.string()),
  maxAttachmentBytes: z.number(),
  allowedMimeTypes: z.array(z.string()),
  maxAttachmentsPerSubmit: z.number(),
  enabledTypes: z.array(
    z.enum(['bug', 'idea', 'question', 'praise', 'custom']),
  ),
  surveyMode: z.enum(['none', 'csat', 'nps', 'thumbs']),
  pageRules: z.unknown().nullable().optional(),
  audienceRules: z.unknown().nullable().optional(),
  triggerConfig: z.unknown().nullable().optional(),
  inlineEnabled: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  theme: z
    .object({
      id: z.string().optional(),
      widgetId: z.string().optional(),
      logoUrl: z.string().nullable().optional(),
      surfaceColor: z.string(),
      textColor: z.string(),
      fontFamily: z.string(),
      borderRadius: z.string(),
      shadow: z.string(),
      launcherIcon: z.string(),
      launcherLabel: z.string(),
      darkMode: z.string(),
      poweredBy: z.boolean(),
      successAnimation: z.enum(['none', 'check', 'thumbs-up']).optional(),
      customCss: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    })
    .nullable()
    .optional(),
  fields: z
    .array(
      z.object({
        id: z.string(),
        widgetId: z.string(),
        key: z.string(),
        label: z.string(),
        kind: z.enum([
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
        ]),
        required: z.boolean(),
        placeholder: z.string().nullable(),
        helpText: z.string().nullable(),
        validation: z.unknown().nullable(),
        options: z.unknown().nullable(),
        visibleWhen: z.unknown().nullable(),
        target: z.enum([
          'user',
          'metadata',
          'message',
          'title',
          'category',
          'severity',
        ]),
        order: z.number(),
        createdAt: z.string(),
        updatedAt: z.string(),
      }),
    )
    .optional(),
  variants: z
    .array(
      z.object({
        id: z.string(),
        widgetId: z.string(),
        name: z.string(),
        weight: z.number(),
        brandColor: z.string().nullable(),
        launcherLabel: z.string().nullable(),
        enabled: z.boolean(),
        createdAt: z.string(),
        updatedAt: z.string(),
      }),
    )
    .optional(),
});

export type WidgetDto = z.infer<typeof widgetSchema>;

const settingsSchema = z.object({
  workspace: z.object({
    id: z.string(),
    slug: z.string(),
    companyName: z.string(),
    productDescription: z.string(),
    industry: z.string(),
    supportContext: z.string(),
    escalationGuidance: z.string(),
    aiContextNotes: z.string(),
    autoCreateCritical: z.boolean(),
    autoCreateProvider: z.enum(['linear', 'jira']),
  }),
  escalationRules: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      field: z.string(),
      operator: z.enum(['equals', 'contains', 'exists', 'numeric_gte']),
      value: z.string().nullable(),
      tier: z.enum(['none', 'watch', 'expedite', 'critical']),
      reason: z.string(),
      enabled: z.boolean(),
    }),
  ),
  integrations: z.object({
    linear: z.object({ configured: z.boolean() }),
    jira: z.object({ configured: z.boolean() }),
  }),
});

export type SettingsResponse = z.infer<typeof settingsSchema>;

const kbArticleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  body: z.string(),
  published: z.boolean(),
  sourceProvider: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  sourceLocale: z.string().nullable().optional(),
  sourceUpdatedAt: z.string().nullable().optional(),
  sourcePath: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({ chunks: z.number() }).optional(),
  chunks: z
    .array(
      z.object({
        id: z.string(),
        articleId: z.string(),
        workspaceId: z.string(),
        heading: z.string().nullable(),
        body: z.string(),
        order: z.number(),
        createdAt: z.string(),
      }),
    )
    .optional(),
});

export type KbArticleDto = z.infer<typeof kbArticleSchema>;

const kbImportProviderSchema = z.enum(['zendesk', 'intercom', 'freshdesk']);
const kbImportPreviewItemSchema = z.object({
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
const kbImportResultSchema = z.object({
  provider: kbImportProviderSchema,
  total: z.number(),
  valid: z.number(),
  skipped: z.number(),
  creates: z.number(),
  updates: z.number(),
  imported: z.number().optional(),
  items: z.array(kbImportPreviewItemSchema),
});

export type KbImportProvider = z.infer<typeof kbImportProviderSchema>;
export type KbImportResult = z.infer<typeof kbImportResultSchema>;

const assistantMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.string().optional(),
});

export type AssistantMessage = z.infer<typeof assistantMessageSchema>;

const assistantSourceSchema = z.object({
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
  citationKey: z.string().optional(),
  label: z.string(),
  href: z.string().optional(),
  excerpt: z.string().optional(),
  score: z.number().optional(),
  lexicalScore: z.number().optional(),
  vectorScore: z.number().optional(),
});

export type AssistantSource = z.infer<typeof assistantSourceSchema>;

const assistantToolCallSchema = z.object({
  name: z.string(),
  status: z.enum(['completed', 'skipped', 'failed']),
  input: z.unknown().optional(),
  summary: z.string().optional(),
  sourceCount: z.number().optional(),
  durationMs: z.number().optional(),
  step: z.number().optional(),
});

export type AssistantToolCall = z.infer<typeof assistantToolCallSchema>;

const assistantQueryResponseSchema = z.object({
  runId: z.string(),
  answer: z.string(),
  messages: z.array(assistantMessageSchema),
  sources: z.array(assistantSourceSchema),
  toolCalls: z.array(assistantToolCallSchema),
  steps: z.array(
    z.object({
      step: z.number(),
      finishReason: z.string(),
      toolCalls: z.array(assistantToolCallSchema),
      sourceIds: z.array(z.string()),
      durationMs: z.number(),
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
    }),
  ),
  stopReason: z.enum([
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
  ]),
  durationMs: z.number(),
  usage: z
    .object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
      totalTokens: z.number().optional(),
    })
    .optional(),
  suggestedQuestions: z.array(z.string()),
});

export type AssistantQueryResponse = z.infer<
  typeof assistantQueryResponseSchema
>;

export type ApiClientOptions = {
  baseUrl: string;
  fetchFn?: typeof fetch;
};

export function createApiClient(opts: ApiClientOptions) {
  const base = opts.baseUrl.replace(/\/$/, '');
  const fetcher = opts.fetchFn ?? fetch;

  async function request<T>(
    path: string,
    init: RequestInit & { schema?: z.ZodType<T> },
  ): Promise<T> {
    const res = await fetcher(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string>),
      },
      credentials: 'include',
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const msg =
        json && typeof json === 'object' && 'message' in json
          ? String((json as { message: unknown }).message)
          : res.statusText;
      throw new Error(msg || `HTTP ${res.status}`);
    }
    if (init.schema) {
      return init.schema.parse(json);
    }
    return json as T;
  }

  const ticketsBase = '/api/v1/tickets';

  return {
    submitTicket(body: {
      customer_email: string;
      description: string;
      title?: string;
      widgetId?: string;
      userContext?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      source?: { url?: string; title?: string };
    }) {
      return request<{ id: string; shortId: string; status: string }>(
        ticketsBase,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );
    },
    listTickets(search: string) {
      return request<TicketListResponse>(`${ticketsBase}${search}`, {
        method: 'GET',
        schema: listResponseSchema,
      });
    },
    getTicketStats(search: string) {
      return request<TicketStatsResponse>(`${ticketsBase}/stats${search}`, {
        method: 'GET',
        schema: ticketStatsResponseSchema,
      });
    },
    getTicket(id: string) {
      return request<TicketDto>(`${ticketsBase}/${id}`, {
        method: 'GET',
        schema: ticketSchema,
      });
    },
    getTicketComments(id: string) {
      return request<{ items: TicketCommentDto[] }>(
        `${ticketsBase}/${id}/comments`,
        {
          method: 'GET',
          schema: ticketCommentsResponseSchema,
        },
      );
    },
    getTicketAttachmentUrl(id: string, attachmentId: string) {
      return request<{ url: string }>(
        `${ticketsBase}/${id}/attachments/${attachmentId}/url`,
        {
          method: 'GET',
        },
      );
    },
    patchTicketStatus(id: string, body: { status: TicketStatus }) {
      return request<TicketDto>(`${ticketsBase}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        schema: ticketSchema,
      });
    },
    getSimilarTickets(id: string) {
      return request<{ items: { id: string; score: number }[] }>(
        `${ticketsBase}/${id}/similar`,
        { method: 'GET', schema: similarResponseSchema },
      );
    },
    addTicketComment(id: string, body: { body: string }) {
      return request<{ id: string; createdAt: string }>(
        `${ticketsBase}/${id}/comments`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );
    },
    getSettings() {
      return request<SettingsResponse>('/api/v1/settings', {
        method: 'GET',
        schema: settingsSchema,
      });
    },
    updateSettings(body: Partial<SettingsResponse>) {
      return request<SettingsResponse>('/api/v1/settings', {
        method: 'PATCH',
        body: JSON.stringify(body),
        schema: settingsSchema,
      });
    },
    createExternalIssue(id: string, provider: ExternalIssueProvider) {
      return request<{
        link: NonNullable<TicketDto['externalIssueLinks']>[number];
      }>(`${ticketsBase}/${id}/external-issues`, {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
    },
    listWidgets() {
      return request<WidgetDto[]>('/api/v1/widgets', {
        method: 'GET',
        schema: z.array(widgetSchema),
      });
    },
    getWidget(id: string) {
      return request<WidgetDto>(`/api/v1/widgets/${id}`, {
        method: 'GET',
        schema: widgetSchema,
      });
    },
    createWidget(body: Partial<WidgetDto> & { name: string }) {
      return request<WidgetDto>('/api/v1/widgets', {
        method: 'POST',
        body: JSON.stringify(body),
        schema: widgetSchema,
      });
    },
    updateWidget(id: string, body: Partial<WidgetDto>) {
      return request<WidgetDto>(`/api/v1/widgets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        schema: widgetSchema,
      });
    },
    archiveWidget(id: string) {
      return request<WidgetDto>(`/api/v1/widgets/${id}`, {
        method: 'DELETE',
        schema: widgetSchema,
      });
    },
    duplicateWidget(id: string) {
      return request<WidgetDto>(`/api/v1/widgets/${id}/duplicate`, {
        method: 'POST',
        body: JSON.stringify({}),
        schema: widgetSchema,
      });
    },
    rotateWidgetSecret(id: string) {
      return request<WidgetDto>(`/api/v1/widgets/${id}/rotate-secret`, {
        method: 'POST',
        body: JSON.stringify({}),
        schema: widgetSchema,
      });
    },
    listKbArticles() {
      return request<KbArticleDto[]>('/api/v1/kb/articles', {
        method: 'GET',
        schema: z.array(kbArticleSchema),
      });
    },
    previewKbImport(body: { provider: KbImportProvider; payload: unknown }) {
      return request<KbImportResult>('/api/v1/kb/imports/preview', {
        method: 'POST',
        body: JSON.stringify(body),
        schema: kbImportResultSchema,
      });
    },
    importKbArticles(body: { provider: KbImportProvider; payload: unknown }) {
      return request<KbImportResult>('/api/v1/kb/imports', {
        method: 'POST',
        body: JSON.stringify(body),
        schema: kbImportResultSchema,
      });
    },
    createKbArticle(body: {
      slug: string;
      title: string;
      body: string;
      published: boolean;
    }) {
      return request<KbArticleDto>('/api/v1/kb/articles', {
        method: 'POST',
        body: JSON.stringify(body),
        schema: kbArticleSchema,
      });
    },
    updateKbArticle(
      id: string,
      body: Partial<{
        slug: string;
        title: string;
        body: string;
        published: boolean;
      }>,
    ) {
      return request<KbArticleDto>(`/api/v1/kb/articles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        schema: kbArticleSchema,
      });
    },
    deleteKbArticle(id: string) {
      return request<KbArticleDto>(`/api/v1/kb/articles/${id}`, {
        method: 'DELETE',
        schema: kbArticleSchema,
      });
    },
    askAssistant(body: {
      message: string;
      history?: AssistantMessage[];
      maxToolCalls?: number;
    }) {
      return request<AssistantQueryResponse>('/api/v1/assistant/query', {
        method: 'POST',
        body: JSON.stringify(body),
        schema: assistantQueryResponseSchema,
      });
    },
  };
}
