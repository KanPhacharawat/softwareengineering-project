# Lab 5 Deployment (CPMS)

Status: Episode 2 (cloud-ready, #24) and Episode 3 (Docker, #25) done. Later episodes fill in GCP and CI/CD details.

## Stack

| Part | Choice |
|---|---|
| App | One Node 22 container (root `Dockerfile`): Express 5 API + built React app (`web/dist`) served by Express, same origin |
| Runtime | Cloud Run (listens on `$PORT`, `0.0.0.0`) |
| Database | Cloud SQL for PostgreSQL 16, accessed with Prisma 6 |
| Sessions | PostgreSQL `session` table (connect-pg-simple), so any instance can serve any request |
| Files | No uploaded files: submissions store a link only, nothing is written to the container disk |
| Images | Artifact Registry |
| Secrets | Secret Manager, injected as env vars by Cloud Run |
| CI/CD | GitHub Actions, Workload Identity Federation (no JSON keys) |

## Environment variables

Every variable the server reads. `server/.env.example` has the same list with placeholders only.

| Variable | Purpose | Secret? | Local value from | Production value from |
|---|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string for Prisma and the session store | Yes | `server/.env` (Docker Compose DB) | Secret Manager |
| `SESSION_SECRET` | Signs the session cookie; 32+ chars required in production | Yes | `server/.env` | Secret Manager |
| `SEED_PASSWORD` | Password of the seeded demo accounts; required in production, not the default | Yes | optional, defaults to the README demo password | Secret Manager |
| `NODE_ENV` | `production` enables Secure cookies and the checks above | No | `server/.env` (`development`) | Cloud Run env var |
| `PORT` | HTTP port | No | `server/.env` (3000) | Set by Cloud Run (8080) |
| `TEST_DATABASE_URL` | Test database for `npm test` (wiped each run) | No | `server/.env` | CI only (service container) |

The browser bundle reads no env vars and holds no secrets; it calls `/api` on the same origin.

## Cloud-readiness checklist (Episode 2)

- [x] Uploaded files not saved on local disk: CPMS has no file upload; submissions are links (`Submission.link`).
- [x] Seed is production-safe: demo password from `SEED_PASSWORD`, refused in production if unset or the default;
  the seed upserts demo rows and keeps app data, so it can be rerun (`seed(prisma, { reset: true })` is test-only).
- [x] No dev shortcuts or default passwords in production: the login page shows no demo accounts;
  `SESSION_SECRET` and `SEED_PASSWORD` are checked at start in production.
- [x] Sessions stored in PostgreSQL (`session` table, created by a Prisma migration).
- [x] Server reads `PORT` and binds `0.0.0.0`.
- [x] `GET /api/ready` returns 200 `{ ok: true, database: "up" }`, or 503 `{ ok: false, database: "down" }` when
  PostgreSQL is unreachable (tests in `server/tests/health.test.ts`).
- [x] Express serves `web/dist` (path fixed at `../web/dist` from the server, so the image must keep that layout) with an `index.html` fallback for client routes, so UI and API run in one container.

## Health endpoints

| Path | Meaning | Use |
|---|---|---|
| `GET /api/health` | Process is up (no DB call) | Liveness |
| `GET /api/ready` | Process is up and PostgreSQL answers | Startup probe and post-deploy smoke test |

## Local production-like run

```bash
npm run build
cd server
NODE_ENV=production PORT=8080 DATABASE_URL=... SESSION_SECRET=$(openssl rand -hex 32) node dist/index.js
curl -i localhost:8080/api/ready
```

## Docker (Episode 3)

| File | What it does |
|---|---|
| `Dockerfile` | Stage 1 `npm ci` + `npm run build` (web: Vite, server: `prisma generate` + tsc). Stage 2 `node:22-alpine` with server production deps only, `server/dist`, `web/dist`, `server/prisma`; runs as `node` (non-root), `NODE_ENV=production`, listens on `$PORT` (default 8080). |
| `.dockerignore` | Keeps `node_modules`, `dist`, `.env*`, `.git`, test output and docs out of the build context. |
| `server/docker-entrypoint.sh` | Starts the server only (`exec "$@"`). Migrations and seed are a separate job. |
| `docker-compose.yml` | `db` (PostgreSQL 16, named volume), `migrate` (same image: `prisma migrate deploy` + `prisma db seed`, exits 0), `app` (starts after `migrate` succeeds, `localhost:8080`). |

`prisma` and `tsx` are server `dependencies` (not dev) because the migrate/seed job runs from the runtime image.

Compose needs no `.env`: every value has a local-only default, overridable from the shell
(`SESSION_SECRET`, `SEED_PASSWORD`, `NODE_ENV`). Compose runs `NODE_ENV=development` on purpose: production sets
Secure cookies, which a browser does not send over plain `http://localhost`. The image itself defaults to
`production`, which is what Cloud Run runs.

```bash
# Build and run everything (from a fresh clone, no .env needed)
docker compose up --build -d --wait
curl -s localhost:8080/api/ready          # {"ok":true,"database":"up"}
# open http://localhost:8080, log in as sup1@cpms.test / password123 (README demo accounts)

# Migrate + seed again (e.g. after a new migration); the seed upserts, safe to rerun
docker compose run --rm migrate

# Logs, restart (data stays in the cpms-db-data volume), stop, wipe
docker compose logs -f app
docker compose restart
docker compose down        # keeps data
docker compose down -v     # deletes the database volume

# Image only (what Cloud Run runs)
docker build -t cpms-app .
docker run --rm -p 8080:8080 -e DATABASE_URL=... -e SESSION_SECRET=... cpms-app
docker run --rm -e DATABASE_URL=... -e NODE_ENV=production -e SEED_PASSWORD=... cpms-app \
  sh -c "npx prisma migrate deploy && npx prisma db seed"   # migrate/seed job
```

C-03 evidence: `docs/labs/lab-05/evidence/C-03-docker-compose.txt`.

## To do in later episodes

- GCP project, Cloud SQL, Artifact Registry, Secret Manager, Cloud Run service URL.
- GitHub Actions: CI quality gate, release pipeline from `main`.

## CI on pull requests (Episode 4)

`.github/workflows/ci-docker.yml`, job `test-and-docker`, runs on every PR to `staging` and `main` (also manual and
`workflow_call` for the later deploy workflow): offline deploy-script tests, `npm ci`, `prisma generate` +
`migrate deploy` + `db seed` against a PostgreSQL 16 service container, server tests (Vitest), typecheck,
`npm run build` (server + web), `docker build` (not pushed). Actions are pinned to full commit SHAs;
`.github/dependabot.yml` updates them weekly.

`deploy/` comes from the starter kit, renamed `toktickit-*` -> `cpms-*`. CPMS differences: secrets are
`cpms-database-url`, `cpms-seed-password` (`SEED_PASSWORD`, migrate job) and `cpms-session-secret`
(`SESSION_SECRET`, service); no `--demo` flag (the seed always creates the demo accounts); port 8080;
`smoke_test.py` checks `/api/health`, `/api/ready`, `/` and an optional cookie-session login.

Run the deploy-script tests locally: `bash deploy/tests/test_deploy_stub.sh && bash deploy/tests/test_release_stub.sh && python3 -m unittest discover -s deploy/tests -p 'test_smoke.py'`
