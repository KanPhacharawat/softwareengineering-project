# Sprint 1 Software Test Specification (STS)

Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Test design written before implementation |

Seed fixtures used by all tests (synthetic): supervisors Sup1 (`sup1@cpms.test`, teams Alpha and Beta) and Sup2
(`sup2@cpms.test`, team Gamma); students S1, S2 (Alpha), S3, S4 (Beta), S5, S6 (Gamma). Integration tests reset
the `cpms_test` database and load these fixtures before each test file.

Levels: Unit = pure domain function (Vitest). API = HTTP request through Express to real PostgreSQL (Vitest +
Supertest). E2E = browser through UI, API and DB (Playwright).

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-01 | AC-01 | API | S1 seeded | login with correct password, then GET /me with cookie | 200, user fields without passwordHash, cookie set; /me returns S1 |
| TEST-02 | AC-02 | API | S1 seeded | login with wrong password | 401 INVALID_CREDENTIALS, no Set-Cookie |
| TEST-03 | AC-02 | API | none | login with unknown email | 401 with the same message as TEST-02 |
| TEST-04 | AC-03 | API | no cookie | GET /me, /teams, /teams/:alpha/milestones, /milestones/:id | each 401 UNAUTHENTICATED, body has only `error` |
| TEST-05 | AC-04 | API | S1 logged in | POST /logout, then GET /me with old cookie | 204, then 401 |
| TEST-06 | AC-05 | API/DB | seed loaded | read all User.passwordHash | all start with `$2`, cost >= 10, none equals plain password |
| TEST-07 | AC-06 | API | Sup1 logged in | POST milestone to Alpha with dueAt +7 days; S1 lists Alpha milestones | 201; S1 sees it with status OPEN; row in DB |
| TEST-08 | AC-07 | API | Sup1 logged in | POST milestone with past dueAt; with title "ab"; with 121-char title | 400 VALIDATION_ERROR with `fields.dueAt` / `fields.title`; milestone count unchanged |
| TEST-09 | AC-08 | API | Sup1 logged in | POST milestone to Gamma | 404; milestone count unchanged |
| TEST-10 | AC-09 | API | S1 logged in | POST milestone to Alpha | 403 FORBIDDEN; count unchanged |
| TEST-11 | AC-10 | API | S1 and Sup2 logged in | GET /teams | S1 gets only Alpha; Sup2 gets only Gamma |
| TEST-12 | AC-10 | API | S1 logged in, Beta has a milestone | GET /teams/:beta and /teams/:beta/milestones | 404, no Beta data in body |
| TEST-13 | AC-11 | API/DB | Alpha milestone due +7 days | S1 POST submission; then S2 and Sup1 GET milestone | 201; both GETs return the same title/description/link, submittedBy S1 |
| TEST-14 | AC-12 | API | submission exists | S2 POST submission again | 409 SUBMISSION_EXISTS; one row |
| TEST-15 | AC-12 | API/DB | open milestone, no submission | S1 and S2 POST at the same time (Promise.all) | one 201 and one 409; exactly one row |
| TEST-16 | AC-13 | API/DB | milestone with dueAt in the past (inserted directly), and one with an existing submission then moved past due | POST and PUT | 422 DEADLINE_PASSED; row unchanged / none created |
| TEST-17 | AC-14 | API | open milestone | POST with link `ftp://x`, `not a url`, and title `ab` | 400 with `fields.link` / `fields.title`; no row |
| TEST-18 | AC-15 | API | Alpha milestone with submission | S3 GET milestone, POST and PUT submission | 404 for all, body without submission data |
| TEST-19 | AC-16 | API/DB | submission by S1, no feedback, before due | S2 PUT new values | 200; DB has new values, submittedBy S2, updatedAt later |
| TEST-20 | AC-09 | API | Sup1 logged in, open Alpha milestone | Sup1 POST submission | 403 FORBIDDEN; no row |
| TEST-21 | AC-17 | API/DB | Alpha submission | Sup1 POST feedback; S1 GET milestone | 201; S1 sees feedback with author Sup1 linked to the submission |
| TEST-22 | AC-19 | API | Alpha submission | S1 POST feedback | 403; no feedback row |
| TEST-23 | AC-19 | API | Alpha submission | Sup2 POST feedback | 404; no feedback row |
| TEST-24 | AC-18 | API/DB | Alpha submission with feedback, before due | S1 PUT | 409 SUBMISSION_LOCKED; row unchanged |
| TEST-25 | AC-20 | API | Alpha submission | Sup1 POST comment "   "; then valid; then valid again | 400; 201; 409 FEEDBACK_EXISTS |
| TEST-U01 | AC-07 | Unit | now fixed | validate milestone input: title lengths 2/3/120/121, dueAt past/equal/future | only 3..120 and future pass |
| TEST-U02 | AC-13, AC-18 | Unit | now fixed | `canChangeSubmission` with now before/equal/after due, with and without feedback | allowed only when now < due and no feedback; reasons DEADLINE_PASSED / SUBMISSION_LOCKED |
| TEST-U03 | AC-14 | Unit | none | validate submission input: http, https, ftp, relative, 500/501-char link | only absolute http(s) up to 500 pass |
| TEST-E2E-01 | AC-21 | E2E | seeded DB, app running | full journey from AC-21 in a browser | each step visible; final page shows feedback and locked notice |
| TEST-E2E-02 | AC-22 | E2E | app running | visit `/` without login; log in; log out; visit `/` | redirected to /login both times |

Manual checks (supplement, not replacing automated tests):

| Check | Requirement | Procedure |
|---|---|---|
| MC-01 | NFR-08 | `git grep -i -E "secret|password"` on release commit shows only placeholders/seed docs; `.env` not tracked; built web bundle contains no SESSION_SECRET |

Coverage: every Sprint 1 AC (AC-01 to AC-22) has at least one automated test.
