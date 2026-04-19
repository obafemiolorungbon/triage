import { z } from 'zod';

const ticketSchema = z.object({
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

/** Single ticket row — same shape as API `Feedback` JSON. */
export type TicketDto = z.infer<typeof ticketSchema>;
export type TicketStatus = TicketDto['status'];

const listResponseSchema = z.object({
  items: z.array(ticketSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type TicketListResponse = z.infer<typeof listResponseSchema>;

const similarResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      score: z.number(),
    }),
  ),
});

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
    }) {
      return request<{ id: string; status: string }>(ticketsBase, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    listTickets(search: string) {
      return request<TicketListResponse>(`${ticketsBase}${search}`, {
        method: 'GET',
        schema: listResponseSchema,
      });
    },
    getTicket(id: string) {
      return request<TicketDto>(`${ticketsBase}/${id}`, {
        method: 'GET',
        schema: ticketSchema,
      });
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
  };
}
