'use client';

import type { TicketDto, TicketListResponse, TicketStatus } from '@triage/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { browserTicketsClient } from '../../lib/tickets-browser-client';
import { KanbanBoard } from './kanban-board';

const STATUSES: TicketStatus[] = [
  'new',
  'triaged',
  'claimed',
  'in_progress',
  'resolved',
  'rejected',
];

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

function StatusSelect({
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
    <select
      className="select select-bordered select-xs max-w-[9rem]"
      value={ticket.status}
      disabled={mutation.isPending}
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

  return (
    <div className="container mx-auto space-y-6 px-0">
      <div className="stats stats-vertical sm:stats-horizontal shadow bg-base-100 w-full sm:w-auto">
        <div className="stat place-items-center py-3">
          <div className="stat-title">Queue</div>
          <div className="stat-value text-2xl">Tickets</div>
          <div className="stat-desc">
            {data ? `${data.total} total` : isLoading ? 'Loading…' : '—'}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="text-2xl font-bold">Ticket queue</h1>
        <div role="tablist" className="tabs tabs-boxed w-fit">
          <Link
            role="tab"
            className={`tab ${view === 'table' ? 'tab-active' : ''}`}
            href={buildHref({ view: null })}
          >
            Table
          </Link>
          <Link
            role="tab"
            className={`tab ${view === 'kanban' ? 'tab-active' : ''}`}
            href={buildHref({ view: 'kanban' })}
          >
            Kanban
          </Link>
        </div>
      </div>

      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4 gap-3">
          <h2 className="card-title text-base">Filters</h2>
          <form
            key={listQs}
            className="flex flex-col gap-3"
            onSubmit={onFilterSubmit}
          >
            <div className="flex flex-wrap gap-2 items-end">
              <label className="form-control w-full sm:w-40">
                <span className="label-text text-xs">Status</span>
                <select
                  name="status"
                  className="select select-bordered select-sm"
                  defaultValue={sp.get('status') ?? ''}
                >
                  <option value="">Any status</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-control w-full sm:w-40">
                <span className="label-text text-xs">Priority</span>
                <select
                  name="priority"
                  className="select select-bordered select-sm"
                  defaultValue={sp.get('priority') ?? ''}
                >
                  <option value="">Any priority</option>
                  <option value="low">low</option>
                  <option value="med">med</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </label>
              <label className="form-control flex-1 min-w-[12rem]">
                <span className="label-text text-xs">Search</span>
                <input
                  name="q"
                  className="input input-bordered input-sm"
                  placeholder="Text, category…"
                  defaultValue={sp.get('q') ?? ''}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="label cursor-pointer gap-2 justify-start">
                <input
                  type="checkbox"
                  name="noiseOnly"
                  value="true"
                  className="checkbox checkbox-sm checkbox-secondary"
                  defaultChecked={sp.get('noiseOnly') === 'true'}
                />
                <span className="label-text">Noise only</span>
              </label>
              <label className="label cursor-pointer gap-2 justify-start">
                <input
                  type="checkbox"
                  name="knowledgeOnly"
                  value="true"
                  className="checkbox checkbox-sm checkbox-accent"
                  defaultChecked={sp.get('knowledgeOnly') === 'true'}
                />
                <span className="label-text">Knowledge gaps</span>
              </label>
              <button type="submit" className="btn btn-primary btn-sm">
                Apply filters
              </button>
            </div>
          </form>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      )}
      {isError && (
        <div role="alert" className="alert alert-error">
          <span>{error instanceof Error ? error.message : 'Could not load queue.'}</span>
        </div>
      )}
      {data && !isLoading && (
        <>
          <p className="text-sm opacity-70">
            {data.total} total · page {data.page} · {data.pageSize} per page
          </p>
          {view === 'kanban' ? (
            <KanbanBoard tickets={data.items} listQueryKey={listQueryKey} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100 shadow">
              <table className="table table-zebra table-sm md:table-md">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Category</th>
                    <th>Flags</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((f) => (
                    <tr key={f.id}>
                      <td className="text-xs whitespace-nowrap">
                        {new Date(f.createdAt).toLocaleString()}
                      </td>
                      <td className="max-w-[10rem] truncate">{f.submitterEmail}</td>
                      <td>
                        <StatusSelect ticket={f} listQueryKey={listQueryKey} />
                      </td>
                      <td>{f.priority ?? '—'}</td>
                      <td className="max-w-[8rem] truncate">{f.category ?? '—'}</td>
                      <td className="text-xs">
                        {f.isNoise && (
                          <span className="badge badge-warning badge-sm mr-1">noise</span>
                        )}
                        {f.knowledgeGap && (
                          <span className="badge badge-accent badge-sm">knowledge</span>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/${f.id}`}
                          className="btn btn-ghost btn-xs"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
