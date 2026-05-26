DO $$ BEGIN
  CREATE TYPE "WidgetSubmissionType" AS ENUM ('bug', 'idea', 'question', 'praise', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SurveyMode" AS ENUM ('none', 'csat', 'nps', 'thumbs');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SurveyScale" AS ENUM ('csat_5', 'nps_10', 'thumbs');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WidgetFieldKind" AS ENUM ('text', 'textarea', 'email', 'url', 'number', 'select', 'multiselect', 'radio', 'checkbox', 'rating', 'file');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WidgetFieldTarget" AS ENUM ('user', 'metadata', 'message', 'title', 'category', 'severity');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "FeedbackSeverity" AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "feedback"
  ADD COLUMN IF NOT EXISTS "submissionType" "WidgetSubmissionType",
  ADD COLUMN IF NOT EXISTS "severity" "FeedbackSeverity";

ALTER TABLE "widget"
  ADD COLUMN IF NOT EXISTS "enabledTypes" "WidgetSubmissionType"[] NOT NULL DEFAULT ARRAY['bug', 'idea', 'question']::"WidgetSubmissionType"[],
  ADD COLUMN IF NOT EXISTS "surveyMode" "SurveyMode" NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS "widget_field" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "widget_field_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "widget_field_widgetId_key_key" ON "widget_field"("widgetId", "key");
CREATE INDEX IF NOT EXISTS "widget_field_widgetId_order_idx" ON "widget_field"("widgetId", "order");

ALTER TABLE "widget_field"
  ADD CONSTRAINT "widget_field_widgetId_fkey"
  FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "survey" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT,
  "widgetId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "scale" "SurveyScale" NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "survey_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "survey_feedbackId_idx" ON "survey"("feedbackId");
CREATE INDEX IF NOT EXISTS "survey_widgetId_createdAt_idx" ON "survey"("widgetId", "createdAt");

ALTER TABLE "survey"
  ADD CONSTRAINT "survey_feedbackId_fkey"
  FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "survey"
  ADD CONSTRAINT "survey_widgetId_fkey"
  FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "widget_field" (
  "id",
  "widgetId",
  "key",
  "label",
  "kind",
  "required",
  "placeholder",
  "target",
  "order"
)
SELECT
  'default-title-' || "id",
  "id",
  'title',
  'Title',
  'text',
  false,
  'Short summary',
  'title',
  10
FROM "widget"
ON CONFLICT ("widgetId", "key") DO NOTHING;

INSERT INTO "widget_field" (
  "id",
  "widgetId",
  "key",
  "label",
  "kind",
  "required",
  "placeholder",
  "target",
  "order"
)
SELECT
  'default-message-' || "id",
  "id",
  'message',
  'Feedback',
  'textarea',
  true,
  'Tell us what happened or what could be better.',
  'message',
  20
FROM "widget"
ON CONFLICT ("widgetId", "key") DO NOTHING;
