import Link from 'next/link';

export function Logo({ href = '/', className = '' }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 group cursor-pointer ${className}`}
    >
      <span className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-ink-800 hairline overflow-hidden">
        <span className="absolute inset-0 bg-gradient-to-br from-lime/25 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="relative w-3.5 h-3.5 text-lime"
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
      <span className="font-display text-[19px] leading-none translate-y-[1px] text-paper-50">
        triage
      </span>
    </Link>
  );
}
