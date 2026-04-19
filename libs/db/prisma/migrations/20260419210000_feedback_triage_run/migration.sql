-- CreateTable
CREATE TABLE "feedback_triage_run" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "cleanedText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "FeedbackPriority" NOT NULL,
    "sentiment" "FeedbackSentiment" NOT NULL,
    "knowledgeGap" BOOLEAN NOT NULL,
    "suggestedTags" TEXT[],
    "industryContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_triage_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_triage_run_feedbackId_createdAt_idx" ON "feedback_triage_run"("feedbackId", "createdAt");

-- AddForeignKey
ALTER TABLE "feedback_triage_run" ADD CONSTRAINT "feedback_triage_run_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
