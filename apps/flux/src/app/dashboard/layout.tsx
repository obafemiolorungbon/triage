import Link from 'next/link';
import { Suspense } from 'react';
import { Logo } from '../../components/ui/logo';
import { DashboardNav } from './dashboard-nav';
import { LiveSync } from './live-sync';
import { LogoutButton } from './logout-button';
import { NotificationBell } from './notification-bell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-ink-900 bg-grain">
      <Suspense fallback={null}>
        <LiveSync />
      </Suspense>

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-ink-900/80 backdrop-blur-xl hairline-b">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 h-14 flex items-center gap-4">
          <Logo />
          <span className="hidden md:inline h-5 w-px bg-paper-100/10 mx-1" />
          <Suspense
            fallback={<div className="h-8 w-56 rounded-full bg-paper-100/5 animate-pulse" />}
          >
            <DashboardNav />
          </Suspense>
          <div className="flex-1" />
          <Link href="/" className="hidden lg:inline-flex btn-ghost text-paper-500">
            Home
          </Link>
          <div className="h-5 w-px bg-paper-100/10" />
          <NotificationBell />
          <LogoutButton />
        </div>
      </header>

      <main className="relative">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
