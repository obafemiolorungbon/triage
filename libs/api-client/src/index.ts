import { z } from 'zod';

const feedbackSchema = z.object({
  id: z.string(),
  submitterEmail: z.string(),
  rawText: z.string(),
  cleanedText: z.string().nullable(),
  category: z.string().nullable(),
  priority: z.enum(['low', 'med', 'high', 'urgent']).nullable(),
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
  assignedAgentId: z.string().nullable(),
  createdAt: z.string(),
  triagedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
});

export type FeedbackDto = z.infer<typeof feedbackSchema>;

const listResponseSchema = z.object({
  items: z.array(feedbackSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type FeedbackListResponse = z.infer<typeof listResponseSchema>;

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

  return {
    submitFeedback(body: { submitterEmail: string; rawText: string }) {
      return request<{ id: string; status: string }>('/api/v1/feedback', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    listFeedback(search: string) {
      return request<FeedbackListResponse>(`/api/v1/feedback${search}`, {
        method: 'GET',
        schema: listResponseSchema,
      });
    },
    getFeedback(id: string) {
      return request<FeedbackDto>(`/api/v1/feedback/${id}`, {
        method: 'GET',
        schema: feedbackSchema,
      });
    },
    claimFeedback(id: string) {
      return request<FeedbackDto>(`/api/v1/feedback/${id}/claim`, {
        method: 'POST',
        schema: feedbackSchema,
      });
    },
    resolveFeedback(id: string) {
      return request<FeedbackDto>(`/api/v1/feedback/${id}/resolve`, {
        method: 'POST',
        schema: feedbackSchema,
      });
    },
    addComment(id: string, body: { body: string }) {
      return request<{ id: string; createdAt: string }>(
        `/api/v1/feedback/${id}/comments`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );
    },
  };
}
