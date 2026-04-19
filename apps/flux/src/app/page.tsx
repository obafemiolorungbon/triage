import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow">
        <div className="flex-1">
          <Link href="/" className="btn btn-ghost text-xl">
            Triage
          </Link>
        </div>
        <div className="flex-none gap-2">
          <Link href="/submit" className="btn btn-primary btn-sm">
            Submit feedback
          </Link>
          <Link href="/login" className="btn btn-ghost btn-sm">
            Staff login
          </Link>
        </div>
      </div>
      <main className="hero min-h-[80vh]">
        <div className="hero-content text-center max-w-2xl">
          <div>
            <h1 className="text-4xl font-bold">Smart triage for customer feedback</h1>
            <p className="py-6 text-lg opacity-80">
              Customers share issues in plain language. AI classifies priority and
              category; your team works the queue with full audit history.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/submit" className="btn btn-primary">
                Send feedback
              </Link>
              <Link href="/dashboard" className="btn btn-outline">
                Open dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
