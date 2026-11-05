# Course Project Management System (CPMS)

CPE 334 group project, Semester 1/2026, Theme 6: Course Project Management System.

Supervisors create milestones for the teams they supervise, students submit their team's work (title,
description, link) before the deadline, and supervisors record feedback that locks the submission.

Engineering documents: [SRS](docs/srs.md), [features](docs/features.md), [traceability](docs/traceability.md),
[system SDS](docs/system-sds.md), [sprint plan](docs/sprints/plan.md), [Sprint 1 contracts](docs/sprints/sprint-1/).

## Stack

React 19 + Vite (web), Node.js 22 + Express 5 + TypeScript (server), PostgreSQL 16 via Prisma 6.
Tests: Vitest + Supertest against a real PostgreSQL database, Playwright for end-to-end.

## Prerequisites

- Node.js 22 and npm 10
- PostgreSQL 16 running locally (or `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`)

## Setup

```bash
# 1. Install dependencies (npm workspaces: server + web)
npm install

# 2. Create a database role and three databases (dev, automated tests, end-to-end tests)
psql -U postgres -c "CREATE ROLE app LOGIN PASSWORD 'app' CREATEDB;"
createdb -U postgres -O app cpms_dev
createdb -U postgres -O app cpms_test
createdb -U postgres -O app cpms_e2e

# 3. Configure environment (edit SESSION_SECRET; never commit .env)
cp server/.env.example server/.env

# 4. Apply migrations and load synthetic seed data into cpms_dev
npm run db:migrate
npm run db:seed
```

### Environment variables (`server/.env`)

| Variable | Example | Purpose |
|---|---|---|
| DATABASE_URL | `postgresql://app:app@localhost:5432/cpms_dev` | PostgreSQL connection |
| SESSION_SECRET | long random string | Signs the session cookie |
| PORT | `3000` | API port |
| NODE_ENV | `development` | `production` enables Secure cookies |
| WEB_ORIGIN | `http://localhost:5173` | Dev web origin (informational) |

Tests use `TEST_DATABASE_URL` (default `postgresql://app:app@localhost:5432/cpms_test`) and
`E2E_DATABASE_URL` (default `.../cpms_e2e`); both databases are reset by the tests.

## Run

```bash
npm run dev          # API on http://localhost:3000, web on http://localhost:5173 (proxies /api)
# or production-style, one process serving API + built SPA:
npm run build && npm start   # http://localhost:3000
```

## Demo accounts (synthetic seed data, local use only)

All seeded accounts use the password printed by `npm run db:seed` (defined in `server/prisma/seed-data.ts`).

| Role | Email | Teams |
|---|---|---|
| Supervisor | sup1@cpms.test | Team Alpha, Team Beta |
| Supervisor | sup2@cpms.test | Team Gamma |
| Student | s1@cpms.test, s2@cpms.test | Team Alpha |
| Student | s3@cpms.test, s4@cpms.test | Team Beta |
| Student | s5@cpms.test, s6@cpms.test | Team Gamma |

## Test

```bash
npm test             # unit + API/database integration tests (Vitest, uses cpms_test)
npm run test:e2e     # Playwright end-to-end tests (builds web, seeds cpms_e2e, starts server on :3100)
```

Test IDs in test names (for example `TEST-13 AC-11`) map to the Sprint 1 STS in
[docs/sprints/sprint-1/sts.md](docs/sprints/sprint-1/sts.md).

## Demo sequence

1. Log in as `sup1@cpms.test`, open Team Alpha, create a milestone due in the future.
2. Log out, log in as `s1@cpms.test`, open the milestone, submit title, description and link; reload to see it saved.
3. Try a milestone whose due date passed (seed or create via API): the submit is rejected with "The milestone due date has passed".
4. Log in as `sup1@cpms.test`, open the submission, save feedback.
5. Log in as `s1@cpms.test`: feedback is visible and the submission shows "Locked after feedback".
6. As `s3@cpms.test` (Team Beta), open the Team Alpha milestone URL: "Not found or you do not have access".

## Git workflow

`main` holds accepted releases. `sprint-1` is the Sprint 1 staging branch. Features are developed on
`feature/...` branches from `sprint-1`, merged by PR after teammate review, then `sprint-1` is merged to `main`
by a reviewed release PR and tagged (for example `v0.1.0`).
