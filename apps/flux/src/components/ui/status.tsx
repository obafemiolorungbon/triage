import type { EscalationTier, TicketStatus } from '@triage/api-client';

/** 6-char #RRGGBB -> rgba(..., a) for readable pills on dark UI */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const STATUS_META: Record<TicketStatus, { label: string; color: string }> = {
  new: { label: 'New', color: '#8FB3C8' },
  triaged: { label: 'Triaged', color: '#B8D66B' },
  claimed: { label: 'Claimed', color: '#D99A3D' },
  in_progress: { label: 'In progress', color: '#B9A66A' },
  resolved: { label: 'Resolved', color: '#7CBF8B' },
  rejected: { label: 'Rejected', color: '#756D61' },
};

const ESCALATION_META: Record<
  EscalationTier,
  { label: string; color: string; pulse: boolean }
> = {
  critical: { label: 'Critical', color: '#E66A5C', pulse: true },
  expedite: { label: 'Expedite', color: '#D99A3D', pulse: false },
  watch: { label: 'Watch', color: '#D8C45D', pulse: false },
  none: { label: 'None', color: '#A49B8E', pulse: false },
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
        boxShadow: glow ? `0 10px 20px -14px ${meta.color}` : undefined,
      }}
      aria-hidden
    />
  );
}

export function StatusPill({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-xs font-medium tracking-tight text-paper-100"
      style={{
        background: hexToRgba(meta.color, 0.2),
        boxShadow: `inset 0 0 0 1px ${hexToRgba(meta.color, 0.42)}`,
      }}
    >
      <StatusDot status={status} size={6} />
      {meta.label}
    </span>
  );
}

export function EscalationPill({
  tier,
}: {
  tier: EscalationTier | null | undefined;
}) {
  const meta = ESCALATION_META[tier ?? 'none'];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-xs font-medium tracking-tight text-paper-100"
      style={{
        background: hexToRgba(meta.color, 0.2),
        boxShadow: `inset 0 0 0 1px ${hexToRgba(meta.color, 0.42)}`,
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
