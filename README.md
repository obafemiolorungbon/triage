# Smart Triage (Nx + NestJS + Next.js)

Monorepo for customer feedback intake, OpenRouter-powered triage (BullMQ worker), and a staff dashboard.

## Apps

| App | Description |
| --- | --- |
| `apps/flux` | Next.js App Router — public submit, staff login, dashboard |
| `apps/backend` | NestJS API — Better Auth (`/api/v1/auth`), feedback CRUD, queues, notifications |
| `libs/shared-types` | Zod schemas / shared types |
| `libs/db` | Prisma schema & client |
| `libs/api-client` | Typed REST helper for the web app |

## Local development

1. Copy [`.env.example`](./.env.example) to `.env` and fill values (Postgres + Redis required).
2. `pnpm install`
3. `pnpm exec prisma migrate dev --schema=libs/db/prisma/schema.prisma`
4. `pnpm exec nx run backend:serve` (terminal 1)
5. `pnpm exec nx run @triage/flux:dev` (terminal 2)

Create the first admin (API must be running):

```bash
ADMIN_EMAIL=you@corp.com ADMIN_PASSWORD='YourSecurePass' API_URL=http://localhost:3000 pnpm seed:admin
```

## Docker (full stack)

```bash
docker compose up --build
```

- **Flux**: http://localhost:4200  
- **API**: http://localhost:3000  
- Set `OPENROUTER_API_KEY` in your environment (or leave unset for fallback triage in the worker).

## Deploy

- [Vercel (Next)](./deploy/VERCEL.md)  
- [Railway (API + worker + DB)](./deploy/RAILWAY.md)

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm build` | Build backend + flux |
| `pnpm db:migrate` | Prisma migrate dev |
| `pnpm db:migrate:deploy` | Prisma migrate deploy (CI/prod) |
| `pnpm db:seed` | Seed demo feedback |
| `pnpm seed:admin` | Create/promote admin user (see above) |
| `pnpm docker:up` | `docker compose up --build` |
