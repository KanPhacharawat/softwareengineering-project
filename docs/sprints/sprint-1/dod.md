# Product Definition of Done (applies to every feature and release)

Version 1.0, 2026-11-05.

A feature is Done only when all of these hold and the evidence exists:

| # | Criterion | Evidence |
|---|---|---|
| 1 | Contract (feature SDS, UI/API/data, AC) and STS rows exist and were committed before implementation. | Commit history of `docs/sprints/` before code commits |
| 2 | Required behaviour is implemented through UI, API and database. | Demo screenshots, E2E test |
| 3 | Every AC has its planned tests implemented and executed; negative, boundary and permission cases included. | Test names mapped to AC in the results table |
| 4 | Rule work followed TDD: the test for the intended behaviour failed before the implementation and passes after. | Saved test run logs with commit IDs |
| 5 | All automated tests pass on the release commit; any failed or skipped test is disclosed, none weakened or disabled. | `npm test` output with counts and commit |
| 6 | Backend enforces authentication, role and ownership rules; no client-supplied identity or role is trusted. | API tests for 401/403/404 |
| 7 | No real secrets in Git or in the web bundle; configuration via environment variables. | MC-01 manual check |
| 8 | PR into sprint staging reviewed by the teammate with a specific check, question or finding; author did not approve own PR. | GitHub PR review |
| 9 | Integrated on sprint staging, full test suite and acceptance checks run, release PR merged to main and tagged. | Release PR, tag |
| 10 | README setup, migrations, seed and commands are current; docs (SRS, traceability) updated for any change. | Repository at the release tag |
| 11 | Incomplete work and known limitations are listed. | Part F known limitations |
