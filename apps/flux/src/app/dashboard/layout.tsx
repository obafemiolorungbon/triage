import Link from 'next/link';
import { LiveSync } from './live-sync';
import { LogoutButton } from './logout-button';
import { NotificationBell } from './notification-bell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-base-200">
      <LiveSync />
      <div className="navbar bg-base-100 shadow z-10">
        <div className="flex-1 gap-2 flex flex-wrap items-center">
          <Link href="/dashboard" className="btn btn-ghost">
            Queue
          </Link>
          <Link href="/dashboard/mine" className="btn btn-ghost btn-sm">
            Mine
          </Link>
          <Link href="/dashboard/knowledge" className="btn btn-ghost btn-sm">
            Knowledge gaps
          </Link>
          <Link href="/" className="btn btn-ghost btn-sm">
            Public site
          </Link>
        </div>
        <div className="flex-none gap-2">
          <NotificationBell />
          <LogoutButton />
        </div>
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
