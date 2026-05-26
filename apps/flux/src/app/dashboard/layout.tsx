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
    <div className="relative min-h-screen overflow-x-hidden bg-ambient bg-grain lg:h-dvh lg:overflow-hidden">
      <Suspense fallback={null}>
        <LiveSync />
      </Suspense>

      <header className="sticky top-0 z-30 border-b border-paper-100/[0.075] bg-ink-900/82 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 md:px-7">
          <Logo />
          <span className="hidden h-5 w-px bg-paper-100/10 md:inline" />
          <Suspense
            fallback={<div className="h-9 w-56 animate-pulse rounded-full bg-paper-100/5" />}
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

      <div className="mx-auto grid max-w-[1500px] lg:h-dvh lg:grid-cols-[280px_1fr]">
        <aside className="hidden h-dvh border-r border-paper-100/[0.075] px-5 py-6 lg:block">
          <div className="flex h-full flex-col">
            <Logo />
            <div className="mt-8">
              <Suspense fallback={<div className="h-56 animate-pulse rounded-2xl bg-paper-100/[0.04]" />}>
                <DashboardNav variant="side" />
              </Suspense>
            </div>
            <div className="mt-auto space-y-4">
              <div className="rounded-3xl border border-paper-100/[0.075] bg-paper-100/[0.035] p-4">
                <p className="font-mono text-2xs uppercase tracking-wider text-paper-500">
                  Workspace
                </p>
                <p className="mt-2 text-sm leading-5 text-paper-300">
                  Feedback intake, triage, and handoff in one self-hosted console.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell variant="sidebar" />
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        <main className="relative min-w-0 lg:h-dvh lg:overflow-y-auto">
          <div className="px-4 py-7 md:px-7 md:py-9 lg:px-9 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
