'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createApiClient } from '@triage/api-client';
import { getPublicApiBase } from '../../lib/api-base';

export default function SubmitPage() {
  const [email, setEmail] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const client = createApiClient({ baseUrl: getPublicApiBase() });
      await client.submitFeedback({ submitterEmail: email, rawText: text });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="btn btn-ghost btn-sm mb-4">
          ← Home
        </Link>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title">Submit feedback</h1>
            {status === 'done' ? (
              <div className="alert alert-success">
                Thank you — we received your message and will triage it shortly.
              </div>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={onSubmit}>
                <label className="form-control w-full">
                  <span className="label-text">Email</span>
                  <input
                    type="email"
                    required
                    className="input input-bordered w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Message</span>
                  <textarea
                    required
                    minLength={10}
                    className="textarea textarea-bordered h-40"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Describe the issue, steps to reproduce, and impact…"
                  />
                </label>
                <p className="text-xs opacity-60">
                  hCaptcha / Turnstile can be wired here (Phase 2 hardening).
                </p>
                {status === 'error' && (
                  <div className="alert alert-error text-sm">{message}</div>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Sending…' : 'Send'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
