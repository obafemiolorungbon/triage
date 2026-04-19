'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getPublicApiBase } from '../../../lib/api-base';

export function TicketActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');

  async function post(path: string, body?: object) {
    setBusy(true);
    try {
      const r = await fetch(`${getPublicApiBase()}${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) throw new Error(await r.text());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => post(`/api/v1/feedback/${id}/claim`)}
        >
          Claim
        </button>
        <button
          type="button"
          className="btn btn-success btn-sm"
          disabled={busy}
          onClick={() => post(`/api/v1/feedback/${id}/resolve`)}
        >
          Resolve
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <textarea
          className="textarea textarea-bordered"
          placeholder="Add an internal comment…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-outline btn-sm w-fit"
          disabled={busy || !comment.trim()}
          onClick={() =>
            post(`/api/v1/feedback/${id}/comments`, { body: comment })
          }
        >
          Post comment
        </button>
      </div>
    </div>
  );
}
