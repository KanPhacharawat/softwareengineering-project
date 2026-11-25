-- F-08: grades (BR-12). New table only, safe on existing data.
-- Contract: docs/sprints/sprint-2/F-08-grading.md v0.1.

CREATE TABLE "Grade" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "gradedById" UUID NOT NULL,
    "gradedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Grade_submissionId_key" ON "Grade"("submissionId");

ALTER TABLE "Grade" ADD CONSTRAINT "Grade_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Grade" ADD CONSTRAINT "Grade_gradedById_fkey"
  FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Grade" ADD CONSTRAINT "Grade_score_range_chk"
  CHECK ("score" >= 0 AND "score" <= 100);
