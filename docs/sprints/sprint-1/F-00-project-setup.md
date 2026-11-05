# F-00 Project setup: feature contract

Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Contract approved by the team before implementation |

Linked requirements: NFR-05, NFR-08. Depends on: none. All other Sprint 1 features depend on F-00.

## Behaviour

Create the empty application skeleton that every later feature builds on:

- npm workspaces: `server/` (Node 22, Express 5, TypeScript) and `web/` (React 19, Vite, TypeScript).
- PostgreSQL 16 via Prisma: schema with `User`, `Team`, `TeamMember` and `session`; first migration `init`;
  reproducible seed (two supervisors, three teams, six students).
- Configuration only through environment variables; `server/.env.example` committed, `.env` git-ignored.
- `GET /api/health` returns `{ "ok": true }`.
- Test runners wired up: Vitest + Supertest (server, real test database), Playwright (web).
- README: prerequisites, setup, run and test commands.
- Repository conventions: `main` (releases), `sprint-1` (staging), `feature/<ID>-<name>` branches, Issue per feature,
  PR into `sprint-1` reviewed by the teammate.

No UI screens and no domain endpoints in this feature.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-00a | On a clean clone, following the README (`npm install`, migrate, seed) completes without errors and `npm run dev` serves the web app and `GET /api/health` returns 200 `{ "ok": true }`. |
| AC-00b | `npm test` runs the server test suite against the `cpms_test` database and reports a passing smoke test (health endpoint and seeded user count). |
| AC-00c | No real secret is committed: only `.env.example` with placeholders is tracked. |

## Tests

| Test | AC | Level | Input | Expected |
|---|---|---|---|---|
| TEST-00a | AC-00a, AC-00b | API | app started on test DB | GET /api/health -> 200 `{ ok: true }` |
| TEST-00b | AC-00b | API/DB | seed loaded | 8 users, 3 teams, each student in exactly one team |
| MC-00 | AC-00c | Manual | release commit | `git ls-files` shows no `.env`; `git grep SESSION_SECRET` only in example/docs |
