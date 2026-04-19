'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '../../lib/auth-client';
import { Logo } from '../../components/ui/logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPending(true);
    const { error: signErr } = await authClient.signIn.email({ email, password });
    setPending(false);
    if (signErr) {
      setError(signErr.message ?? 'Sign-in failed');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="relative min-h-screen bg-ambient bg-grain grid lg:grid-cols-5">
      <aside className="relative hidden lg:flex flex-col justify-between p-10 lg:col-span-2 border-r border-paper-100/5">
        <Logo />
        <div className="stagger max-w-md">
          <span className="pill">Staff</span>
          <h1 className="mt-6 text-4xl md:text-5xl tracking-tightest text-paper-50 font-medium">
            Sign in
          </h1>
        </div>
        <p className="text-2xs font-mono text-paper-500">
          © {new Date().getFullYear()}
        </p>
      </aside>

      <section className="relative flex items-center justify-center p-6 lg:col-span-3">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10 flex justify-center">
            <Logo />
          </div>
          <div className="stagger">
            <h2 className="text-2xl tracking-tight text-paper-50 font-medium lg:hidden">
              Sign in
            </h2>

            <form className="mt-8 lg:mt-0 flex flex-col gap-4" onSubmit={onSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-paper-500">
                  Email
                </span>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-paper-500">
                  Password
                </span>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </label>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg px-4 py-3 text-sm text-[#FF9999]"
                  style={{
                    background: 'rgba(255, 94, 94, 0.08)',
                    boxShadow: 'inset 0 0 0 1px rgba(255, 94, 94, 0.25)',
                  }}
                >
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary mt-2" disabled={isPending}>
                {isPending ? (
                  <>
                    <span className="spinner !w-4 !h-4 !border-ink-900/20 !border-t-ink-900" />
                    Signing in
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <div className="mt-8">
              <Link href="/" className="text-xs text-paper-500 hover:text-paper-100 transition-colors">
                ← Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
