import Link from 'next/link';
import { PublicNav } from '../components/public-nav';

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-ambient bg-grain">
      <PublicNav />

      <main className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-20 pt-32 lg:grid-cols-[0.85fr_1.15fr]">
        <section>
          <p className="font-mono text-2xs uppercase tracking-wider text-lime">
            Self-hosted feedback operations
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[0.94] tracking-tightest text-paper-50 md:text-7xl">
            Route customer signal without losing context.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-paper-400">
            Triage collects feedback through brandable widgets, classifies it
            with company context, and helps teams decide what needs internal
            handling or an external engineering ticket.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="btn-primary h-11 justify-center">
              Staff sign in
            </Link>
            <Link href="/submit" className="btn-secondary h-11 justify-center">
              Manual intake
            </Link>
          </div>
        </section>

        <section className="surface-raised overflow-hidden rounded-[28px]">
          <div className="flex h-12 items-center gap-2 border-b border-paper-100/[0.075] px-5">
            <span className="h-2 w-2 rounded-full bg-paper-100/20" />
            <span className="h-2 w-2 rounded-full bg-paper-100/20" />
            <span className="h-2 w-2 rounded-full bg-paper-100/20" />
          </div>
          <div className="grid min-h-[460px] grid-cols-[150px_1fr]">
            <aside className="border-r border-paper-100/[0.075] p-5 text-sm text-paper-500">
              <strong className="mb-4 block text-paper-200">Queue</strong>
              <span className="pill mb-2">Widgets</span>
              <span className="pill mb-2">Knowledge</span>
              <span className="pill">Settings</span>
            </aside>
            <div className="p-5">
              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  ['New', '18'],
                  ['Critical', '4'],
                  ['Deflected', '127'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-paper-100/[0.04] p-4 ring-1 ring-paper-100/[0.06]">
                    <p className="font-mono text-2xs uppercase tracking-wider text-paper-500">{label}</p>
                    <strong className="mt-2 block font-mono text-2xl text-paper-50">{value}</strong>
                  </div>
                ))}
              </div>
              {[
                ['enterprise', 'critical', 'Checkout fails after plan upgrade'],
                ['production', 'expedite', 'Reports take 18 seconds to load'],
                ['docs', 'watch', 'Webhook retry behavior is unclear'],
              ].map(([meta, tier, title]) => (
                <div key={title} className="border-t border-paper-100/[0.06] py-4">
                  <div className="flex items-center justify-between gap-4 font-mono text-2xs uppercase tracking-wider text-paper-500">
                    <span>{meta}</span>
                    <span>{tier}</span>
                  </div>
                  <p className="mt-2 text-paper-100">{title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
