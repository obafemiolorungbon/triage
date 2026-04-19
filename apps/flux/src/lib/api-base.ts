/** Server-side: prefer internal URL (Docker). Client: NEXT_PUBLIC_API_URL. */
export function getServerApiBase(): string {
  return (
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4200'
  );
}

export function getPublicApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4200';
}
