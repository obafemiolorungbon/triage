# Triage

Self-hosted feedback intake for product and support teams.

Triage gives companies an embeddable website/app widget, AI-assisted feedback
classification, metadata-based escalation, an internal support Kanban, and
manual or automatic handoff to Linear or Jira.

## Open-Source MVP Status

This repo is preparing for a public MIT-licensed MVP release. The current
product supports a self-hosted single-workspace deployment, multiple widgets,
widget branding, public feedback intake, image attachments, AI triage,
metadata escalation, knowledge-base deflection, an internal dashboard, and
Linear/Jira handoff.

The MVP is not yet a fully hardened production support platform. Captcha,
encrypted widget secret storage, acknowledgement emails, public status pages,
full observability, data-retention automation, localization, and deeper
compliance workflows are tracked as roadmap items.

## Apps

| App | Description |
| --- | --- |
| `apps/flux` | Internal Next.js app: widget iframe, staff login, dashboard, settings |
| `apps/site` | Separate marketing site for the open-source product |
| `apps/playground` | Demo app showing the widget on a marketing page and inside a web app |
| `apps/backend` | NestJS API: auth, widget intake, tickets, queues, settings, integrations |
| `libs/shared-types` | Zod schemas and shared API types |
| `libs/db` | Prisma schema, migrations, and client |
| `libs/api-client` | Typed REST helper for the web app |

## Docs

