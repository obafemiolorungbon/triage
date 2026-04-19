'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '../../lib/auth-client';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      onClick={async () => {
        await authClient.signOut();
        router.push('/login');
        router.refresh();
      }}
      aria-label="Sign out"
      title="Sign out"
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
        <path
          d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l-5-5 5-5M5 12h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
