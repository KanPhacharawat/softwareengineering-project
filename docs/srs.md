# Software Requirements Specification (SRS)

Product: Course Project Management System (CPMS)
Theme: 6, Course Project Management System
Version: 1.0 (Sprint 1 baseline), 2026-11-05

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-11-05 | Initial baseline for Deliverable 1 | Project launch |

## 1. Stakeholder problem and context

A university course runs a supervised team project. Each student team (two to four students) is assigned one
supervisor (a lecturer or TA). During the semester the supervisor sets milestones (for example "Requirements
draft", "Sprint 1 demo"), the team submits its work for each milestone as a title, a short description and a link
(repository, document or video), and the supervisor gives written feedback.

Today this is done over chat and email. Submissions are scattered, it is unclear which version the supervisor
reviewed, late submissions are argued about afterwards, and students can accidentally see other teams' work.

CPMS gives each team and its supervisor one place for milestones, submissions and feedback, with deadlines
enforced by the server and strict per-team privacy.

Chosen context: one course offering (CPE 334, Semester 1/2026). Teams, memberships and supervisor
assignments are prepared by course staff before the semester and loaded as seed data.

## 2. Actors and responsibilities

| Actor | Responsibilities | Access scope |
|---|---|---|
| Student | Member of exactly one team. Views the team's milestones, submits and edits the team's work before the deadline, reads the supervisor's feedback (and later grades). | Own team only |
| Supervisor | Assigned to one or more teams. Creates milestones for assigned teams, reviews submissions, records feedback (later: requests revisions, grades, views reports). | Assigned teams only |
| Course staff (offline) | Prepares accounts, teams, membership and supervisor assignment as seed data. Not a system user in this product. | n/a |

## 3. Scope

In scope (whole product):

- Login, logout and current-user identity for seeded Student and Supervisor accounts.
- Supervisor-created milestones with due dates for assigned teams.
- One team submission per milestone (title, description, link), editable until the deadline.
- Written supervisor feedback linked to a specific submission.
- Revision requests, resubmission and revision history (Sprint 2).
- Milestone editing and closing (Sprint 2).
- Grading of submissions (Sprint 2).
- Team progress board and supervisor summary report (Sprint 3).

Explicit exclusions:

- Self-registration, password recovery, email verification, account administration.
- Creating or editing teams, memberships or supervisor assignments in the UI (seed data only).
- A separate Instructor/Admin role.
- File upload; work is submitted as a link.
- Email, chat or push notifications; external integrations (LMS, GitHub API).
- Multiple courses or semesters in one deployment.
- Multiple roles per account.

## 4. Functional requirements

| ID | Requirement | Sprint |
|---|---|---|
| FR-01 | A user can log in with email and password and receives an authenticated session. | 1 |
| FR-02 | A logged-in user can log out; the session is invalidated on the server. | 1 |
| FR-03 | A logged-in user can retrieve their identity (id, name, email, role). | 1 |
| FR-04 | A user can list the teams visible to them (Student: own team; Supervisor: assigned teams) with members. | 1 |
| FR-05 | A supervisor can create a milestone (title, optional description, due date/time) for an assigned team. | 1 |
| FR-06 | A user can list a visible team's milestones with each milestone's submission status. | 1 |
| FR-07 | A student can submit the team's work for a milestone with title, description and link. | 1 |
| FR-08 | A student can edit the team's submission (title, description, link). | 1 |
| FR-09 | Team members and the assigned supervisor can view a milestone with its submission and feedback. | 1 |
| FR-10 | A supervisor can record written feedback on a submission of an assigned team. | 1 |
| FR-11 | A supervisor can request a revision of a submission that has feedback, with a reason and a revision due date. | 2 |
| FR-12 | A student can resubmit after a revision request; the resubmission becomes a new version. | 2 |
| FR-13 | Team members and the supervisor can view the revision history: every version with its feedback. | 2 |
| FR-14 | A supervisor can edit a milestone's title, description and due date, or close it. | 2 |
| FR-15 | A supervisor can record a grade for a submission. | 2 |
| FR-16 | Team members can view the grade of their submissions. | 2 |
| FR-17 | Team members and the supervisor can view a progress board of the team's milestones by status. | 3 |
| FR-18 | A supervisor can view a summary report across assigned teams (submitted, late/missing, feedback pending, grades). | 3 |
| FR-19 | A student can view a progress summary of the own team. | 3 |

## 5. Business rules

| ID | Rule | Sprint |
|---|---|---|
| BR-01 | A student can read and change only data of the team they belong to. Other teams' data is never returned. | 1 |
| BR-02 | A supervisor can read and act only on teams assigned to them. | 1 |
| BR-03 | Only supervisors create milestones and record feedback; students cannot. Only students create or edit submissions; supervisors cannot. | 1 |
| BR-04 | A milestone needs a title of 3 to 120 characters and a due date/time in the future at the moment of creation. Description is at most 2000 characters. | 1 |
| BR-05 | A team has at most one submission per milestone. A second submit attempt is rejected; changes go through edit. | 1 |
| BR-06 | A submission can be created or edited only before the milestone due date/time, judged by server time. | 1 |
| BR-07 | Once feedback is recorded on a submission, the submission is locked and cannot be edited (until a revision request in Sprint 2). | 1 |
| BR-08 | Feedback is 1 to 2000 characters, is recorded once per submission version, and stays linked to that version. | 1 |
| BR-09 | A submission needs a title of 3 to 120 characters, a description of at most 2000 characters and a link that is an absolute http or https URL of at most 500 characters. | 1 |
| BR-10 | A revision request needs a reason (1 to 1000 characters) and a revision due date in the future. Resubmission creates a new version; earlier versions and their feedback are kept unchanged. | 2 |
| BR-11 | After a revision request, resubmission is accepted only before the revision due date. | 2 |
| BR-12 | A grade is an integer 0 to 100, can be recorded only on a submission that has feedback, and only by the assigned supervisor. | 2 |
| BR-13 | A closed milestone accepts no new submissions, edits or resubmissions. A due date can only be changed to a future date. | 2 |

## 6. Non-functional requirements

| ID | Requirement and measurable target | Verification | Sprint |
|---|---|---|---|
| NFR-01 | Passwords are stored only as bcrypt hashes with cost factor at least 10; no plaintext password is stored or returned by any endpoint. | DB integration test reads stored hash; API test checks responses | 1 |
| NFR-02 | Every protected endpoint rejects an unauthenticated request with 401 and returns no private data. | API tests on each protected route | 1 |
| NFR-03 | Authorization is enforced on the backend: a forbidden role operation returns 403; a resource of another team returns 404 without its data. | API tests for each role/ownership restriction | 1 |
| NFR-04 | Sessions use an httpOnly, SameSite=Lax cookie (Secure in production), expire after 8 hours of inactivity, and are destroyed on logout so the old cookie is rejected. | API test reuses cookie after logout; config review | 1 |
| NFR-05 | All domain data is stored in PostgreSQL through versioned migrations and survives an application restart or redeployment. | Integration tests on real DB; restart check in Lab 5 | 1 (design), 2 (Lab 5 deploy check) |
| NFR-06 | With 20 concurrent users on the seed dataset, 95% of API requests complete in under 500 ms on the deployed instance. | Load test script (autocannon) against deployment | 3 |
| NFR-07 | Every data screen shows explicit loading, empty and error states, and form errors appear next to the field. | E2E checks + UAT checklist | 1 (core screens), 3 (all) |
| NFR-08 | All configuration (database URL, session secret, port) comes from environment variables; no secret is committed to Git or shipped to the browser. | Repo secret scan + review checklist; Docker run in Lab 5 | 1 |
| NFR-09 | Concurrent submit requests for the same team and milestone never store more than one submission (database unique constraint). | Integration test with parallel requests | 1 |

## 7. Assumptions

| ID | Assumption |
|---|---|
| AS-01 | Each student belongs to exactly one team in this course; each team has exactly one supervisor. |
| AS-02 | All times are stored in UTC; the UI shows them in Asia/Bangkok time. |
| AS-03 | Any member of a team may submit or edit the team's submission; the system records who did it last. |
| AS-04 | Seeded demo accounts with synthetic data are sufficient for all assessments. |

## 8. Decisions, questions and resolutions

| ID | Question | Decision | Date |
|---|---|---|---|
| D-01 | Which Sprint 1 slice? A proposal approve/reject flow was considered. | Follow the theme's Sprint 1 example: milestone, submission, feedback. An alternative would need TA approval. | 2026-11-05 |
| D-02 | Deadline rule or revision rule for Sprint 1? | Deadline rule: submit/edit only before the due date; feedback locks the submission. Revision flow moves to Sprint 2. | 2026-11-05 |
| D-03 | How are teams and supervisor assignments created? | Seed data only; team management UI is excluded. | 2026-11-05 |
| D-04 | Is an Instructor role needed? | No. Student and Supervisor only, to keep scope feasible alongside Labs 5 to 7. | 2026-11-05 |
| D-05 | What does a student see for another team's resource? | 404 Not Found, so the existence of other teams' data is not revealed. A wrong-role operation returns 403. | 2026-11-05 |
| D-06 | Session or token? | Server-side session stored in PostgreSQL with an httpOnly cookie, so logout truly revokes access. | 2026-11-05 |
| D-07 | What does the submission contain? | Title, description and link. File upload is excluded. | 2026-11-05 |
| D-09 | Where does Sprint 1 start? | From an empty repository: F-00 Project setup is the first Sprint 1 feature, then F-01 to F-05. | 2026-11-05 |
| D-08 | Can a supervisor see feedback/grades of other teams? | No; only assigned teams (BR-02). Students see feedback and grades of their own team only. | 2026-11-05 |
