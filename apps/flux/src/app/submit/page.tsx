'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { browserTicketsClient } from '../../lib/tickets-browser-client';

export default function SubmitPage() {
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      browserTicketsClient().submitTicket({
        customer_email: email,
        description: text,
        title: title.trim() || undefined,
      }),
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    mutation.mutate();
  }

  const done = mutation.isSuccess;

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="container max-w-xl mx-auto">
        <Link href="/" className="btn btn-ghost btn-sm mb-4">
          ← Home
        </Link>
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body gap-4">
            <h1 className="card-title text-2xl">Submit a ticket</h1>
            {done ? (
              <div role="status" className="alert alert-success">
                <span>
                  Thank you — we received your ticket and will triage it shortly.
                </span>
              </div>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={onSubmit}>
                <label className="form-control w-full">
                  <span className="label-text font-medium">Customer email</span>
                  <input
                    type="email"
                    name="customer_email"
                    required
                    className="input input-bordered w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text font-medium">Title (optional)</span>
                  <input
                    type="text"
                    name="title"
                    className="input input-bordered w-full"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short summary"
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text font-medium">Description</span>
                  <textarea
                    name="description"
                    required
                    minLength={10}
                    className="textarea textarea-bordered min-h-40"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Describe the issue, steps to reproduce, and impact…"
                  />
                </label>
                <p className="text-xs opacity-60">
                  hCaptcha / Turnstile can be wired here (Phase 2 hardening).
                </p>
                {mutation.isError && (
                  <div role="alert" className="alert alert-error text-sm">
                    {message}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-primary w-full sm:w-auto"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      Sending…
                    </>
                  ) : (
                    'Send ticket'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
