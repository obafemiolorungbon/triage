CREATE TYPE "EscalationTier" AS ENUM ('none', 'watch', 'expedite', 'critical');
CREATE TYPE "EscalationOperator" AS ENUM ('equals', 'contains', 'exists', 'numeric_gte');
CREATE TYPE "ExternalIssueProvider" AS ENUM ('linear', 'jira');
CREATE TYPE "ExternalIssueCreationMode" AS ENUM ('manual', 'automatic');

DROP INDEX IF EXISTS "feedback_status_priority_createdAt_idx";

ALTER TABLE "feedback"
  DROP COLUMN IF EXISTS "priority",
  ADD COLUMN "escalationTier" "EscalationTier" NOT NULL DEFAULT 'none',
  ADD COLUMN "escalationReason" TEXT,
  ADD COLUMN "userContext" JSONB,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "sourceTitle" TEXT;

ALTER TABLE "feedback_triage_run"
  DROP COLUMN IF EXISTS "priority",
  ADD COLUMN "escalationTier" "EscalationTier" NOT NULL DEFAULT 'none',
  ADD COLUMN "escalationReason" TEXT,
  ADD COLUMN "issueTitle" TEXT,
  ADD COLUMN "issueBody" TEXT;

DROP TYPE IF EXISTS "FeedbackPriority";

CREATE INDEX "feedback_status_escalationTier_createdAt_idx" ON "feedback"("status", "escalationTier", "createdAt");

CREATE TABLE "workspace_config" (
  "id" TEXT NOT NULL DEFAULT 'default',
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
  CONSTRAINT "workspace_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "widget_config" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "widgetKey" TEXT NOT NULL,
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
  CONSTRAINT "widget_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "widget_config_widgetKey_key" ON "widget_config"("widgetKey");

CREATE TABLE "escalation_rule" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "operator" "EscalationOperator" NOT NULL,
  "value" TEXT,
  "tier" "EscalationTier" NOT NULL,
  "reason" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "escalation_rule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "escalation_rule_enabled_tier_idx" ON "escalation_rule"("enabled", "tier");

CREATE TABLE "external_issue_link" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "provider" "ExternalIssueProvider" NOT NULL,
  "externalId" TEXT NOT NULL,
  "externalKey" TEXT,
  "externalUrl" TEXT NOT NULL,
  "creationMode" "ExternalIssueCreationMode" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_issue_link_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_issue_link_feedbackId_provider_key" ON "external_issue_link"("feedbackId", "provider");
CREATE INDEX "external_issue_link_provider_externalId_idx" ON "external_issue_link"("provider", "externalId");

ALTER TABLE "external_issue_link"
  ADD CONSTRAINT "external_issue_link_feedbackId_fkey"
  FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "workspace_config" ("id") VALUES ('default') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "widget_config" ("id", "widgetKey") VALUES ('default', 'local-dev-widget') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "escalation_rule" ("id", "label", "field", "operator", "value", "tier", "reason")
VALUES
  ('default-enterprise-plan', 'Enterprise customer', 'plan', 'equals', 'enterprise', 'critical', 'Enterprise customer feedback is escalated by default.'),
  ('default-production-env', 'Production issue', 'environment', 'equals', 'production', 'expedite', 'Production environment feedback should be reviewed quickly.')
ON CONFLICT ("id") DO NOTHING;
