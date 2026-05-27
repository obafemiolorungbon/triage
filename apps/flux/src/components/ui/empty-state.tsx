import type { ReactNode } from 'react';

type EmptyStateVariant =
  | 'tickets'
  | 'filtered'
  | 'widgets'
  | 'kb'
  | 'notifications'
  | 'similar'
  | 'external'
  | 'kanban'
  | 'generic';

type EmptyStateTone = 'surface' | 'plain' | 'compact';

export function EmptyState({
  variant = 'generic',
  title,
  description,
  actions,
  tone = 'surface',
  className = '',
}: {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  actions?: ReactNode;
  tone?: EmptyStateTone;
  className?: string;
}) {
  if (tone === 'compact') {
    return (
      <div
        className={`rounded-xl border border-dashed border-paper-100/10 bg-paper-100/[0.018] px-3 py-5 text-center ${className}`}
      >
        <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-paper-100/[0.045] text-paper-300 ring-1 ring-paper-100/[0.08]">
          <EmptyIcon variant={variant} small />
        </div>
        <p className="text-xs font-medium text-paper-200">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-[15rem] text-2xs leading-5 text-paper-500">
            {description}
          </p>
        )}
        {actions && <div className="mt-3 flex justify-center gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <section
      className={`relative overflow-hidden rounded-2xl ${
        tone === 'surface' ? 'surface p-7 md:p-10' : 'p-4'
      } ${className}`}
    >
      {tone === 'surface' && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(520px 260px at 50% -8%, rgba(184,214,107,0.10), transparent 65%)',
          }}
        />
      )}
      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="relative mb-5">
          <div
            aria-hidden
            className="absolute inset-[-10px] rounded-[1.35rem] bg-lime/5 blur-xl"
          />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-100/[0.055] text-lime ring-1 ring-paper-100/[0.1]">
            <EmptyIcon variant={variant} />
          </div>
        </div>
        <h3 className="text-xl font-medium tracking-tight text-paper-50">{title}</h3>
        {description && (
          <p className="mt-2 max-w-md text-sm leading-6 text-paper-400">
            {description}
          </p>
        )}
        {actions && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyIcon({
  variant,
  small = false,
}: {
  variant: EmptyStateVariant;
  small?: boolean;
}) {
  const size = small ? 18 : 24;
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: small ? 1.8 : 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (variant === 'widgets') {
    return (
      <svg {...common}>
        <path d="M5 7.5h14" />
        <path d="M7 4.5h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3Z" />
        <path d="M8 12h5" />
        <path d="M8 15h8" />
      </svg>
    );
  }
  if (variant === 'kb') {
    return (
      <svg {...common}>
        <path d="M6.5 4.5h8A3.5 3.5 0 0 1 18 8v11.5H8A3.5 3.5 0 0 1 4.5 16V6.5a2 2 0 0 1 2-2Z" />
        <path d="M8 8h6" />
        <path d="M8 11h5" />
        <path d="M8 14.5h7" />
      </svg>
    );
  }
  if (variant === 'notifications') {
    return (
      <svg {...common}>
        <path d="M6.5 10.5a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5Z" />
        <path d="M10 19a2.2 2.2 0 0 0 4 0" />
      </svg>
    );
  }
  if (variant === 'external') {
    return (
      <svg {...common}>
        <path d="M8 7h-1.5A2.5 2.5 0 0 0 4 9.5v8A2.5 2.5 0 0 0 6.5 20h8a2.5 2.5 0 0 0 2.5-2.5V16" />
        <path d="M13 4h7v7" />
        <path d="M11 13 20 4" />
      </svg>
    );
  }
  if (variant === 'similar' || variant === 'filtered') {
    return (
      <svg {...common}>
        <path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L20 20" />
        <path d="M8.5 10.5h5" />
        <path d="M8.5 13.5h3" />
      </svg>
    );
  }
  if (variant === 'kanban') {
    return (
      <svg {...common}>
        <path d="M5 5.5h4v13H5z" />
        <path d="M10 5.5h4v8h-4z" />
        <path d="M15 5.5h4v10h-4z" />
      </svg>
    );
  }
  if (variant === 'tickets') {
    return (
      <svg {...common}>
        <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 16.5z" />
        <path d="M8 9h8" />
        <path d="M8 12h5" />
        <path d="M8 15h6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
