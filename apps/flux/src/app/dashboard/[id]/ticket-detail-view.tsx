'use client';

import type { TicketDto } from '@triage/api-client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { browserTicketsClient } from '../../../lib/tickets-browser-client';
import { TicketActions } from './ticket-actions';

export function TicketDetailView({ id }: { id: string }) {
  const client = browserTicketsClient();

  const ticketQuery = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => client.getTicket(id),
  });

  const similarQuery = useQuery({
    queryKey: ['ticket', id, 'similar'],
    queryFn: () => client.getSimilarTickets(id),
    enabled: !!id && ticketQuery.isSuccess,
  });

  if (ticketQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (ticketQuery.isError || !ticketQuery.data) {
    return (
      <div role="alert" className="alert alert-error max-w-2xl">
        Not found or no access.
      </div>
    );
  }

  const f: TicketDto = ticketQuery.data;
  const similar = similarQuery.data?.items ?? [];

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/dashboard" className="btn btn-ghost btn-sm gap-2">
        ← Queue
      </Link>

      <div className="card bg-base-100 shadow-lg border border-base-200">
        <div className="card-body gap-3">
          <h1 className="card-title text-xl">Ticket {f.id}</h1>
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-lg">{f.status}</span>
            {f.priority && (
              <span className="badge badge-secondary badge-lg">{f.priority}</span>
            )}
            {f.category && (
              <span className="badge badge-outline badge-lg">{f.category}</span>
            )}
            {f.sentiment && (
              <span className="badge badge-ghost badge-lg">{f.sentiment}</span>
            )}
            {f.knowledgeGap && (
              <span className="badge badge-accent badge-lg">knowledge gap</span>
            )}
          </div>
          <p className="text-sm opacity-70">
            From <strong>{f.submitterEmail}</strong> ·{' '}
            {new Date(f.createdAt).toLocaleString()}
            {f.triagedAt && ` · triaged ${new Date(f.triagedAt).toLocaleString()}`}
          </p>
          <div className="divider my-1" />
          <h2 className="font-semibold">Cleaned text</h2>
          <p className="whitespace-pre-wrap text-sm bg-base-200 p-4 rounded-box">
            {f.cleanedText ?? '— (pending triage)'}
          </p>
          <details className="collapse collapse-arrow bg-base-200 rounded-box">
            <summary className="collapse-title text-sm font-medium min-h-0 py-3">
              Raw submission
            </summary>
            <div className="collapse-content text-sm whitespace-pre-wrap pb-3">
              {f.rawText}
            </div>
          </details>
        </div>
      </div>

      <div className="card bg-base-100 shadow-md border border-base-200">
        <div className="card-body gap-3">
          <h2 className="card-title text-lg">Actions</h2>
          <TicketActions id={id} />
        </div>
      </div>

      <div className="card bg-base-100 shadow-md border border-base-200">
        <div className="card-body gap-3">
          <h2 className="card-title text-lg">Similar tickets</h2>
          {similarQuery.isLoading ? (
            <span className="loading loading-dots loading-md" />
          ) : similar.length === 0 ? (
            <p className="text-sm opacity-70">No similar items yet.</p>
          ) : (
            <ul className="menu menu-sm bg-base-200 rounded-box max-w-md">
              {similar.map((s) => (
                <li key={s.id}>
                  <Link href={`/dashboard/${s.id}`} className="link">
                    {s.id}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
