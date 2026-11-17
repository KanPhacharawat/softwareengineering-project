# Lab 5 Deployment (CPMS)

Status: complete for Lab 5 (Episodes 1-8, Issues #22-#31). Live URL: https://cpms-wpsgfzameq-as.a.run.app

Contents: stack and changes from the reference, GCP resources, environment variables, commands (build, test, run,
migrate, seed), Docker, CI and merge gate, release pipeline and procedure, how to find the running commit,
persistence and rollback, cost control.

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

## Changes from the reference (Lab 5 starter kit)

| Kit (TokTickIT) | CPMS | Why |
|---|---|---|
| Two images: `server/Dockerfile` + `client/Dockerfile` (nginx) | One root `Dockerfile`; Express serves `web/dist` | npm workspaces app; same origin, so no CORS and one Cloud Run service |
| Names `toktickit-*` | `cpms-*` in `deploy/`, workflows and GCP | Our app name; scripts and tests use the same names |
| Seed only with `--demo` | Seed always upserts the demo accounts; password from `SEED_PASSWORD` | Lab 6 partner team needs demo accounts; seed keeps app data |
| Secrets `DATABASE_URL`, `SESSION_SECRET` | Also `cpms-seed-password` (migrate job only) | No default password in production |
| Smoke test of the kit endpoints | `/api/health`, `/api/ready`, `/`, optional login | Our health endpoints |
| - | Cloud Run env `TZ=Asia/Bangkok` | Due dates shown in Thai time |

## GCP resources

Owner account: James (GCP Free Trial, Issue #23). Nothing below is a secret.

| Resource | Name / value |
|---|---|
| Project ID | `cpe334-pungkung-james` |
| Region | `asia-southeast1` (every resource) |
| Artifact Registry (Docker) | `cpms`, image `asia-southeast1-docker.pkg.dev/cpe334-pungkung-james/cpms/cpms:<full commit SHA>` |
| Cloud Run service | `cpms`, https://cpms-wpsgfzameq-as.a.run.app, min 0 / max 3 instances, 1 CPU, 512 MiB, port 8080, public (`--allow-unauthenticated`) |
| Cloud Run job | `cpms-migrate` (`npx prisma migrate deploy && npx prisma db seed`), run before every release |
| Cloud SQL | `cpms-pg`, PostgreSQL 16, Enterprise edition, `db-f1-micro`, 10 GB SSD, storage auto-increase off; database `cpms`, user `cpms`; connected through the Cloud SQL socket |
| Secret Manager | `cpms-database-url`, `cpms-session-secret`, `cpms-seed-password` (access granted per secret to the runtime account only) |
| Runtime service account | `cpms-runner` (`roles/cloudsql.client` + secret accessor on the three secrets) |
| Deployer service account | `cpms-deployer` (`roles/run.developer`, `roles/artifactregistry.writer` on repo `cpms`, `roles/iam.serviceAccountUser` on `cpms-runner`); no JSON keys |
| Workload Identity Federation | pool `github-actions`, provider `github-main` (issuer `https://token.actions.githubusercontent.com`); attribute condition allows only this repository (ID 1446701247, owner 83383938), `refs/heads/main`, workflow `deploy.yml` and environment `demo` |
| Budget | `CPE334-Alert`, 3,000 THB, alerts at 35-100% |

First-time setup was `deploy/deploy.sh` (Issue #27); `deploy/release.sh` only updates these resources.

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
| `TZ` | Time zone of the container | No | not set (host) | Cloud Run env var `Asia/Bangkok` |

Pipeline settings (GitHub, not read by the app):

| Name | Kind | Purpose | Secret? |
|---|---|---|---|
| `GCP_PROJECT_ID`, `GCP_REGION` | Environment `demo` variable | Target project and region | No |
| `WIF_PROVIDER` | Environment `demo` variable | Full resource name of WIF provider `github-main` | No |
| `WIF_SERVICE_ACCOUNT` | Environment `demo` variable | `cpms-deployer@cpe334-pungkung-james.iam.gserviceaccount.com` | No |
| `SMOKE_EMAIL` + `SMOKE_PASSWORD` | Variable + secret (optional) | Login step of the smoke test; not set, so that step is skipped | Password yes |

The CI database password (`app`) in `ci-docker.yml` and `docker-compose.yml` is a local throw-away value, not a secret.
No `.env` file is committed (`.gitignore` has `.env` and `.env.*`, except `.env.example`).

The browser bundle reads no env vars and holds no secrets; it calls `/api` on the same origin.

## Commands

| Task | Local (Node) | Docker | Cloud |
|---|---|---|---|
| Build | `npm ci && npm run build` | `docker build -t cpms-app .` or `docker compose up --build` | `Deploy demo` workflow |
| Test | `npm test`, `npm run test:e2e`, `npm run typecheck` | - | CI job `test-and-docker` |
| Run | `npm run dev` | `docker compose up -d --wait` | Cloud Run service `cpms` |
| Migrate | `npm run db:migrate` | `docker compose run --rm migrate` | job `cpms-migrate` |
| Seed | `npm run db:seed` | same `migrate` service | job `cpms-migrate` |

Local setup details are in the root `README.md`.

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

## Merge gate (Episode 6)

Ruleset `protect-main` (active, no bypass, target `main`): restrict deletions, block force pushes, require a pull
request with 1 approval, require status check `test-and-docker` and an up-to-date branch. Proof (C-02): PR #36 from
the temporary branch `test/prove-gate` broke `server/tests/health.test.ts`; `test-and-docker` failed and merging was
blocked. The PR was closed unmerged and the branch deleted, so the released app was not touched (Issue #28).

## Release pipeline (Episode 7)

`.github/workflows/deploy.yml` (name `Deploy demo`, environment `demo`) runs on every push to `main`:
CI (`test-and-docker`) -> sign in with Workload Identity Federation (no key) -> build and push
`asia-southeast1-docker.pkg.dev/cpe334-pungkung-james/cpms/cpms:<full commit SHA>` -> `deploy/release.sh` (pin the image by
digest, run job `cpms-migrate`, update service `cpms`, 100% traffic to the new revision) -> `deploy/smoke_test.py`
(`/api/health`, `/api/ready`, `/`, optional login) -> run summary. Values come from the `demo` environment variables
`GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` (optional `SMOKE_EMAIL` + secret `SMOKE_PASSWORD`).

Release procedure (nobody types a deploy command):

1. Issue -> branch from `staging` -> PR into `staging`, reviewed by the teammate, green CI, merge.
2. Release PR `staging` -> `main`, green CI, merge. The merge push starts `Deploy demo`.
3. Sync `staging` with `main` afterwards (merge `origin/main` into `staging`), the ruleset needs up-to-date branches.

Find the running commit:

- Actions -> Deploy demo -> run -> Summary: `Commit image tag` (= merged commit SHA) and `Digest`.
- Cloud Run -> `cpms` -> Revisions: the revision with 100% traffic shows the same image digest.
- `gcloud run services describe cpms --region asia-southeast1 --format='value(spec.template.spec.containers[0].image)'`
  prints the digest; `gcloud artifacts docker images list asia-southeast1-docker.pkg.dev/cpe334-pungkung-james/cpms/cpms --include-tags`
  maps that digest to the commit SHA tag.

Rollback: Actions -> Deploy demo -> Run workflow, `image_tag` = full SHA of an older image (no tests, build or
migration; the database is not rolled back).

## Release history

| Release | PR into `main` | Commit (image tag) | Deploy demo run | Digest |
|---|---|---|---|---|
| A: deploy workflow | #38 | `cd48e2e14b12e0aef0541cb3ecb57a6a1f362551` | [43714413857](https://github.com/KanPhacharawat/softwareengineering-project/actions/runs/43714413857) | `sha256:b46204a1...` |
| B: visible change (login page note, PR #39) | #40 | `a11fdc0a06c993a6ca5d372a06fc02332b17cbc0` | [43715758117](https://github.com/KanPhacharawat/softwareengineering-project/actions/runs/43715758117) | `sha256:765d4684...` |
| Rollback to A | manual run | `cd48e2e...` | [43719428740](https://github.com/KanPhacharawat/softwareengineering-project/actions/runs/43719428740) | `sha256:b46204a1...` |
| Roll forward to B (running now) | manual run | `a11fdc0...` | [43719708355](https://github.com/KanPhacharawat/softwareengineering-project/actions/runs/43719708355) | `sha256:765d4684...` |

## Persistence and rollback (Episode 8)

Data lives only in Cloud SQL (records and sessions); the container keeps nothing. Check (C-05, Issue #30): as `sup1`
create milestone `Milestone test` on team Alpha on release B, roll back to release A, then roll forward to B. After
each redeploy the login page note disappears and comes back, and the milestone and the session are still there.
A restart (new revision of the same image, or scale to zero and a cold start) keeps the data for the same reason.

## Cost control and teardown

Budget alert first (Issue #23); Cloud Run min 0 / max 3; smallest Cloud SQL tier with storage auto-increase off.
Keep the service running until grading of Lab 6, Lab 7 and the Final Project ends, then run `deploy/teardown.sh`
(deletes the service, job, Cloud SQL instance, secrets and images).

## Evidence

| Check | Where |
|---|---|
| C-01 | PR #34, run [43397390405](https://github.com/KanPhacharawat/softwareengineering-project/actions/runs/43397390405) (83 tests passed) |
| C-02 | PR #36, Issue #28 |
| C-03 | `docs/labs/lab-05/evidence/C-03-docker-compose.txt` |
| C-04 | Issue #27 (sign in, business action, access restriction on the public URL) |
| C-05 | Issue #30 |
| C-06 | Issue #29, PRs #39 and #40, run 43715758117 |
