# Lab 7 release readiness and retrospective (#87)

Scope: the **maintained Sprint 1 functionality** (F-01 to F-05) plus the approved change CR-01 (BR-06 v2, 24-hour
late grace window) in the deployed release. Sprint 2 features (F-06 to F-08) are deployed in the same release but
are not Sprint 1 maintenance evidence. Reviewed 26 Nov 2026 by Kan and James (each reviews the other's part in PR).

## 1. Readiness checklist

| Item | Record |
|---|---|
| Submitted / deployed version | Tag `v0.2.0` → `main` `4b4b7e0` (PR #96); image `cpms:4b4b7e0…`; Cloud Run revision `cpms-00007-7sf` (100 % traffic). Full chain in [versions.md](versions.md). |
| Defects by severity / status | **None open.** Review basis: GitHub issues labeled `bug` (0, open or closed); reviews of PR #93 (approved, 0 blocking) and #98; all post-deploy checks passed. No defect was found in the Sprint 1 slice while making the change. |
| Automated tests | `staging` `9e28431` (= `main` release content + evidence docs), 26 Nov 13:31 Bangkok: `npm test` **15 files, 132 passed, 0 failed, 0 skipped**; Playwright **24 passed, 0 failed, 0 skipped**; typecheck and build pass. Node 22.23.5, Vitest 4.0.18, Playwright 1.63.0, PostgreSQL 16.15. Output: [readiness-tests.txt](../../evidence/lab-07/readiness-tests.txt). A first attempt the same day failed only because the local PostgreSQL in the dev container was not running (connection refused before any test ran); after starting it the run above passed with no code change. The release CI run [45671569032](https://github.com/KanPhacharawat/softwareengineering-project/actions/runs/45671569032) was green. Change-specific TDD: red `081f8a6` (8 failing), green `668a349` ([tdd-red.txt](../../evidence/lab-07/tdd-red.txt), [tdd-green.txt](../../evidence/lab-07/tdd-green.txt)). |
| Selected user tests | Manual, on the live site, 26 Nov: UAT-02 Test 2.3 (deadline) re-run as L7-DEP-02 (inside grace) and L7-DEP-03 (grace ended); UAT-03 lifecycle steps "teammate edit" and "lock after feedback" re-run as L7-DEP-01 and L7-DEP-06. UAT-01, 04, 05, 06 and the rest of UAT-02/03 were **not** re-run for Lab 7 (the deadline rule does not touch them; they are covered by the automated suite and the v0.2.0 post-deploy journey r01–r14). |
| Technical debt | Section 2 below. |
| Config / secrets | No new environment variable for this change. All variables documented in `server/.env.example` and `docs/labs/lab-05/deployment.md`; production values in Secret Manager / Cloud Run. `git grep` for hard-coded passwords/secrets found none (only placeholders and the documented test value). Seed password typed by the user in the browser, never stored. |
| Docs / run instructions | README and `deployment.md` unchanged and still correct (no new step for this change; the migration runs through the existing `cpms-migrate` job). UAT-02, UAT-03 and the UAT README updated for BR-06 v2 in this PR (AC-13 → AC-49, grace step added). SRS/SDS/STS/traceability updated in #83. |
| Deployment / smoke | L7-DEP-01 to 07 **all passed** on `cpms-00007-7sf` ([deploy evidence](../../evidence/lab-07/deploy/README.md)). Migration `20261125120000_submission_late_at` applied by `cpms-migrate-hqjd4`; Cloud SQL backup `1795628796635` taken before. |
| **Decision** | **READY.** The changed rule works on the live release for student, teammate and supervisor, the preserved rules (closed, lock, 404, old data) still hold, all automated tests pass, and no defect is open. Open items are debt only (section 2), none blocks use. Owner of follow-up: Kan (D-1, D-2 in Sprint 3), James (D-4 at Prisma 7). |

## 2. Technical debt

Debt is a known shortcut or weakness that works today; a defect is behavior that breaks a requirement (none open).

| ID | Item | Impact | Priority | Disposition / action |
|---|---|---|---|---|
| D-1 | Deadline logic in two places: server `canChangeSubmission` / `effectiveDueAt` decides, the UI repeats the comparison with `editableUntil ?? milestone.graceEndsAt` in `milestone-page.tsx` to hide the form. | If the rule changes again, the UI can disagree with the server until both are edited. Server still enforces (422), so no data risk. | Medium | Keep: UI already uses server-computed `editableUntil`/`graceEndsAt`, so only the "now ≥" check is duplicated. Sprint 3: add `canEdit` to the API response and drop the UI comparison. Owner Kan. |
| D-2 | Grace length is a hard-coded constant `GRACE_PERIOD_MS` (24 h). | Changing it needs a code change and release. | Low | Accepted: CR-01 scope says fixed 24 h, no configuration. Revisit only if a course rule asks for another value. |
| D-3 | UAT-02/03 case text described the old rule. | Testers would expect a reject right at the due time. | — | **Resolved in this PR** (UAT-02 Test 2.3 + step 20, UAT-03 objective, UAT README). |
| D-4 | `npm audit --omit=dev`: 4 high findings from the Prisma CLI config loader (`deepmerge-ts`, `effect`). | Build/migrate-time tooling only, not in the request path. | Low | Accepted until the Prisma 7 major upgrade (breaking). Owner James. Same as at v0.1.0. |
| D-5 | A Cloud Run revision created by a Console redeploy (outside the pipeline) would not match any commit. | Traceability of what runs. | — | **Not present now**: `cpms-00007-7sf` was created by deploy run 45676139537 with image tag = merge commit. Rule kept: deploy only through `deploy.yml`. |
| D-6 | `lateAt` is stored, not recomputed, when F-07 moves `dueAt`. | A supervisor who extends the due date still sees Late. | — | **By design** (CR-01 decision 3.3), tested by TEST-53. Not debt; listed so it is not reported as a defect. |

## 3. Retrospective

> Draft by Claude from the observed work; Kan and James edit their own wording in the PR review.

- **What helped?** Writing the change request and the reviewed contract (#82, #83) before any code meant the red tests in `081f8a6` came straight from AC-49..52, and James's review of #91 caught the missing "`lateAt` survives an F-07 extension" test before implementation. Next: keep "contract PR reviewed before the red commit" for the Sprint 3 rule change.
- **What hurt?** Three parallel streams (Lab 7, F-08 #92, release #74) touched the same files (`submission-service.ts`, `api.ts`, `milestone-page.tsx`) and made the release wait for #92 and #73. Post-deploy checks also needed a person to log in on the live site because the dev container cannot reach Cloud Run. Next: agree merge order for shared files at sprint planning, and set `SMOKE_EMAIL`/`SMOKE_PASSWORD` in the deploy workflow so login is part of the automated smoke.
- **What will change for the final release (13 Dec)?** Run the full readiness checklist (this file as the template) on the release candidate before merging to `main`, close D-1 by moving the edit decision to the API, and record every post-deploy check with revision and Bangkok time as done here.
