/**
 * Browser origins allowed for CORS (HTTP, Socket.IO, Better Auth trustedOrigins).
 *
 * Set `CORS_ORIGINS` to a comma-separated list to override completely.
 * Otherwise uses `APP_URL`, and in non-production also allows common local
 * Next.js dev URLs so `localhost` vs `127.0.0.1` does not break credentialed requests.
 */
export function getCorsOrigins(): string[] {
  const explicit = process.env.CORS_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (explicit?.length) {
    return [...new Set(explicit)];
  }

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const out = new Set<string>([appUrl]);

  if (process.env.NODE_ENV !== 'production') {
    out.add('http://localhost:3000');
    out.add('http://127.0.0.1:3000');
    out.add('http://localhost:3001');
    out.add('http://127.0.0.1:3001');
    out.add('http://localhost:3002');
    out.add('http://127.0.0.1:3002');
  }

  return [...out];
}
