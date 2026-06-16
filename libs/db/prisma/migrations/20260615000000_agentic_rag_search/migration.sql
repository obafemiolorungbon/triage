-- Canonicalize the single-workspace development slug without overwriting an
-- explicitly configured default workspace.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "workspace" WHERE "slug" = 'default') THEN
        UPDATE "workspace" SET "slug" = 'default' WHERE "slug" = 'acme-demo';
    END IF;
END $$;

-- Search documents for hybrid customer-feedback retrieval.
CREATE TABLE "feedback_search_document" (
    "feedbackId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "searchVector" tsvector GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce("searchText", ''))
    ) STORED,
    "embedding" vector(1536),
    "contentHash" TEXT NOT NULL,
    "embeddingModel" TEXT,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embeddedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_search_document_pkey" PRIMARY KEY ("feedbackId")
);

CREATE INDEX "feedback_search_document_workspaceId_indexedAt_idx"
    ON "feedback_search_document"("workspaceId", "indexedAt");

CREATE INDEX "feedback_search_document_searchVector_idx"
    ON "feedback_search_document" USING GIN ("searchVector");

ALTER TABLE "feedback_search_document"
    ADD CONSTRAINT "feedback_search_document_feedbackId_fkey"
    FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feedback_search_document"
    ADD CONSTRAINT "feedback_search_document_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Generated lexical index for existing KB chunks.
ALTER TABLE "kb_chunk"
    ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
        to_tsvector(
            'simple',
            coalesce("heading", '') || ' ' || coalesce("body", '')
        )
    ) STORED;

CREATE INDEX "kb_chunk_searchVector_idx"
    ON "kb_chunk" USING GIN ("searchVector");
