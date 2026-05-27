'use client';

import type { TicketDto } from '@triage/api-client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { browserTicketsClient } from '../../../lib/tickets-browser-client';
import { EmptyState } from '../../../components/ui/empty-state';
import { EscalationPill, StatusPill } from '../../../components/ui/status';
import { TicketActions } from './ticket-actions';

export function TicketDetailView({ id }: { id: string }) {
  const client = browserTicketsClient();

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
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <h1 className="text-2xl text-paper-50 font-medium">Not found</h1>
        <Link href="/dashboard" className="btn-secondary mt-6 inline-flex">
          ← Queue
        </Link>
      </div>
    );
  }

  const f: TicketDto = ticketQuery.data;
  const similar = similarQuery.data?.items ?? [];

  return (
    <div className="stagger">
      {/* ===== Back link ===== */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-paper-500 hover:text-lime transition-colors mb-8 cursor-pointer"
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

      {/* ===== Main grid ===== */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* -- Left: content -- */}
        <article className="lg:col-span-2 space-y-8">
          {/* Header */}
          <header>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <StatusPill status={f.status} />
              <EscalationPill tier={f.escalationTier} />
              {f.category && (
                <span className="pill">{f.category}</span>
              )}
              {f.sentiment && (
                <span className="pill">sentiment: {f.sentiment}</span>
              )}
              {f.submissionType && (
                <span className="pill">type: {f.submissionType}</span>
              )}
              {f.severity && (
                <span className="pill">severity: {f.severity}</span>
              )}
              {f.knowledgeGap && (
                <span className="pill pill-accent">knowledge gap</span>
              )}
              {f.isNoise && (
                <span
                  className="pill"
                  style={{
                    color: '#FFA94D',
                    background: 'rgba(255,169,77,0.08)',
                    boxShadow: 'inset 0 0 0 1px rgba(255,169,77,0.2)',
                  }}
                >
                  noise
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl tracking-tightest text-paper-50 text-balance leading-[1.05]">
              {f.category ? (
                <span>{f.category}</span>
              ) : (
                <span className="text-paper-300">Ticket</span>
              )}
            </h1>
            <p className="mt-4 text-sm text-paper-400 flex flex-wrap gap-x-4 gap-y-1 font-mono">
              <span>
                <span className="text-paper-500">from</span>{' '}
                <span className="text-paper-200">{f.submitterEmail}</span>
              </span>
              <span>
                <span className="text-paper-500">id</span>{' '}
                <span className="text-paper-300">{f.id.slice(0, 12)}</span>
              </span>
              <span>
                <span className="text-paper-500">received</span>{' '}
                <span className="text-paper-300">
                  {new Date(f.createdAt).toLocaleString()}
                </span>
              </span>
              {f.triagedAt && (
                <span>
                  <span className="text-paper-500">triaged</span>{' '}
                  <span className="text-paper-300">
                    {new Date(f.triagedAt).toLocaleString()}
                  </span>
                </span>
              )}
            </p>
          </header>

          {/* Cleaned text */}
          <section>
            <SectionHead num="01" label="Cleaned text" />
            <div className="mt-4 surface rounded-xl p-6">
              <p className="text-paper-100 leading-relaxed whitespace-pre-wrap text-[15px]">
                {f.cleanedText ?? (
                  <span className="text-paper-500">—</span>
                )}
              </p>
            </div>
          </section>

          {/* Raw */}
          <section>
            <RawCollapse raw={f.rawText} />
          </section>

          {(f.attachments ?? []).length > 0 && (
            <section>
              <SectionHead num="02" label="Images" />
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                {(f.attachments ?? []).map((attachment) => (
                  <AttachmentPreview
                    key={attachment.id}
                    ticketId={f.id}
                    attachment={attachment}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Similar tickets */}
          <section>
            <SectionHead num={(f.attachments ?? []).length > 0 ? '03' : '02'} label="Similar" />
            {similarQuery.isLoading ? (
              <div className="mt-4 flex items-center gap-2 text-paper-500 text-sm">
                <span className="spinner !w-3.5 !h-3.5" />
                …
              </div>
            ) : similar.length === 0 ? (
              <EmptyState
                variant="similar"
                tone="compact"
                title="No close matches"
                description="New related feedback will appear here once the queue has enough signal."
                className="mt-4"
              />
            ) : (
              <ul className="mt-4 surface rounded-xl divide-y divide-paper-100/5 overflow-hidden">
                {similar.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/dashboard/${s.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-paper-100/[0.03] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-paper-300">
                          {s.id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <SimilarityMeter score={s.score} />
                        <span className="text-xs font-mono text-paper-500 tabular-nums">
                          {Math.round(s.score * 100)}%
                        </span>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 12 12"
                          fill="none"
                          className="text-paper-500 group-hover:text-lime transition-colors"
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
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </article>

        {/* -- Right: sticky action rail -- */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="sticky top-20 space-y-6">
            <div className="surface rounded-xl p-5">
              <SectionHead num="·" label="Actions" />
              <div className="mt-4">
                <TicketActions id={id} />
              </div>
            </div>

            {/* Quick facts */}
            <div className="surface rounded-xl p-5">
              <SectionHead num="·" label="Metadata" />
              <dl className="mt-4 space-y-3 text-sm">
                <Fact label="Status" value={<StatusPill status={f.status} />} />
                <Fact
                  label="Escalation"
                  value={<EscalationPill tier={f.escalationTier} />}
                />
                {f.escalationReason && (
                  <Fact
                    label="Reason"
                    value={
                      <span className="text-xs text-paper-300 text-right">
                        {f.escalationReason}
                      </span>
                    }
                  />
                )}
                <Fact
                  label="Sentiment"
                  value={
                    f.sentiment ? (
                      <span className="text-paper-200 capitalize">{f.sentiment}</span>
                    ) : (
                      <span className="text-paper-500 font-mono">—</span>
                    )
                  }
                />
                <Fact
                  label="Assigned"
                  value={
                    f.assignedAgentId ? (
                      <span className="font-mono text-xs text-paper-200">
                        {f.assignedAgentId.slice(0, 8)}
                      </span>
                    ) : (
                      <span className="text-paper-500 font-mono">unassigned</span>
                    )
                  }
                />
                <Fact
                  label="Resolved"
                  value={
                    f.resolvedAt ? (
                      <span className="font-mono text-xs text-paper-300">
                        {new Date(f.resolvedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-paper-500 font-mono">—</span>
                    )
                  }
                />
              </dl>
            </div>

            <div className="surface rounded-xl p-5">
              <SectionHead num="-" label="External" />
              <div className="mt-4 space-y-2">
                {(f.externalIssueLinks ?? []).length === 0 ? (
                  <EmptyState
                    variant="external"
                    tone="compact"
                    title="No linked issues"
                    description="Create a Linear or Jira issue from the action panel when this needs engineering follow-up."
                  />
                ) : (
                  (f.externalIssueLinks ?? []).map((link) => (
                    <a
                      key={link.id}
                      href={link.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg px-3 py-2 bg-paper-100/[0.03] hover:bg-paper-100/[0.06] transition-colors cursor-pointer"
                    >
                      <span className="text-sm text-paper-100 capitalize">
                        {link.provider}
                      </span>
                      <span className="text-2xs font-mono text-paper-500">
                        {link.externalKey ?? link.externalId.slice(0, 8)} / {link.creationMode}
                      </span>
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionHead({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-2xs font-mono uppercase tracking-[0.18em] text-paper-500">
      <span className="text-lime">{num}</span>
      <span className="h-px w-6 bg-paper-500/40" />
      <span>{label}</span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-2xs font-mono uppercase tracking-wider text-paper-500">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function SimilarityMeter({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(1, score));
  return (
    <div className="w-16 h-1 rounded-full bg-paper-100/[0.06] overflow-hidden">
      <div
        className="h-full bg-lime"
        style={{ width: `${pct * 100}%`, boxShadow: '0 0 8px rgba(217,255,77,0.5)' }}
      />
    </div>
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
          // Signed URLs are short-lived and generated per authenticated viewer.
          <img
            src={urlQuery.data.url}
            alt={attachment.fileName ?? 'Feedback attachment'}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full grid place-items-center">
            <span className="spinner" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <span className="min-w-0 truncate text-sm text-paper-200">
          {attachment.fileName ?? 'Image'}
        </span>
        <span className="text-2xs font-mono text-paper-500">
          {Math.round(attachment.sizeBytes / 1024)}KB
        </span>
      </div>
    </a>
  );
}

function RawCollapse({ raw }: { raw: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="surface rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-5 py-3 hover:bg-paper-100/[0.03] transition-colors cursor-pointer"
      >
        <span className="text-xs font-mono uppercase tracking-wider text-paper-400">
          Raw
        </span>
        <svg
          viewBox="0 0 12 12"
          fill="none"
          className={`w-3 h-3 text-paper-500 transition-transform ${open ? 'rotate-180' : ''}`}
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
        <div className="px-5 pb-5 pt-1 border-t border-paper-100/5">
          <pre className="text-sm text-paper-300 whitespace-pre-wrap font-mono leading-relaxed">
            {raw}
          </pre>
        </div>
      )}
    </div>
  );
}
