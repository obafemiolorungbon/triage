# Vercel (Next.js — `apps/flux`)

1. Create a Vercel project and import this Git repository.
2. **Root Directory**: leave empty (monorepo root) or set to repo root.
3. **Install Command**: `pnpm install --frozen-lockfile`
4. **Build Command**: `pnpm exec nx run @triage/flux:build`
5. **Output Directory**: `apps/flux/.next` (default Next on Vercel) — if using standalone output, configure **Output** to match Nx standalone layout or disable `output: 'standalone'` for Vercel-only deploys.
6. **Environment variables** (Production + Preview):
   - `NEXT_PUBLIC_API_URL` — public URL of the Nest API (e.g. `https://api.yourdomain.com`).
   - `INTERNAL_API_URL` — same as `NEXT_PUBLIC_API_URL` unless you use a private URL for Server Components (e.g. Railway private networking).
   - `NEXT_PUBLIC_ENABLE_WS` — set `true` only if the browser can open a WebSocket to the API origin (same-site or cookie/session compatible); otherwise leave `false`.

CORS on the API must allow your Vercel domain in `APP_URL` / trusted origins.
