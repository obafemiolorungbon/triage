'use client';

import { useEffect, useState } from 'react';
import { getPublicApiBase } from '../../lib/api-base';

type Row = { id: string; title: string; read: boolean; createdAt: string };

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Row[]>([]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const r = await fetch(`${getPublicApiBase()}/api/v1/notifications`, {
        credentials: 'include',
      });
      if (r.ok) {
        setItems((await r.json()) as Row[]);
      }
    })();
  }, [open]);

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        className="btn btn-ghost btn-circle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
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
            <span className="badge badge-xs badge-primary indicator-item">
              {unread}
            </span>
          )}
        </span>
      </button>
      {open && (
        <ul
          tabIndex={0}
          className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-72 max-h-80 overflow-y-auto border border-base-300"
        >
          {items.length === 0 ? (
            <li className="px-2 py-1 text-sm opacity-70">No notifications</li>
          ) : (
            items.map((i) => (
              <li key={i.id}>
                <span className="text-xs">{i.title}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
