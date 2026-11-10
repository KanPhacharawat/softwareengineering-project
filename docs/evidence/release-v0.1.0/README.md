# Release v0.1.0 evidence (Sprint 1 integration)

Collected 2026-11-10 on `sprint-1` at commit `45193c4` (all of F-00 to F-05 merged, PRs #15 to #20). Issue #13.

## Test results (DoD #5, #9)

| Check | Result | File |
|---|---|---|
| `npm test` (unit + API/DB, Vitest + Supertest) | 77 passed, 0 failed, 0 skipped (8 files) | [npm-test.txt](npm-test.txt) |
| Playwright E2E (incl. TEST-E2E-01, TEST-E2E-02) | 18 passed, 0 failed, 0 skipped | [e2e.txt](e2e.txt) |
| `npm run typecheck`, `npm run build` | pass | - |
| MC-00, MC-01 (NFR-08, AC-00c, DoD #7) | pass | [manual-checks-MC-00-MC-01.txt](manual-checks-MC-00-MC-01.txt) |
| Server-side rule and access checks (curl against the API) | all expected 401/403/404/409/422/400 | [api-rule-and-access-checks.txt](api-rule-and-access-checks.txt) |

Every STS test ID (TEST-00a to TEST-25, TEST-U01 to TEST-U03, TEST-E2E-01, TEST-E2E-02) appears in the test names.

## Integration review findings

Earlier review comments on PR #18, #19 and #20 were re-checked on the merged code: Bangkok time zone for due dates,
milestone detail route, Edit hidden after deadline, malformed id gives 404, "Last updated by" text, row lock
(`FOR UPDATE`) in both submission edit and feedback, TEST-U02 with a real feedback shape. All fixed.
Two gaps were still open and are fixed in this release (commit `45193c4`):

- TEST-12 did not create a Beta milestone, so it could not show that Beta milestone data does not leak.
- The E2E milestone test used a hard-coded due date 2026-12-01 and would start failing after that day.

## Part F demo screenshots ([screenshots/](screenshots/))

Seeded demo data (password `password123`). One extra Alpha milestone with a due date in the past was inserted
directly into the dev database for b1, because the UI and API (correctly) refuse to create one.

| Demo | Screenshots |
|---|---|
| Login / logout (AC-01, AC-02, AC-04, AC-22) | d1 unauthenticated visit goes to /login, d2 wrong password rejected, d3 logged in, d4 after logout back to /login |
| Normal journey (AC-21) | a1 supervisor teams, a2 milestone created, a3 student sees it OPEN, a4 to a5 student submits, a6 teammate sees the same submission, a7 to a8 supervisor feedback, a9 student sees feedback and lock |
| Rule rejection (BR-04, BR-06, BR-07) | b1 deadline passed so submission closed, b2 statuses MISSED and FEEDBACK_GIVEN, b3 milestone validation errors; API side in api-rule-and-access-checks.txt |
| Forbidden access (BR-01, BR-02, BR-03) | c1 student opens another team, c2 student has no New milestone form, c3 other supervisor opens an Alpha milestone |

## Known limitations at v0.1.0

- `npm audit`: 3 high findings, all one advisory in `deepmerge-ts` used by the Prisma CLI config loader (build and
  migrate time only). The fix needs the Prisma 7 major upgrade, planned with Lab 5.
- No login rate limiting yet (not a Sprint 1 requirement).
- NFR-05 restart-after-deploy and NFR-06 load are verified in Lab 5 / Sprint 3, as planned in the traceability matrix.
