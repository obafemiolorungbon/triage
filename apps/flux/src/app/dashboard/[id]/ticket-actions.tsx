'use client';

import type { TicketStatus } from '@triage/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { browserTicketsClient } from '../../../lib/tickets-browser-client';

export function TicketActions({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const client = browserTicketsClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    void queryClient.invalidateQueries({ queryKey: ['tickets'] });
  };

  const patchMutation = useMutation({
    mutationFn: (status: TicketStatus) => client.patchTicketStatus(id, { status }),
    onSuccess: invalidate,
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => client.addTicketComment(id, { body }),
    onSuccess: () => {
      setComment('');
      invalidate();
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={patchMutation.isPending}
          onClick={() => patchMutation.mutate('claimed')}
        >
          Claim
        </button>
        <button
          type="button"
          className="btn btn-success btn-sm"
          disabled={patchMutation.isPending}
          onClick={() => patchMutation.mutate('resolved')}
        >
          Resolve
        </button>
      </div>
      {patchMutation.isError && (
        <div className="alert alert-error alert-sm text-sm">{String(patchMutation.error)}</div>
      )}
      <div className="divider my-0 text-xs">Comments</div>
      <div className="flex flex-col gap-2">
        <textarea
          className="textarea textarea-bordered min-h-24"
          placeholder="Add an internal comment…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-outline btn-sm w-fit"
          disabled={commentMutation.isPending || !comment.trim()}
          onClick={() => commentMutation.mutate(comment.trim())}
        >
          Post comment
        </button>
      </div>
      {commentMutation.isError && (
        <div className="alert alert-error alert-sm text-sm">
          {String(commentMutation.error)}
        </div>
      )}
    </div>
  );
}
