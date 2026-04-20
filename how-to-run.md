# How to Run Locally (First-Timer Guide)

This is a chronological walkthrough for someone who has just cloned this repo and wants to get the app running on their machine. Follow the steps in order.

---

## 1. Prerequisites

Install these once, globally, before doing anything else.

| Tool | Version | Why |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | `>= 20` | Runtime for the API, worker, and Next.js app |
| [pnpm](https://pnpm.io/installation) | `9.15.9` (pinned via `packageManager`) | Package manager for the monorepo |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | latest | Easiest way to get Postgres + Redis |
| [Git](https://git-scm.com/) | any recent | To clone the repo |

Verify the basics:

```bash
node --version    # v20+
pnpm --version    # 9.15.9 (or activate via: corepack enable && corepack prepare pnpm@9.15.9 --activate)
docker --version
```

> **Windows users:** All commands in this guide work in PowerShell. If a command starts with `ADMIN_EMAIL=... pnpm ...`, see the Windows note in [Step 7](#7-create-your-first-admin-user).

---

## 2. Clone the Repository

```bash
git clone <this-repo-url> triage
cd triage
```

---

## 3. Install Dependencies

From the repo root:

```bash
pnpm install
```

This installs everything for all apps and libs (`apps/backend`, `apps/flux`, `libs/db`, `libs/shared-types`, `libs/api-client`).

---

## 4. Configure Environment Variables

Copy the example file and open it in your editor:

```bash
cp .env.example .env
```

At a minimum, fill these values:

| Variable | What to set it to |
| --- | --- |
| `DATABASE_URL` | Leave as-is if you're using the Docker Postgres from Step 5 |
| `REDIS_URL` | Leave as-is if you're using the Docker Redis from Step 5 |
| `BETTER_AUTH_SECRET` | Generate with `openssl rand -base64 32` (must be 32+ chars) |
| `OPENROUTER_API_KEY` | Optional in dev — leave blank and the worker will use a fallback triage path |

Everything else (`APP_URL`, `API_PUBLIC_URL`, `PORT`, `NEXT_PUBLIC_API_URL`, etc.) is already wired for localhost and can stay as-is.

---

## 5. Start Postgres and Redis

The easiest path is to let Docker Compose run just the databases for you:

```bash
docker compose up -d postgres redis
```

Confirm they're healthy:

```bash
docker compose ps
```

You should see `postgres` on port `5432` and `redis` on port `6379`.

> Prefer a native install? Make sure Postgres is running on `5432` with user/password `postgres/postgres` and a DB called `triage`, and Redis on `6379`. Then update `DATABASE_URL` / `REDIS_URL` in `.env` if needed.

---

## 6. Run the Database Migration

Generate the Prisma client and apply the schema to your local Postgres:

```bash
pnpm db:migrate
```

This runs `prisma migrate dev` against `libs/db/prisma/schema.prisma` and creates all the tables. On first run Prisma will also generate the client.

(Optional) Seed the DB with demo feedback:

```bash
pnpm db:seed
```

---

## 7. Start the Backend API

Open **terminal 1** at the repo root:

```bash
pnpm exec nx run backend:serve
```

Wait for the log line:

```
Application is running on: http://localhost:4200/api/v1
```

Health check:

```bash
curl http://localhost:4200/api/v1/health/ready
```

---

## 8. Start the Triage Worker

The NestJS API serves HTTP, but the BullMQ **worker is a separate process** that actually performs triage. Open **terminal 2** at the repo root:

```bash
pnpm exec tsx apps/backend/src/worker-bootstrap.ts
```

You should see:

```
Triage worker consuming queue…
```

Leave this running — without it, tickets will be queued but never triaged.

---

## 9. Start the Next.js Web App (Flux)

Open **terminal 3** at the repo root:

```bash
pnpm exec nx run @triage/flux:dev
```

When it's ready you'll see `Local: http://localhost:3000`.

---

## 10. Create Your First Admin User

The API must be running (Step 7) for this to work. From a **new terminal**:

**macOS / Linux:**

```bash
ADMIN_EMAIL=you@corp.com ADMIN_PASSWORD='YourSecurePass' API_URL=http://localhost:4200 pnpm seed:admin
```

**Windows PowerShell:**

```powershell
$env:ADMIN_EMAIL="you@corp.com"; $env:ADMIN_PASSWORD="YourSecurePass"; $env:API_URL="http://localhost:4200"; pnpm seed:admin
```

If this fails, then a simple email, password and name fields can be used to create the user via Postman

```
curl --location --request POST 'http://localhost:4200/api/v1/auth/sign-up/email' \
--header 'User-Agent: Apidog/1.0.0 (https://apidog.com)' \
--header 'Content-Type: application/json' \
--header 'Accept: */*' \
--header 'Host: localhost:4200' \
--header 'Connection: keep-alive' \
--data-raw '{
    "email": "obafemi@gmail.com",
    "password": "realpassword",
    "name":"Obafemi"
}'
```
---

## 11. Open the App

| URL | What it is |
| --- | --- |
| http://localhost:3000 | Public feedback form + staff login |
| http://localhost:3000/login | Log in with the admin you just created |
| http://localhost:3000/dashboard | Staff dashboard (after login) |
| http://localhost:4200/api/v1 | API root |
| http://localhost:4200/admin/queues | BullMQ dashboard (only if `BULL_BOARD_ENABLED=true` in `.env`) |

Submit a piece of feedback from the home page, then watch it flow through the worker terminal and appear in the dashboard.

---

## Alternative: Run the Whole Stack in Docker

If you'd rather not manage three terminals, one command brings up Postgres, Redis, the API, the worker, and Flux:

```bash
docker compose up --build
```

Then open http://localhost:3000. You still need to run the admin-seed command from [Step 10](#10-create-your-first-admin-user) once the API is healthy.

---

## Common Scripts

| Command | Purpose |
| --- | --- |
| `pnpm db:migrate` | Create/apply a new Prisma migration locally |
| `pnpm db:studio` | Open Prisma Studio to browse the DB |
| `pnpm db:seed` | Load demo feedback |
| `pnpm seed:admin` | Create/promote an admin user |
| `pnpm build` | Production build for backend + flux |
| `pnpm docker:up` | Shortcut for `docker compose up --build` |

---

## Troubleshooting

- **`ECONNREFUSED 5432` / `6379`** — Postgres or Redis isn't running. Re-run `docker compose up -d postgres redis`.
- **`BETTER_AUTH_SECRET must be at least 32 characters`** — Regenerate with `openssl rand -base64 32` and paste the full value into `.env`.
- **Tickets show up but never get categorized** — The worker in Step 8 isn't running, or `REDIS_URL` differs between API and worker.
- **`pnpm: command not found`** — Run `corepack enable && corepack prepare pnpm@9.15.9 --activate`.
- **Prisma client missing after pulling new changes** — Run `pnpm db:generate` (or just `pnpm db:migrate`).
- **Port already in use** — Change `PORT` in `.env` (for the API) or pass `-p 3001` to `next dev` (for Flux).
