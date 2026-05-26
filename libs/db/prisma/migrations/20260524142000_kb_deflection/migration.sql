-- Pgvector is required for knowledge-base semantic search.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "DeflectionOutcome" AS ENUM ('searched', 'answered', 'solved', 'submitted', 'abandoned');

-- CreateTable
CREATE TABLE "kb_article" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateIndex
CREATE UNIQUE INDEX "kb_article_workspaceId_slug_key" ON "kb_article"("workspaceId", "slug");
CREATE INDEX "kb_article_workspaceId_published_idx" ON "kb_article"("workspaceId", "published");
CREATE INDEX "kb_chunk_articleId_idx" ON "kb_chunk"("articleId");
CREATE INDEX "kb_chunk_workspaceId_idx" ON "kb_chunk"("workspaceId");
CREATE INDEX "kb_chunk_embedding_ivfflat_idx" ON "kb_chunk" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
CREATE INDEX "deflection_workspaceId_createdAt_idx" ON "deflection"("workspaceId", "createdAt");
CREATE INDEX "deflection_widgetId_outcome_idx" ON "deflection"("widgetId", "outcome");

-- AddForeignKey
ALTER TABLE "kb_article" ADD CONSTRAINT "kb_article_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kb_chunk" ADD CONSTRAINT "kb_chunk_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "kb_article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kb_chunk" ADD CONSTRAINT "kb_chunk_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deflection" ADD CONSTRAINT "deflection_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deflection" ADD CONSTRAINT "deflection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
