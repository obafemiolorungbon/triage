'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '../../lib/auth-client';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      onClick={async () => {
        await authClient.signOut();
        router.push('/login');
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
