'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '../../lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const { error: signErr } = await authClient.signIn.email({
      email,
      password,
    });
    if (signErr) {
      setError(signErr.message ?? 'Sign-in failed');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-200">
        <div className="card-body gap-4">
          <h1 className="card-title text-2xl">Staff login</h1>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <label className="form-control w-full">
              <span className="label-text">Email</span>
              <input
                type="email"
                className="input input-bordered w-full"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text">Password</span>
              <input
                type="password"
                className="input input-bordered w-full"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && (
              <div role="alert" className="alert alert-error text-sm">
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary w-full">
              Sign in
            </button>
          </form>
          <div className="divider my-0" />
          <Link href="/" className="link link-hover text-sm self-center">
            ← Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
