# Release v0.2.0 (Sprint 2)

Released 26 Nov 2026 (Bangkok time). Merged `staging → main` in PR #96, deployed by "Deploy demo" (S2-08 #74).

## Release identity

| Item | Value |
|---|---|
| Tag | `v0.2.0` on `4b4b7e0` (GitHub Release "v0.2.0") |
| Merge commit on `main` | `4b4b7e058a70ca0c8b25d8b8c4b9ea0a519232e1` (PR #96, parents `a11fdc0` + `ebb177c`) |
| Deployed image tag (`cpms:<sha>`) | `4b4b7e058a70ca0c8b25d8b8c4b9ea0a519232e1` = merge commit ✓, digest `sha256:6fc6cd1ef52a1c8da867f1363b00f33c7cf4814ce1750108ad3f6ae0b30f5dd9` |
| CI run (`test-and-docker`, PR #96 head `ebb177c`) | [45671569032](https://github.com/KanPhacharawat/softwareengineering-project/actions/runs/45671569032) ✓ |
| Deploy run ("Deploy demo") | [45676139537](https://github.com/KanPhacharawat/softwareengineering-project/actions/runs/45676139537) ✓, smoke `/api/health`, `/api/ready`, `/` passed |
| Cloud Run revision (`cpms`) | `cpms-00007-7sf`, 100% traffic |
| `cpms-migrate` execution | `cpms-migrate-hqjd4`, succeeded (5 migrations) |
| Cloud SQL backup before release | `1795628796635` on `cpms-pg`, 2026-11-25 17:46 UTC, SUCCESSFUL |
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
Release PR #96 CI run: [45671569032](https://github.com/KanPhacharawat/softwareengineering-project/actions/runs/45671569032), green.

## Post-deploy checks (26 Nov 2026, live URL)

Journey on a new Alpha milestone "v0.2.0 check 2026-11-26" with seed users s1, s2, sup1. All passed.

| # | Check | Result | Screenshot |
|---|---|---|---|
| 1 | Deploy run green, image tag = merge commit, smoke passed | OK | [r01](r01-deploy-run-green.png), [r02](r02-deploy-summary.png) |
| 2 | New revision serves 100% | OK `cpms-00007-7sf` | [r03](r03-cloud-run-revision.png) |
| 3 | `cpms-migrate` succeeded | OK `cpms-migrate-hqjd4` | [r04](r04-migrate-job-success.png) |
| 4 | Sprint 1 data (17 Nov submission, UAT-Alpha-05) shown as Version 1 with its feedback | OK | [r05a](r05a-sprint1-data-as-version-1.jpg), [r05b](r05b-sprint1-data-history.jpg) |
| 5 | sup1 creates milestone (+7 d) | OK | [r06](r06-milestone-created.jpg) |
| 6 | s1 submits v1 | OK | [r07](r07-submission-saved.jpg) |
| 7 | sup1 feedback + revision request | OK | [r08a](r08a-revision-requested-badge.jpg), [r08b](r08b-revision-requested.jpg) |
| 8 | s2 resubmits, History v1 + v2 | OK | [r09a](r09a-resubmitted-v2.jpg), [r09b](r09b-history-v1-v2.jpg) |
| 9 | sup1 feedback on v2, grade 90 | OK | [r10](r10-graded-90.jpg) |
| 10 | sup1 closes milestone | OK | [r11](r11-milestone-closed.jpg) |
| 11 | s1 sees Closed, "This milestone is closed.", no form, Grade 90 / 100, History v1 + v2 | OK | [r12a](r12a-student-closed-view.jpg), [r12b](r12b-student-grade-history.jpg) |
| 12 | Log out, log in as s1 again: closedAt set, grade 90, versions [1, 2] | OK | [r13](r13-persisted-after-relogin.jpg) |
| 13 | s1 `PUT /api/submissions/:id/grade {"score":100}` → 403 `FORBIDDEN`, grade still 90 | OK | [r14](r14-student-grade-forbidden-403.jpg) |

Passwords were typed by Kan in the browser and are not recorded anywhere.

## Known limitations

- `npm audit --omit=dev`: 4 high findings, all from the Prisma CLI's config loader (`deepmerge-ts`, `effect`),
  used only at build and migrate time. The fix needs the Prisma 7 major upgrade (same as at v0.1.0).
- `Submission.createdById` for submissions made before this release is the last saver, not necessarily the first submitter.
- No login rate limiting yet.
- Cosmetic: when a revision reason ends with ".", the revision line shows two periods ("resubmit.. Due …"). Sprint 3 fix.

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
