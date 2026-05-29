'use client';

import type { TicketDto } from '@triage/api-client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { browserTicketsClient } from '../../../lib/tickets-browser-client';
import { EmptyState } from '../../../components/ui/empty-state';
import { EscalationPill, StatusPill } from '../../../components/ui/status';
import { TicketActions } from './ticket-actions';

type DetailMode = 'page' | 'drawer';

export function TicketDetailView({
  id,
  mode = 'page',
}: {
  id: string;
  mode?: DetailMode;
}) {
  const client = browserTicketsClient();
  const isDrawer = mode === 'drawer';

  const ticketQuery = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => client.getTicket(id),
  });

  const similarQuery = useQuery({
    queryKey: ['ticket', id, 'similar'],
    queryFn: () => client.getSimilarTickets(id),
    enabled: !!id && ticketQuery.isSuccess,
  });

  if (ticketQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <span className="spinner" />
      </div>
    );
  }

  if (ticketQuery.isError || !ticketQuery.data) {
    return (
      <div className="mx-auto mt-16 max-w-2xl text-center">
        <h1 className="text-2xl font-medium text-paper-50">Not found</h1>
        <Link href="/dashboard" className="btn-secondary mt-6 inline-flex">
          Back to queue
        </Link>
      </div>
    );
  }

  const ticket: TicketDto = ticketQuery.data;
  const similar = similarQuery.data?.items ?? [];
  const title = ticket.category || ticket.submissionType || 'Feedback';
  const primaryText = ticket.cleanedText || ticket.rawText;

  return (
    <div className={isDrawer ? 'space-y-5' : 'space-y-7'}>
      {!isDrawer && (
        <Link
          href="/dashboard"
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-paper-500 transition-colors hover:text-lime"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M9.5 6h-7M6 2.5L2.5 6 6 9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Queue
        </Link>
      )}

      <header className="border-b border-paper-100/[0.075] pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={ticket.status} />
          <EscalationPill tier={ticket.escalationTier} />
          {ticket.knowledgeGap && <span className="pill pill-accent">knowledge gap</span>}
          {ticket.isNoise && <NoisePill />}
        </div>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-2xs uppercase tracking-wider text-paper-500">
              {ticket.shortId || ticket.id.slice(0, 8)}
            </p>
            <h1
              className={`mt-1 font-semibold leading-[1.04] tracking-tightest text-paper-50 text-balance ${
                isDrawer ? 'text-3xl' : 'text-4xl md:text-5xl'
              }`}
            >
              {sentenceCase(title)}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {ticket.sentiment && <span className="pill">sentiment: {ticket.sentiment}</span>}
            {ticket.submissionType && <span className="pill">type: {ticket.submissionType}</span>}
            {ticket.severity && <span className="pill">severity: {ticket.severity}</span>}
          </div>
        </div>
      </header>

      <div className={`grid gap-5 ${isDrawer ? '' : 'xl:grid-cols-[minmax(0,1fr)_360px]'}`}>
        <main className="min-w-0 space-y-5">
          <section className="surface rounded-xl p-5 md:p-6">
            <PanelTitle title="Feedback" eyebrow="Customer signal" />
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-paper-100">
              {primaryText || <span className="text-paper-500">No feedback text captured.</span>}
            </p>
          </section>

          {ticket.escalationReason && (
            <section className="rounded-xl border border-escalation-expedite/25 bg-escalation-expedite/[0.07] p-5">
              <PanelTitle title="Why this was escalated" eyebrow={ticket.escalationTier} />
              <p className="mt-3 text-sm leading-6 text-paper-200">
                {ticket.escalationReason}
              </p>
            </section>
          )}

          {(ticket.attachments ?? []).length > 0 && (
            <section className="surface rounded-xl p-5">
              <PanelTitle title="Attachments" eyebrow={`${ticket.attachments?.length ?? 0} files`} />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(ticket.attachments ?? []).map((attachment) => (
                  <AttachmentPreview
                    key={attachment.id}
                    ticketId={ticket.id}
                    attachment={attachment}
                  />
                ))}
              </div>
            </section>
          )}

          <RawCollapse raw={ticket.rawText} />

          <SimilarTickets
            isLoading={similarQuery.isLoading}
            items={similar}
          />
        </main>

        <aside className="min-w-0 space-y-5">
          <section className="surface rounded-xl p-5">
            <PanelTitle title="Actions" eyebrow="Workflow" />
            <div className="mt-4">
              <TicketActions id={id} />
            </div>
          </section>

          <section className="surface rounded-xl p-5">
            <PanelTitle title="Overview" eyebrow="Routing facts" />
            <dl className="mt-4 divide-y divide-paper-100/[0.055]">
              <Fact label="From" value={ticket.submitterEmail} />
              <Fact label="Received" value={formatDateTime(ticket.createdAt)} />
              <Fact label="Triaged" value={ticket.triagedAt ? formatDateTime(ticket.triagedAt) : 'Not yet'} />
              <Fact label="Assigned" value={ticket.assignedAgentId ? ticket.assignedAgentId.slice(0, 8) : 'Unassigned'} />
              <Fact label="Resolved" value={ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : 'Open'} />
              {ticket.sourceTitle && <Fact label="Source" value={ticket.sourceTitle} />}
              {ticket.sourceUrl && (
                <Fact
                  label="URL"
                  value={
                    <a
                      href={ticket.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-lime transition-colors hover:text-lime-bright"
                    >
                      Open source
                    </a>
                  }
                />
              )}
            </dl>
          </section>

          <section className="surface rounded-xl p-5">
            <PanelTitle title="External issues" eyebrow="Engineering handoff" />
            <div className="mt-4 space-y-2">
              {(ticket.externalIssueLinks ?? []).length === 0 ? (
                <EmptyState
                  variant="external"
                  tone="compact"
                  title="No linked issues"
                  description="Use the handoff actions to create a linked engineering issue with this ticket context."
                />
              ) : (
                (ticket.externalIssueLinks ?? []).map((link) => (
                  <a
                    key={link.id}
                    href={link.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-paper-100/[0.035] px-3 py-2 transition-colors hover:bg-paper-100/[0.065]"
                  >
                    <span className="text-sm font-medium text-paper-100">
                      {providerName(link.provider)} issue
                    </span>
                    <span className="shrink-0 font-mono text-2xs text-paper-500">
                      {link.externalKey ?? link.externalId.slice(0, 8)}
                    </span>
                  </a>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PanelTitle({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div>
      <p className="font-mono text-2xs uppercase tracking-wider text-paper-500">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-base font-medium text-paper-50">{title}</h2>
    </div>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0">
      <dt className="font-mono text-2xs uppercase tracking-wider text-paper-500">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm text-paper-200">{value}</dd>
    </div>
  );
}

function SimilarTickets({
  isLoading,
  items,
}: {
  isLoading: boolean;
  items: { id: string; score: number }[];
}) {
  return (
    <section className="surface rounded-xl p-5">
      <PanelTitle title="Similar feedback" eyebrow="Pattern check" />
      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-paper-500">
          <span className="spinner !h-3.5 !w-3.5" />
          Loading matches
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          variant="similar"
          tone="compact"
          title="No close matches"
          description="Related feedback will appear here once the queue has enough signal."
          className="mt-4"
        />
      ) : (
        <ul className="mt-4 divide-y divide-paper-100/[0.055]">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/dashboard/${item.id}`}
                className="group flex cursor-pointer items-center justify-between gap-4 py-3"
              >
                <span className="font-mono text-xs text-paper-300">{item.id.slice(0, 8)}</span>
                <span className="flex items-center gap-3">
                  <SimilarityMeter score={item.score} />
                  <span className="font-mono text-2xs tabular-nums text-paper-500">
                    {Math.round(item.score * 100)}%
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SimilarityMeter({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(1, score));
  return (
    <span className="block h-1 w-16 overflow-hidden rounded-full bg-paper-100/[0.06]">
      <span className="block h-full bg-lime" style={{ width: `${pct * 100}%` }} />
    </span>
  );
}

function AttachmentPreview({
  ticketId,
  attachment,
}: {
  ticketId: string;
  attachment: NonNullable<TicketDto['attachments']>[number];
}) {
  const client = browserTicketsClient();
  const urlQuery = useQuery({
    queryKey: ['ticket', ticketId, 'attachment-url', attachment.id],
    queryFn: () => client.getTicketAttachmentUrl(ticketId, attachment.id),
  });

  return (
    <a
      href={urlQuery.data?.url ?? '#'}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-xl bg-paper-100/[0.04] ring-1 ring-paper-100/10"
    >
      <div className="aspect-video bg-ink-800">
        {urlQuery.data?.url ? (
          <img
            src={urlQuery.data.url}
            alt={attachment.fileName ?? 'Feedback attachment'}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <span className="spinner" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <span className="min-w-0 truncate text-sm text-paper-200">
          {attachment.fileName ?? 'Image'}
        </span>
        <span className="font-mono text-2xs text-paper-500">
          {Math.round(attachment.sizeBytes / 1024)}KB
        </span>
      </div>
    </a>
  );
}

function RawCollapse({ raw }: { raw: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="surface overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-5 py-3 text-left transition-colors hover:bg-paper-100/[0.03]"
      >
        <span>
          <span className="block font-mono text-2xs uppercase tracking-wider text-paper-500">
            Original submission
          </span>
          <span className="text-sm text-paper-300">Show the unprocessed text</span>
        </span>
        <svg
          viewBox="0 0 12 12"
          fill="none"
          className={`h-3 w-3 text-paper-500 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="border-t border-paper-100/5 px-5 pb-5 pt-4">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-paper-300">
            {raw || 'No raw text captured.'}
          </pre>
        </div>
      )}
    </section>
  );
}

function NoisePill() {
  return (
    <span
      className="pill"
      style={{
        color: '#E7B46A',
        background: 'rgba(217,154,61,0.09)',
        boxShadow: 'inset 0 0 0 1px rgba(217,154,61,0.2)',
      }}
    >
      noise
    </span>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ');
}

function providerName(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
