# System-Level Software Design Specification (SDS)

Product: Course Project Management System (CPMS). Version 1.0, 2026-11-05.

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
  Milestone ||--o| Submission : "has at most one"
  Submission ||--o| Feedback : "has at most one"
  User ||--o{ Submission : "last submitted by"
  User ||--o{ Feedback : authors
```

| Entity | Fields | Constraints and ownership |
|---|---|---|
| User | id (uuid), email, name, role (STUDENT, SUPERVISOR), passwordHash, createdAt | email unique, lowercased. passwordHash is bcrypt; never selected into API responses. |
| Team | id, name, supervisorId -> User | name unique. supervisorId must be a SUPERVISOR. Owner of all team data. |
| TeamMember | teamId -> Team, userId -> User | PK (teamId, userId); userId unique (AS-01: one team per student). |
| Milestone | id, teamId -> Team, title, description, dueAt (timestamptz), createdById -> User, createdAt | title 3..120, description <= 2000 (validated in API). Belongs to one team. |
| Submission | id, milestoneId -> Milestone, title, description, link, submittedById -> User, submittedAt, updatedAt | milestoneId unique (BR-05, NFR-09). Team derived through milestone. |
| Feedback | id, submissionId -> Submission, authorId -> User, comment, createdAt | submissionId unique (BR-08). Its presence locks the submission (BR-07). |
| session | sid, sess (json), expire | Managed by connect-pg-simple, created by migration. |

Sprint 2 extends this model with `SubmissionVersion` (Submission keeps current version), `RevisionRequest`,
`Grade`, and `Milestone.closedAt`. These are additive migrations.

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
| 409 | SUBMISSION_EXISTS / SUBMISSION_LOCKED / FEEDBACK_EXISTS | BR-05, BR-07, BR-08 |
| 422 | DEADLINE_PASSED | BR-06 |
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
| POST | /api/submissions/:submissionId/feedback | F-05 |

## 5. Roles, permissions and ownership

| Operation | Student | Supervisor | Record scope |
|---|---|---|---|
| Log in / log out / view own identity | yes | yes | own account |
| List/view teams | yes | yes | Student: own team. Supervisor: assigned teams. |
| List/view milestones | yes | yes | team scope as above |
| Create milestone | no (403) | yes | assigned team only |
| Edit / close milestone (S2) | no | yes | assigned team only |
| Create / edit submission | yes | no (403) | own team; before deadline; not locked |
| View submission and feedback | yes | yes | team scope |
| Record feedback | no (403) | yes | assigned team only |
| Request revision, grade (S2) | no | yes | assigned team only |
| Resubmit (S2) | yes | no | own team |
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
| NODE_ENV | development | `production` enables secure cookies and static serving |
| WEB_ORIGIN | http://localhost:5173 | dev only; production is same-origin |

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
