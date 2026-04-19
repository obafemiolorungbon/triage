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
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title">Staff login</h1>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <input
              type="email"
              className="input input-bordered"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="input input-bordered"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <div className="alert alert-error text-sm">{error}</div>}
            <button type="submit" className="btn btn-primary">
              Sign in
            </button>
          </form>
          <Link href="/" className="link link-hover text-sm">
            ← Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
