## B.1 Tests for the new behavior: setup and assertions

Evidence **L7-B01**. Issue #84, branch `feature/84-late-grace-window`. All new tests were written in the red commit
`081f8a6` on top of the pre-change implementation `492957a`, before any production code changed.

| Test ID | AC | File | Setup | Assertion |
|---|---|---|---|---|
| TEST-U08 | AC-49, AC-51, AC-52 | `server/tests/late-grace.test.ts` | pure domain functions, fixed `now`, due `D = 2026-11-20T10:00Z`, `G = D + 24 h` | `canChangeSubmission` allows `D - 1 ms`, `D`, `G - 1 ms`, rejects `G` with `DEADLINE_PASSED`; closed → `MILESTONE_CLOSED`, feedback → `SUBMISSION_LOCKED`, v2 past revision due → `DEADLINE_PASSED`; status `OPEN` until `G - 1 ms`, `MISSED` at `G` |
| TEST-52 | AC-49, AC-50 | same | Alpha milestone `D = now - 1 h`; second one `D = now - 25 h` | POST → 201, `lateAt` between request start and end, 1 row; second POST → 422 `DEADLINE_PASSED`, 0 rows |
| TEST-53 | AC-49, AC-50 | same | on-time POST, then due moved to `now - 1 h` | late PUT sets `lateAt`; next PUT keeps it; Sup1 extends `dueAt` (F-07) and `lateAt` is unchanged for S1 and Sup1; after `now - 25 h` PUT → 422, row unchanged |
| TEST-54 | AC-51, AC-50 | same | no-submission milestones in and after grace; one late submission | team list `OPEN` + `graceEndsAt = D + 24 h`, then `MISSED`; same `lateAt` for S1 and Sup1; S3 → 404 |
| TEST-55 | AC-52 | same | milestones inside the grace window | closed → 409 `MILESTONE_CLOSED`; after feedback → 409 `SUBMISSION_LOCKED`; second POST → 409 `SUBMISSION_EXISTS`; Sup1 → 403; S3 → 404; v2 → 422 |
| TEST-56 | AC-50, AC-52 | same | on-time row, then two parallel late PUTs (`Promise.all`) | `lateAt = null` before; both 200; `lateAt` set once and not overwritten |
| TEST-E2E-08 | AC-50, AC-51 | `web/e2e/late-grace.spec.ts` | milestone due 1 h ago (browser, Playwright) | S1 sees the grace message, submits, sees `Late` and "Submitted late at … (Bangkok time)"; Sup1 sees `Late` on the team list and milestone page |

The API has no injectable clock, so API/DB tests place the due date relative to real time (`now - 1 h` is inside the
window, `now - 25 h` is after it). Exact millisecond boundaries are tested in TEST-U08 with a fixed `now`.

**Excerpt: TEST-U08 and TEST-52** (`server/tests/late-grace.test.ts` at `081f8a6`, lines 37–101)

{{code 081f8a6:server/tests/late-grace.test.ts|37-101}}

**Excerpt: TEST-E2E-08** (`web/e2e/late-grace.spec.ts` at `081f8a6`)

{{code 081f8a6:web/e2e/late-grace.spec.ts|19-43}}

## B.2 Red: the new tests fail on the pre-change implementation

Evidence **L7-B02**. Tested code: `staging` `492957a` (pre-change implementation) plus the test-only commit `081f8a6`.
Run 25 Nov 2026 12:31:19 UTC (19:31 Bangkok). Command: `cd server && npx vitest run`.

Result: **8 failed, 115 passed, 0 skipped** (123 tests, 13 files). All 8 failures are assertion failures on the missing
new behavior (`expected 422 to be 201`, `expected 'MISSED' to be 'OPEN'`, `expected undefined to be null` for the
missing `lateAt` field); there is no compile error and no broken fixture, and all 115 existing tests still pass.

{{text docs/evidence/lab-07/tdd-red.txt}}

## B.3 Implementation diff

Evidence **L7-B03**. Commit `668a349` (TDD green), the complete production-code change. `git diff 081f8a6 668a349`
for `server/prisma`, `server/src` and `web/src` (the green commit changed no test).

| Area | Change |
|---|---|
| Rule | `GRACE_PERIOD_MS` and `graceEndsAt()` in one place; `effectiveDueAt` = `dueAt + 24 h` for version 1, revision due for version ≥ 2 (no grace, BR-11). Check order `MILESTONE_CLOSED` → `DEADLINE_PASSED` → `SUBMISSION_LOCKED` unchanged. |
| Status | no submission → `MISSED` only at `now >= dueAt + 24 h`. |
| Data | migration `20261125120000_submission_late_at`: nullable `lateAt TIMESTAMPTZ(3)`, no backfill (old rows were all on time). |
| Consistency | `lateAt` is written inside the existing transaction; on PUT only when version 1, `lateAt` is null and `now >= dueAt`, under the existing Milestone → Submission `FOR UPDATE` locks, so parallel late saves set it once (TEST-56). |
| Authorization | unchanged: the same routes, role checks and team scoping; grace widens no access (TEST-55, L7-DEP-05). |
| API / UI | `lateAt`, `graceEndsAt`, `editableUntil`; `Late` badge, grace message, form open until `graceEndsAt`. |

