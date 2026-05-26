ALTER TABLE "kb_article"
  ADD COLUMN "sourceProvider" TEXT,
  ADD COLUMN "sourceId" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "sourceLocale" TEXT,
  ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "sourcePath" TEXT;

CREATE UNIQUE INDEX "kb_article_workspaceId_sourceProvider_sourceId_key"
  ON "kb_article"("workspaceId", "sourceProvider", "sourceId");
