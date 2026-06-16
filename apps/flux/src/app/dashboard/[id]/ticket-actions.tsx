'use client';

import type { ExternalIssueProvider, TicketStatus } from '@triage/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { browserTicketsClient } from '../../../lib/tickets-browser-client';

export function TicketActions({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [dialog, setDialog] = useState<null | 'claim' | 'resolve' | 'reject'>(
    null,
  );
  const client = browserTicketsClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    queryClient.invalidateQueries({ queryKey: ['ticket', id, 'comments'] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
  };

  const patchMutation = useMutation({
    mutationFn: (status: TicketStatus) =>
      client.patchTicketStatus(id, { status }),
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
      <div className="space-y-2">
        <button
          type="button"
          className="btn-primary btn-sm w-full"
          disabled={patchMutation.isPending}
          onClick={() => setDialog('claim')}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
          >
            <path
              d="M2 6l3 3L10 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Claim
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm w-full"
          disabled={patchMutation.isPending}
          onClick={() => patchMutation.mutate('in_progress')}
        >
          Move to in progress
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={patchMutation.isPending}
          onClick={() => setDialog('resolve')}
          style={{
            background: 'rgba(74, 222, 128, 0.08)',
            color: '#4ADE80',
            boxShadow: 'inset 0 0 0 1px rgba(74, 222, 128, 0.25)',
          }}
        >
          Resolve
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={patchMutation.isPending}
          onClick={() => setDialog('reject')}
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
          Engineering handoff
        </span>
        <p className="text-xs leading-5 text-paper-500">
          Create a linked issue with the feedback text and triage context.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={issueMutation.isPending}
            onClick={() => issueMutation.mutate('linear')}
          >
            Send to Linear
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={issueMutation.isPending}
            onClick={() => issueMutation.mutate('jira')}
          >
            Send to Jira
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
          {commentMutation.isPending ? 'Posting' : 'Post'}
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

      {dialog && (
        <ActionDialog
          kind={dialog}
          busy={patchMutation.isPending}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            const nextStatus: TicketStatus =
              dialog === 'claim'
                ? 'claimed'
                : dialog === 'resolve'
                  ? 'resolved'
                  : 'rejected';
            patchMutation.mutate(nextStatus, {
              onSuccess: () => setDialog(null),
            });
          }}
        />
      )}
    </div>
  );
}

function ActionDialog({
  kind,
  busy,
  onCancel,
  onConfirm,
}: {
  kind: 'claim' | 'resolve' | 'reject';
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = {
    claim: {
      title: 'Claim this ticket?',
      body: 'Claiming moves the ticket into your work queue and signals that you are handling it. It does not resolve the issue or notify the submitter.',
      confirm: 'Claim ticket',
    },
    resolve: {
      title: 'Resolve this ticket?',
      body: 'Resolve only when the feedback has been handled or no further internal action is needed.',
      confirm: 'Resolve ticket',
    },
    reject: {
      title: 'Reject this ticket?',
      body: 'Rejecting closes this item as not actionable. The ticket remains in history for reporting and audit.',
      confirm: 'Reject ticket',
    },
  }[kind];

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink-950/72 px-4 backdrop-blur-[2px]">
      <div
        role={kind === 'claim' ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        className="surface-raised w-full max-w-sm rounded-xl p-5"
      >
        <h3 className="text-base font-medium text-paper-50">{copy.title}</h3>
        <p className="mt-2 text-sm leading-6 text-paper-400">{copy.body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-ghost btn-sm text-paper-400"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={
              kind === 'claim' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'
            }
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working' : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
