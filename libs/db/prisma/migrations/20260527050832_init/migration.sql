-- Enable pgvector for knowledge-base embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "EscalationTier" AS ENUM ('none', 'watch', 'expedite', 'critical');

-- CreateEnum
CREATE TYPE "EscalationOperator" AS ENUM ('equals', 'contains', 'exists', 'numeric_gte');

-- CreateEnum
CREATE TYPE "ExternalIssueProvider" AS ENUM ('linear', 'jira');

-- CreateEnum
CREATE TYPE "ExternalIssueCreationMode" AS ENUM ('manual', 'automatic');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('image');

-- CreateEnum
CREATE TYPE "WidgetSubmissionType" AS ENUM ('bug', 'idea', 'question', 'praise', 'custom');

-- CreateEnum
CREATE TYPE "SurveyMode" AS ENUM ('none', 'csat', 'nps', 'thumbs');

-- CreateEnum
CREATE TYPE "SurveyScale" AS ENUM ('csat_5', 'nps_10', 'thumbs');

-- CreateEnum
CREATE TYPE "WidgetFieldKind" AS ENUM ('text', 'textarea', 'email', 'url', 'number', 'select', 'multiselect', 'radio', 'checkbox', 'rating', 'file');

-- CreateEnum
CREATE TYPE "WidgetFieldTarget" AS ENUM ('user', 'metadata', 'message', 'title', 'category', 'severity');

-- CreateEnum
CREATE TYPE "FeedbackSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "DeflectionOutcome" AS ENUM ('searched', 'answered', 'solved', 'submitted', 'abandoned');

