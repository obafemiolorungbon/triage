# Railway (Nest API + worker + Postgres + Redis)

## Services

1. **PostgreSQL** — plugin; copy `DATABASE_URL` into the API and worker services.
2. **Redis** — plugin; set `REDIS_URL` (e.g. `redis://default:...@...:6379`).
3. **API** — deploy from this repo using `apps/backend/Dockerfile`. Set all variables from [`.env.example`](../.env.example). Public hostname → set `API_PUBLIC_URL`, `BETTER_AUTH_URL`, and add that origin to `APP_URL` (Vercel app URL) for cookies/CORS.
4. **Worker** — second service, **same Docker image** and env as API, with start command:
   - **Custom start command**: `/entry.sh worker`  
   (Image `ENTRYPOINT` is `/entry.sh`; override **Command** to `worker`.)
5. **Release phase / one-off** (optional): run `pnpm exec prisma migrate deploy --schema=libs/db/prisma/schema.prisma` against production DB before traffic, or rely on API container entrypoint which runs migrations on boot.

## Health checks

- HTTP health path: `GET /api/v1/health/ready` (checks Postgres + Redis).

## Secrets

- `BETTER_AUTH_SECRET` (≥32 chars), `OPENROUTER_API_KEY`, optional `RESEND_*`, `SLACK_WEBHOOK_URL`.

## First admin user

With the API running and DB migrated:

```bash
ADMIN_EMAIL=you@corp.com ADMIN_PASSWORD='...' API_URL=https://api.yourdomain.com pnpm seed:admin
```
