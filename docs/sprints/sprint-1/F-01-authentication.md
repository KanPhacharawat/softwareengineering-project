# F-01 Authentication and session: feature contract

Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Contract written before implementation |

Linked requirements: FR-01, FR-02, FR-03, NFR-01, NFR-02, NFR-04. Depends on: none.

## Behaviour and workflow

1. User opens `/login`, enters email and password, presses Log in.
2. API lowercases the email, finds the user, compares the password with the bcrypt hash.
3. On success the session is regenerated, `userId` stored, cookie `cpms.sid` set; UI goes to `/`.
4. Every protected request passes `requireAuth`, which loads the user from the session.
5. Logout destroys the server session and clears the cookie; UI returns to `/login`.

Rules and validation: email and password are required strings (email max 254, password max 200).
Unknown email and wrong password give the same response so accounts cannot be probed.
Passwords are never returned. No registration or password reset (exclusion).

Failure and boundary cases: empty body -> 400; wrong password -> 401; request with expired or destroyed
session -> 401; logout without a session -> 204 (idempotent).

Permissions: login is public; logout and me require a session.

## UI

`/login` form with email and password fields, submit button disabled while sending, error banner
"Invalid email or password". Top bar on every authenticated page with name, role and Logout.
Visiting any page without a session redirects to `/login`.

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| POST /api/auth/login | `{ "email": "s1@cpms.test", "password": "..." }` | 200 `{ "user": { "id", "email", "name", "role" } }` + Set-Cookie | 400 VALIDATION_ERROR, 401 INVALID_CREDENTIALS |
| POST /api/auth/logout | none | 204, cookie cleared | none |
| GET /api/auth/me | none | 200 `{ "user": { ... } }` | 401 UNAUTHENTICATED |

## Data

Tables `User` (email unique, passwordHash, role enum) and `session` (connect-pg-simple). Created in migration
`init`. Seed creates the demo accounts with bcrypt cost 12.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-01 | Given a seeded user, when they log in with the correct email and password, then the response is 200 with their id, name, email and role (no password hash), a session cookie is set, and `GET /api/auth/me` with that cookie returns the same user. |
| AC-02 | Given a wrong password or an unknown email, login returns 401 `INVALID_CREDENTIALS` with the same message and no session cookie. |
| AC-03 | Given no session cookie, every protected endpoint (`/api/auth/me`, `/api/teams`, `/api/teams/:id/milestones`, `/api/milestones/:id`) returns 401 `UNAUTHENTICATED` and no domain data. |
| AC-04 | Given a logged-in user, after `POST /api/auth/logout` the same cookie gets 401 on `/api/auth/me`. |
| AC-05 | Stored `passwordHash` values are bcrypt hashes (prefix `$2`, cost >= 10) and never equal the plain password. |
| AC-22 | In the UI, an unauthenticated visit to `/` redirects to `/login`; after Logout the user is on `/login` and going back to `/` redirects to `/login` again. |
