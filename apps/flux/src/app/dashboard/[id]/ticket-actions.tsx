'use client';

import type { ExternalIssueProvider, TicketStatus } from '@triage/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { browserTicketsClient } from '../../../lib/tickets-browser-client';

export function TicketActions({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const client = browserTicketsClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
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

  const issueMutation = useMutation({
    mutationFn: (provider: ExternalIssueProvider) =>
      client.createExternalIssue(id, provider),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={patchMutation.isPending}
          onClick={() => patchMutation.mutate('claimed')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2 6l3 3L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Claim
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={patchMutation.isPending}
          onClick={() => patchMutation.mutate('resolved')}
          style={{
            background: 'rgba(74, 222, 128, 0.08)',
            color: '#4ADE80',
            boxShadow: 'inset 0 0 0 1px rgba(74, 222, 128, 0.25)',
          }}
        >
          Resolve
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={patchMutation.isPending}
          onClick={() => patchMutation.mutate('in_progress')}
        >
          In progress
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={patchMutation.isPending}
          onClick={() => patchMutation.mutate('rejected')}
        >
          Reject
        </button>
      </div>

      {patchMutation.isError && (
        <div
          className="rounded-lg px-3 py-2 text-xs text-[#FF9999]"
          style={{
            background: 'rgba(255, 94, 94, 0.08)',
            boxShadow: 'inset 0 0 0 1px rgba(255, 94, 94, 0.25)',
          }}
        >
          {String(patchMutation.error)}
        </div>
      )}

      <div className="rule" />

      <div className="flex flex-col gap-3">
        <span className="text-2xs font-mono uppercase tracking-wider text-paper-500">
          External issue
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={issueMutation.isPending}
            onClick={() => issueMutation.mutate('linear')}
          >
            Linear
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={issueMutation.isPending}
            onClick={() => issueMutation.mutate('jira')}
          >
            Jira
          </button>
        </div>
        {issueMutation.isError && (
          <div
            className="rounded-lg px-3 py-2 text-xs text-[#FF9999]"
            style={{
              background: 'rgba(255, 94, 94, 0.08)',
              boxShadow: 'inset 0 0 0 1px rgba(255, 94, 94, 0.25)',
            }}
          >
            {String(issueMutation.error)}
          </div>
        )}
      </div>

      <div className="rule" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-mono uppercase tracking-wider text-paper-500">
            Comment
          </span>
          <span className="text-2xs font-mono text-paper-500 tabular-nums">
            {comment.length}
          </span>
        </div>
        <textarea
          className="textarea min-h-24 !text-sm"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary btn-sm w-full"
          disabled={commentMutation.isPending || !comment.trim()}
          onClick={() => commentMutation.mutate(comment.trim())}
        >
          {commentMutation.isPending ? '…' : 'Post'}
        </button>
        {commentMutation.isError && (
          <div
            className="rounded-lg px-3 py-2 text-xs text-[#FF9999]"
            style={{
              background: 'rgba(255, 94, 94, 0.08)',
              boxShadow: 'inset 0 0 0 1px rgba(255, 94, 94, 0.25)',
            }}
          >
            {String(commentMutation.error)}
          </div>
        )}
      </div>
    </div>
  );
}
