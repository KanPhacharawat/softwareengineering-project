# Release v0.2.0 (Sprint 2)

> **Draft.** Prepared on `release/74-v0.2.0` before the release. Fields marked _after deploy_ are filled in by the
> follow-up PR once `staging → main` is merged, deployed and tagged (S2-08 #74).

## Release identity

| Item | Value |
|---|---|
| Tag | `v0.2.0` (_after deploy_) |
| Merge commit on `main` | _after deploy_ |
| Deployed image tag (`cpms:<sha>`) | _after deploy_ (must equal the merge commit) |
| CI run (`test-and-docker`) | _after deploy_ |
| Deploy run ("Deploy demo") | _after deploy_ |
| Cloud Run revision (`cpms`) | _after deploy_ |
| `cpms-migrate` execution | _after deploy_ |
| Previous release | `v0.1.0` = `a11fdc0`, revision `cpms-00006-xfg` (left untouched) |
| Live URL | https://cpms-wpsgfzameq-as.a.run.app |

## Features

| Feature | What users get | Issues / PRs |
|---|---|---|
| F-06 Revision request, resubmission and history | Supervisor requests a revision with a reason and due date; a student resubmits as a new version; everyone in the team sees the version history with feedback per version | #63 (PR #76), #55 (PR #58), #67 (PR #79), #68 (PR #80), #69 (PR #81) |
| F-07 Milestone management | Supervisor edits title, description and due date, and closes a milestone; a closed milestone blocks all student writes | #64 (PR #77), #70 (PR #89) |
| F-08 Grading | Supervisor saves and edits a 0–100 grade after feedback; students see "Grade: N / 100" | #66 (PR #78), #71 (PR #92) |
| Lab 7 CR-01, BR-06 v2 late grace window | v1 can be submitted or edited until 24 h after the due date and is marked Late | #82 (PR #90), #83 (PR #91), #84 (PR #93) |
| Tests | TEST-27 port; Sprint 2 cross-feature regression | #72 (PR #65), #73 (PR #94) |

Also in this release (docs only, from Lab 6): PR #50, #51, #53, #56, #57.

## New API endpoints

| Method | Path | Role |
|---|---|---|
| PATCH | `/api/milestones/:milestoneId` | Supervisor |
| POST | `/api/milestones/:milestoneId/close` | Supervisor |
| POST | `/api/submissions/:submissionId/revision-request` | Supervisor |
| POST | `/api/submissions/:submissionId/versions` | Student |
| GET | `/api/submissions/:submissionId/history` | Team member or team supervisor |
| PUT | `/api/submissions/:submissionId/grade` | Supervisor |

## Database migrations (run by `cpms-migrate`, in order)

| Migration | Change | Existing data |
|---|---|---|
| `20261119150000_submission_created_by` | `Submission.createdById` (NOT NULL) | Backfilled from `submittedById` (last saver, because v0.1.0 never stored the original submitter) |
| `20261123180000_revision_versions` | `SubmissionVersion`, `RevisionRequest`, `Submission.currentVersion`, `Feedback.versionId` (NOT NULL) | Every submission becomes version 1 and every feedback is linked to it |
| `20261124140000_milestone_close` | `Milestone.closedAt`, `closedById` + pair CHECK | Nullable, existing milestones stay open |
| `20261125120000_submission_late_at` | `Submission.lateAt` | Nullable, NULL is correct for old rows |
| `20261125164000_grade` | `Grade` table + score CHECK 0..100 | New table only |

Rehearsed on a v0.1.0 schema with Sprint 1 data: [migration-rehearsal.txt](migration-rehearsal.txt). Nothing was lost.

## Test results

On staging `c9b2d2b`'s test commit (S2-07 #73): `npm test` 15 files / 132 tests passed, Playwright 24 passed,
0 failed, 0 skipped, typecheck and build ok. Full output: [../sprint-2/regression.txt](../sprint-2/regression.txt).
Release PR CI run: _after deploy_.

## Post-deploy checks (_after deploy_)

Smoke (`/api/health`, `/api/ready`), manual journey on the live URL, persistence after reload and re-login,
forbidden call (S1 `PUT /grade` → 403) and the Sprint 1 data shown as Version 1. Screenshots go in this folder.

## Known limitations

- `npm audit --omit=dev`: 4 high findings, all from the Prisma CLI's config loader (`deepmerge-ts`, `effect`),
  used only at build and migrate time. The fix needs the Prisma 7 major upgrade (same as at v0.1.0).
- `Submission.createdById` for submissions made before this release is the last saver, not necessarily the first submitter.
- No login rate limiting yet.

## Rollback plan

1. **Migration fails:** `deploy/release.sh` stops before updating the service, so the old revision keeps serving.
   Read the `cpms-migrate` logs and fix forward on `staging`. Restore the Cloud SQL backup taken before the
   release only together with James.
2. **Broken deploy after a successful migration:** prefer a fix forward. An image rollback
   (run `deploy.yml` with `image_tag` = `a11fdc0…`) does not undo migrations. v0.1.0 code can still read, but:
   creating feedback fails (`Feedback.versionId` is NOT NULL), creating a submission fails (`Submission.createdById`
   is NOT NULL with no default), and editing a submission updates `Submission` but not its `SubmissionVersion` v1,
   so the history drifts. Use it only to restore a site that is down.
3. Either way, open a `defect` issue.
