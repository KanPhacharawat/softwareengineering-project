# F-11 Product hardening: feature contract

Version history

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-27 | Initial contract: performance (NFR-06), screen states (NFR-07), failure handling, CI secret scan (NFR-08), final regression. Written before any F-11 work (D2 Part C). |

Linked requirements: NFR-06, NFR-07, NFR-08, NFR-02, NFR-03, NFR-05 (regression only).
Depends on: all features; screen-state checks for F-09 and F-10 need those screens (S3-01 #106, S3-02 #107).
Implementation: S3-03 #108 (target 10 Dec 2026). Final regression runs on the final release candidate (13 Dec).

F-11 adds **no domain behaviour** and no new business rule. It makes existing NFRs measurable and closes the gaps listed
in `docs/traceability.md` v2.0 ("Coverage gaps": NFR-06 not measured, NFR-07 partial, NFR-08 manual only).

## Design decisions (agreed 27 Nov)

1. **NFR-06 load test** uses `autocannon` (root devDependency) in `scripts/load-test.mjs`, 20 connections, against the
   **deployed** Cloud Run instance with the seed dataset. Only `POST /api/auth/login` and GET endpoints are loaded:
   **no domain data is written to production**. Each login does write one row to the `session` table (connect-pg-simple);
   to bound that, the login run is capped at **200 requests** (not a duration), and those sessions expire after 8 h and
   are pruned by the store (NFR-04).
2. autocannon reports p97.5, not p95. Pass rule: **p97.5 < 500 ms** for each endpoint (stricter than p95 < 500 ms, so a
   pass also proves NFR-06) and **0 non-2xx responses** and 0 errors/timeouts.
3. The load test may remain **Planned** at the D2 checkpoint (29 Nov); it must be run and recorded before the final
   release (13 Dec). A failing result is recorded as a defect, not hidden or re-defined.
4. **NFR-07** is checked by a screen inventory (below). Every data screen shows loading, empty and error states; every
   form shows field errors next to the field. Missing states are added; each data screen gets an E2E state check by
   route interception.
5. **Failure handling**: the server already maps unknown errors to `500 { error: { code: 'INTERNAL_ERROR', message:
   'Something went wrong' } }` (`server/src/errors.ts`). F-11 adds a test that no stack, SQL or error message leaks, and
   a **Try again** button in `ErrorState` that calls the page's `reload()` (already in `useApi`, `web/src/lib/use-api.ts`).
   A 404 keeps the existing message and shows no Try again (retrying cannot help).
6. **NFR-08**: add a secret scan step to `ci-docker.yml` job `test-and-docker`: download a **pinned gitleaks release
   binary, verify its SHA-256**, and run `gitleaks git --redact` over the repository history (checkout with
   `fetch-depth: 0`, keeping `persist-credentials: false`). A binary is used instead of `gitleaks-action` so the job keeps
   `permissions: contents: read` and needs no extra token, and so the version is pinned like the other actions (by hash). It replaces the manual MC-01 check as the per-PR gate; MC-01 stays as a release
   check.
7. **Final regression** is part of F-11: full unit + API/DB + E2E suite plus the Sprint 1, Sprint 2 and Sprint 3
   journeys on the final candidate commit, with pass/fail/skip counts recorded.

**Explicit exclusions**: caching layers, autoscaling changes, accessibility audit beyond NFR-07, new features.

## NFR-07 screen inventory (current state on `staging` 78dab10)

| Screen | Loading | Empty | Error | Field errors | Try again | E2E state check today |
|---|---|---|---|---|---|---|
| Login `/login` | **Log in** button disabled with spinner icon while sending | n/a | form alert | email, password (`aria-describedby` linked) | n/a (form) | `auth.spec.ts` (wrong password) |
| Home `/` (teams) | `TeamCardsSkeleton` | `EmptyState` | `ErrorState` | n/a | **missing** | empty only (`teams.spec.ts`) |
| Team `/teams/:id` | `TeamPageSkeleton`, `MilestonesSkeleton` | "No members yet", "No milestones yet" | `ErrorState` | milestone form (text under input, **not** `aria-describedby` linked) | **missing** | **missing** |
| Milestone `/milestones/:id` | `MilestonePageSkeleton`; history has its own "Loading history" | "No submission yet" | `ErrorState`; history "Could not load history" | submission, feedback, revision request, grade, milestone edit (text under input, **not** `aria-describedby` linked) | **missing** | history only (`revision-history.spec.ts`) |
| Board `/teams/:id/board` (F-09) | per F-09 contract | "No milestones yet." | `ErrorState` | n/a (read-only) | add | TEST-E2E-09 (500 → error) |
| Report `/reports` (F-10) | per F-10 contract | per F-10 contract | `ErrorState` | n/a (read-only) | add | TEST-E2E-10 |

Gaps to close in S3-03: Try again on every `ErrorState` except 404; E2E state checks for Home error, Team (loading,
error), Milestone (loading, error); link every form field error to its input with `aria-describedby` (as the login page
already does) so "next to the field" is testable. S3-03 re-checks this table against the code and updates it in the evidence file.

## Workflow

**W1 Load test (NFR-06)**

1. Operator sets `LOAD_TEST_URL`, `LOAD_TEST_EMAIL`, `LOAD_TEST_PASSWORD` (a seed supervisor; values from the private
   handoff, never committed) and `LOAD_TEST_VERSION` (tag + Cloud Run revision from the deploy run; the API exposes no
   version, `/api/health` returns only `{ ok: true }`).
2. `npm run load-test` logs in once to get a session cookie, reads the first team from `GET /api/teams` and its first
   milestone from `GET /api/teams/:teamId/milestones` (ids are not hard-coded), then runs autocannon 20 connections ×
   30 s on each GET endpoint, and 20 connections × **200 requests** on `POST /api/auth/login`.
3. Script prints a table (endpoint, requests, p50, p97.5, p99, non-2xx, errors, PASS/FAIL) and writes it to
   `docs/evidence/F-11/load-test-<version>.txt`. Exit code 1 if any endpoint fails.

Endpoints: `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/teams`, `GET /api/teams/:alphaId/milestones`,
`GET /api/milestones/:id`, `GET /api/teams/:teamId/board` (F-09), `GET /api/reports/supervisor-summary` (F-10, if released).
If the chosen team has no milestone, the script exits 2 "Seed data has no milestone" instead of skipping the endpoint.

**W2 Error and retry (NFR-07, failure handling)**

1. A data GET fails with 500 (or network error).
2. Page shows `ErrorState` "Something went wrong" with **Try again**.
3. User clicks **Try again** → `reload()` → loading → success content (or the error again).

**W3 Secret scan (NFR-08)**

PR opened → `test-and-docker` runs `gitleaks` on the PR commits → job fails if a secret is found → PR cannot merge.

## Validation, boundaries and errors

| Check | Boundary | Result |
|---|---|---|
| Load test p97.5 | 499 ms | PASS |
| | 500 ms | FAIL (rule is strictly `< 500`) |
| Load test non-2xx | 0 | PASS; ≥ 1 → FAIL |
| Load test env vars | any of the four missing | script exits 2 naming the missing variable(s) (`LOAD_TEST_URL`, `LOAD_TEST_EMAIL`, `LOAD_TEST_PASSWORD`, `LOAD_TEST_VERSION`), sends nothing |
| Load test login fails | 401 on the first login | script exits 2 "Login failed", sends no load |
| `ErrorState` | `status === 404` | not-found message, **no** Try again |
| | any other status or network error (`status 0`) | message + Try again |

Known risk: `POST /api/auth/login` runs bcrypt (cost 12 in the seed, NFR-01 requires ≥ 10) and may be the slowest endpoint under 20 concurrent
logins on one Cloud Run instance. If it fails, the result is recorded as a defect with its numbers; NFR-01 (cost) is not
lowered to pass NFR-06.

Error codes: no new codes.

## Data definition

No change. No migration.

## API definition

No new endpoint and no change to any response. Failure contract (existing, now tested):

| Case | Response |
|---|---|
| Unexpected error in any route | `500 { "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong" } }`; no `stack`, no SQL, no original message; error logged on the server |

## UI definition (English only)

- `web/src/components/page-states.tsx` `ErrorState` gains optional `onRetry?: () => void`. When given and
  `error.status !== 404`, it shows button **Try again** under the message.
- Every page passes `onRetry={state.reload}` for its data GETs (home, team, team milestones, milestone, board, report).
- No other visual change.

## Scripts and CI

| File | Change |
|---|---|
| `scripts/load-test.mjs` (new) | W1; uses `autocannon` programmatic API; no secrets in code |
| `package.json` (root) | `"load-test": "node scripts/load-test.mjs"`; devDependency `autocannon` (pinned) |
| `.github/workflows/ci-docker.yml` | checkout gets `fetch-depth: 0`; new step "Secret scan (gitleaks)" right after checkout: pinned binary + SHA-256 check, `gitleaks git --redact` |
| `.gitleaks.toml` (only if needed) | allowlist for CI-only test values (`postgresql://app:app@localhost…`, `.env.example` placeholders), each entry with a comment; never allowlist a real secret |

## Acceptance criteria

| ID | Acceptance criterion |
|---|---|
| AC-63 | Given the deployed candidate with the seed dataset, when `npm run load-test` runs 20 connections on each listed endpoint, then every endpoint has p97.5 < 500 ms with 0 non-2xx and 0 errors, and the output file names the deployed version and revision; missing env vars or a failed login stop the script before any load. |
| AC-64 | Every data screen in the inventory (home, team, milestone, board, report) shows a loading state, its empty state, and an error state when its GET fails, and every form shows server field errors next to the field. |
| AC-65 | An unexpected server error returns exactly `500 { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }` with no stack or internal message; on a failed data GET the page shows **Try again** (not for 404), and clicking it reloads and shows the data when the API recovers. |
| AC-66 | The CI job `test-and-docker` runs a secret scan on every PR to `staging`/`main`; it passes on the repository and fails on a commit containing a planted fake secret. |
| AC-67 | On the final candidate commit, the full automated suite (unit, API/DB, E2E) passes with 0 failed tests and every skipped test disclosed, and the Sprint 1, Sprint 2 and Sprint 3 journeys pass; the deployed version matches the tag, commit and CI run. |

## STS (test design)

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-NFR-06 | AC-63 | Performance (measurement) | deployed candidate, seed data, env vars set | `npm run load-test`; also run once with `LOAD_TEST_URL` unset and once with a wrong password | each endpoint p97.5 < 500 ms, non-2xx 0, errors 0, output saved with `LOAD_TEST_VERSION`; missing env → exit 2, no requests; bad login → exit 2, no load |
| TEST-67 | AC-64 | E2E | seed; Playwright route interception per screen | home, team, milestone, board, report: (a) delay the GET 1 s; (b) fulfil empty data; (c) fulfil 500 | (a) loading element (`aria-busy="true"`) visible; (b) the screen's empty message; (c) "Something went wrong" alert |
| TEST-68 | AC-64 | E2E | seed | submit invalid values in login, milestone create/edit, submission, feedback, revision request, grade forms | each server field error is shown under its input and the input's `aria-describedby` points to the error element (after the S3-03 fix); references existing checks where they already exist |
| TEST-69 | AC-65 | API | minimal Express app with the real `errorHandler` and a route that throws `new Error('relation "Secret" password=x')` | GET the route | status 500; body deep-equals `{ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }`; body text contains no `stack`, `relation`, `password` |
| TEST-70 | AC-65 | E2E | seed; board GET intercepted: first call 500, then pass-through; separate case 404 | open board; click **Try again**; open an unknown milestone id | error + **Try again**; after click the board renders; 404 page shows not-found message and no **Try again** |
| TEST-SEC-01 | AC-66 | CI check | PR CI run; scratch branch (never merged) with a fake key in a file | open PR / run workflow on scratch branch | secret scan step green on the PR; red on the scratch branch (run link saved); scratch branch deleted |
| TEST-REG-01 | AC-67 | Regression (record) | final candidate commit | `npm test`, `npm run test:e2e`, CI run, deploy run, post-deploy checks | counts recorded in `docs/evidence/release-<final>/regression.txt`: 0 failed, skipped listed with reason; journeys TEST-E2E-06/07 (Sprint 1), Sprint 2 journey, TEST-E2E-09 (+ F-10 E2E) pass |

Coverage: AC-63..AC-67 each have at least one test or measurement; every row points to an AC in this range.

## Layers with no change

Database schema, migrations and seed; all endpoints and their responses; domain rules (BR-*); auth and session.

## Definition of Done (F-11)

Product DoD applies. F-11 extra: load-test output, secret-scan run links and final regression counts are saved under
`docs/evidence/F-11/` (and the final release folder); `docs/traceability.md` rows NFR-06, NFR-07 and NFR-08 show the
actual result and version; no test is weakened or skipped to reach green.
