'use client';

import type {
  EscalationTier,
  TicketDto,
  TicketListResponse,
  TicketStatus,
} from '@triage/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { browserTicketsClient } from '../../lib/tickets-browser-client';
import { EmptyState as DashboardEmptyState } from '../../components/ui/empty-state';
import {
  EscalationPill,
  StatusDot,
  StatusPill,
} from '../../components/ui/status';
import { KanbanBoard } from './kanban-board';
import { TicketPreviewDrawer } from './ticket-preview-drawer';

const STATUSES: TicketStatus[] = [
  'new',
  'triaged',
  'claimed',
  'in_progress',
  'resolved',
  'rejected',
];

const ESCALATION_TIERS: EscalationTier[] = [
  'critical',
  'expedite',
  'watch',
  'none',
];
const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const FILTER_PARAM_KEYS = [
  'q',
  'status',
  'escalationTier',
  'noiseOnly',
  'knowledgeOnly',
] as const;

function useListQueryString() {
  const sp = useSearchParams();
  return useMemo(() => {
    const u = new URLSearchParams(sp.toString());
    const view = u.get('view');
    if (view === 'kanban') {
      u.set('pageSize', '100');
    } else if (!u.has('pageSize')) {
      u.set('pageSize', '20');
    }
    const s = u.toString();
    return s ? `?${s}` : '?pageSize=20';
  }, [sp]);
}

