# Feature Inventory

Version 1.1, 2026-11-29 (Sprint 2: Status column, F-06 parts 1 to 4, change-log rows, S2-09 #75). Version 1.0, 2026-11-05. Requirement IDs refer to [srs.md](srs.md).

| ID | Feature | Description | Requirements | Depends on | Sprint | Status |
|---|---|---|---|---|---|---|
| F-00 | Project setup | Monorepo (server + web), TypeScript, Express and React skeletons, PostgreSQL + Prisma with first migration and seed, test runners (Vitest, Supertest, Playwright), env config, README, branch/issue/PR conventions. | NFR-05, NFR-08 | none | 1 | Accepted v0.1.0 |
| F-01 | Authentication and session | Login with email/password, logout, current user, session lifecycle, password hashing. | FR-01, FR-02, FR-03, NFR-01, NFR-02, NFR-04 | F-00 | 1 | Accepted v0.1.0 |
| F-02 | Role and team authorization | Cross-cutting backend responsibility: role checks and team ownership checks on every protected route; visible-team listing. | FR-04, BR-01, BR-02, BR-03, NFR-03 | F-01 | 1 | Accepted v0.1.0 |
| F-03 | Milestone creation | Supervisor creates a milestone for an assigned team; members list team milestones with status. | FR-05, FR-06, BR-04 | F-01, F-02 | 1 | Accepted v0.1.0 (status rule v2 in v0.2.0) |
| F-04 | Team submission | Student submits and edits the team's work before the deadline; members and supervisor view it. | FR-07, FR-08, FR-09, BR-05, BR-06, BR-09, NFR-09 | F-03 | 1 | Accepted v0.1.0 (BR-06 v2 grace window in v0.2.0) |
| F-05 | Supervisor feedback | Supervisor records feedback on a submission; feedback locks the submission and is visible to the team. | FR-09, FR-10, BR-07, BR-08 | F-04 | 1 | Accepted v0.1.0 (lock per version in v0.2.0) |
| F-06 | Revision and history | Part 1: original submitter kept (`createdBy`, #55). Part 2: revision request with reason and revision due date. Part 3: resubmission as a new version. Part 4: version history with feedback, revision request and grade per version. | FR-11, FR-12, FR-13, BR-07, BR-08, BR-10, BR-11 | F-05 | 2 | Accepted v0.2.0 |
| F-07 | Milestone management | Edit milestone details and due date; close a milestone. | FR-14, BR-13 | F-03 | 2 | Accepted v0.2.0 |
| F-08 | Grading | Supervisor grades a submission with feedback; team views grades. | FR-15, FR-16, BR-12 | F-05 | 2 | Accepted v0.2.0 |
| F-09 | Team progress board | Board of the team's milestones by status (open, submitted, feedback given, revision requested, missed). | FR-17, FR-19 | F-06, F-07, F-08 | 3 | Planned Sprint 3 |
| F-10 | Supervisor summary report | Summary across assigned teams: late/missing submissions, feedback pending, grade overview. | FR-18 | F-06, F-07, F-08 | 3 | Planned Sprint 3 |
| F-11 | Product hardening | Performance target, consistent loading/empty/error states, failure handling and regression suite. | NFR-06, NFR-07 | all | 3 | Planned Sprint 3 |
| R-01 | Persistence and delivery readiness | System responsibility: established by F-00 locally; Docker/CI/GCP added in Lab 5. | NFR-05, NFR-08 | F-00 | 1 (local), 2 (Lab 5 deploy) | Accepted v0.1.0 (Docker, CI and Cloud Run added in Lab 5, `a11fdc0`) |

## Change log

| Date | Change | Reason | Approved by |
|---|---|---|---|
| 2026-11-05 | Proposal approve/reject feature removed before baseline | Theme 6 Sprint 1 example requires milestone, submission and feedback | Team (D-01) |
| 2026-11-05 | Instructor role features removed before baseline | Scope decision D-04 | Team |
| 2026-11-05 | F-00 Project setup added as first Sprint 1 feature | Sprint 1 starts from an empty repository | Kan |
| 2026-11-19 | F-06 part 1 (original submitter `createdBy`) moved into Sprint 2 scope early | Lab 6 UAT finding UF-03: an edit replaced the submitter (#55, PR #58) | Team (PR #58 review) |
| 2026-11-21 | F-06 contract v0.2: parts 2 to 4; feedback moves to versions (BR-07, BR-08 per version) | Sprint 2 contract (S2-C1 #63, PR #76) | Team (PR #76 review) |
| 2026-11-23 | TEST-27 (teammate edit after feedback) ported from `lab6-exercise` to `staging` | Lab 6 controlled defect UF-EX-01 must stay covered (S2-06 #72, PR #65) | Team (PR #65 review) |
| 2026-11-25 | F-03 status and F-04 window changed by BR-06 v2 (24 h grace) | Lab 7 CR-01 (#82, PR #90) | Team (PR #90) |
| 2026-11-26 | F-06, F-07, F-08 released | Release v0.2.0 (`4b4b7e0`, #74) | Team (PR #96) |
