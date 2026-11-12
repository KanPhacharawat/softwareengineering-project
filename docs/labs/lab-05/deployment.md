# Lab 5 Deployment (CPMS)

Status: started in Episode 2 (cloud-ready refactor, #24). Later episodes fill in Docker, GCP and CI/CD details.

## Stack

| Part | Choice |
|---|---|
| App | One Node 22 container: Express 5 API + built React app (`web/dist`) served by Express, same origin |
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

## To do in later episodes

- Dockerfile (multi-stage) and `.dockerignore`; run `prisma migrate deploy` before start.
  Note: `prisma`, `tsx` and `dotenv-cli` are dev dependencies, so the migrate/seed step needs them in the image
  or a separate job.
- GCP project, Cloud SQL, Artifact Registry, Secret Manager, Cloud Run service URL.
- GitHub Actions: CI quality gate, release pipeline from `main`.
