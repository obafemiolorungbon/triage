# Contributing

Triage is a self-hosted open-source feedback platform. Contributions should
keep the product practical for teams that want to run it themselves.

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy the environment template:

```bash
cp .env.example .env
```

3. Start local services:

```bash
docker compose up -d postgres redis minio minio-init
```

4. Run database migrations and generate Prisma client:

```bash
pnpm db:migrate
pnpm db:generate
```

5. Start the development stack:

```bash
pnpm dev
```

6. Create or promote an admin while the backend is running:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='change-me-in-dev' API_URL=http://localhost:4200 pnpm seed:admin
```

PowerShell:

```powershell
$env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_PASSWORD="change-me-in-dev"; $env:API_URL="http://localhost:4200"; pnpm seed:admin
```

## Branches And PRs

- Use short, descriptive branches. Maintainer branches commonly use the
  `codex/` prefix.
- Keep pull requests focused. Avoid mixing product changes, formatting-only
  rewrites, and dependency churn.
- Include migrations when changing Prisma models.
- Keep public widget changes backwards compatible unless the PR clearly marks a
  breaking change.

## Focused Checks

Run the smallest checks that match your change. For larger backend or widget
changes, use:

```bash
pnpm exec prisma validate --schema=libs/db/prisma/schema.prisma
pnpm db:generate
pnpm exec tsc -p libs/api-client/tsconfig.json
pnpm nx run backend:build
pnpm exec tsc -p apps/flux/tsconfig.json --noEmit
pnpm nx run @triage/flux:build
```

CI runs Prisma generate, migrations against Postgres with pgvector, backend
build, Flux build, and a backend Docker image smoke build.

## Documentation

Public widget behavior should be documented when it changes. Start with:

- `README.md`
- `docs/deployment.md`
- `docs/widget-usage.md`
- `docs/widget-implementation-plan.md`

## Security

Do not commit real credentials. Use blank placeholders in examples and rotate
any key that has been shared outside a private runtime.
