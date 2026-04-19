'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getPublicApiBase } from '../../lib/api-base';

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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items = listQuery.data ?? [];
  const unread = items.filter((i) => !i.read).length;

  function markAllVisibleRead() {
    const ids = items.filter((i) => !i.read).map((i) => i.id);
    if (ids.length) markReadMutation.mutate(ids);
  }

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        className="btn btn-ghost btn-circle"
        onClick={() =>
          setOpen((prev) => {
            const next = !prev;
            if (next) void queryClient.invalidateQueries({ queryKey: ['notifications'] });
            return next;
          })
        }
        aria-label="Notifications"
        aria-expanded={open}
      >
        <span className="indicator">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          {unread > 0 && (
            <span className="badge badge-xs badge-primary indicator-item">{unread}</span>
          )}
        </span>
      </button>
      {open && (
        <div
          tabIndex={0}
          className="dropdown-content z-[1] mt-2 w-80 rounded-box border border-base-300 bg-base-100 p-0 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-base-200 px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={markReadMutation.isPending}
                onClick={() => markAllVisibleRead()}
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="menu max-h-80 flex-nowrap overflow-y-auto p-2">
            {listQuery.isLoading && (
              <li className="disabled">
                <span className="loading loading-spinner loading-sm" />
              </li>
            )}
            {listQuery.isError && (
              <li className="px-2 py-1 text-sm text-error">Could not load.</li>
            )}
            {!listQuery.isLoading && items.length === 0 && (
              <li className="px-2 py-2 text-sm opacity-70">No notifications</li>
            )}
            {items.map((i) => (
              <li key={i.id}>
                <div className="flex flex-col items-start gap-0 py-2">
                  <span className={`text-sm font-medium ${!i.read ? '' : 'opacity-60'}`}>
                    {i.title}
                  </span>
                  <span className="text-xs opacity-60 line-clamp-2">{i.body}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
