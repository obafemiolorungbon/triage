import Link from 'next/link';
import { cookies } from 'next/headers';
import { getServerApiBase } from '../../../lib/api-base';
import { TicketActions } from './ticket-actions';

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookie = (await cookies()).toString();
  const base = getServerApiBase();
  const res = await fetch(`${base}/api/v1/feedback/${id}`, {
    headers: { cookie },
    cache: 'no-store',
  });
  if (!res.ok) {
    return <div className="alert alert-error">Not found or no access.</div>;
  }
  const f = (await res.json()) as {
    id: string;
    submitterEmail: string;
    rawText: string;
    cleanedText: string | null;
    category: string | null;
    priority: string | null;
    sentiment: string | null;
    status: string;
    isNoise: boolean;
    knowledgeGap: boolean;
    createdAt: string;
    triagedAt: string | null;
  };

  const sim = await fetch(`${base}/api/v1/feedback/${id}/similar`, {
    headers: { cookie },
    cache: 'no-store',
  });
  const similar = sim.ok ? ((await sim.json()) as { items: { id: string }[] }) : { items: [] };

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/dashboard" className="btn btn-ghost btn-sm">
        ← Queue
      </Link>
      <div className="card bg-base-100 shadow">
        <div className="card-body gap-2">
          <h1 className="card-title text-xl">Ticket {f.id}</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="badge">{f.status}</span>
            {f.priority && <span className="badge badge-secondary">{f.priority}</span>}
            {f.category && <span className="badge badge-outline">{f.category}</span>}
            {f.sentiment && <span className="badge badge-ghost">{f.sentiment}</span>}
            {f.knowledgeGap && <span className="badge badge-accent">knowledge gap</span>}
          </div>
          <p className="text-sm opacity-70">
            From <strong>{f.submitterEmail}</strong> ·{' '}
            {new Date(f.createdAt).toLocaleString()}
            {f.triagedAt && ` · triaged ${new Date(f.triagedAt).toLocaleString()}`}
          </p>
          <div className="divider" />
          <h2 className="font-semibold">Cleaned text</h2>
          <p className="whitespace-pre-wrap text-sm bg-base-200 p-3 rounded-lg">
            {f.cleanedText ?? '— (pending triage)'}
          </p>
          <details className="collapse collapse-arrow bg-base-200 rounded-lg">
            <summary className="collapse-title text-sm font-medium">Raw submission</summary>
            <div className="collapse-content text-sm whitespace-pre-wrap">{f.rawText}</div>
          </details>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-lg">Actions</h2>
          <TicketActions id={id} />
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-lg">Similar tickets (pgvector Phase 2)</h2>
          {similar.items.length === 0 ? (
            <p className="text-sm opacity-70">No similar items yet.</p>
          ) : (
            <ul className="list list-disc pl-4 text-sm">
              {similar.items.map((s) => (
                <li key={s.id}>
                  <Link href={`/dashboard/${s.id}`} className="link">
                    {s.id}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
