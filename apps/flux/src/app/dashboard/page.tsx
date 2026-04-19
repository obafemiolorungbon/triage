import Link from 'next/link';
import { cookies } from 'next/headers';
import { getServerApiBase } from '../../lib/api-base';

type Row = {
  id: string;
  submitterEmail: string;
  status: string;
  priority: string | null;
  category: string | null;
  isNoise: boolean;
  knowledgeGap: boolean;
  createdAt: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    qs.set(k, Array.isArray(v) ? v[0] : v);
  }
  const query = qs.toString();
  const cookie = (await cookies()).toString();
  const res = await fetch(
    `${getServerApiBase()}/api/v1/feedback${query ? `?${query}` : ''}`,
    { headers: { cookie }, cache: 'no-store' },
  );
  if (!res.ok) {
    return <div className="alert alert-error">Could not load queue.</div>;
  }
  const data = (await res.json()) as {
    items: Row[];
    total: number;
    page: number;
    pageSize: number;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Feedback queue</h1>
        <form className="flex flex-wrap gap-2 items-center" method="get">
          <select name="status" className="select select-bordered select-sm" defaultValue="">
            <option value="">Any status</option>
            <option value="new">new</option>
            <option value="triaged">triaged</option>
            <option value="claimed">claimed</option>
            <option value="resolved">resolved</option>
            <option value="rejected">rejected</option>
          </select>
          <select name="priority" className="select select-bordered select-sm" defaultValue="">
            <option value="">Any priority</option>
            <option value="low">low</option>
            <option value="med">med</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
          <label className="input input-bordered input-sm flex items-center gap-2">
            Search
            <input name="q" className="grow min-w-0" placeholder="text…" />
          </label>
          <label className="label cursor-pointer gap-2 text-sm">
            <input type="checkbox" name="noiseOnly" value="true" className="checkbox checkbox-sm" />
            noise only
          </label>
          <label className="label cursor-pointer gap-2 text-sm">
            <input
              type="checkbox"
              name="knowledgeOnly"
              value="true"
              className="checkbox checkbox-sm"
            />
            knowledge gaps
          </label>
          <button type="submit" className="btn btn-primary btn-sm">
            Filter
          </button>
        </form>
      </div>
      <p className="text-sm opacity-70">
        {data.total} total · page {data.page}
      </p>
      <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>When</th>
              <th>Email</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Category</th>
              <th>Flags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((f) => (
              <tr key={f.id}>
                <td className="text-xs whitespace-nowrap">
                  {new Date(f.createdAt).toLocaleString()}
                </td>
                <td>{f.submitterEmail}</td>
                <td>
                  <span className="badge badge-ghost">{f.status}</span>
                </td>
                <td>{f.priority ?? '—'}</td>
                <td>{f.category ?? '—'}</td>
                <td className="text-xs">
                  {f.isNoise && <span className="badge badge-warning mr-1">noise</span>}
                  {f.knowledgeGap && (
                    <span className="badge badge-accent">knowledge</span>
                  )}
                </td>
                <td>
                  <Link href={`/dashboard/${f.id}`} className="btn btn-ghost btn-xs">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
