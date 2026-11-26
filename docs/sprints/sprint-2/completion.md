# Sprint 2 completion table

Version 1.0, 2026-11-29 (S2-09 #75, D2 Part B). Sources: feature contracts in this folder, merged PRs, the S2-07
regression ([../../evidence/sprint-2/regression.txt](../../evidence/sprint-2/regression.txt)) and release v0.2.0
([../../evidence/release-v0.2.0/notes.md](../../evidence/release-v0.2.0/notes.md)).

Result basis: `c066576` = staging `7bb4d03` (all Sprint 2 and Lab 7 code) + the S2-07 tests only. `npm test`
15 files / 132 tests passed, `npm run test:e2e` 24 passed, 0 failed, 0 skipped. CI `test-and-docker` green on
release PR #96 head `ebb177c`. Release `v0.2.0` = tag on `main` `4b4b7e0`, Cloud Run revision `cpms-00007-7sf`,
post-deploy checks r01..r14 PASS on 2026-11-26.

## Feature completion

| Feature | AC | Implementation (issue, PR, merge commit) | Executed verification (tests) | Result | Accepted release |
|---|---|---|---|---|---|
| F-06 Revision and history | AC-23..AC-35 | #55 / PR #58 `cf07680` (part 1); #67 / PR #79 `5b30c15`; #68 / PR #80 `f4543ff`; #69 / PR #81 `c981f6f` | TEST-26, TEST-28..TEST-38, TEST-U04, TEST-U05, TEST-E2E-03 | 13 / 13 AC pass, 0 failed on `c066576` | v0.2.0 |
| F-07 Milestone management | AC-36..AC-42 | #70 / PR #89 `37d8913` | TEST-39..TEST-44, TEST-U06, TEST-E2E-04, TEST-E2E-07 | 7 / 7 AC pass, 0 failed on `c066576` | v0.2.0 |
| F-08 Grading | AC-43..AC-48 | #71 / PR #92 `7bb4d03` | TEST-45..TEST-50, TEST-U07, TEST-E2E-05 | 6 / 6 AC pass, 0 failed on `c066576` | v0.2.0 |
| Cross-feature regression | all Sprint 1 + 2 AC | #73 / PR #94 `c9b2d2b`; TEST-27 port #72 / PR #65 `45af544` | TEST-51, TEST-E2E-06, TEST-E2E-07, Sprint 1 suite unchanged | pass, 0 failed, 0 skipped | v0.2.0 |
| Lab 7 CR-01 (BR-06 v2, maintenance of F-03/F-04) | AC-49..AC-52 | #84 / PR #93 `69598c8` | TEST-U08, TEST-52..TEST-56, TEST-16, TEST-E2E-08; live L7-DEP-01..07 | 4 / 4 AC pass on `c066576`; L7-DEP PASS on `cpms-00007-7sf` | v0.2.0 |

Not done in Sprint 2: none of the planned Sprint 2 AC. Sprint 3 features (F-09, F-10, F-11) are Planned, see
[traceability](../../traceability.md#coverage-gaps).

## Per-AC check

| AC | Feature | What it checks | Executed test (file :: ID) | Result |
|---|---|---|---|---|
| AC-23 | F-06 p1 | original submitter kept after teammate edit | `server/tests/submissions.test.ts` :: TEST-26 | Pass (`c066576`, CI `ebb177c`) |
| AC-24 | F-06 p2 | revision request stored, status REVISION_REQUESTED | `server/tests/revision-request.test.ts` :: TEST-28 | Pass (`c066576`, CI `ebb177c`) |
| AC-25 | F-06 p2 | invalid reason / dueAt rejected | `server/tests/revision-request.test.ts` :: TEST-29, TEST-U04 (3) | Pass (`c066576`, CI `ebb177c`) |
| AC-26 | F-06 p2 | FEEDBACK_REQUIRED, REVISION_EXISTS, parallel requests | `server/tests/revision-request.test.ts` :: TEST-30 (2) | Pass (`c066576`, CI `ebb177c`) |
| AC-27 | F-06 p2 | 403 / 404 / 401 on revision request | `server/tests/revision-request.test.ts` :: TEST-31 | Pass (`c066576`, CI `ebb177c`) |
| AC-28 | F-06 p3 | resubmit creates version 2, v1 unchanged | `server/tests/resubmission.test.ts` :: TEST-32 | Pass (`c066576`, CI `ebb177c`) |
| AC-29 | F-06 p3 | REVISION_DUE_PASSED; revision due overrides milestone due | `server/tests/resubmission.test.ts` :: TEST-33 (2), TEST-U05 | Pass (`c066576`, CI `ebb177c`) |
| AC-30 | F-06 p3 | NO_REVISION_REQUEST, RESUBMISSION_EXISTS, edit window of v2 | `server/tests/resubmission.test.ts` :: TEST-34 (3), TEST-U05 | Pass (`c066576`, CI `ebb177c`) |
| AC-31 | F-06 p3 | feedback on v2 locks v2, v1 feedback unchanged | `server/tests/resubmission.test.ts` :: TEST-35 | Pass (`c066576`, CI `ebb177c`) |
| AC-32 | F-06 p4 | full history for team and supervisor | `server/tests/history.test.ts` :: TEST-37 | Pass (`c066576`, CI `ebb177c`) |
| AC-33 | F-06 p4 | history scoped (404 / 401) | `server/tests/history.test.ts` :: TEST-38 | Pass (`c066576`, CI `ebb177c`) |
| AC-34 | F-06 p4 | UI revision, resubmit, History | `web/e2e/revision-history.spec.ts` :: TEST-E2E-03 | Pass (`c066576`, CI `ebb177c`) |
| AC-35 | F-06 | migration: every submission has v1, feedback on v1 | `server/tests/revision-request.test.ts` :: TEST-36; `docs/evidence/F-06/migration-rehearsal.txt`; prod r05a/r05b | Pass (`c066576`, CI `ebb177c`) |
| AC-36 | F-07 | PATCH title, description, dueAt | `server/tests/milestone-management.test.ts` :: TEST-39 | Pass (`c066576`, CI `ebb177c`) |
| AC-37 | F-07 | invalid PATCH rejected | `server/tests/milestone-management.test.ts` :: TEST-40, TEST-U06 | Pass (`c066576`, CI `ebb177c`) |
| AC-38 | F-07 | close, second close 409, parallel close | `server/tests/milestone-management.test.ts` :: TEST-41 | Pass (`c066576`, CI `ebb177c`) |
| AC-39 | F-07 | closed milestone blocks student writes and revision request | `server/tests/milestone-management.test.ts` :: TEST-42, TEST-U06; `web/e2e/milestone-closed.spec.ts` :: TEST-E2E-07 | Pass (`c066576`, CI `ebb177c`) |
| AC-40 | F-07 | 403 / 404 / 401 on edit and close | `server/tests/milestone-management.test.ts` :: TEST-43 | Pass (`c066576`, CI `ebb177c`) |
| AC-41 | F-07 | UI edit and close, Closed badge | `web/e2e/milestone-management.spec.ts` :: TEST-E2E-04 | Pass (`c066576`, CI `ebb177c`) |
| AC-42 | F-07 | extending a past-due milestone reopens submit | `server/tests/milestone-management.test.ts` :: TEST-44 | Pass (`c066576`, CI `ebb177c`) |
| AC-43 | F-08 | grade stored (open, closed, expired revision) | `server/tests/grading.test.ts` :: TEST-45 | Pass (`c066576`, CI `ebb177c`) |
| AC-44 | F-08 | invalid scores rejected, 0 and 100 accepted | `server/tests/grading.test.ts` :: TEST-46, TEST-U07 | Pass (`c066576`, CI `ebb177c`) |
| AC-45 | F-08 | FEEDBACK_REQUIRED, REVISION_PENDING, SUBMISSION_GRADED | `server/tests/grading.test.ts` :: TEST-47, TEST-U07 | Pass (`c066576`, CI `ebb177c`) |
| AC-46 | F-08 | grade update keeps one row | `server/tests/grading.test.ts` :: TEST-48 | Pass (`c066576`, CI `ebb177c`) |
| AC-47 | F-08 | 403 / 404 / 401 on grade | `server/tests/grading.test.ts` :: TEST-49 | Pass (`c066576`, CI `ebb177c`) |
| AC-48 | F-08 | team sees grade, other team 404, UI | `server/tests/grading.test.ts` :: TEST-50; `web/e2e/grading.spec.ts` :: TEST-E2E-05 | Pass (`c066576`, CI `ebb177c`) |

Lab 7 AC shipped in the same release:

| AC | Feature | What it checks | Executed test (file :: ID) | Result |
|---|---|---|---|---|
| AC-49 | F-04 (Lab 7) | v1 save accepted until dueAt + 24 h | `server/tests/late-grace.test.ts` :: TEST-U08, TEST-52, TEST-53; `server/tests/submissions.test.ts` :: TEST-16 | Pass (`c066576`, CI `ebb177c`) |
| AC-50 | F-04 (Lab 7) | first late save sets lateAt once | `server/tests/late-grace.test.ts` :: TEST-52, TEST-53, TEST-54, TEST-56; `web/e2e/late-grace.spec.ts` :: TEST-E2E-08 | Pass (`c066576`, CI `ebb177c`) |
| AC-51 | F-03 (Lab 7) | OPEN in grace, MISSED after | `server/tests/late-grace.test.ts` :: TEST-U08, TEST-54; TEST-E2E-08 | Pass (`c066576`, CI `ebb177c`) |
| AC-52 | F-04 (Lab 7) | unchanged rules inside grace | `server/tests/late-grace.test.ts` :: TEST-U08, TEST-55, TEST-56 | Pass (`c066576`, CI `ebb177c`) |

A count such as "TEST-30 (2)" means two `it` blocks share that ID. Exact test names: [traceability test index](../../traceability.md#test-index-actual-names-in-code).
