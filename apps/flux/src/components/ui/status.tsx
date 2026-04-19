import type { TicketStatus } from '@triage/api-client';

export type Priority = 'low' | 'med' | 'high' | 'urgent';

const STATUS_META: Record<TicketStatus, { label: string; color: string }> = {
  new: { label: 'New', color: '#60A5FA' },
  triaged: { label: 'Triaged', color: '#D9FF4D' },
  claimed: { label: 'Claimed', color: '#FFA94D' },
  in_progress: { label: 'In progress', color: '#C084FC' },
  resolved: { label: 'Resolved', color: '#4ADE80' },
  rejected: { label: 'Rejected', color: '#6B665A' },
};

const PRIORITY_META: Record<Priority, { label: string; color: string; pulse: boolean }> = {
  urgent: { label: 'Urgent', color: '#FF5E5E', pulse: true },
  high: { label: 'High', color: '#FF9F43', pulse: false },
  med: { label: 'Med', color: '#FFD43B', pulse: false },
  low: { label: 'Low', color: '#8C8678', pulse: false },
};

export function StatusDot({
  status,
  size = 8,
  glow = false,
}: {
  status: TicketStatus;
  size?: number;
  glow?: boolean;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: meta.color,
        boxShadow: glow ? `0 0 12px -2px ${meta.color}` : undefined,
      }}
      aria-hidden
    />
  );
}

export function StatusPill({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 h-6 text-xs font-medium tracking-tight"
      style={{
        background: `${meta.color}14`,
        color: meta.color,
        boxShadow: `inset 0 0 0 1px ${meta.color}33`,
      }}
    >
      <StatusDot status={status} size={6} />
      {meta.label}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: Priority | null | undefined }) {
  if (!priority) {
    return <span className="text-paper-500 text-xs font-mono">—</span>;
  }
  const meta = PRIORITY_META[priority];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 h-6 text-xs font-medium tracking-tight"
      style={{
        background: `${meta.color}14`,
        color: meta.color,
        boxShadow: `inset 0 0 0 1px ${meta.color}33`,
      }}
    >
      <span className="relative flex w-1.5 h-1.5">
        {meta.pulse && (
          <span
            className="absolute inset-0 rounded-full animate-pulse-soft"
            style={{ background: meta.color, opacity: 0.6 }}
          />
        )}
        <span
          className="relative w-1.5 h-1.5 rounded-full"
          style={{ background: meta.color }}
        />
      </span>
      {meta.label}
    </span>
  );
}

export function TagPill({ children }: { children: React.ReactNode }) {
  return <span className="pill">{children}</span>;
}
