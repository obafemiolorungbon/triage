-- Add targeting, trigger, and inline configuration to widgets.
ALTER TABLE "widget" ADD COLUMN "pageRules" JSONB;
ALTER TABLE "widget" ADD COLUMN "audienceRules" JSONB;
ALTER TABLE "widget" ADD COLUMN "triggerConfig" JSONB;
ALTER TABLE "widget" ADD COLUMN "inlineEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Widget variants are used by embed.js for sticky A/B assignment.
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

CREATE INDEX "widget_variant_widgetId_enabled_idx" ON "widget_variant"("widgetId", "enabled");
ALTER TABLE "widget_variant" ADD CONSTRAINT "widget_variant_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
