-- #67 (F-06 v0.2): submissions get versions, revision requests and feedback per version.
-- Existing rows become version 1 (submittedById = last saver, createdById on Submission keeps the original
-- submitter) and every existing feedback is linked to that version 1. Contract: docs/sprints/sprint-2/F-06-revision-history.md.

-- 1. New tables and Submission.currentVersion
CREATE TABLE "SubmissionVersion" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "link" TEXT NOT NULL,
    "submittedById" UUID NOT NULL,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SubmissionVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RevisionRequest" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "dueAt" TIMESTAMPTZ(3) NOT NULL,
    "requestedById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevisionRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Submission" ADD COLUMN "currentVersion" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "SubmissionVersion_submissionId_versionNumber_key" ON "SubmissionVersion"("submissionId", "versionNumber");
CREATE UNIQUE INDEX "RevisionRequest_versionId_key" ON "RevisionRequest"("versionId");
CREATE INDEX "RevisionRequest_submissionId_idx" ON "RevisionRequest"("submissionId");

ALTER TABLE "SubmissionVersion" ADD CONSTRAINT "SubmissionVersion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionVersion" ADD CONSTRAINT "SubmissionVersion_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SubmissionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Backfill version 1 for every existing submission
INSERT INTO "SubmissionVersion" ("id", "submissionId", "versionNumber", "title", "description", "link", "submittedById", "submittedAt", "updatedAt")
SELECT gen_random_uuid(), s."id", 1, s."title", s."description", s."link", s."submittedById", s."submittedAt", s."updatedAt"
FROM "Submission" s;

-- 3. Link every existing feedback to version 1, then make the link required
ALTER TABLE "Feedback" ADD COLUMN "versionId" UUID;
UPDATE "Feedback" f SET "versionId" = v."id"
FROM "SubmissionVersion" v
WHERE v."submissionId" = f."submissionId" AND v."versionNumber" = 1;
ALTER TABLE "Feedback" ALTER COLUMN "versionId" SET NOT NULL;
CREATE UNIQUE INDEX "Feedback_versionId_key" ON "Feedback"("versionId");
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SubmissionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Feedback is per version now: the submission may have several (plain index instead of unique)
DROP INDEX "Feedback_submissionId_key";
CREATE INDEX "Feedback_submissionId_idx" ON "Feedback"("submissionId");
