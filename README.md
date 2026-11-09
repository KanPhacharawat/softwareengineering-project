# Course Project Management System (CPMS)

CPE 334 group project, Semester 1/2026, Theme 6: Course Project Management System.

Teams submit milestone work and receive feedback from their assigned supervisor.
Product and engineering documents are in [`docs/`](docs/) (SRS, SDS, sprint plans, feature contracts,
UI direction in [`docs/design.md`](docs/design.md)).

## Stack

| Part | Technology |
|---|---|
| `server/` | Node.js 22, Express 5, TypeScript, Prisma 6, PostgreSQL 16 |
| `web/` | React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui, lucide-react |
| Tests | Vitest + Supertest (server, real test database), Playwright (web E2E) |

npm workspaces: run every command below from the repository root.

## Prerequisites

- Node.js 22 or newer (npm 10+)
- Docker with Docker Compose (Docker Desktop on macOS/Windows). PostgreSQL itself runs in a container, so no local
  install is needed.

## Database (Docker)

[`docker-compose.yml`](docker-compose.yml) runs PostgreSQL 16 on host port **5433** with user `app` / password `app`
and two databases: `cpms_dev` (development) and `cpms_test` (used by `npm test`). Data is kept in the Docker volume
`cpms-db-data`.

```bash
npm run db:up      # start the database and wait until it is healthy
npm run db:down    # stop it (data is kept)
docker compose down -v   # stop and delete all database data
```

## Setup

```bash
npm install
npm run db:up                           # start PostgreSQL in Docker
cp server/.env.example server/.env     # then set SESSION_SECRET
npm run db:migrate                      # apply Prisma migrations to cpms_dev
npm run db:seed                         # load demo data (2 supervisors, 3 teams, 6 students)
npx playwright install chromium         # once, only for E2E tests
```

Configuration is only through environment variables in `server/.env` (git-ignored). See
[`server/.env.example`](server/.env.example) for every variable.

## Run

```bash
npm run db:up   # if the database is not running yet
npm run dev
```

- Web app: http://localhost:5173 (Vite proxies `/api` to the API). Without a session it opens `/login`; use a demo
  account below.
- API: http://localhost:3000, health check `GET /api/health` returns `{ "ok": true }`
- Auth API (F-01): `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. Sessions are stored in the
  `session` table of PostgreSQL and sent as the httpOnly cookie `cpms.sid` (8 hours of inactivity). Every other
  `/api` route needs a session and answers 401 without one.
- Teams API (F-02): `GET /api/teams` (student: own team, supervisor: assigned teams), `GET /api/teams/:teamId`
  (404 for a team outside the user's scope). Wrong-role operations answer 403.
- Milestones API (F-03): `GET /api/teams/:teamId/milestones` (sorted by due date with status `OPEN`, `SUBMITTED`,
  `FEEDBACK_GIVEN`, `MISSED`), `POST /api/teams/:teamId/milestones` (supervisor only, validated with BR-04).
- Submissions API (F-04): `GET /api/milestones/:milestoneId` (milestone detail with submission), `POST /api/milestones/:milestoneId/submission` (student only, single submission, BR-05, BR-06, BR-09), `PUT /api/milestones/:milestoneId/submission` (edit before deadline while no feedback, BR-06, BR-07, BR-09).
- Feedback API (F-05): `POST /api/submissions/:submissionId/feedback` (supervisor only, single feedback per submission, locks submission from student edits, BR-02, BR-03, BR-07, BR-08).

## Test

```bash
npm test            # server tests (Vitest + Supertest) against cpms_test
npm run test:e2e    # Playwright browser tests (starts the dev servers if not running)
npm run typecheck   # TypeScript checks for server and web
```

`npm test` applies migrations to the `cpms_test` database (`TEST_DATABASE_URL`) and replaces its data with the seed
before running. It never touches `cpms_dev`.

## Demo accounts (seed, synthetic)

All accounts use the password `password123`.

| Email | Role | Team |
|---|---|---|
| sup1@cpms.test | Supervisor | Alpha, Beta |
| sup2@cpms.test | Supervisor | Gamma |
| s1@cpms.test, s2@cpms.test | Student | Alpha |
| s3@cpms.test, s4@cpms.test | Student | Beta |
| s5@cpms.test, s6@cpms.test | Student | Gamma |

## Other scripts

| Command | What it does |
|---|---|
| `npm run db:reset` | Drop and recreate `cpms_dev` from migrations, then seed (destroys local dev data) |
| `npm run build` | Build server (`server/dist`) and web (`web/dist`) |

## Repository conventions

- Branches: `main` (releases, tagged), `sprint-<n>` (sprint staging), `feature/<ID>-<name>` (one per feature,
  e.g. `feature/F-01-authentication`), branched from the sprint branch.
- One GitHub Issue per feature; commits reference it (`Refs #7`).
- Pull request from the feature branch into `sprint-<n>`, reviewed by the teammate (authors do not approve their own
  PR). At sprint end a release PR merges `sprint-<n>` into `main` and the release is tagged (`v0.1.0`).
- Feature contracts and tests are written in `docs/sprints/` before implementation (see the Definition of Done).
