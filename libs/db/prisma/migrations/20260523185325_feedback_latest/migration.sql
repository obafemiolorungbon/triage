-- AlterTable
ALTER TABLE "escalation_rule" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "widget_config" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workspace_config" ALTER COLUMN "updatedAt" DROP DEFAULT;
