'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

type Tab = { label: string; href: string; match: (p: string, sp: URLSearchParams) => boolean };

const TABS: Tab[] = [
  {
    label: 'Queue',
    href: '/dashboard',
    match: (p, sp) =>
      p === '/dashboard' && !sp.get('assignedMe') && !sp.get('knowledgeOnly'),
  },
  {
    label: 'Mine',
    href: '/dashboard/mine',
    match: (p, sp) => p.startsWith('/dashboard/mine') || sp.get('assignedMe') === 'true',
  }
];

export function DashboardNav() {
  const pathname = usePathname();
  const sp = useSearchParams();

  return (
    <nav
      className="flex items-center gap-1 text-sm"
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
            className={`relative h-8 px-3 inline-flex items-center rounded-full transition-colors duration-150 cursor-pointer ${active
                ? 'text-paper-50 bg-paper-100/10'
                : 'text-paper-400 hover:text-paper-100 hover:bg-paper-100/5'
              }`}
          >
            {tab.label}
            {active && (
              <span className="ml-2 w-1 h-1 rounded-full bg-lime" aria-hidden />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
