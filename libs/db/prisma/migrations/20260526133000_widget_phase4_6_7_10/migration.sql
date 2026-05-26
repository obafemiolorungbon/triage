ALTER TABLE "feedback"
ADD COLUMN "shortId" TEXT,
ADD COLUMN "consent" JSONB;

UPDATE "feedback"
SET "shortId" = 'TR-' || upper(substr(md5("id"), 1, 6))
WHERE "shortId" IS NULL;

ALTER TABLE "feedback"
ALTER COLUMN "shortId" SET NOT NULL;

CREATE UNIQUE INDEX "feedback_shortId_key" ON "feedback"("shortId");

ALTER TABLE "widget"
ADD COLUMN "requireConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "privacyPolicyUrl" TEXT,
ADD COLUMN "consentText" TEXT NOT NULL DEFAULT 'I agree to be contacted about this feedback.';
