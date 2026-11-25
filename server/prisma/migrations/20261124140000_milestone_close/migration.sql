-- #70 (F-07): milestone close metadata (additive, nullable; existing milestones stay unclosed).
-- Contract: docs/sprints/sprint-2/F-07-milestone-management.md v0.1.

ALTER TABLE "Milestone" ADD COLUMN "closedAt" TIMESTAMPTZ(3);
ALTER TABLE "Milestone" ADD COLUMN "closedById" UUID;

ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_closedById_fkey"
  FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_closed_pair_chk"
  CHECK (("closedAt" IS NULL) = ("closedById" IS NULL));
