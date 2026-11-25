-- Lab 7 CR-01 (BR-06 v2): first late save time. NULL for existing rows (all on time under the old rule).
ALTER TABLE "Submission" ADD COLUMN "lateAt" TIMESTAMPTZ(3);
