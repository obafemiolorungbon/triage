import Link from 'next/link';

export function Logo({ href = '/', className = '' }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 group cursor-pointer ${className}`}
    >
      <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-ink-800 hairline">
        <span className="absolute inset-0 bg-lime/10 opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="relative h-3.5 w-3.5 text-lime"
          aria-hidden
        >
          <path
            d="M2 3h12M4 8h8M6 13h4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="text-[17px] font-semibold leading-none tracking-tight text-paper-50">
        triage
      </span>
    </Link>
  );
}
