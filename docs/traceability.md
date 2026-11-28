# Requirements Traceability Matrix

Version 2.1, 2026-11-28 (F-11 hardening, S3-03 #108: NFR-06, NFR-07, NFR-08 rows). Version 2.0, 2026-11-26 (Sprint 2 baseline, S2-09 #75: new columns, actual test files, result and release per row). Version 1.7, 2026-11-25 (Lab 7 CR-01: BR-06 v2 grace window, AC-49 to AC-52 planned, #83). Version 1.6, 2026-11-19 (F-06 part 1, original submitter, #55). Version 1.5, 2026-11-10 (Sprint 1 release v0.1.0: remaining Sprint 1 rows closed after integration test run and MC-00/MC-01). Version 1.4, 2026-11-07 (F-04 rows marked Implemented). Version 1.3, 2026-11-06 (F-03 rows marked Implemented). Version 1.2, 2026-11-06 (F-02 rows updated). Version 1.1, 2026-11-06 (F-01 rows marked Implemented). Version 1.0, 2026-11-05. Requirement to feature to sprint to verification.

Version 2.0 replaces the matrix layout. The 1.x matrix is kept in Git history (`git show 4b4b7e0:docs/traceability.md`).
Requirement IDs are in [srs.md](srs.md), features in [features.md](features.md). Sprint 1 AC/TEST IDs are in
[sprints/sprint-1/](sprints/sprint-1/), Sprint 2 in [sprints/sprint-2/](sprints/sprint-2/), Lab 7 AC-49..AC-52 in
[sprints/sprint-1/sts.md](sprints/sprint-1/sts.md) v1.1 and [labs/lab-07/](labs/lab-07/).

How to read the result column (status words of S2-09):

| Word | Meaning |
|---|---|
| Planned | contract/AC exists or is allocated, no code |
| Implemented | code merged to `staging`, test not yet run on the release commit |
| Tested | its tests passed on the given commit |
| Accepted | in release `v0.2.0` on `main`, tests passed, deployed |
| Not passed | test exists and fails or was skipped (reason given) |

Evidence behind "pass on `c066576` + CI `ebb177c`": the S2-07 cross-feature regression
([evidence/sprint-2/regression.txt](evidence/sprint-2/regression.txt): `npm test` 15 files / 132 tests passed,
`npm run test:e2e` 24 passed, 0 failed, 0 skipped; `c066576` = staging `7bb4d03` + tests only) and the
`test-and-docker` CI run on release PR #96 (head `ebb177c`, green). Release `v0.2.0` = tag on `main` `4b4b7e0`
(merge of `ebb177c`), deployed as Cloud Run revision `cpms-00007-7sf` on 2026-11-26 with post-deploy checks r01..r14
PASS ([evidence/release-v0.2.0/notes.md](evidence/release-v0.2.0/notes.md)). Sprint 1 rows were first accepted in
v0.1.0 and re-ran unchanged in that regression.

## Matrix

| Requirement | Feature | Sprint | AC / NFR check | Planned test | Actual file :: test name | Result + version |
|---|---|---|---|---|---|---|
| FR-01 | F-01 | 1 | AC-01, AC-02 | TEST-01, TEST-02, TEST-03 | `server/tests/auth.test.ts` :: TEST-01, TEST-02 / TEST-03 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-02 | F-01 | 1 | AC-04, AC-22 | TEST-05, TEST-E2E-02 | `server/tests/auth.test.ts` :: TEST-05<br>`web/e2e/auth.spec.ts` :: TEST-E2E-02 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-03 | F-01 | 1 | AC-01 | TEST-01 | `server/tests/auth.test.ts` :: TEST-01 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-04 | F-02 | 1 | AC-10 | TEST-11, TEST-12 | `server/tests/teams.test.ts` :: TEST-11, TEST-12 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-05 | F-03 | 1 | AC-06, AC-07 | TEST-07, TEST-08, TEST-U01 | `server/tests/milestones.test.ts` :: TEST-07, TEST-08, TEST-U01 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-06 | F-03 (status v2: Lab 7) | 1, v2 Lab 7 | AC-06, AC-10, AC-51 | TEST-07, TEST-11, TEST-12, TEST-54 | `server/tests/milestones.test.ts` :: TEST-07<br>`server/tests/teams.test.ts` :: TEST-11, TEST-12<br>`server/tests/late-grace.test.ts` :: TEST-54 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-07 | F-04 | 1 | AC-11, AC-12 | TEST-13, TEST-14, TEST-15 | `server/tests/submissions.test.ts` :: TEST-13, TEST-14, TEST-15 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-08 | F-04 | 1 | AC-16 | TEST-19 | `server/tests/submissions.test.ts` :: TEST-19 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-09 | F-04, F-05 | 1 | AC-11, AC-17 | TEST-13, TEST-21 | `server/tests/submissions.test.ts` :: TEST-13<br>`server/tests/feedback.test.ts` :: TEST-21 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-10 | F-05 | 1 | AC-17 | TEST-21 | `server/tests/feedback.test.ts` :: TEST-21 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-11 | F-06 part 2 | 2 | AC-24, AC-25, AC-26, AC-27 | TEST-U04, TEST-28..TEST-31 | `server/tests/revision-request.test.ts` :: TEST-U04 (3 tests), TEST-28, TEST-29, TEST-30 (2 tests), TEST-31 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-12 | F-06 part 3 | 2 | AC-28, AC-29, AC-30, AC-31 | TEST-U05, TEST-32..TEST-35 | `server/tests/resubmission.test.ts` :: TEST-U05 (3 tests), TEST-32, TEST-33 (2), TEST-34 (3), TEST-35 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-13 | F-06 parts 1, 4 | 2 | AC-23, AC-32, AC-33, AC-34, AC-35 | TEST-26, TEST-36, TEST-37, TEST-38, TEST-E2E-03 | `server/tests/submissions.test.ts` :: TEST-26<br>`server/tests/revision-request.test.ts` :: TEST-36<br>`server/tests/history.test.ts` :: TEST-37, TEST-38<br>`web/e2e/revision-history.spec.ts` :: TEST-E2E-03 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`); TEST-36 also rehearsed in `docs/evidence/F-06/migration-rehearsal.txt` |
| FR-14 | F-07 | 2 | AC-36..AC-42 | TEST-U06, TEST-39..TEST-44, TEST-E2E-04 | `server/tests/milestone-management.test.ts` :: TEST-U06 (3), TEST-39..TEST-44<br>`web/e2e/milestone-management.spec.ts` :: TEST-E2E-04 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-15 | F-08 | 2 | AC-43..AC-47 | TEST-U07, TEST-45..TEST-49 | `server/tests/grading.test.ts` :: TEST-U07 (2), TEST-45..TEST-49 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-16 | F-08 | 2 | AC-48 | TEST-50, TEST-E2E-05 | `server/tests/grading.test.ts` :: TEST-50<br>`web/e2e/grading.spec.ts` :: TEST-E2E-05 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| FR-17 | F-09 | 3 | Sprint 3 contract | Sprint 3 | none yet | Planned (Sprint 3) |
| FR-18 | F-10 | 3 | Sprint 3 contract (reads `lateAt`, grades) | Sprint 3 | none yet | Planned (Sprint 3) |
| FR-19 | F-09 | 3 | Sprint 3 contract | Sprint 3 | none yet | Planned (Sprint 3) |
| BR-01 | F-02 | 1 | AC-10, AC-15 | TEST-11, TEST-12, TEST-18 | `server/tests/teams.test.ts` :: TEST-11, TEST-12<br>`server/tests/submissions.test.ts` :: TEST-18 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`); Sprint 2 scope also in TEST-38, TEST-50 |
| BR-02 | F-02, F-03, F-05 | 1 | AC-08, AC-19 | TEST-09, TEST-23 | `server/tests/milestones.test.ts` :: TEST-09<br>`server/tests/feedback.test.ts` :: TEST-23 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`); Sprint 2 scope also in TEST-31, TEST-43, TEST-49 |
| BR-03 | F-02, F-03, F-04, F-05 | 1 | AC-09, AC-19 | TEST-10, TEST-20, TEST-22 | `server/tests/milestones.test.ts` :: TEST-10<br>`server/tests/submissions.test.ts` :: TEST-20<br>`server/tests/feedback.test.ts` :: TEST-22 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| BR-04 | F-03 | 1 | AC-07 | TEST-08, TEST-U01 | `server/tests/milestones.test.ts` :: TEST-08, TEST-U01 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| BR-05 | F-04 | 1 | AC-12 | TEST-14, TEST-15 | `server/tests/submissions.test.ts` :: TEST-14, TEST-15 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| BR-06 | F-04, F-03 status (v2 Lab 7 CR-01) | 1, v2 Lab 7 | AC-13 (superseded), AC-49, AC-50, AC-51, AC-52 | TEST-16, TEST-U02 (revised), TEST-U08, TEST-52..TEST-56, TEST-E2E-08 | `server/tests/submissions.test.ts` :: TEST-16, TEST-U02<br>`server/tests/late-grace.test.ts` :: TEST-U08, TEST-52..TEST-56<br>`web/e2e/late-grace.spec.ts` :: TEST-E2E-08 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`); live checks L7-DEP-01..07 PASS on `cpms-00007-7sf` (PR #98) |
| BR-07 | F-05 (per version: F-06) | 1, v2 in 2 | AC-18, AC-31 | TEST-24, TEST-27, TEST-U02, TEST-35, TEST-U05 | `server/tests/feedback.test.ts` :: TEST-24, TEST-27<br>`server/tests/submissions.test.ts` :: TEST-U02<br>`server/tests/resubmission.test.ts` :: TEST-35, TEST-U05 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| BR-08 | F-05 (per version: F-06) | 1, v2 in 2 | AC-20, AC-31 | TEST-25, TEST-35 | `server/tests/feedback.test.ts` :: TEST-25<br>`server/tests/resubmission.test.ts` :: TEST-35 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| BR-09 | F-04 | 1 | AC-14 | TEST-17, TEST-U03 | `server/tests/submissions.test.ts` :: TEST-17, TEST-U03 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| BR-10 | F-06 | 2 | AC-24, AC-25, AC-26, AC-28 | TEST-U04, TEST-28, TEST-29, TEST-30, TEST-32 | `server/tests/revision-request.test.ts` :: TEST-U04, TEST-28, TEST-29, TEST-30<br>`server/tests/resubmission.test.ts` :: TEST-32 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| BR-11 | F-06 | 2 | AC-29, AC-30 | TEST-U05, TEST-33, TEST-34 | `server/tests/resubmission.test.ts` :: TEST-U05, TEST-33, TEST-34 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| BR-12 | F-08 (hook in F-06) | 2 | AC-43..AC-47 | TEST-U07, TEST-45..TEST-49 | `server/tests/grading.test.ts` :: TEST-U07, TEST-45..TEST-49 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| BR-13 | F-07 | 2 | AC-37, AC-38, AC-39, AC-42 | TEST-U06, TEST-40, TEST-41, TEST-42, TEST-44, TEST-E2E-07 | `server/tests/milestone-management.test.ts` :: TEST-U06, TEST-40, TEST-41, TEST-42, TEST-44<br>`web/e2e/milestone-closed.spec.ts` :: TEST-E2E-07 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| NFR-01 | F-01 | 1 | AC-05 | TEST-06 | `server/tests/auth.test.ts` :: TEST-06 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`) |
| NFR-02 | F-01, F-02 | 1 | AC-03 (+ 401 cases in AC-27, AC-33, AC-40, AC-47) | TEST-04 | `server/tests/auth.test.ts` :: TEST-04 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`); new Sprint 2 routes in TEST-31, TEST-38, TEST-43, TEST-49 |
| NFR-03 | F-02 | 1 | AC-08, AC-09, AC-15, AC-19 | TEST-09, TEST-10, TEST-18, TEST-20, TEST-22, TEST-23 | `server/tests/milestones.test.ts` :: TEST-09, TEST-10<br>`server/tests/submissions.test.ts` :: TEST-18, TEST-20<br>`server/tests/feedback.test.ts` :: TEST-22, TEST-23 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`); deployed: r14 student grade 403 (`docs/evidence/release-v0.2.0/`) |
| NFR-04 | F-01 | 1 | AC-04; Secure cookie by config review | TEST-05 | `server/tests/auth.test.ts` :: TEST-05 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`). Secure flag in production: config review only (no automated test) |
| NFR-05 | F-00, R-01 | 1, 2 (deploy) | AC-11, AC-35; data kept across redeploy | TEST-13, TEST-36; release check r05, r13 | `server/tests/submissions.test.ts` :: TEST-13<br>`server/tests/revision-request.test.ts` :: TEST-36 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`); v0.2.0 deploy kept Sprint 1 data as version 1 (r05a/r05b) and after re-login (r13) |
| NFR-06 | F-11 | 3 | AC-63 | TEST-NFR-06 | `scripts/load-test.mjs` (`npm run load-test`); output `docs/evidence/F-11/load-test-<version>.txt` | Implemented (#108): script done, env/login guards checked locally (exit 2). Local dry run (not evidence, `docs/evidence/F-11/load-test-local-dryrun.txt`): all GETs PASS, login FAIL (p97.5 8.6 s, bcrypt cost 12). Measurement on the deployed candidate: Planned (before 13 Dec) |
| NFR-07 | F-11 (core screens F-03..F-08) | 1 (core), 3 (all) | AC-21, AC-22, AC-34, AC-41, AC-48, AC-64, AC-65 | TEST-E2E-01..TEST-E2E-05, TEST-67, TEST-68, TEST-69, TEST-70 | `web/e2e/feedback.spec.ts` :: TEST-E2E-01<br>`web/e2e/auth.spec.ts` :: TEST-E2E-02<br>`web/e2e/revision-history.spec.ts` :: TEST-E2E-03 (loading/empty/error by route interception)<br>`web/e2e/milestone-management.spec.ts` :: TEST-E2E-04<br>`web/e2e/grading.spec.ts` :: TEST-E2E-05<br>`web/e2e/screen-states.spec.ts` :: TEST-67, TEST-68, TEST-70<br>`server/tests/errors.test.ts` :: TEST-69 | Core screens: Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`). All screens (home, team, milestone, board, report): Tested on `feature/108-hardening`: server 149/149, E2E 29/29 (`docs/evidence/F-11/tdd-green*.txt`) |
| NFR-08 | F-00, R-01, F-11 | 1, 3 (CI) | DoD review; MC-01; AC-66 | Secret scan MC-01; TEST-SEC-01 | `docs/evidence/sprint-2/mc-01-v0.2.0.txt` (manual grep + web bundle check on `4b4b7e0`)<br>`.github/workflows/ci-docker.yml` step "Secret scan (gitleaks)"<br>`docs/evidence/F-11/secret-scan-local.txt` | Accepted v0.2.0 (MC-01 PASS on `4b4b7e0`, 2026-11-26). CI gate: Implemented (#108); local gitleaks 8.28.0 PASS on repo history, FAIL on a planted token. CI run links: added when the PR runs |
| NFR-09 | F-04 | 1 | AC-12 | TEST-15 | `server/tests/submissions.test.ts` :: TEST-15 | Accepted v0.2.0 (pass on `c066576` + CI `ebb177c`); same pattern for versions/grades in TEST-30, TEST-34, TEST-48 |

Numbers in brackets, such as "TEST-U04 (3 tests)", count separate `it` blocks that share one ID.

## Coverage gaps

| Gap | Requirement | Reason | Plan |
|---|---|---|---|
| No code or test | FR-17, FR-19 (F-09 board) | Sprint 3 scope | F-09 contract and tests in Sprint 3 |
| No code or test | FR-18 (F-10 report) | Sprint 3 scope | F-10 contract; reads `lateAt` and grades |
| Not measured | NFR-06 (20 users, p95 < 500 ms) | Load test needs the deployed candidate | `npm run load-test` (#108) on the deployed candidate before 13 Dec |
| Manual only | NFR-04 Secure cookie in production | Config review, no automated test | Keep in release checklist |
| Superseded | AC-13 (BR-06 v1) | Replaced by AC-49 in Lab 7 CR-01; TEST-16 now checks the v2 rule | none |

Not passed: none. No test failed or was skipped in the S2-07 regression or the release CI.

## Test index (actual names in code)

Generated with `grep -rnoE "(it|test)\('TEST-[^']*'" server/tests web/e2e`. Tests named in a `describe` block
(TEST-01..TEST-12, TEST-U01..TEST-U03, TEST-U08) are listed by their `describe` title.

| File | Test name |
|---|---|
| `server/tests/auth.test.ts` | TEST-01 (AC-01) login with correct credentials (describe) |
| `server/tests/auth.test.ts` | TEST-02 / TEST-03 (AC-02) wrong password and unknown email (describe) |
| `server/tests/auth.test.ts` | TEST-04 (AC-03, NFR-02) protected endpoints without a session (describe) |
| `server/tests/auth.test.ts` | TEST-05 (AC-04, NFR-04) logout (describe) |
| `server/tests/auth.test.ts` | TEST-06 (AC-05, NFR-01) stored password hashes (describe) |
| `server/tests/milestones.test.ts` | TEST-U01 (AC-07, BR-04) milestone input and status unit tests (describe) |
| `server/tests/milestones.test.ts` | TEST-07 (AC-06, FR-05, FR-06) POST and GET milestones for an assigned team (describe) |
| `server/tests/milestones.test.ts` | TEST-08 (AC-07, BR-04) POST milestone validation rejects invalid inputs (describe) |
| `server/tests/milestones.test.ts` | TEST-09 (AC-08, BR-02) POST milestone to an unassigned team returns 404 (describe) |
| `server/tests/milestones.test.ts` | TEST-10 (AC-09, BR-03) student cannot create a milestone (describe) |
| `server/tests/teams.test.ts` | TEST-11 (AC-10, FR-04) GET /api/teams lists only visible teams (describe) |
| `server/tests/teams.test.ts` | TEST-12 (AC-10, BR-01, BR-02) GET /api/teams/:teamId is scoped (describe) |
| `server/tests/submissions.test.ts` | TEST-U02 (AC-49 was AC-13, AC-18) canChangeSubmission unit tests (describe) |
| `server/tests/submissions.test.ts` | TEST-U03 (AC-14, BR-09) validateSubmissionInput unit tests (describe) |
| `server/tests/late-grace.test.ts` | TEST-U08 (AC-49, AC-51, AC-52) grace window boundaries with a fixed now (describe) |
| `server/tests/submissions.test.ts` | TEST-13 (AC-11) S1 submits to Alpha milestone; S2 and Sup1 GET milestone returning submission |
| `server/tests/submissions.test.ts` | TEST-14 (AC-12, BR-05) S2 submits again to milestone with existing submission -> 409 SUBMISSION_EXISTS |
| `server/tests/submissions.test.ts` | TEST-15 (AC-12, NFR-09) simultaneous POST submissions: exactly one succeeds and one gets 409 |
| `server/tests/submissions.test.ts` | TEST-16 (AC-49 was AC-13, BR-06) dueAt more than 24 h ago returns 422 DEADLINE_PASSED on POST and PUT |
| `server/tests/submissions.test.ts` | TEST-17 (AC-14, BR-09) rejects invalid inputs (ftp, not a url, short title) with 400 VALIDATION_ERROR |
| `server/tests/submissions.test.ts` | TEST-18 (AC-15, BR-01) student S3 of Team Beta accessing Team Alpha milestone with submission gets 404 |
| `server/tests/submissions.test.ts` | TEST-19 (AC-16) S2 PUT updates existing submission before due date |
| `server/tests/submissions.test.ts` | TEST-20 (AC-09, BR-03) supervisor cannot create or edit a submission (403 FORBIDDEN) |
| `server/tests/feedback.test.ts` | TEST-21 (AC-17) Sup1 posts feedback; S1 GET milestone shows feedback linked to submission with author Sup1 and status FEEDBACK_GIVEN |
| `server/tests/feedback.test.ts` | TEST-22 (AC-19, BR-03) S1 POST feedback -> 403 FORBIDDEN, no feedback row in DB |
| `server/tests/feedback.test.ts` | TEST-23 (AC-19, BR-02) Sup2 POST feedback on Alpha submission -> 404 NOT_FOUND, no feedback row in DB |
| `server/tests/feedback.test.ts` | TEST-24 (AC-18, BR-07) Alpha submission with feedback, before due -> S1 PUT submission -> 409 SUBMISSION_LOCKED, row unchanged |
| `server/tests/feedback.test.ts` | TEST-25 (AC-20, BR-08) Sup1 POST comment "   " -> 400; then valid -> 201; then valid again -> 409 FEEDBACK_EXISTS |
| `server/tests/submissions.test.ts` | TEST-26 (AC-23) original submitter is kept after a teammate edits |
| `server/tests/feedback.test.ts` | TEST-27 (AC-18, BR-07) Alpha submission by S1 with feedback, before due -> teammate S2 PUT submission -> 409 SUBMISSION_LOCKED, row unchanged |
| `server/tests/revision-request.test.ts` | TEST-28 (AC-24) Sup1 requests a revision -> 201, stored, status REVISION_REQUESTED for S1 and Sup1 |
| `server/tests/revision-request.test.ts` | TEST-29 (AC-25) invalid bodies -> 400 VALIDATION_ERROR with fields, nothing stored; 1 and 1000 chars -> 201 |
| `server/tests/revision-request.test.ts` | TEST-30 (AC-26) no feedback -> 409 FEEDBACK_REQUIRED; second request (open or expired) -> 409 REVISION_EXISTS |
| `server/tests/revision-request.test.ts` | TEST-30 (AC-26) two parallel requests store exactly one |
| `server/tests/revision-request.test.ts` | TEST-31 (AC-27) S1 403, Sup2 404, malformed 404, unknown 404, no session 401; nothing stored |
| `server/tests/resubmission.test.ts` | TEST-32 (AC-28) S2 resubmits before revision due -> 201 v2, createdBy S1, v1 + v1 feedback unchanged |
| `server/tests/resubmission.test.ts` | TEST-33 (AC-29) at/after revision due -> 422 REVISION_DUE_PASSED, status FEEDBACK_GIVEN, request EXPIRED |
| `server/tests/resubmission.test.ts` | TEST-33 (AC-29) milestone due passed but revision due in the future -> 201 |
| `server/tests/resubmission.test.ts` | TEST-34 (AC-30) S1 PUT edits v2 only before feedback; after revision due -> 422 DEADLINE_PASSED |
| `server/tests/resubmission.test.ts` | TEST-34 (AC-30) no request 409, second 409 RESUBMISSION_EXISTS, Sup1 403, S3 404, malformed 404 |
| `server/tests/resubmission.test.ts` | TEST-34 (AC-30) two parallel resubmissions store exactly one version |
| `server/tests/resubmission.test.ts` | TEST-35 (AC-31) feedback on v2 is stored on v2 and locks it; second feedback 409; v1 feedback unchanged |
| `server/tests/revision-request.test.ts` | TEST-36 every Submission has its current version row and every Feedback points to a version |
| `server/tests/history.test.ts` | TEST-37 (AC-32) S1, S2, Sup1 get every version ascending with submitter, feedback and revision request |
| `server/tests/history.test.ts` | TEST-38 (AC-33) S3 404, Sup2 404, malformed 404, unknown 404, no session 401; error bodies carry no data |
| `server/tests/milestone-management.test.ts` | TEST-39 (AC-36) Sup1 PATCHes title, description, dueAt -> 200, DB updated, S1 GET sees new values |
| `server/tests/milestone-management.test.ts` | TEST-40 (AC-37) invalid PATCH bodies -> 400 + fields, row unchanged; valid 3/120 titles and clear description -> 200 |
| `server/tests/milestone-management.test.ts` | TEST-41 (AC-38) Sup1 closes milestone -> 200; close again -> 409; PATCH closed -> 409; parallel closes -> one 200 + one 409 |
| `server/tests/milestone-management.test.ts` | TEST-42 (AC-39) closed milestone blocks submit, edit, resubmit, revision-request (409 MILESTONE_CLOSED) but allows feedback (201) |
| `server/tests/milestone-management.test.ts` | TEST-43 (AC-40) S1 403, Sup2 404, malformed 404, no cookie 401; DB row unchanged |
| `server/tests/milestone-management.test.ts` | TEST-44 (AC-42) past-due milestone: title-only PATCH keeps MISSED; extending dueAt reopens submit window |
| `server/tests/grading.test.ts` | TEST-45 (AC-43) Sup1 PUTs grade 85 on open, closed, expired-revision, and closed+open-revision milestones -> 200 |
| `server/tests/grading.test.ts` | TEST-46 (AC-44) invalid scores -> 400 fields.score, nothing stored; 0 and 100 -> 200 |
| `server/tests/grading.test.ts` | TEST-47 (AC-45) FEEDBACK_REQUIRED, REVISION_PENDING, SUBMISSION_GRADED, and parallel grade vs revision-request |
| `server/tests/grading.test.ts` | TEST-48 (AC-46) updating grade 85 -> 90 keeps one row with later updatedAt; parallel PUTs keep one row |
| `server/tests/grading.test.ts` | TEST-49 (AC-47) S1 403, Sup2 404, malformed 404, unknown 404, no cookie 401; Grade count 0 |
| `server/tests/grading.test.ts` | TEST-50 (AC-48) S1 and S2 see grade in GET milestone, S3 gets 404, ungraded returns grade: null |
| `server/tests/regression-sprint-2.test.ts` | TEST-51 create -> submit -> feedback -> revision -> v2 -> feedback -> grade -> edit due -> close -> history |
| `server/tests/late-grace.test.ts` | TEST-52 (AC-49, AC-50) POST inside the grace window -> 201 with lateAt; after it -> 422, no row |
| `server/tests/late-grace.test.ts` | TEST-53 (AC-49, AC-50) on-time then late edit sets lateAt once; F-07 extension keeps it; after grace 422 |
| `server/tests/late-grace.test.ts` | TEST-54 (AC-51, AC-50) team list: OPEN + graceEndsAt in grace, MISSED after, lateAt for team and supervisor only |
| `server/tests/late-grace.test.ts` | TEST-55 (AC-52) unchanged rules inside the grace window |
| `server/tests/late-grace.test.ts` | TEST-56 (AC-50, AC-52) on-time row has lateAt null; parallel late PUTs set lateAt once |
| `web/e2e/feedback.spec.ts` | TEST-E2E-01 (AC-21) supervisor leaves feedback, student sees feedback card and locked notice |
| `web/e2e/auth.spec.ts` | TEST-E2E-02 unauthenticated visit redirects to /login; after logout / redirects to /login again |
| `web/e2e/revision-history.spec.ts` | TEST-E2E-03 (AC-34) supervisor requests a revision, student resubmits, both see History |
| `web/e2e/milestone-management.spec.ts` | TEST-E2E-04 (AC-41) supervisor edits and closes milestone; team page and student view show Closed and no form |
| `web/e2e/grading.spec.ts` | TEST-E2E-05 (AC-48) supervisor records and edits grade; student sees grade and Not graded yet on ungraded work |
| `web/e2e/sprint-2-journey.spec.ts` | TEST-E2E-06 create -> submit -> feedback -> revision -> resubmit -> feedback -> grade; student sees grade and history |
| `web/e2e/milestone-closed.spec.ts` | TEST-E2E-07 closed milestone: student sees Closed and no form; direct API submit -> 409 MILESTONE_CLOSED |
| `web/e2e/late-grace.spec.ts` | TEST-E2E-08 (AC-50, AC-51) student submits inside the grace window; student and supervisor see Late |
| `server/tests/revision-request.test.ts` | TEST-U04 accepts reasons of 1 and 1000 characters and dueAt now + 1 min; returns trimmed data |
| `server/tests/revision-request.test.ts` | TEST-U04 rejects bad dueAt with fields.dueAt (missing, not a date, now, now - 1s) |
| `server/tests/revision-request.test.ts` | TEST-U04 rejects bad reasons with fields.reason |
| `server/tests/resubmission.test.ts` | TEST-U05 canChangeSubmission uses the revision due for v >= 2 (BR-11) and locks on current feedback (BR-07) |
| `server/tests/resubmission.test.ts` | TEST-U05 canResubmit: no request, answered request, open, due -1 s / = / +1 s |
| `server/tests/resubmission.test.ts` | TEST-U05 computeMilestoneStatus: open request -> REVISION_REQUESTED, expired -> FEEDBACK_GIVEN |
| `server/tests/milestone-management.test.ts` | TEST-U06 canChangeSubmission returns MILESTONE_CLOSED before DEADLINE_PASSED |
| `server/tests/milestone-management.test.ts` | TEST-U06 rejects empty, unknown-only, and non-object bodies with fields.form |
| `server/tests/milestone-management.test.ts` | TEST-U06 validates partial title, description, and dueAt boundaries |
| `server/tests/grading.test.ts` | TEST-U07 canGrade checks FEEDBACK_REQUIRED first and blocks only OPEN + unclosed milestone |
| `server/tests/grading.test.ts` | TEST-U07 validates score boundaries and rejects non-integer / non-number / out-of-range values |
| `server/tests/errors.test.ts` | TEST-69 returns the fixed 500 body with no stack or internal message |
| `web/e2e/screen-states.spec.ts` | TEST-67 (AC-64) every data screen shows loading, empty and error states |
| `web/e2e/screen-states.spec.ts` | TEST-68 (AC-64) server field errors show under each input and are linked with aria-describedby |
| `web/e2e/screen-states.spec.ts` | TEST-70 (AC-65) Try again reloads after a 500; a 404 shows no Try again |

## Approved changes

| Date | Change | Affected IDs |
|---|---|---|
| 2026-11-05 | Baseline created | all |
| 2026-11-07 | F-04 Team submission implemented | FR-07, FR-08, FR-09, BR-05, BR-06, BR-09, NFR-09 |
| 2026-11-09 | F-05 Supervisor feedback implemented (migration 20261109145639_feedback adds Feedback table) | FR-09, FR-10, BR-07, BR-08 |
| 2026-11-19 | F-06 part 1, original submitter `createdBy` (#55, PR #58, from Lab 6 UAT UF-03); migration `submission_created_by` | FR-13, AC-23 |
| 2026-11-23 | TEST-27 ported from `lab6-exercise` to `staging` (#72, PR #65, Lab 6 UF-EX-01) | BR-07 |
| 2026-11-24 | F-06 parts 2 to 4 implemented (#67 PR #79, #68 PR #80, #69 PR #81); migration `revision_versions` | FR-11, FR-12, FR-13, BR-07, BR-08, BR-10, BR-11 |
| 2026-11-25 | Lab 7 CR-01 approved (PR #90): BR-06 v2 24 h late grace window, `Submission.lateAt` | BR-06, FR-06, FR-07, FR-08, FR-09 |
| 2026-11-25 | F-07 milestone edit and close implemented (#70, PR #89); migration `milestone_close` | FR-14, BR-13 |
| 2026-11-25 | Lab 7 CR-01 implemented (#84, PR #93); migration `submission_late_at` | BR-06, FR-06, FR-07, FR-08 |
| 2026-11-25 | F-08 grading implemented (#71, PR #92); migration `grade` | FR-15, FR-16, BR-12 |
| 2026-11-26 | Sprint 2 regression TEST-51, TEST-E2E-06, TEST-E2E-07 added (#73, PR #94) | all Sprint 1 and 2 rows |
| 2026-11-26 | Release v0.2.0 (`4b4b7e0`, PR #96, #74) deployed as `cpms-00007-7sf` | all Sprint 2 rows, BR-06 v2 |
| 2026-11-26 | SRS v1.2: BR-07, BR-08, BR-10..BR-13 reworded to the contracts; matrix v2.0 (S2-09 #75) | BR-07, BR-08, BR-10, BR-11, BR-12, BR-13 |
| 2026-11-28 | F-11 hardening implemented (#108): load-test script, Try again, screen-state E2E, linked field errors, CI secret scan | NFR-06, NFR-07, NFR-08 |
