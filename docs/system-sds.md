# System-Level Software Design Specification (SDS)

Product: Course Project Management System (CPMS). Version 1.2, 2026-11-26 (Sprint 2 baseline, S2-09 #75: F-06/F-07/F-08 data model, endpoints, error codes, migration list; matches release v0.2.0). Version 1.1, 2026-11-25 (Lab 7 CR-01, #83: `Submission.lateAt`, `DEADLINE_PASSED` = grace end for version 1). Version 1.0, 2026-11-05.

## 1. Architecture and stack

CPMS is a modular monolith with three logical layers. In production one Node.js process serves both the
built React app and the JSON API, so it packages into one Docker image and runs on Cloud Run with Cloud SQL.

```mermaid
flowchart LR
  B[Browser<br/>React SPA] -- "HTTPS JSON /api/*<br/>session cookie" --> A[Express API<br/>routes -> services -> domain rules]
  A -- "Prisma Client (SQL)" --> D[(PostgreSQL 16)]
  A -- "session store" --> D
```

| Layer | Technology | Responsibility |
|---|---|---|
| UI | React 19, Vite, React Router, TypeScript | Screens, navigation, client-side form hints, loading/empty/error states. Holds no authority: it only displays what the API allows. |
| API / application | Node.js 22, Express 5, TypeScript, zod, express-session | Authentication, authorization, input validation, business rules, error mapping. |
| Domain rules | Pure TypeScript module `server/src/domain` | Deadline, lock and validation rules as pure functions so they can be unit tested without a database. |
| Data | PostgreSQL 16, Prisma ORM 6 (schema + migrations) | Persistence, foreign keys, unique constraints (one submission per milestone, one feedback per submission). |

Why this stack: TypeScript on both sides keeps one language for the pair; Express is small enough to show
where every rule is enforced; Prisma gives versioned migrations and a typed client; PostgreSQL gives real
constraints and is available as Cloud SQL.

Where business rules are enforced: in the service layer of the API (`server/src/services`), using the pure rules
in `server/src/domain`, backed by database constraints for uniqueness. The UI repeats some validation only for
user convenience.

Request flow inside the API: `router -> requireAuth -> zod validation -> service (loads user's scope, checks role and
ownership, applies domain rule) -> Prisma -> JSON response`. Errors are thrown as `AppError(status, code)` and
turned into the error shape by one error middleware.

Repository layout:

```
server/   Express API, Prisma schema/migrations/seed, unit + integration tests
web/      React SPA, Playwright end-to-end tests
docs/     SRS, features, traceability, SDS, sprint plans and contracts, evidence
```

## 2. Data model

```mermaid
erDiagram
  User ||--o{ TeamMember : "is member"
  Team ||--o{ TeamMember : has
  User ||--o{ Team : supervises
  Team ||--o{ Milestone : has
  User ||--o{ Milestone : "creates / closes"
  Milestone ||--o| Submission : "has at most one"
  Submission ||--|{ SubmissionVersion : "has versions 1..n"
  SubmissionVersion ||--o| Feedback : "has at most one"
  SubmissionVersion ||--o| RevisionRequest : "has at most one"
  Submission ||--o| Grade : "has at most one"
  User ||--o{ Submission : "created by / last saved by"
  User ||--o{ SubmissionVersion : "submitted by"
  User ||--o{ Feedback : authors
  User ||--o{ RevisionRequest : requests
  User ||--o{ Grade : grades
```

| Entity | Fields | Constraints and ownership |
|---|---|---|
| User | id (uuid), email, name, role (STUDENT, SUPERVISOR), passwordHash, createdAt | email unique, lowercased. passwordHash is bcrypt; never selected into API responses. |
| Team | id, name, supervisorId -> User | name unique. supervisorId must be a SUPERVISOR. Owner of all team data. |
| TeamMember | teamId -> Team, userId -> User | PK (teamId, userId); userId unique (AS-01: one team per student). |
| Milestone | id, teamId -> Team, title, description, dueAt (timestamptz), createdById -> User, createdAt, closedAt (nullable, F-07), closedById -> User (nullable, F-07) | title 3..120, description <= 2000 (validated in API). Belongs to one team. CHECK `Milestone_closed_pair_chk`: closedAt and closedById are both null or both set. Close is final (BR-13). |
| Submission | id, milestoneId -> Milestone, title, description, link, submittedById -> User (last saved by), createdById -> User (original submitter, F-06), submittedAt, updatedAt, currentVersion (int, default 1, F-06), lateAt (nullable; first save at or after the due date, Lab 7 CR-01, BR-06 v2) | milestoneId unique (BR-05, NFR-09). Team derived through milestone. title/description/link mirror the current version. |
| SubmissionVersion (F-06) | id, submissionId -> Submission, versionNumber, title, description, link, submittedById -> User, submittedAt, updatedAt | unique (submissionId, versionNumber). Only the current version is ever updated; older versions are read-only history (BR-10). |
| RevisionRequest (F-06) | id, submissionId -> Submission, versionId -> SubmissionVersion, reason, dueAt, requestedById -> User, createdAt | versionId unique (one request per version). Status `OPEN` / `EXPIRED` / `RESUBMITTED` is derived, not stored. |
| Feedback | id, submissionId -> Submission, versionId -> SubmissionVersion (F-06), authorId -> User, comment, createdAt | versionId unique (BR-08 v2: one feedback per version; the Sprint 1 unique on submissionId was replaced). Feedback on the current version locks it (BR-07). |
| Grade (F-08) | id, submissionId -> Submission, score, versionNumber (version graded), gradedById -> User, gradedAt, updatedAt | submissionId unique (one grade per submission, SRS section 8). CHECK `Grade_score_range_chk` 0..100 (BR-12). |
| session | sid, sess (json), expire | Managed by connect-pg-simple, created by migration. |

Sprint 2 added `SubmissionVersion`, `RevisionRequest`, `Grade`, `Milestone.closedAt/closedById`,
`Feedback.versionId` and `Submission.currentVersion` (v0.2.0); Lab 7 added `Submission.lateAt`.

Migrations in order (all in `server/prisma/migrations`, applied by `prisma migrate deploy`; v0.2.0 applied the
last five on production, rehearsed on a copy of the main schema with Sprint 1 rows in
`docs/evidence/release-v0.2.0/migration-rehearsal.txt`):

| # | Migration | Release | Change | Why it is safe on production data |
|---|---|---|---|---|
| 1 | `20261105180947_init` | v0.1.0 | User, Team, TeamMember, session | Empty database. |
| 2 | `20261106171857_milestone` | v0.1.0 | Milestone | New table. |
| 3 | `20261107092737_submission` | v0.1.0 | Submission (milestoneId unique) | New table. |
| 4 | `20261109145639_feedback` | v0.1.0 | Feedback (submissionId unique) | New table. |
| 5 | `20261119150000_submission_created_by` | v0.2.0 | `Submission.createdById` (#55) | Added nullable, backfilled from `submittedById`, then set NOT NULL; no row lost. |
| 6 | `20261123180000_revision_versions` | v0.2.0 | SubmissionVersion, RevisionRequest, `Submission.currentVersion`, `Feedback.versionId` | Every existing submission is copied into version 1 and every existing feedback is linked to that version 1 before the column becomes required; old data reads as version 1. |
| 7 | `20261124140000_milestone_close` | v0.2.0 | `Milestone.closedAt`, `closedById` + pair CHECK | Nullable, no backfill: existing milestones stay open. |
| 8 | `20261125120000_submission_late_at` | v0.2.0 | `Submission.lateAt` (Lab 7) | Nullable; NULL is correct for old rows because the old rule made late saves impossible. |
| 9 | `20261125164000_grade` | v0.2.0 | Grade + score CHECK | New table only. |

Database setup: `prisma migrate deploy` applies versioned SQL migrations from `server/prisma/migrations`.
`npm run db:seed` loads reproducible synthetic data (two supervisors, three teams, six students, sample milestones)
with fixed IDs and emails. Tests use a separate database (`cpms_test`) that is reset before each test file.

## 3. UI structure and conventions

| Route | Screen | Roles |
|---|---|---|
| `/login` | Login form | public |
| `/` | My teams: student sees own team, supervisor sees assigned teams | both |
| `/teams/:teamId` | Team page: members and milestones with status badge; supervisor sees "New milestone" form | both (scoped) |
| `/milestones/:milestoneId` | Milestone detail: submission (form for student when editable), feedback (form for supervisor) | both (scoped) |

Shared behaviour: a top bar shows the current user's name, role and a Logout button. Every page that loads data
shows a loading indicator, an empty state ("No milestones yet") and an error banner with the API's message.
Forms disable the submit button while sending and show field errors returned by the API (`fields`) under each
input. A 401 from any call sends the user to `/login`. A 404 shows "Not found or you do not have access".
Dates are shown in Asia/Bangkok time.

## 4. API conventions

- Base path `/api`, JSON request and response bodies, resource-oriented paths.
- Success: `200` read/update, `201` create, `204` logout.
- Error shape for every failure:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Readable message", "fields": { "title": "Too short" } } }
```

| Status | code | When |
|---|---|---|
| 400 | VALIDATION_ERROR | body fails schema or BR-04/BR-08/BR-09 |
| 401 | UNAUTHENTICATED / INVALID_CREDENTIALS | no valid session / wrong login |
| 403 | FORBIDDEN | wrong role for the operation (BR-03) or acting on an unassigned team that is visible by ID |
| 404 | NOT_FOUND | resource missing or outside the user's team scope (D-05) |
| 409 | SUBMISSION_EXISTS / SUBMISSION_LOCKED / FEEDBACK_EXISTS | BR-05, BR-07, BR-08 (FEEDBACK_EXISTS: the current version already has feedback) |
| 409 | FEEDBACK_REQUIRED | F-06/F-08: revision request or grade before feedback on the current version (BR-10, BR-12) |
| 409 | REVISION_EXISTS | F-06: the current version already has a revision request |
| 409 | NO_REVISION_REQUEST | F-06: resubmit without an open revision request |
| 409 | RESUBMISSION_EXISTS | F-06: the revision request was already answered by a resubmission |
| 409 | MILESTONE_CLOSED | F-07: any student write, revision request, milestone edit or second close on a closed milestone (BR-13) |
| 409 | REVISION_PENDING | F-08: grade while a revision request is open (BR-12) |
| 409 | SUBMISSION_GRADED | F-06: revision request after the submission is graded (BR-12) |
| 422 | REVISION_DUE_PASSED | F-06: resubmit at or after the revision due date (BR-11) |
| 422 | DEADLINE_PASSED | BR-06 v2: version 1 at or after `dueAt + 24 h`; BR-11: version >= 2 at or after the revision due |
| 500 | INTERNAL_ERROR | unexpected; message is generic, details only in server log |

Validation uses zod schemas per endpoint. Unknown fields are ignored; a client-provided user id, role or team
ownership is never trusted, the server uses the session user.

Sprint 1 endpoints (details in the feature contracts):

| Method | Path | Feature |
|---|---|---|
| POST | /api/auth/login | F-01 |
| POST | /api/auth/logout | F-01 |
| GET | /api/auth/me | F-01 |
| GET | /api/teams | F-02 |
| GET | /api/teams/:teamId | F-02 |
| GET | /api/teams/:teamId/milestones | F-03 |
| POST | /api/teams/:teamId/milestones | F-03 |
| GET | /api/milestones/:milestoneId | F-04, F-05 |
| POST | /api/milestones/:milestoneId/submission | F-04 |
| PUT | /api/milestones/:milestoneId/submission | F-04 |
| POST | /api/submissions/:submissionId/feedback | F-05 (v0.2.0: on the current version) |

Sprint 2 endpoints (release v0.2.0):

| Method | Path | Feature | Role |
|---|---|---|---|
| POST | /api/submissions/:submissionId/revision-request | F-06 | Supervisor |
| POST | /api/submissions/:submissionId/versions | F-06 (resubmit, new version) | Student |
| GET | /api/submissions/:submissionId/history | F-06 (all versions with feedback, revision request, grade) | both (scoped) |
| PATCH | /api/milestones/:milestoneId | F-07 (title, description, dueAt) | Supervisor |
| POST | /api/milestones/:milestoneId/close | F-07 | Supervisor |
| PUT | /api/submissions/:submissionId/grade | F-08 (create or change) | Supervisor |

Operations: `GET /api/health` (liveness) and `GET /api/ready` (database check, Lab 5 CH-02) are public.

## 5. Roles, permissions and ownership

| Operation | Student | Supervisor | Record scope |
|---|---|---|---|
| Log in / log out / view own identity | yes | yes | own account |
| List/view teams | yes | yes | Student: own team. Supervisor: assigned teams. |
| List/view milestones | yes | yes | team scope as above |
| Create milestone | no (403) | yes | assigned team only |
| Edit / close milestone (F-07) | no (403) | yes | assigned team only |
| Create / edit submission | yes | no (403) | own team; before deadline; not locked |
| View submission and feedback | yes | yes | team scope |
| Record feedback | no (403) | yes | assigned team only |
| Request revision (F-06), grade (F-08) | no (403) | yes | assigned team only |
| Resubmit (F-06) | yes | no (403) | own team |
| Progress board (S3) | yes | yes | team scope |
| Summary report (S3) | no | yes | assigned teams |

Scope rule implementation: every service call first resolves the team of the target record, then checks
`isMember(user, team)` for students or `team.supervisorId === user.id` for supervisors. Out-of-scope records
return 404. A role that can never perform the operation gets 403 before any lookup. Hidden buttons in the UI are
convenience only.

## 6. Authentication and session

- Passwords: bcrypt (bcryptjs), cost 12, only hashes stored. Seed accounts get hashed at seed time.
- Login: `POST /api/auth/login` looks up the email (lowercased), compares with bcrypt. On failure the same
  `INVALID_CREDENTIALS` message is returned for unknown email and wrong password. On success the session is
  regenerated (prevents fixation) and `userId` is stored in it.
- Session: express-session with connect-pg-simple store in PostgreSQL. Cookie `cpms.sid`, httpOnly,
  SameSite=Lax, Secure when `NODE_ENV=production`, rolling maxAge 8 hours.
- Current user: `requireAuth` middleware loads the user by `session.userId` on every request; a missing or
  deleted user gives 401. `GET /api/auth/me` returns `{ id, email, name, role }`.
- Logout: `session.destroy()` deletes the row in the session table and clears the cookie; the old cookie is then
  rejected (NFR-04).

## 7. Configuration and delivery design

| Variable | Example (local) | Notes |
|---|---|---|
| DATABASE_URL | postgresql://app:app@localhost:5433/cpms_dev | Local DB runs in Docker (`docker-compose.yml`); Cloud SQL connection string in production (Secret Manager) |
| SESSION_SECRET | (random 32+ chars) | Secret Manager in production; never committed |
| PORT | 3000 | Cloud Run sets it |
| NODE_ENV | development | `production` enables secure cookies and stricter checks |
| SEED_PASSWORD | (random) | demo account password; required in production, Secret Manager |

`.env.example` documents these with placeholder values; `.env` is git-ignored. The browser bundle contains no
secrets; it calls the API on the same origin.

Planned GCP deployment (Lab 5):

```mermaid
flowchart LR
  Dev[GitHub PR] --> CI[GitHub Actions: build + tests]
  CI --> Main[merge to main]
  Main --> Build[Build Docker image -> Artifact Registry]
  Build --> Run[Cloud Run service<br/>Node serves API + SPA]
  Run --> SQL[(Cloud SQL PostgreSQL)]
  SM[Secret Manager] --> Run
```

- Image: multi-stage Dockerfile, builds `web` and `server`, runs `prisma migrate deploy` then `node dist/index.js`.
- Durable storage: Cloud SQL (PostgreSQL 16); Cloud Run instances are stateless because sessions live in the DB.
- Secrets: DATABASE_URL and SESSION_SECRET from Secret Manager.
