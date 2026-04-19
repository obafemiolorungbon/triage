import Link from 'next/link';
import { PublicNav } from '../components/public-nav';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-ambient bg-grain overflow-hidden flex flex-col">
      <PublicNav />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex justify-between max-w-7xl mx-auto px-6 opacity-[0.04]"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="block w-px h-full bg-paper-100" />
        ))}
      </div>

      <main className="relative flex-1 flex items-center justify-center px-6 pt-28 pb-24">
        <div className="mx-auto max-w-lg w-full text-center stagger">
          <h1 className="text-4xl md:text-5xl tracking-tightest text-paper-50 font-medium text-balance">
            <span className="font-display italic text-lime">Triage</span>
          </h1>
          <div className="mt-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link href="/submit" className="btn-primary justify-center">
              Submit ticket
            </Link>
            <Link href="/login" className="btn-secondary justify-center">
              Staff sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