-- CreateEnum
CREATE TYPE "FeedbackSentiment" AS ENUM ('negative', 'neutral', 'positive');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('new', 'triaged', 'claimed', 'in_progress', 'resolved', 'rejected');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'agent',

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "widgetId" TEXT,
    "submitterEmail" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "cleanedText" TEXT,
    "submissionType" "WidgetSubmissionType",
    "category" TEXT,
    "severity" "FeedbackSeverity",
    "escalationTier" "EscalationTier" NOT NULL DEFAULT 'none',
    "escalationReason" TEXT,
    "sentiment" "FeedbackSentiment",
    "status" "FeedbackStatus" NOT NULL DEFAULT 'new',
    "isNoise" BOOLEAN NOT NULL DEFAULT false,
    "knowledgeGap" BOOLEAN NOT NULL DEFAULT false,
    "userContext" JSONB,
    "metadata" JSONB,
    "consent" JSONB,
    "sourceUrl" TEXT,
    "sourceTitle" TEXT,
    "assignedAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triagedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_triage_run" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "cleanedText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sentiment" "FeedbackSentiment" NOT NULL,
    "knowledgeGap" BOOLEAN NOT NULL,
    "suggestedTags" TEXT[],
    "escalationTier" "EscalationTier" NOT NULL DEFAULT 'none',
    "escalationReason" TEXT,
    "issueTitle" TEXT,
    "issueBody" TEXT,
    "industryContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_triage_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_comment" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "feedbackId" TEXT,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industryPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_config" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tenantId" TEXT,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "widget" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widgetKey" TEXT NOT NULL,
    "widgetSecret" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "devMode" BOOLEAN NOT NULL DEFAULT false,
    "identityVerificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 30,
    "configRateLimitPerMinute" INTEGER NOT NULL DEFAULT 120,
    "requireConsent" BOOLEAN NOT NULL DEFAULT false,
    "privacyPolicyUrl" TEXT,
    "consentText" TEXT NOT NULL DEFAULT 'I agree to be contacted about this feedback.',
    "brandColor" TEXT NOT NULL DEFAULT '#D9FF4D',
    "accentColor" TEXT NOT NULL DEFAULT '#0A0A0B',
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "size" TEXT NOT NULL DEFAULT 'md',
    "title" TEXT NOT NULL DEFAULT 'Send feedback',
    "description" TEXT NOT NULL DEFAULT 'Tell us what happened or what could be better.',
    "successMessage" TEXT NOT NULL DEFAULT 'Thanks. Your feedback was received.',
    "enabledUserFields" TEXT[] DEFAULT ARRAY['email', 'name']::TEXT[],
    "requiredUserFields" TEXT[] DEFAULT ARRAY['email']::TEXT[],
    "enabledMetadataKeys" TEXT[] DEFAULT ARRAY['plan', 'environment', 'accountId', 'url']::TEXT[],
    "maxAttachmentBytes" INTEGER NOT NULL DEFAULT 10485760,
    "allowedMimeTypes" TEXT[] DEFAULT ARRAY['image/png', 'image/jpeg', 'image/webp']::TEXT[],
    "maxAttachmentsPerSubmit" INTEGER NOT NULL DEFAULT 3,
    "enabledTypes" "WidgetSubmissionType"[] DEFAULT ARRAY['bug', 'idea', 'question']::"WidgetSubmissionType"[],
    "surveyMode" "SurveyMode" NOT NULL DEFAULT 'none',
    "pageRules" JSONB,
    "audienceRules" JSONB,
    "triggerConfig" JSONB,
    "inlineEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "widget_variant" (
    "id" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "brandColor" TEXT,
    "launcherLabel" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_article" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sourceProvider" TEXT,
    "sourceId" TEXT,
    "sourceUrl" TEXT,
    "sourceLocale" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "sourcePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_chunk" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "heading" TEXT,
    "body" TEXT NOT NULL,
    "embedding" vector(1536),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deflection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "widgetId" TEXT,
    "query" TEXT NOT NULL,
    "outcome" "DeflectionOutcome" NOT NULL,
    "articleId" TEXT,
    "score" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "widget_theme" (
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
    "successAnimation" TEXT NOT NULL DEFAULT 'check',
    "customCss" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "widget_field" (
    "id" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "WidgetFieldKind" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "helpText" TEXT,
    "validation" JSONB,
    "options" JSONB,
    "visibleWhen" JSONB,
    "target" "WidgetFieldTarget" NOT NULL DEFAULT 'metadata',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachment" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'image',
    "mimeType" TEXT NOT NULL,
    "fileName" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT,
    "widgetId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "scale" "SurveyScale" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalation_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_shortId_key" ON "feedback"("shortId");

-- CreateIndex
CREATE INDEX "feedback_status_escalationTier_createdAt_idx" ON "feedback"("status", "escalationTier", "createdAt");

-- CreateIndex
CREATE INDEX "feedback_assignedAgentId_idx" ON "feedback"("assignedAgentId");

-- CreateIndex
CREATE INDEX "feedback_widgetId_idx" ON "feedback"("widgetId");

-- CreateIndex
CREATE INDEX "feedback_triage_run_feedbackId_createdAt_idx" ON "feedback_triage_run"("feedbackId", "createdAt");

-- CreateIndex
CREATE INDEX "feedback_comment_feedbackId_idx" ON "feedback_comment"("feedbackId");

-- CreateIndex
CREATE INDEX "audit_log_feedbackId_idx" ON "audit_log"("feedbackId");

-- CreateIndex
CREATE INDEX "notification_userId_read_idx" ON "notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_slug_key" ON "tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_slug_key" ON "workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "widget_widgetKey_key" ON "widget"("widgetKey");

-- CreateIndex
CREATE INDEX "widget_workspaceId_archivedAt_idx" ON "widget"("workspaceId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "widget_workspaceId_name_key" ON "widget"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "widget_variant_widgetId_enabled_idx" ON "widget_variant"("widgetId", "enabled");

-- CreateIndex
CREATE INDEX "kb_article_workspaceId_published_idx" ON "kb_article"("workspaceId", "published");

-- CreateIndex
CREATE UNIQUE INDEX "kb_article_workspaceId_slug_key" ON "kb_article"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "kb_article_workspaceId_sourceProvider_sourceId_key" ON "kb_article"("workspaceId", "sourceProvider", "sourceId");

-- CreateIndex
CREATE INDEX "kb_chunk_articleId_idx" ON "kb_chunk"("articleId");

-- CreateIndex
CREATE INDEX "kb_chunk_workspaceId_idx" ON "kb_chunk"("workspaceId");

-- CreateIndex
CREATE INDEX "deflection_workspaceId_createdAt_idx" ON "deflection"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "deflection_widgetId_outcome_idx" ON "deflection"("widgetId", "outcome");

-- CreateIndex
CREATE UNIQUE INDEX "widget_theme_widgetId_key" ON "widget_theme"("widgetId");

-- CreateIndex
CREATE INDEX "widget_field_widgetId_order_idx" ON "widget_field"("widgetId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "widget_field_widgetId_key_key" ON "widget_field"("widgetId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "attachment_storageKey_key" ON "attachment"("storageKey");

-- CreateIndex
CREATE INDEX "attachment_feedbackId_idx" ON "attachment"("feedbackId");

-- CreateIndex
CREATE INDEX "attachment_widgetId_idx" ON "attachment"("widgetId");

-- CreateIndex
CREATE INDEX "survey_feedbackId_idx" ON "survey"("feedbackId");

-- CreateIndex
CREATE INDEX "survey_widgetId_createdAt_idx" ON "survey"("widgetId", "createdAt");

-- CreateIndex
CREATE INDEX "escalation_rule_enabled_tier_idx" ON "escalation_rule"("enabled", "tier");

-- CreateIndex
CREATE INDEX "external_issue_link_provider_externalId_idx" ON "external_issue_link"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "external_issue_link_feedbackId_provider_key" ON "external_issue_link"("feedbackId", "provider");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_triage_run" ADD CONSTRAINT "feedback_triage_run_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comment" ADD CONSTRAINT "feedback_comment_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comment" ADD CONSTRAINT "feedback_comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widget" ADD CONSTRAINT "widget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widget_variant" ADD CONSTRAINT "widget_variant_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_article" ADD CONSTRAINT "kb_article_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_chunk" ADD CONSTRAINT "kb_chunk_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "kb_article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_chunk" ADD CONSTRAINT "kb_chunk_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deflection" ADD CONSTRAINT "deflection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deflection" ADD CONSTRAINT "deflection_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widget_theme" ADD CONSTRAINT "widget_theme_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widget_field" ADD CONSTRAINT "widget_field_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey" ADD CONSTRAINT "survey_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey" ADD CONSTRAINT "survey_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_issue_link" ADD CONSTRAINT "external_issue_link_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
