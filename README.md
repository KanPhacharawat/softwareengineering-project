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
- PostgreSQL 16 running locally, with a user that can create databases. Example (psql as superuser):

  ```sql
  CREATE USER app WITH PASSWORD 'app' CREATEDB;
  CREATE DATABASE cpms_dev OWNER app;
  CREATE DATABASE cpms_test OWNER app;
  ```

  Or with Docker: `docker run -d --name cpms-db -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app -e POSTGRES_DB=cpms_dev -p 5432:5432 postgres:16`
  then `docker exec cpms-db createdb -U app cpms_test`.

## Setup

```bash
npm install
cp server/.env.example server/.env     # then set SESSION_SECRET (and DATABASE_URL if yours differs)
npm run db:migrate                      # apply Prisma migrations to cpms_dev
npm run db:seed                         # load demo data (2 supervisors, 3 teams, 6 students)
npx playwright install chromium         # once, only for E2E tests
```

Configuration is only through environment variables in `server/.env` (git-ignored). See
[`server/.env.example`](server/.env.example) for every variable.

## Run

```bash
npm run dev
```

- Web app: http://localhost:5173 (Vite proxies `/api` to the API)
- API: http://localhost:3000, health check `GET /api/health` returns `{ "ok": true }`

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