- [Deployment guide](docs/deployment.md)
- [Widget usage guide](docs/widget-usage.md)
- [Widget implementation roadmap](docs/widget-implementation-plan.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## Core Flow

1. A company embeds `/embed.js` on any site or web app.
2. The script opens a sandboxed iframe widget from `apps/flux`.
3. Customers submit feedback with optional user and metadata context.
4. The backend stores the feedback, runs spam detection, and queues AI triage.
5. Company context from dashboard settings is included in the AI prompt.
6. Metadata rules assign an escalation tier: `none`, `watch`, `expedite`, or `critical`.
7. Agents work feedback in the internal dashboard.
8. Agents can manually create Linear/Jira issues, and critical feedback can auto-create an external issue when enabled.

## Local Development

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:

```bash
pnpm install
```

3. Start Postgres with pgvector, Redis, and MinIO:

```bash
docker compose up -d postgres redis minio minio-init
```

4. Apply migrations:

```bash
pnpm db:migrate
```

5. Start the API, worker, dashboard, and marketing site:

```bash
pnpm exec nx run backend:serve
pnpm exec tsx apps/backend/src/worker-bootstrap.ts
pnpm exec nx run @triage/flux:dev
pnpm exec nx run @triage/site:dev --port=3001
pnpm exec nx run @triage/playground:dev --port=3002
```

Create the first admin while the API is running:

```bash
ADMIN_EMAIL=you@corp.com ADMIN_PASSWORD='YourSecurePass' API_URL=http://localhost:4200 pnpm seed:admin
```

PowerShell:

```powershell
$env:ADMIN_EMAIL="you@corp.com"; $env:ADMIN_PASSWORD="YourSecurePass"; $env:API_URL="http://localhost:4200"; pnpm seed:admin
```

## URLs

| URL | Purpose |
| --- | --- |
| http://localhost:3000 | Internal app |
| http://localhost:3000/dashboard | Staff dashboard |
| http://localhost:3000/dashboard/settings | Company, escalation, and integration settings |
| http://localhost:3000/dashboard/widgets | Widget keys, branding, fields, and image attachment limits |
| http://localhost:3000/embed.js | Embeddable widget script alias |
| http://localhost:3000/embed/v1 | Versioned widget script |
| http://localhost:3000/embed/v1.c8b5f1a4.js | Immutable widget script URL |
| http://localhost:3001 | Marketing site |
| http://localhost:3002 | Widget playground |
| http://localhost:4200/api/v1 | Backend API |

## Widget Embed

```html
<script
  src="http://localhost:3000/embed/v1"
  data-widget-key="local-dev-widget"
  data-position="bottom-right"
  async
></script>

<script>
  window.TriageWidget?.identify(
    { email: "customer@example.com", name: "Ada", accountId: "acct_123" },
    { plan: "enterprise", environment: "production", affectedUsers: 42 }
  );
</script>
```

The script also supports queued calls before it loads:

```html
<script>
  window.triageQ = window.triageQ || [];
  triageQ.push(["identify", { email: "customer@example.com" }]);
  triageQ.push(["open", { type: "bug", prefill: { title: "Checkout issue" } }]);
</script>
```

Runtime API:

```ts
TriageWidget.boot({ widgetKey, user, userHash, locale });
TriageWidget.shutdown();
TriageWidget.identify(user, metadata, { userHash });
TriageWidget.update(metadata);
TriageWidget.prefill({ title, message, severity });
TriageWidget.open({ type: "bug", prefill: { title: "Checkout broken" } });
TriageWidget.close();
```

Custom open buttons can live anywhere on the host page:

```html
<button data-triage-open data-triage-type="bug">Report a bug</button>
```

## Image Attachments

The widget supports direct-to-S3 image uploads using presigned PUT URLs. Local
development uses MinIO from `docker-compose.yml`; production can point the same
environment variables at S3, R2, B2, Tigris, or another S3-compatible store.

```env
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=triage-uploads
S3_FORCE_PATH_STYLE=true
```

Per-widget limits live in `/dashboard/widgets/:id`: max image count, max image
size, and allowed image MIME types. MVP supports image attachments only.

## Widget Forms

Each widget has its own form configuration in `/dashboard/widgets/:id`.
Admins can enable submission types (`bug`, `idea`, `question`, `praise`,
`custom`), configure field rows, route fields to user context, metadata, title,
message, category, or severity, and enable an optional CSAT/NPS/thumbs survey.

The widget stores in-progress drafts in browser `localStorage`, keyed by widget
and submission type, and clears the draft after successful submission.

## Targeting, Triggers, And Variants

Each widget can now store page rules, audience rules, trigger config, inline
embed support, and weighted variants. The embed script evaluates those settings
on the host page before showing the launcher.

```json
{
  "include": [{ "kind": "urlPath", "op": "startsWith", "value": "/docs" }],
  "exclude": [{ "kind": "urlPath", "op": "startsWith", "value": "/pricing" }]
}
```

```json
{ "mode": "time_on_page", "seconds": 15 }
```

Inline embeds use the same script:

```html
<div data-triage-inline data-widget-key="local-dev-widget" data-height="620px"></div>
```

## Widget Branding And Theming

Each widget has its own theme in `/dashboard/widgets/:id`. Admins can configure
surface/text colors, launcher label, position, border radius, shadow, logo URL,
font family, dark-mode behavior, and whether the widget shows the powered-by
line. The public config endpoint returns the theme, `/widget` applies it through
CSS variables, and `/embed.js` uses the same values for the host-page launcher
and iframe panel.

Launcher icons accept a small built-in set (`message-circle`, `bug`,
`help-circle`, `lightbulb`, `thumbs-up`, `megaphone`, `star`) or an HTTPS image
URL. Custom CSS is sanitized on save and applied inside the iframe only.

`data-position` on the embed script still works as an override; otherwise the
widget uses the saved dashboard position, including bottom, top, centered, and
side-tab launcher placements.

## Widget Consent And Security

Per-widget security settings live in `/dashboard/widgets/:id`.

- Allowed origins restrict where a widget key can submit from.
- Dev mode allows localhost origins while testing.
- Identity verification uses `userHash = HMAC-SHA256(widgetSecret, email || id)`.
- Rate limits are per widget key and client IP.
- Optional consent requires a checkbox and stores consent metadata on feedback.
- The success screen shows a copyable ticket reference like `TR-1A2B3C`.

Keyboard behavior: `?` opens the launcher from the host page, `Escape` closes the
iframe panel, and `?` inside the widget shows shortcut help.

## Knowledge Base Deflection

Admins can publish Markdown support articles in `/dashboard/kb`. Articles are
chunked by H2/H3 sections and indexed for widget search. Local and production
Postgres use the `pgvector/pgvector:pg16` image so semantic search works without
separate vector infrastructure.

```env
OPENROUTER_MODEL_EMBEDDING=openai/text-embedding-3-small
```

When `OPENROUTER_API_KEY` is not configured, the widget still uses a simple
lexical fallback so local development remains usable.

## External Issues

Linear and Jira credentials are environment-driven in v1.

```env
LINEAR_API_KEY=
LINEAR_TEAM_ID=
LINEAR_PROJECT_ID=

JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_PROJECT_KEY=
JIRA_ISSUE_TYPE=Task
```

Admins can enable automatic external issue creation for `critical` feedback in
dashboard settings. Agents can always create Linear/Jira issues manually from a
ticket detail page when the provider is configured.

## Docker

```bash
docker compose up --build
```

- Internal app: http://localhost:3000
- Marketing site: http://localhost:3001
- Widget playground: http://localhost:3002
- API: http://localhost:4200

## Production Deployment

For a self-hosted deployment:

1. Run Postgres with pgvector, Redis, and S3-compatible object storage.
2. Set production env vars for `DATABASE_URL`, `REDIS_URL`,
   `BETTER_AUTH_SECRET`, `APP_URL`, `API_PUBLIC_URL`, and S3 credentials.
3. Run migrations with `pnpm db:migrate:deploy`.
4. Run the backend API and worker as long-running services.
5. Deploy `apps/flux` for the dashboard/widget iframe, `apps/site` for the
   marketing/docs site, and optionally `apps/playground` for demos.
6. Create the first admin with `pnpm seed:admin`.
7. Configure widget origins, consent, branding, and integrations from the
   dashboard before publishing the embed script.

## Open-Source Roadmap

The near-term open-source roadmap is intentionally focused on making the widget
safer, easier to deploy, and easier to operate:

- Security: Turnstile/hCaptcha, encrypted widget secrets, profanity filtering,
  and an origin-rule test tool.
- Submissions: console/network autocapture, richer device metadata, conditional
  form logic, and stronger server-side field validation.
- Acknowledgement: Resend email receipts, signed read-only status links, and
  office-hours/SLA messaging.
- Widget UX: shadow-DOM launcher, focus trap, focus return, aria-live updates,
  reduced-motion polish, localization, RTL, and live draft preview.
- Operations: widget analytics, embed error reporting, Sentry integration,
  config audit diffs, health checks, retention jobs, and deletion workflows.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm build` | Build backend, dashboard, and marketing site |
| `pnpm build:backend` | Build the NestJS API |
| `pnpm build:flux` | Build the internal Next.js app |
| `pnpm build:site` | Build the marketing Next.js app |
| `pnpm build:playground` | Build the widget playground app |
| `pnpm db:migrate` | Run Prisma migrate dev |
| `pnpm db:migrate:deploy` | Run Prisma migrate deploy |
| `pnpm db:seed` | Seed demo feedback |
| `pnpm seed:admin` | Create or promote an admin user |
| `pnpm docker:up` | Run `docker compose up --build` |
