-- DropIndex
DROP INDEX "kb_chunk_embedding_ivfflat_idx";

-- AlterTable
ALTER TABLE "widget" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "widget_field" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "widget_theme" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workspace" ALTER COLUMN "updatedAt" DROP DEFAULT;
