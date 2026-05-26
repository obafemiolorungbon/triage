'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

type Tab = {
  label: string;
  href: string;
  description: string;
  icon: 'queue' | 'mine' | 'widgets' | 'kb' | 'settings';
  match: (p: string, sp: URLSearchParams) => boolean;
};

const TABS: Tab[] = [
  {
    label: 'Queue',
    href: '/dashboard',
    description: 'All incoming feedback',
    icon: 'queue',
    match: (p, sp) =>
      p === '/dashboard' && !sp.get('assignedMe') && !sp.get('knowledgeOnly'),
  },
  {
    label: 'Mine',
    href: '/dashboard/mine',
    description: 'Claimed work',
    icon: 'mine',
    match: (p, sp) => p.startsWith('/dashboard/mine') || sp.get('assignedMe') === 'true',
  },
  {
    label: 'Widgets',
    href: '/dashboard/widgets',
    description: 'Embeds and forms',
    icon: 'widgets',
    match: (p) => p.startsWith('/dashboard/widgets'),
  },
  {
    label: 'KB',
    href: '/dashboard/kb',
    description: 'Deflection content',
    icon: 'kb',
    match: (p) => p.startsWith('/dashboard/kb'),
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    description: 'Workspace controls',
    icon: 'settings',
    match: (p) => p.startsWith('/dashboard/settings'),
  }
];

export function DashboardNav({ variant = 'top' }: { variant?: 'top' | 'side' }) {
  const pathname = usePathname();
  const sp = useSearchParams();

  if (variant === 'side') {
    return (
      <nav className="space-y-1" aria-label="Dashboard sections">
        {TABS.map((tab) => {
          const active = tab.match(pathname, new URLSearchParams(sp.toString()));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`group block rounded-2xl px-3 py-3 transition-colors ${
                active
                  ? 'bg-paper-100/[0.095] text-paper-50 shadow-[inset_0_0_0_1px_rgba(245,239,229,0.08)]'
                  : 'text-paper-400 hover:bg-paper-100/[0.045] hover:text-paper-100'
              }`}
            >
              <span className="flex items-center justify-between gap-3 text-sm font-medium">
                <span className="flex min-w-0 items-center gap-2.5">
                  <NavIcon name={tab.icon} />
                  <span className="truncate">{tab.label}</span>
                </span>
                {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime" aria-hidden />}
              </span>
              <span className="mt-0.5 block text-xs text-paper-500 group-hover:text-paper-400">
                {tab.description}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className="flex max-w-[52vw] items-center gap-1 overflow-x-auto rounded-full border border-paper-100/[0.075] bg-paper-100/[0.035] p-1 text-sm scrollbar-thin md:max-w-none"
      role="tablist"
      aria-label="Dashboard sections"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname, new URLSearchParams(sp.toString()));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={`relative inline-flex h-8 cursor-pointer items-center rounded-full px-3.5 transition-colors duration-150 ${active
                ? 'bg-paper-100/[0.12] text-paper-50 shadow-[inset_0_0_0_1px_rgba(245,239,229,0.08)]'
                : 'text-paper-400 hover:bg-paper-100/[0.06] hover:text-paper-100'
              }`}
          >
            <NavIcon name={tab.icon} />
            <span className="ml-2">{tab.label}</span>
            {active && (
              <span className="ml-2 h-1 w-1 rounded-full bg-lime" aria-hidden />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function NavIcon({ name }: { name: Tab['icon'] }) {
  const common = {
    className: 'h-4 w-4 shrink-0',
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true,
  } as const;

  if (name === 'queue') {
    return (
      <svg {...common}>
        <path d="M5 6h14M5 12h14M5 18h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'mine') {
    return (
      <svg {...common}>
        <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20a7.5 7.5 0 0115 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'widgets') {
    return (
      <svg {...common}>
        <path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'kb') {
    return (
      <svg {...common}>
        <path d="M6 5.5A3.5 3.5 0 019.5 2H18v18H9.5A3.5 3.5 0 006 23V5.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M10 7h5M10 11h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M19 12a7 7 0 00-.12-1.28l2.02-1.56-2-3.46-2.39.96A7.13 7.13 0 0014.3 5.4L14 2.85h-4l-.3 2.55a7.13 7.13 0 00-2.21 1.26L5.1 5.7l-2 3.46 2.02 1.56A7 7 0 005 12c0 .44.04.87.12 1.28L3.1 14.84l2 3.46 2.39-.96A7.13 7.13 0 009.7 18.6l.3 2.55h4l.3-2.55a7.13 7.13 0 002.21-1.26l2.39.96 2-3.46-2.02-1.56c.08-.41.12-.84.12-1.28z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
