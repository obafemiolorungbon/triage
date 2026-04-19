'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { browserTicketsClient } from '../../lib/tickets-browser-client';
import { Logo } from '../../components/ui/logo';

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
      setMessage(err instanceof Error ? err.message : 'Request failed');
    },
  });

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    mutation.mutate();
  }, [])

  const done = mutation.isSuccess;

  return (
    <div className="relative min-h-screen bg-ambient bg-grain">
      <header className="fixed top-4 left-4 right-4 z-40 mx-auto max-w-6xl">
        <div className="flex items-center justify-between h-14 px-4 rounded-full surface-raised backdrop-blur-xl">
          <Logo />
          <Link href="/" className="btn-ghost">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M9.5 6h-7M6 2.5L2.5 6 6 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Home
          </Link>
        </div>
      </header>

      <main className="relative pt-32 pb-24 px-6">
        <div className="mx-auto max-w-2xl">
          <div className="stagger">
            <h1 className="text-4xl md:text-5xl tracking-tightest text-paper-50 font-medium">
              Submit ticket
            </h1>

            {done ? (
              <SuccessState onReset={() => mutation.reset()} />
            ) : (
              <form
                className="mt-10 surface rounded-2xl p-6 md:p-8 flex flex-col gap-5"
                onSubmit={onSubmit}
              >
                <Field label="Email">
                  <input
                    type="email"
                    name="customer_email"
                    required
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </Field>

                <Field label="Title (optional)">
                  <input
                    type="text"
                    name="title"
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={500}
                  />
                </Field>

                <Field label="Description" hint={`${text.length} / 20000`}>
                  <textarea
                    name="description"
                    required
                    minLength={10}
                    maxLength={20_000}
                    className="textarea min-h-48"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </Field>

                {mutation.isError && (
                  <div
                    role="alert"
                    className="rounded-lg px-4 py-3 text-sm text-[#FF9999]"
                    style={{
                      background: 'rgba(255, 94, 94, 0.08)',
                      boxShadow: 'inset 0 0 0 1px rgba(255, 94, 94, 0.25)',
                    }}
                  >
                    {message}
                  </div>
                )}

                <div className="mt-2 flex justify-end pt-5 border-t border-paper-100/5">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? (
                      <>
                        <span className="spinner !w-4 !h-4 !border-ink-900/20 !border-t-ink-900" />
                        Submitting
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center justify-between">
        <span className="text-sm font-medium text-paper-100 tracking-tight">{label}</span>
        {hint && (
          <span className="text-2xs font-mono text-paper-500 tabular-nums">{hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

function SuccessState({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-10 surface rounded-2xl p-8 md:p-10 text-center animate-fade-up">
      <div className="mx-auto w-14 h-14 rounded-full bg-lime/10 flex items-center justify-center mb-5">
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-lime">
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="text-xl md:text-2xl tracking-tight text-paper-50">Received</h2>
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" className="btn-secondary" onClick={onReset}>
          Another
        </button>
        <Link href="/" className="btn-ghost">
          Home
        </Link>
      </div>
    </div>
  );
}
