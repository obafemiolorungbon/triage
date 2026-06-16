# Deployment Guide

Triage is deployed as three web processes plus infrastructure:

- Backend API: NestJS on `apps/backend`
- Worker: `apps/backend/src/worker-bootstrap.ts`
- Dashboard/widget app: Next.js on `apps/flux`
- Optional public site: `apps/site`
- Optional demo app: `apps/playground`

## Infrastructure

Required services:

- Postgres with pgvector
- Redis
- S3-compatible object storage such as S3, R2, B2, Tigris, or MinIO

Recommended production flow:

```bash
pnpm install --frozen-lockfile
pnpm db:migrate:deploy
pnpm build
```

Run these as separate long-running services:

```bash
pnpm nx run backend:serve
pnpm exec tsx apps/backend/src/worker-bootstrap.ts
```

Deploy `apps/flux`, `apps/site`, and `apps/playground` with your Next.js host
of choice after running their build targets.

## Environment

Minimum production variables:

```env
DATABASE_URL=
REDIS_URL=
BETTER_AUTH_SECRET=
APP_URL=https://dashboard.example.com
API_PUBLIC_URL=https://api.example.com
CORS_ORIGINS=https://dashboard.example.com

S3_ENDPOINT=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=
S3_FORCE_PATH_STYLE=false
```

Optional integrations:

```env
OPENROUTER_API_KEY=
ASSISTANT_TIMEOUT_MS=120000
LINEAR_API_KEY=
LINEAR_TEAM_ID=
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_PROJECT_KEY=
RESEND_API_KEY=
RESEND_FROM=
```

## First Run

Create the first admin after the API is reachable:

```bash
ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='change-me' API_URL=https://api.example.com pnpm seed:admin
```

Then open the dashboard, create or edit a widget, and configure:

- Allowed origins
- Dev mode off for production widgets
- Consent and privacy policy URL if needed
- Branding, launcher icon, and custom CSS
- Form fields and attachment limits
- Linear/Jira automation if used
