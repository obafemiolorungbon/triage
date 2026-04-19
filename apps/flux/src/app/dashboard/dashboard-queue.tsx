'use client';

import type {
  TicketDto,
  TicketListResponse,
  TicketStatus,
} from '@triage/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { browserTicketsClient } from '../../lib/tickets-browser-client';
import { PriorityPill, StatusDot, StatusPill } from '../../components/ui/status';
import type { Priority } from '../../components/ui/status';
import { KanbanBoard } from './kanban-board';

const STATUSES: TicketStatus[] = [
  'new',
  'triaged',
  'claimed',
  'in_progress',
  'resolved',
  'rejected',
];

const PRIORITIES: Priority[] = ['urgent', 'high', 'med', 'low'];

function useListQueryString() {
  const sp = useSearchParams();
  return useMemo(() => {
    const u = new URLSearchParams(sp.toString());
    const view = u.get('view');
    if (view === 'kanban') {
      u.set('pageSize', '150');
    } else if (!u.has('pageSize')) {
      u.set('pageSize', '20');
    }
    const s = u.toString();
    return s ? `?${s}` : '?pageSize=20';
  }, [sp]);
}

function StatusCell({
  ticket,
  listQueryKey,
}: {
  ticket: TicketDto;
  listQueryKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const client = browserTicketsClient();
  const mutation = useMutation({
    mutationFn: (status: TicketStatus) =>
      client.patchTicketStatus(ticket.id, { status }),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey });
      const previous = queryClient.getQueryData<TicketListResponse>(listQueryKey);
      if (previous) {
        queryClient.setQueryData<TicketListResponse>(listQueryKey, {
          ...previous,
          items: previous.items.map((t) =>
            t.id === ticket.id ? { ...t, status } : t,
          ),
        });
      }
      return { previous };
    },
    onError: (_e, _s, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(listQueryKey, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
    },
  });

  return (
    <div className="relative inline-flex items-center">
      <StatusPill status={ticket.status} />
      <select
        className="absolute inset-0 opacity-0 cursor-pointer"
        value={ticket.status}
        disabled={mutation.isPending}
        aria-label="Change status"
        onChange={(e) => {
          const v = e.target.value as TicketStatus;
          if (v !== ticket.status) mutation.mutate(v);
        }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DashboardQueue() {
  const router = useRouter();
  const sp = useSearchParams();
  const listQs = useListQueryString();
  const listQueryKey = ['tickets', listQs] as const;
  const view = sp.get('view') === 'kanban' ? 'kanban' : 'table';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: listQueryKey,
    queryFn: () => browserTicketsClient().listTickets(listQs),
  });

  function buildHref(patch: Record<string, string | null | undefined>) {
    const u = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === '') u.delete(k);
      else u.set(k, v);
    }
    const s = u.toString();
    return s ? `/dashboard?${s}` : '/dashboard';
  }

  function onFilterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const u = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      if (typeof v === 'string' && v) u.set(k, v);
    }
    if (view === 'kanban') u.set('view', 'kanban');
    const s = u.toString();
    router.push(s ? `/dashboard?${s}` : '/dashboard');
  }

  const q = sp.get('q') ?? '';
  const status = sp.get('status') ?? '';
  const priority = sp.get('priority') ?? '';
  const noiseOnly = sp.get('noiseOnly') === 'true';
  const knowledgeOnly = sp.get('knowledgeOnly') === 'true';
  const hasFilters = Boolean(q || status || priority || noiseOnly || knowledgeOnly);

  const countsByStatus = useMemo(() => {
    const c: Partial<Record<TicketStatus, number>> = {};
    data?.items.forEach((t) => {
      c[t.status] = (c[t.status] ?? 0) + 1;
    });
    return c;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* ==== Header ==== */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl tracking-tightest text-paper-50 font-medium">
            Tickets
          </h1>
          <p className="mt-2 text-sm text-paper-400 font-mono tabular-nums">
            {data
              ? `${data.total} · p${data.page} · ${data.pageSize}/page`
              : isLoading
                ? '…'
                : '—'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-full surface text-xs font-medium">
            <Link
              href={buildHref({ view: null })}
              className={`h-8 px-4 inline-flex items-center rounded-full transition-colors cursor-pointer ${
                view === 'table'
                  ? 'bg-paper-100 text-ink-900'
                  : 'text-paper-400 hover:text-paper-100'
              }`}
            >
              Table
            </Link>
            <Link
              href={buildHref({ view: 'kanban' })}
              className={`h-8 px-4 inline-flex items-center rounded-full transition-colors cursor-pointer ${
                view === 'kanban'
                  ? 'bg-paper-100 text-ink-900'
                  : 'text-paper-400 hover:text-paper-100'
              }`}
            >
              Kanban
            </Link>
          </div>
        </div>
      </div>

      {/* ==== Stat strip ==== */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-px rounded-xl overflow-hidden hairline bg-paper-100/5">
        {STATUSES.map((s) => (
          <div key={s} className="bg-ink-900 px-4 py-3 hover:bg-ink-850 transition-colors">
            <div className="flex items-center gap-2">
              <StatusDot status={s} size={6} />
              <span className="text-2xs font-mono uppercase tracking-wider text-paper-500">
                {s.replace('_', ' ')}
              </span>
            </div>
            <div className="mt-1 text-2xl font-display text-paper-50 tabular-nums">
              {countsByStatus[s] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* ==== Filters ==== */}
      <form
        key={listQs}
        onSubmit={onFilterSubmit}
        className="surface rounded-xl p-3 flex flex-wrap items-center gap-2"
      >
        <div className="relative flex-1 min-w-[220px]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-paper-500 pointer-events-none"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            name="q"
            className="input !pl-9"
            placeholder="Search"
            defaultValue={q}
          />
        </div>
        <select
          name="status"
          className="select select-sm !w-auto"
          defaultValue={status}
        >
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          name="priority"
          className="select select-sm !w-auto"
          defaultValue={priority}
        >
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 px-3 h-8 rounded-full hairline cursor-pointer text-xs text-paper-300 hover:text-paper-50 transition-colors">
          <input
            type="checkbox"
            name="noiseOnly"
            value="true"
            className="checkbox"
            defaultChecked={noiseOnly}
          />
          Noise
        </label>
        <label className="inline-flex items-center gap-2 px-3 h-8 rounded-full hairline cursor-pointer text-xs text-paper-300 hover:text-paper-50 transition-colors">
          <input
            type="checkbox"
            name="knowledgeOnly"
            value="true"
            className="checkbox"
            defaultChecked={knowledgeOnly}
          />
          Knowledge gap
        </label>
        <button type="submit" className="btn-primary btn-sm">
          Apply
        </button>
        {hasFilters && (
          <Link href="/dashboard" className="btn-ghost btn-sm text-paper-500">
            Reset
          </Link>
        )}
      </form>

      {/* ==== Results ==== */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <span className="spinner" />
        </div>
      )}

      {isError && (
        <div
          role="alert"
          className="rounded-xl px-4 py-3 text-sm text-[#FF9999]"
          style={{
            background: 'rgba(255, 94, 94, 0.08)',
            boxShadow: 'inset 0 0 0 1px rgba(255, 94, 94, 0.25)',
          }}
        >
          {error instanceof Error ? error.message : 'Could not load queue.'}
        </div>
      )}

      {data && !isLoading && data.items.length === 0 && <EmptyState />}

      {data && !isLoading && data.items.length > 0 && (
        <>
          {view === 'kanban' ? (
            <KanbanBoard tickets={data.items} listQueryKey={listQueryKey} />
          ) : (
            <div className="surface rounded-xl overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-2xs font-mono uppercase tracking-wider text-paper-500 hairline-b">
                      <th className="text-left font-normal px-4 py-2.5 w-28">When</th>
                      <th className="text-left font-normal px-3 py-2.5">From</th>
                      <th className="text-left font-normal px-3 py-2.5 w-32">Status</th>
                      <th className="text-left font-normal px-3 py-2.5 w-28">Priority</th>
                      <th className="text-left font-normal px-3 py-2.5 w-40">Category</th>
                      <th className="text-left font-normal px-3 py-2.5 w-40">Flags</th>
                      <th className="text-right font-normal px-4 py-2.5 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((f) => (
                      <tr
                        key={f.id}
                        className="group border-t border-paper-100/[0.04] hover:bg-paper-100/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 text-2xs font-mono text-paper-500 tabular-nums whitespace-nowrap align-middle">
                          {new Date(f.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-paper-100/5 text-paper-300 text-xs font-medium shrink-0">
                              {(f.submitterEmail[0] ?? '?').toUpperCase()}
                            </div>
                            <span className="truncate text-paper-200 max-w-[16rem]">
                              {f.submitterEmail}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <StatusCell ticket={f} listQueryKey={listQueryKey} />
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <PriorityPill priority={f.priority as Priority | null} />
                        </td>
                        <td className="px-3 py-3 align-middle">
                          {f.category ? (
                            <span className="text-paper-300 text-xs">{f.category}</span>
                          ) : (
                            <span className="text-paper-500 font-mono text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {f.isNoise && (
                              <span
                                className="pill"
                                style={{
                                  color: '#FFA94D',
                                  background: 'rgba(255,169,77,0.08)',
                                  boxShadow: 'inset 0 0 0 1px rgba(255,169,77,0.2)',
                                }}
                              >
                                noise
                              </span>
                            )}
                            {f.knowledgeGap && (
                              <span className="pill pill-accent">gap</span>
                            )}
                            {!f.isNoise && !f.knowledgeGap && (
                              <span className="text-paper-500 font-mono text-xs">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right align-middle">
                          <Link
                            href={`/dashboard/${f.id}`}
                            className="inline-flex items-center gap-1 text-xs text-paper-400 opacity-0 group-hover:opacity-100 hover:text-lime transition-all"
                          >
                            Open
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                              <path d="M2.5 6h7M6 2.5L9.5 6 6 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="surface rounded-2xl p-16 text-center">
      <h3 className="text-lg text-paper-50 tracking-tight">No tickets</h3>
    </div>
  );
}
