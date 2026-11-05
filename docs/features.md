# Feature Inventory

Version 1.0, 2026-11-05. Requirement IDs refer to [srs.md](srs.md).

| ID | Feature | Description | Requirements | Depends on | Sprint |
|---|---|---|---|---|---|
| F-01 | Authentication and session | Login with email/password, logout, current user, session lifecycle, password hashing. | FR-01, FR-02, FR-03, NFR-01, NFR-02, NFR-04 | none | 1 |
| F-02 | Role and team authorization | Cross-cutting backend responsibility: role checks and team ownership checks on every protected route; visible-team listing. | FR-04, BR-01, BR-02, BR-03, NFR-03 | F-01 | 1 |
| F-03 | Milestone creation | Supervisor creates a milestone for an assigned team; members list team milestones with status. | FR-05, FR-06, BR-04 | F-01, F-02 | 1 |
| F-04 | Team submission | Student submits and edits the team's work before the deadline; members and supervisor view it. | FR-07, FR-08, FR-09, BR-05, BR-06, BR-09, NFR-09 | F-03 | 1 |
| F-05 | Supervisor feedback | Supervisor records feedback on a submission; feedback locks the submission and is visible to the team. | FR-09, FR-10, BR-07, BR-08 | F-04 | 1 |
| F-06 | Revision and history | Revision request with reason and revision due date, resubmission as new version, version history with feedback. | FR-11, FR-12, FR-13, BR-10, BR-11 | F-05 | 2 |
| F-07 | Milestone management | Edit milestone details and due date; close a milestone. | FR-14, BR-13 | F-03 | 2 |
| F-08 | Grading | Supervisor grades a submission with feedback; team views grades. | FR-15, FR-16, BR-12 | F-05 | 2 |
| F-09 | Team progress board | Board of the team's milestones by status (open, submitted, feedback given, revision requested, missed). | FR-17, FR-19 | F-06, F-07, F-08 | 3 |
| F-10 | Supervisor summary report | Summary across assigned teams: late/missing submissions, feedback pending, grade overview. | FR-18 | F-06, F-07, F-08 | 3 |
| F-11 | Product hardening | Performance target, consistent loading/empty/error states, failure handling and regression suite. | NFR-06, NFR-07 | all | 3 |
| R-01 | Persistence and delivery readiness | System responsibility: PostgreSQL migrations and seed, environment-based config, Docker/GCP readiness. | NFR-05, NFR-08 | none | 1 (design + local), 2 (Lab 5 deploy) |

## Change log

| Date | Change | Reason | Approved by |
|---|---|---|---|
| 2026-11-05 | Proposal approve/reject feature removed before baseline | Theme 6 Sprint 1 example requires milestone, submission and feedback | Team (D-01) |
| 2026-11-05 | Instructor role features removed before baseline | Scope decision D-04 | Team |
