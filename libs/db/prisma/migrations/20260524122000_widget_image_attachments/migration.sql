DO $$ BEGIN
  CREATE TYPE "AttachmentKind" AS ENUM ('image');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "widget"
  ADD COLUMN IF NOT EXISTS "maxAttachmentBytes" INTEGER NOT NULL DEFAULT 10485760,
  ADD COLUMN IF NOT EXISTS "allowedMimeTypes" TEXT[] NOT NULL DEFAULT ARRAY['image/png', 'image/jpeg', 'image/webp']::TEXT[],
  ADD COLUMN IF NOT EXISTS "maxAttachmentsPerSubmit" INTEGER NOT NULL DEFAULT 3;

CREATE TABLE IF NOT EXISTS "attachment" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "attachment_storageKey_key" ON "attachment"("storageKey");
CREATE INDEX IF NOT EXISTS "attachment_feedbackId_idx" ON "attachment"("feedbackId");
CREATE INDEX IF NOT EXISTS "attachment_widgetId_idx" ON "attachment"("widgetId");

ALTER TABLE "attachment"
  ADD CONSTRAINT "attachment_feedbackId_fkey"
  FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attachment"
  ADD CONSTRAINT "attachment_widgetId_fkey"
  FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