{{diff 081f8a6 668a349 -- server/prisma server/src web/src}}

## B.4 Green: the same tests pass

Evidence **L7-B04**. Tested commit `668a349`, run 25 Nov 2026 12:35:06 UTC (19:35 Bangkok), same command.
Result: **123 passed, 0 failed, 0 skipped** (13 files), including all 8 tests that failed in B.2.

{{text docs/evidence/lab-07/tdd-green.txt}}

## B.5 Regression of existing behavior

Evidence **L7-B05** (on the change), **L7-B06** (revised old tests), **L7-D02** (on the release candidate).

**Selected suite and why.** The whole server suite and all Playwright specs were run, not a subset, because the changed
functions (`canChangeSubmission`, `effectiveDueAt`, `computeMilestoneStatus`) are called by every write path for
submissions (F-04), feedback lock (F-05), resubmission (F-06), milestone edit/close (F-07) and by every milestone
list/detail response. The suite covers the preserved rules listed in A.2 section 2: on-time submit/edit, one submission
per milestone under parallel requests, validation, feedback lock, supervisor 403, other team 404, closed milestone,
resubmission deadline, original submitter.

| Run | Commit | Command | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| Baseline before the change | `492957a` | `npm test` | 115 | 0 | 0 |
| Green, server | `668a349` | `npm test` (Vitest + Supertest) | 123 | 0 | 0 |
| Green, E2E | `668a349` | `npm run test:e2e` (Playwright, Chromium, 1 worker) | 21 | 0 | 0 |
| Green, types | `668a349` | `npm run typecheck` | pass | | |
| CI on PR #93 | `668a349` | `test-and-docker`: `npm test`, typecheck, `npm run build`, `docker build` | success | | |
| Release candidate, server | `9e28431` (= `v0.2.0` code) | `npm test` | 132 | 0 | 0 |
| Release candidate, E2E | `9e28431` | `npm run test:e2e` | 24 | 0 | 0 |
| Release candidate, types + build | `9e28431` | `npm run typecheck`, `npm run build` | pass | | |

