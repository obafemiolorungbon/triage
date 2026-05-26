CREATE TABLE IF NOT EXISTS "workspace" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "companyName" TEXT NOT NULL DEFAULT 'Your company',
  "productDescription" TEXT NOT NULL DEFAULT '',
  "industry" TEXT NOT NULL DEFAULT 'general SaaS',
  "supportContext" TEXT NOT NULL DEFAULT '',
  "escalationGuidance" TEXT NOT NULL DEFAULT '',
  "aiContextNotes" TEXT NOT NULL DEFAULT '',
  "autoCreateCritical" BOOLEAN NOT NULL DEFAULT false,
  "autoCreateProvider" "ExternalIssueProvider" NOT NULL DEFAULT 'linear',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_slug_key" ON "workspace"("slug");

INSERT INTO "workspace" (
  "id",
  "slug",
  "companyName",
  "productDescription",
  "industry",
  "supportContext",
  "escalationGuidance",
  "aiContextNotes",
  "autoCreateCritical",
  "autoCreateProvider",
  "createdAt",
  "updatedAt"
)
SELECT
  'default',
  'default',
  COALESCE("companyName", 'Your company'),
  COALESCE("productDescription", ''),
  COALESCE("industry", 'general SaaS'),
  COALESCE("supportContext", ''),
  COALESCE("escalationGuidance", ''),
  COALESCE("aiContextNotes", ''),
  COALESCE("autoCreateCritical", false),
  COALESCE("autoCreateProvider", 'linear'),
  COALESCE("createdAt", CURRENT_TIMESTAMP),
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "workspace_config"
WHERE "id" = 'default'
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "workspace" ("id", "slug")
VALUES ('default', 'default')
ON CONFLICT ("slug") DO NOTHING;

CREATE TABLE IF NOT EXISTS "widget" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "widgetKey" TEXT NOT NULL,
  "widgetSecret" TEXT NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "brandColor" TEXT NOT NULL DEFAULT '#D9FF4D',
  "accentColor" TEXT NOT NULL DEFAULT '#0A0A0B',
  "position" TEXT NOT NULL DEFAULT 'bottom-right',
  "size" TEXT NOT NULL DEFAULT 'md',
  "title" TEXT NOT NULL DEFAULT 'Send feedback',
  "description" TEXT NOT NULL DEFAULT 'Tell us what happened or what could be better.',
  "successMessage" TEXT NOT NULL DEFAULT 'Thanks. Your feedback was received.',
  "enabledUserFields" TEXT[] NOT NULL DEFAULT ARRAY['email', 'name']::TEXT[],
  "requiredUserFields" TEXT[] NOT NULL DEFAULT ARRAY['email']::TEXT[],
  "enabledMetadataKeys" TEXT[] NOT NULL DEFAULT ARRAY['plan', 'environment', 'accountId', 'url']::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "widget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "widget_widgetKey_key" ON "widget"("widgetKey");
CREATE UNIQUE INDEX IF NOT EXISTS "widget_workspaceId_name_key" ON "widget"("workspaceId", "name");
CREATE INDEX IF NOT EXISTS "widget_workspaceId_archivedAt_idx" ON "widget"("workspaceId", "archivedAt");

ALTER TABLE "widget"
  ADD CONSTRAINT "widget_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "widget" (
  "id",
  "workspaceId",
  "name",
  "widgetKey",
  "widgetSecret",
  "brandColor",
  "accentColor",
  "position",
  "size",
  "title",
  "description",
  "successMessage",
  "enabledUserFields",
  "requiredUserFields",
  "enabledMetadataKeys",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy',
  'default',
  'Legacy',
  COALESCE("widgetKey", 'local-dev-widget'),
  'legacy-secret',
  COALESCE("brandColor", '#D9FF4D'),
  COALESCE("accentColor", '#0A0A0B'),
  COALESCE("position", 'bottom-right'),
  COALESCE("size", 'md'),
  COALESCE("title", 'Send feedback'),
  COALESCE("description", 'Tell us what happened or what could be better.'),
  COALESCE("successMessage", 'Thanks. Your feedback was received.'),
  COALESCE("enabledUserFields", ARRAY['email', 'name']::TEXT[]),
  COALESCE("requiredUserFields", ARRAY['email']::TEXT[]),
  COALESCE("enabledMetadataKeys", ARRAY['plan', 'environment', 'accountId', 'url']::TEXT[]),
  COALESCE("createdAt", CURRENT_TIMESTAMP),
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "widget_config"
WHERE "id" = 'default'
ON CONFLICT ("workspaceId", "name") DO NOTHING;

INSERT INTO "widget" ("id", "workspaceId", "name", "widgetKey", "widgetSecret")
VALUES ('legacy', 'default', 'Legacy', 'local-dev-widget', 'legacy-secret')
ON CONFLICT ("workspaceId", "name") DO NOTHING;

CREATE TABLE IF NOT EXISTS "widget_theme" (
  "id" TEXT NOT NULL,
  "widgetId" TEXT NOT NULL,
  "logoUrl" TEXT,
  "surfaceColor" TEXT NOT NULL DEFAULT '#0A0A0B',
  "textColor" TEXT NOT NULL DEFAULT '#FAF7F1',
  "fontFamily" TEXT NOT NULL DEFAULT 'system',
  "borderRadius" TEXT NOT NULL DEFAULT '18px',
  "shadow" TEXT NOT NULL DEFAULT 'soft',
  "launcherIcon" TEXT NOT NULL DEFAULT 'message-circle',
  "launcherLabel" TEXT NOT NULL DEFAULT 'Feedback',
  "darkMode" TEXT NOT NULL DEFAULT 'auto',
  "poweredBy" BOOLEAN NOT NULL DEFAULT true,
  "customCss" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "widget_theme_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "widget_theme_widgetId_key" ON "widget_theme"("widgetId");

ALTER TABLE "widget_theme"
  ADD CONSTRAINT "widget_theme_widgetId_fkey"
  FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "widget_theme" ("id", "widgetId")
SELECT 'legacy-theme', "id"
FROM "widget"
WHERE "id" = 'legacy'
ON CONFLICT ("widgetId") DO NOTHING;

ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "widgetId" TEXT;
CREATE INDEX IF NOT EXISTS "feedback_widgetId_idx" ON "feedback"("widgetId");

ALTER TABLE "feedback"
  ADD CONSTRAINT "feedback_widgetId_fkey"
  FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
