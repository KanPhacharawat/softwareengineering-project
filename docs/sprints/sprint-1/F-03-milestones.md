# F-03 Milestone creation: feature contract

Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Contract written before implementation |

Linked requirements: FR-05, FR-06, BR-02, BR-03, BR-04. Depends on: F-01, F-02.

## Behaviour and workflow

1. Supervisor opens `/teams/:teamId` of an assigned team and fills "New milestone": title, description, due date/time.
2. API checks role SUPERVISOR (else 403), team in scope (else 404), validates input and BR-04, stores the milestone.
3. The milestone appears in the team list for the supervisor and all team members, sorted by due date,
   each with a status: `OPEN` (no submission, before due), `SUBMITTED`, `FEEDBACK_GIVEN`, `MISSED` (no submission, past due).

Validation: title trimmed 3..120 chars; description optional, max 2000; `dueAt` ISO 8601 date-time and later than
server time now.

## UI

Team page shows member list and milestone table (title, due date in Bangkok time, status badge).
Supervisor sees a form under the table; field errors from the API show under each input; on success the form
clears and the list reloads. Empty state "No milestones yet".

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| GET /api/teams/:teamId/milestones | none | 200 `{ "milestones": [ { "id", "title", "description", "dueAt", "status" } ] }` | 401, 404 |
| POST /api/teams/:teamId/milestones | `{ "title", "description"?, "dueAt" }` | 201 `{ "milestone": { ... } }` | 400 VALIDATION_ERROR, 401, 403 FORBIDDEN (student), 404 (team not assigned) |

## Data

Table `Milestone(id, teamId FK, title, description, dueAt timestamptz, createdById FK, createdAt)`, index on teamId.
Migration `init`.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-06 | Given supervisor Sup1 assigned to Team Alpha, when Sup1 posts a valid milestone with a future due date, then 201 is returned, the milestone is stored, and a member of Team Alpha sees it in the milestone list with status OPEN. |
| AC-07 | Given a due date in the past, or a title shorter than 3 or longer than 120 characters, the request returns 400 `VALIDATION_ERROR` with the failing field in `fields`, and no milestone is stored. |
| AC-08 | Given Sup1 is not assigned to Team Gamma, a milestone post for Team Gamma returns 404 and nothing is stored. |
| AC-09 | Wrong-role operations are rejected with 403: a student posting a milestone (nothing stored), and a supervisor posting a submission (F-04). |