Tool versions (recorded on 26 Nov in the same dev container): Node 22.23.5, Vitest 4.0.18, Playwright 1.63.0,
PostgreSQL 16.15. The release-candidate counts are higher because F-08 (#92) and the Sprint 2 regression (#94) were merged
after the change; they include all CR-01 tests (131/131 on the merge of #92 with the change, before #94).

{{text docs/evidence/lab-07/regression.txt}}

{{text docs/evidence/lab-07/readiness-tests.txt}}

**Existing tests whose expected result changed legitimately (L7-B06).** Only fixtures that encoded the old deadline were
moved past the new grace end, so they still assert the same rejection (422 `DEADLINE_PASSED`, `MISSED`, row
unchanged). No test was deleted, skipped or weakened. Each changed line carries the comment `// Lab 7 BR-06 v2 (CR-01, #82)`.
The STS revision of TEST-16 and TEST-U02 is versioned in `sts.md` v1.1 (A.3). Diff `git diff 492957a 081f8a6`:

{{diff 492957a 081f8a6 -- server/tests/submissions.test.ts server/tests/milestones.test.ts server/tests/resubmission.test.ts server/tests/milestone-management.test.ts}}

## B.6 Issue, PR review, CI and staging integration

Evidence **L7-B07**.

| Item | Value |
|---|---|
| Issue | #84 L7-03 (closed by PR #93) |
| PR | #93 `feature/84-late-grace-window` → `staging`, commits `081f8a6` (red) and `668a349` (green) |
| CI | run 45615332623, job `test-and-docker`, **success**, 25 Nov 2026 12:36–12:38 UTC, on `668a349` |
| Review | James, **Approved**, 25 Nov 2026 22:04 Bangkok, on `668a349` (text below) |
| Integration | merged by James into `staging` as `69598c8`, 25 Nov 22:05 Bangkok |
| Later Sprint 2 merge | F-08 grading PR #92 (`7bb4d03`) touched the same files and was merged after the change without conflicts; 131/131 on the merged result. Sprint 2 cross-feature regression PR #94 includes the CR-01 tests. |

**PR #93 review (James, Approved, 25 Nov 2026 22:04 Bangkok):**

> Reviewed the full diff, TDD red/green evidence, and regression outputs for **CR-01 (BR-06 v2)** against Lab 7 Part B
> and the contract merged in #91.
>
> **TDD sequence (`081f8a6` red → `668a349` green):** Red commit fails on 8 genuine assertion errors (`expected 422 to
> be 201`, `expected 'MISSED' to be 'OPEN'`, `expected undefined to be null`) with 115 existing tests passing; green
> commit brings the suite to 123/123 server tests, 21/21 Playwright E2E tests, and clean `typecheck`.
> `change-request.md` §7 now records the exact pre-change baseline (`staging 492957a` / red `081f8a6`).
>
> **Domain and precedence:** `GRACE_PERIOD_MS`, `graceEndsAt()`, `effectiveDueAt()` (v1 gets +24 h, v >= 2 keeps
> revision due with no grace), `computeMilestoneStatus()`, and the `MILESTONE_CLOSED → DEADLINE_PASSED →
> SUBMISSION_LOCKED` order match the contract.
>
> **Persistence and concurrency:** Nullable `Submission.lateAt TIMESTAMPTZ(3)` migration with no backfill is safe for
> production. Setting `lateAt` only when `currentVersion === 1 && !locked.lateAt && now >= lockedMilestone.dueAt` inside
> the existing `FOR UPDATE` lock handles parallel late PUTs cleanly (`TEST-56`) and preserves `lateAt` across F-07
> due-date extensions (`TEST-53`).
>
> **Regression hygiene and UI:** All 5 revised existing test fixtures are clearly annotated (`// Lab 7 BR-06 v2`)
> without weakening or skipping unaffected checks. `LateBadge`, grace notice, and `editableUntil ?? milestone.graceEndsAt`
> form window work for both student and supervisor (`TEST-E2E-08`), and CI (`test-and-docker`) is green.
>
> **Minor notes for #85 / Lab 7 PDF (non-blocking):** include tool versions (Node, Vitest, Playwright, Postgres) and
> `npm run build` alongside the `regression.txt` counts. *(Done: B.5 table and L7-D02.)*
>
> Approved, ready to merge into `staging`.

## B.7 Reviewed main release and GCP deployment

Evidence **L7-B08**. The change shipped inside the Sprint 2 release `v0.2.0` through the normal Lab 5 pipeline
(`staging → main` PR, CI, merge commit, "Deploy demo" workflow). Issue #85 recorded the release and checks.

| Item | Value |
|---|---|
| Release PR | #96 `staging` (`ebb177c`) → `main`, approved by James 26 Nov 01:30 Bangkok, merged by James 01:32 |
| Release commit and tag | `main` `4b4b7e058a70ca0c8b25d8b8c4b9ea0a519232e1`, tag `v0.2.0` |
| CI on the release PR | run 45671569032 `test-and-docker`, success, on `ebb177c` |
| Cloud SQL backup before release | `1795628796635` on `cpms-pg`, SUCCESSFUL |
| Deploy run | 45676139537 "Deploy demo" on `main`, success |
| Image | `cpms:4b4b7e058a70ca0c8b25d8b8c4b9ea0a519232e1`, digest `sha256:6fc6cd1e…0f5dd9` |
| Migration job | `cpms-migrate-hqjd4` succeeded, applied `20261125120000_submission_late_at` |
| Cloud Run revision | `cpms-00007-7sf`, 100 % traffic, https://cpms-wpsgfzameq-as.a.run.app |

**PR #96 review (James, Approved, 26 Nov 2026 01:30 Bangkok):**

> Release gate checks look good for `v0.2.0` (`staging` `ebb177c` → `main`): scope is clean (97 files across F-06,
> F-07, F-08, Lab 6 docs, Lab 7 CR-01, S2-06/S2-07 tests, and PR #95 release prep; no stray files or unreviewed
> commits); all 5 migrations are in order and rehearsed with 0 data loss, and pre-merge Cloud SQL backup
> `1795628796635` is confirmed `SUCCESSFUL`; `CI & Docker Build / test-and-docker` passed on this PR (`45671569032`);
> rollback impact accurately covers `Feedback.versionId`, `Submission.createdById`, and `SubmissionVersion` drift.
> Approved, ready to merge with **Create a merge commit** to trigger production deploy.

{{fig docs/evidence/release-v0.2.0/r01-deploy-run-green.png|L7-B08a (r01). Deploy demo run 45676139537 on main 4b4b7e0 completed successfully, 26 Nov 2026 01:32–01:36 Bangkok. Expected: all jobs green. Actual: green.}}

{{fig docs/evidence/release-v0.2.0/r04-migrate-job-success.png|L7-B08b (r04). Cloud Run job cpms-migrate, execution cpms-migrate-hqjd4 succeeded (includes 20261125120000_submission_late_at). Expected: success. Actual: success.}}

{{fig docs/evidence/release-v0.2.0/r03-cloud-run-revision.png|L7-B08c (r03). Cloud Run service cpms: revision cpms-00007-7sf serving 100 % of traffic, image tag 4b4b7e0. Expected: new revision live. Actual: live.}}

## B.8 Post-deployment checks: changed and preserved behavior

Evidence **L7-DEP-01** to **L7-DEP-07**. Manual checks on the live site, revision `cpms-00007-7sf`, 26 Nov 2026,
synthetic seed users (s1, s2 = Team Alpha students, s3 = Team Beta student, sup1 = Alpha supervisor). L7-DEP-01..03 check
the changed rule; L7-DEP-04..06 check preserved Sprint 1 domain and access rules; L7-DEP-07 is the pipeline smoke test.
API output was captured from the browser console of the logged-in user; passwords were typed by the user and never
stored.

{{include docs/evidence/lab-07/deploy/README.md|section=2}}

{{fig docs/evidence/lab-07/deploy/L7-DEP-01a-student-late-badge.jpg|L7-DEP-01a. 26 Nov 13:21 Bangkok, cpms-00007-7sf. Action: s1 submits through the form 2 min after the due time 13:19. Expected: saved, Late. Actual: SUBMITTED, Late badge, "Submitted late at 26 Nov 2026, 13:21 (Bangkok time)", grace notice until 27 Nov 13:19.}}

{{fig docs/evidence/lab-07/deploy/L7-DEP-01b-supervisor-team-list-late.jpg|L7-DEP-01b. 26 Nov 13:22, cpms-00007-7sf. Action: sup1 opens the Alpha team page. Expected: Late badge in the milestone list. Actual: Late badge next to SUBMITTED.}}

{{fig docs/evidence/lab-07/deploy/L7-DEP-01c-supervisor-milestone-late.jpg|L7-DEP-01c. 26 Nov 13:22, cpms-00007-7sf. Action: sup1 opens the milestone. Expected: same late time as the student sees. Actual: Late badge and the same "Submitted late at" time.}}

{{fig docs/evidence/lab-07/deploy/L7-DEP-02-open-grace-message.jpg|L7-DEP-02. 26 Nov 13:21, cpms-00007-7sf. Action: s1 opens the milestone 2 min after the due time, no submission. Expected: OPEN with the grace message and the form. Actual: OPEN, "Due date passed. Late submissions accepted until 27 Nov 2026, 13:19 (Bangkok time)."}}

{{fig docs/evidence/lab-07/deploy/L7-DEP-03-missed-after-grace.jpg|L7-DEP-03. 26 Nov 13:12, cpms-00007-7sf. Action: s1 opens "UAT-Alpha-02 Boundary Sandbox" (due 22 Nov 14:00, grace ended 23 Nov 14:00, no submission) and POSTs. Expected: MISSED, 422 DEADLINE_PASSED. Actual: MISSED, [422, "DEADLINE_PASSED"], still no submission.}}

{{fig docs/evidence/lab-07/deploy/L7-DEP-04-sprint1-not-late.jpg|L7-DEP-04. 26 Nov 13:12, cpms-00007-7sf. Action: s1 opens "UAT-Alpha-05" (Sprint 1 submission of 17 Nov). Expected: lateAt null, no Late badge (old data unchanged by the migration). Actual: lateAt null, FEEDBACK_GIVEN, no Late badge.}}

{{fig docs/evidence/lab-07/deploy/L7-DEP-05-other-team-404.jpg|L7-DEP-05. 26 Nov 13:25, cpms-00007-7sf. Action: s3 (Team Beta) opens the Alpha milestone and PUTs. Expected: 404, no data. Actual: GET 404 NOT_FOUND, PUT 404, page "Not found or you do not have access".}}

{{fig docs/evidence/lab-07/deploy/L7-DEP-06-teammate-late-locked.jpg|L7-DEP-06. 26 Nov 13:24, cpms-00007-7sf. Action: sup1 gave feedback at 13:22; s2 (teammate) edits inside the grace window. Expected: 409 SUBMISSION_LOCKED, data unchanged; teammate also sees Late. Actual: [409, "SUBMISSION_LOCKED"], title and lateAt unchanged, Late badge shown.}}

**Raw API output for L7-DEP-01..06** (`docs/evidence/lab-07/deploy/api-output.txt`):

{{text docs/evidence/lab-07/deploy/api-output.txt}}

**L7-DEP-07 smoke test** (excerpt of the deploy job log; environment lines with no assessed content removed):

{{text docs/evidence/lab-07/deploy/L7-DEP-07-smoke.txt|1-17,40-43}}

## B.9 Version table

Evidence **L7-B09**.

{{include docs/labs/lab-07/versions.md}}