function useStatsQueryString() {
  const sp = useSearchParams();
  return useMemo(() => {
    const u = new URLSearchParams(sp.toString());
    u.delete('page');
    u.delete('pageSize');
    u.delete('view');
    const s = u.toString();
    return s ? `?${s}` : '';
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
      const previous =
        queryClient.getQueryData<TicketListResponse>(listQueryKey);
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
      void queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
    },
  });

  return (
    <div className="relative inline-flex items-center">
      <StatusPill status={ticket.status} />
      <select
        className="absolute inset-0 cursor-pointer opacity-0"
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
  const [previewTicketId, setPreviewTicketId] = useState<string | null>(null);
  const listQs = useListQueryString();
  const statsQs = useStatsQueryString();
  const listQueryKey = ['tickets', listQs] as const;
  const statsQueryKey = ['ticket-stats', statsQs] as const;
  const view = sp.get('view') === 'kanban' ? 'kanban' : 'table';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: listQueryKey,
    queryFn: () => browserTicketsClient().listTickets(listQs),
  });
  const { data: statsData } = useQuery({
    queryKey: statsQueryKey,
    queryFn: () => browserTicketsClient().getTicketStats(statsQs),
  });

  function buildHref(
    patch: Record<string, string | number | null | undefined>,
  ) {
    const u = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === '') u.delete(k);
      else u.set(k, String(v));
    }
    const s = u.toString();
    return s ? `/dashboard?${s}` : '/dashboard';
  }

  function onFilterSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const u = new URLSearchParams(sp.toString());
    FILTER_PARAM_KEYS.forEach((key) => u.delete(key));
    u.delete('page');
    for (const [k, v] of fd.entries()) {
      if (typeof v === 'string' && v) u.set(k, v);
    }
    if (view === 'kanban') u.set('view', 'kanban');
    else u.delete('view');
    const s = u.toString();
    router.push(s ? `/dashboard?${s}` : '/dashboard');
  }

  const q = sp.get('q') ?? '';
  const status = sp.get('status') ?? '';
  const escalationTier = sp.get('escalationTier') ?? '';
  const noiseOnly = sp.get('noiseOnly') === 'true';
  const knowledgeOnly = sp.get('knowledgeOnly') === 'true';
  const hasFilters = Boolean(
    q || status || escalationTier || noiseOnly || knowledgeOnly,
  );
  const resetFiltersHref = buildHref({
    q: null,
    status: null,
    escalationTier: null,
    noiseOnly: null,
    knowledgeOnly: null,
    page: null,
  });

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;
  const canShowTablePagination = Boolean(
    data && view === 'table' && data.total > 0,
  );

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tightest text-paper-50 md:text-5xl">
            Tickets
          </h1>
          <p className="mt-2 font-mono text-sm tabular-nums text-paper-400">
            {data
              ? `${data.total} total, page ${data.page}, ${data.pageSize} per page`
              : isLoading
                ? 'Loading queue'
                : 'No queue data'}
          </p>
        </div>

        <div className="surface inline-flex w-fit items-center rounded-full p-1 text-xs font-medium">
          <Link
            href={buildHref({ view: null, page: null })}
            className={`inline-flex h-8 cursor-pointer items-center rounded-full px-4 transition-colors ${
              view === 'table'
                ? 'bg-paper-100 text-ink-900 shadow-[inset_0_0_0_1px_rgba(17,16,14,0.14)]'
                : 'text-paper-400 hover:text-paper-100'
            }`}
          >
            Table
          </Link>
          <Link
            href={buildHref({ view: 'kanban', page: null })}
            className={`inline-flex h-8 cursor-pointer items-center rounded-full px-4 transition-colors ${
              view === 'kanban'
                ? 'bg-paper-100 text-ink-900 shadow-[inset_0_0_0_1px_rgba(17,16,14,0.14)]'
                : 'text-paper-400 hover:text-paper-100'
            }`}
          >
            Kanban
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-paper-100/[0.075] bg-paper-100/[0.06] md:grid-cols-6">
        {STATUSES.map((s) => (
          <div
            key={s}
            className="bg-ink-900/95 px-4 py-3 transition-colors hover:bg-ink-850"
          >
            <div className="flex items-center gap-2">
              <StatusDot status={s} size={6} />
              <span className="font-mono text-2xs uppercase tracking-wider text-paper-500">
                {s.replace('_', ' ')}
              </span>
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-paper-50">
              {statsData?.byStatus[s] ?? 0}
            </div>
          </div>
        ))}
      </div>

      <form
        key={listQs}
        onSubmit={onFilterSubmit}
        className="surface flex flex-wrap items-center gap-2 rounded-2xl p-3"
      >
        <div className="relative min-w-[220px] flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-500"
            aria-hidden
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M20 20l-3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
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
          name="escalationTier"
          className="select select-sm !w-auto"
          defaultValue={escalationTier}
        >
          <option value="">Any escalation</option>
          {ESCALATION_TIERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label className="hairline inline-flex h-8 cursor-pointer items-center gap-2 rounded-full px-3 text-xs text-paper-300 transition-colors hover:text-paper-50">
          <input
            type="checkbox"
            name="noiseOnly"
            value="true"
            className="checkbox"
            defaultChecked={noiseOnly}
          />
          Noise
        </label>
        <label className="hairline inline-flex h-8 cursor-pointer items-center gap-2 rounded-full px-3 text-xs text-paper-300 transition-colors hover:text-paper-50">
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
          <Link
            href={resetFiltersHref}
            className="btn-ghost btn-sm text-paper-500"
          >
            Reset
          </Link>
        )}
      </form>

      {isLoading && <QueueSkeleton />}

      {isError && (
        <div
          role="alert"
          className="rounded-2xl px-4 py-3 text-sm text-[#F0A49A]"
          style={{
            background: 'rgba(230, 106, 92, 0.08)',
            boxShadow: 'inset 0 0 0 1px rgba(230, 106, 92, 0.24)',
          }}
        >
          {error instanceof Error ? error.message : 'Could not load queue.'}
        </div>
      )}

      {data && !isLoading && data.items.length === 0 && (
        <DashboardEmptyState
          variant={data.total > 0 || hasFilters ? 'filtered' : 'tickets'}
          title={
            data.total > 0
              ? 'No tickets on this page'
              : hasFilters
                ? 'No tickets match this view'
                : 'No feedback has arrived yet'
          }
          description={
            data.total > 0
              ? 'Use the pagination controls to move back into the available queue range.'
              : hasFilters
                ? 'This queue is clear for the current filters. Reset the view or adjust the criteria.'
                : 'Publish a widget on your site to start triaging customer feedback.'
          }
          actions={
            <>
              {data.total > 0 && (
                <Link
                  href={buildHref({ page: Math.min(data.page, totalPages) })}
                  className="btn-secondary"
                >
                  Go to last page
                </Link>
              )}
              {hasFilters && (
                <Link href={resetFiltersHref} className="btn-secondary">
                  Reset filters
                </Link>
              )}
              <Link
                href="/dashboard/widgets"
                className="btn-ghost text-paper-400"
              >
                Configure widgets
              </Link>
            </>
          }
        />
      )}

      {data && !isLoading && data.items.length > 0 && (
        <>
          {view === 'kanban' ? (
            <KanbanBoard
              tickets={data.items}
              listQueryKey={listQueryKey}
              onOpenTicket={setPreviewTicketId}
            />
          ) : (
            <div className="surface overflow-hidden rounded-2xl">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="hairline-b bg-paper-100/[0.025] font-mono text-2xs uppercase tracking-wider text-paper-500">
                      <th className="w-28 px-4 py-2.5 text-left font-normal">
                        When
                      </th>
                      <th className="px-3 py-2.5 text-left font-normal">
                        From
                      </th>
                      <th className="w-32 px-3 py-2.5 text-left font-normal">
                        Status
                      </th>
                      <th className="w-32 px-3 py-2.5 text-left font-normal">
                        Escalation
                      </th>
                      <th className="w-40 px-3 py-2.5 text-left font-normal">
                        Category
                      </th>
                      <th className="w-40 px-3 py-2.5 text-left font-normal">
                        Flags
                      </th>
                      <th className="w-16 px-4 py-2.5 text-right font-normal"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((f) => (
                      <tr
                        key={f.id}
                        className="group border-t border-paper-100/[0.045] transition-colors hover:bg-paper-100/[0.035]"
                      >
                        <td className="whitespace-nowrap px-4 py-3 align-middle font-mono text-2xs tabular-nums text-paper-500">
                          {new Date(f.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-100/[0.075] text-xs font-medium text-paper-200 ring-1 ring-paper-100/[0.08]">
                              {(f.submitterEmail[0] ?? '?').toUpperCase()}
                            </div>
                            <span className="max-w-[16rem] truncate text-paper-200">
                              {f.submitterEmail}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <StatusCell ticket={f} listQueryKey={listQueryKey} />
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <EscalationPill tier={f.escalationTier} />
                        </td>
                        <td className="px-3 py-3 align-middle">
                          {f.category ? (
                            <span className="text-xs text-paper-300">
                              {f.category}
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-paper-500">
                              None
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {f.isNoise && (
                              <span
                                className="pill"
                                style={{
                                  color: '#E7B46A',
                                  background: 'rgba(217,154,61,0.09)',
                                  boxShadow:
                                    'inset 0 0 0 1px rgba(217,154,61,0.2)',
                                }}
                              >
                                noise
                              </span>
                            )}
                            {f.knowledgeGap && (
                              <span className="pill pill-accent">gap</span>
                            )}
                            {!f.isNoise && !f.knowledgeGap && (
                              <span className="font-mono text-xs text-paper-500">
                                Clear
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right align-middle">
                          <Link
                            href={`/dashboard/${f.id}`}
                            onClick={(event) => {
                              event.preventDefault();
                              setPreviewTicketId(f.id);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-paper-400 opacity-100 transition-all hover:text-lime md:opacity-0 md:group-hover:opacity-100"
                          >
                            Open
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 12 12"
                              fill="none"
                              aria-hidden
                            >
                              <path
                                d="M2.5 6h7M6 2.5L9.5 6 6 9.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {canShowTablePagination && (
                <TablePagination
                  page={data.page}
                  pageSize={data.pageSize}
                  total={data.total}
                  totalPages={totalPages}
                  buildHref={buildHref}
                  onPageSizeChange={(pageSize) => {
                    router.push(buildHref({ pageSize, page: null }));
                  }}
                />
              )}
            </div>
          )}
        </>
      )}
      {data &&
        !isLoading &&
        data.items.length === 0 &&
        canShowTablePagination && (
          <TablePagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            totalPages={totalPages}
            buildHref={buildHref}
            onPageSizeChange={(pageSize) => {
              router.push(buildHref({ pageSize, page: null }));
            }}
          />
        )}
      {previewTicketId && (
        <TicketPreviewDrawer
          ticketId={previewTicketId}
          onClose={() => setPreviewTicketId(null)}
        />
      )}
    </div>
  );
}

function TablePagination({
  page,
  pageSize,
  total,
  totalPages,
  buildHref,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  buildHref: (
    patch: Record<string, string | number | null | undefined>,
  ) => string;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const displayPage = Math.min(Math.max(page, 1), totalPages);
  const firstItem = total === 0 ? 0 : (displayPage - 1) * pageSize + 1;
  const lastItem = Math.min(total, displayPage * pageSize);
  const previousPage = page > totalPages ? totalPages : Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;
  const pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS.includes(pageSize)
    ? TABLE_PAGE_SIZE_OPTIONS
    : [...TABLE_PAGE_SIZE_OPTIONS, pageSize].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-3 border-t border-paper-100/[0.06] px-4 py-3 md:flex-row md:items-center md:justify-between">
      <p className="font-mono text-xs tabular-nums text-paper-500">
        Showing {firstItem}-{lastItem} of {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 font-mono text-2xs uppercase tracking-wider text-paper-500">
          Rows
          <select
            className="select select-sm !w-auto"
            value={pageSize}
            aria-label="Rows per page"
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <span className="px-2 font-mono text-xs tabular-nums text-paper-400">
          Page {displayPage} of {totalPages}
        </span>
        {isFirstPage ? (
          <span className="btn-secondary btn-sm pointer-events-none opacity-45">
            Prev
          </span>
        ) : (
          <Link
            href={buildHref({ page: previousPage })}
            className="btn-secondary btn-sm"
          >
            Prev
          </Link>
        )}
        {isLastPage ? (
          <span className="btn-secondary btn-sm pointer-events-none opacity-45">
            Next
          </span>
        ) : (
          <Link
            href={buildHref({ page: nextPage })}
            className="btn-secondary btn-sm"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="surface overflow-hidden rounded-2xl">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[120px_1fr_140px_140px] gap-4 border-t border-paper-100/[0.045] px-4 py-4 first:border-t-0"
        >
          <span className="h-4 rounded bg-paper-100/[0.055]" />
          <span className="h-4 rounded bg-paper-100/[0.075]" />
          <span className="h-6 rounded-full bg-paper-100/[0.055]" />
          <span className="h-6 rounded-full bg-paper-100/[0.055]" />
        </div>
      ))}
    </div>
  );
}
