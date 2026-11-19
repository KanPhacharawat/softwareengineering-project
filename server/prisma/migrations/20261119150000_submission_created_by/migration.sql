-- #55 (F-06): keep the original submitter. Existing rows only know the last editor, so backfill from it.
ALTER TABLE "Submission" ADD COLUMN "createdById" UUID;
UPDATE "Submission" SET "createdById" = "submittedById";
ALTER TABLE "Submission" ALTER COLUMN "createdById" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
