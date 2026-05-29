'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { getPublicApiBase } from '../../lib/api-base';
import { EmptyState } from '../../components/ui/empty-state';

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

async function fetchNotifications(): Promise<NotificationRow[]> {
  const r = await fetch(`${getPublicApiBase()}/api/v1/notifications`, {
    credentials: 'include',
  });
  if (!r.ok) throw new Error('Failed to load notifications');
  return (await r.json()) as NotificationRow[];
}

async function markNotificationsRead(ids: string[]): Promise<void> {
  const r = await fetch(`${getPublicApiBase()}/api/v1/notifications/read`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!r.ok) throw new Error('Failed to mark read');
}

function relative(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell({ variant = 'top' }: { variant?: 'top' | 'sidebar' }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);

  const listQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items = listQuery.data ?? [];
  const unread = items.filter((i) => !i.read).length;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function markAllVisibleRead() {
    const ids = items.filter((i) => !i.read).map((i) => i.id);
    if (ids.length) markReadMutation.mutate(ids);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={`relative inline-flex h-9 items-center justify-center rounded-full text-paper-300 transition-colors hover:bg-paper-100/5 hover:text-paper-50 ${
          variant === 'sidebar' ? 'w-9 shrink-0' : 'w-9'
        }`}
        onClick={() => {
          setOpen((prev) => {
            const next = !prev;
            if (next) void queryClient.invalidateQueries({ queryKey: ['notifications'] });
            return next;
          });
        }}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden>
          <path
            d="M6 8a6 6 0 1112 0c0 3 1.5 4.5 2 5.5H4c.5-1 2-2.5 2-5.5zM9.5 18a2.5 2.5 0 005 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-lime text-[10px] font-mono font-semibold text-ink-900 tabular-nums shadow-glow-lime">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={`z-50 animate-fade-in overflow-hidden rounded-2xl surface-raised ${
            variant === 'sidebar'
              ? 'fixed left-[300px] top-5 w-[min(360px,calc(100vw-332px))]'
              : 'absolute right-0 mt-2 w-[min(360px,calc(100vw-32px))]'
          }`}
        >
          <div className="px-4 py-3 flex items-center justify-between hairline-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-paper-50">Notifications</span>
              {unread > 0 && (
                <span className="pill pill-accent !h-4 !text-[10px] !px-1.5">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs text-paper-400 hover:text-lime transition-colors cursor-pointer disabled:opacity-50"
                disabled={markReadMutation.isPending}
                onClick={markAllVisibleRead}
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[420px] overflow-y-auto scrollbar-thin divide-y divide-paper-100/5">
            {listQuery.isLoading && (
              <li className="p-8 flex justify-center">
                <span className="spinner" />
              </li>
            )}
            {listQuery.isError && (
              <li className="p-4 text-sm text-[#FF9999]">Could not load.</li>
            )}
            {!listQuery.isLoading && items.length === 0 && (
              <li className="p-4">
                <EmptyState
                  variant="notifications"
                  tone="compact"
                  title="No notifications"
                  description="Important ticket updates will appear here."
                />
              </li>
            )}
            {items.map((i) => (
              <li
                key={i.id}
                className={`group px-4 py-3 flex gap-3 hover:bg-paper-100/[0.03] transition-colors ${!i.read ? '' : 'opacity-60'
                  }`}
              >
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!i.read ? 'bg-lime' : 'bg-paper-500/40'
                    }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm font-medium text-paper-100 truncate">
                      {i.title}
                    </p>
                    <span className="text-2xs font-mono text-paper-500 shrink-0">
                      {relative(i.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-paper-400 line-clamp-2">{i.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
