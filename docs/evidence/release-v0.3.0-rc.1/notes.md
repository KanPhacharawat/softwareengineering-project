# Release v0.3.0-rc.1 (D2 integrated candidate) — DRAFT

Draft 27 Nov 2026, updated 28 Nov 2026 (Bangkok time) after F-10 #107 and F-11 #108 merged, on `release/109-v0.3.0-rc.1` (S3-04 #109). Deploy fields are filled after the release PR
`staging → main` is merged and "Deploy demo" runs.

## Release identity

| Item | Value |
|---|---|
| Tag | `v0.3.0-rc.1` on the merge commit (after deploy) |
| Merge commit on `main` | after deploy |
| Deployed image tag (`cpms:<sha>`) | after deploy (must equal the merge commit) |
| CI run (`test-and-docker`, release PR head) | after PR |
| Deploy run ("Deploy demo") | after deploy |
| Cloud Run revision (`cpms`) | after deploy |
| `cpms-migrate` execution | after deploy (expected: no pending migration) |
| Cloud SQL backup before release | Kan, before merge |
| Previous release | `v0.2.0` = `4b4b7e0` (Sprint 2 release, stays identifiable) |
| Live URL | https://cpms-wpsgfzameq-as.a.run.app |

## Contents since v0.2.0

| Item | What | Issues / PRs |
|---|---|---|
| F-09 Team progress board | `GET /api/teams/:teamId/board` + `/teams/:teamId/board`: summary (counts per status, graded, average score, closed) and five status columns; same view for team students and the assigned supervisor | #103 (PR #112), #106 (PR #115) |
| Sprint 3 contracts | F-09 v0.2, F-10 v0.2, F-11 v0.2 (`docs/sprints/sprint-3/`) | #103 (PR #112), #104 (PR #113), #105 (PR #114) |
| Sprint 2 docs | SRS 1.2, SDS 1.2, features 1.1, traceability 2.0, completion table, change register | #75 (PR #100) |
| F-10 Supervisor summary report | `GET /api/reports/supervisor-summary` + `/reports` page: per-team milestone status counts, graded and average score for the supervisor's teams; students 403 | #104 (PR #113), #107 (PR #116) |
| F-11 Hardening | **Try again** on network/5xx errors, `aria-busy` on milestones skeleton, field errors linked with `aria-describedby`, `npm run load-test` (NFR-06), CI secret scan with pinned gitleaks (NFR-08) | #105 (PR #114), #108 (PR #117) |
| Lab 7 docs | deploy evidence, metrics, readiness | #85 (PR #98), #86 (PR #101), #87 (PR #99) |

Not in this candidate (before 13 Dec): deployed load-test run (NFR-06; local dry run: login p97.5 ~8.6 s with bcrypt cost 12, expected to be recorded as a defect), TEST-SEC-01 red-run CI evidence, AC-67 final regression on `v1.0.0`.

## New API endpoints

| Method | Path | Role |
|---|---|---|
| GET | `/api/teams/:teamId/board` | Team member or assigned supervisor (others 404, anonymous 401) |
| GET | `/api/reports/supervisor-summary` | Supervisor only (student 403, anonymous 401) |

## Database migrations

None. `server/prisma/migrations` is unchanged since `v0.2.0` (same 9 migration folders; `git diff origin/main -- server/prisma/migrations` is empty); F-09, F-10 and F-11 add no schema change.

## Test results (before release PR)

On `release/109-v0.3.0-rc.1` (staging `f7fef7e` merged + version bump): typecheck and build ok, `npm test` 18 files /
149 tests passed, Playwright 29 passed, 0 failed, 0 skipped. Full output: [regression.txt](regression.txt).
Cross-feature checks: TEST-E2E-09 creates and submits a milestone through the Sprint 1/2 flows, then reads it on the F-09
board as student and supervisor; TEST-E2E-10 reads the same data on the F-10 supervisor report (student 403). Sprint 1
journeys TEST-E2E-01/02, Sprint 2 journeys TEST-E2E-06/07 and Lab 7 TEST-E2E-08 pass unchanged.
