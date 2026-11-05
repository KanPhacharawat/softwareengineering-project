# F-02 Role and team authorization: feature contract

Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Contract written before implementation |

Linked requirements: FR-04, BR-01, BR-02, BR-03, NFR-03. Depends on: F-01.

This is a cross-cutting backend responsibility used by F-03, F-04 and F-05, plus the team listing endpoints.

## Behaviour

- `requireRole(role)` rejects a wrong-role operation with 403 `FORBIDDEN` before touching data (BR-03).
- `loadTeamInScope(user, teamId)` returns the team only if the user is a member (student) or its supervisor;
  otherwise 404 `NOT_FOUND` (BR-01, BR-02, decision D-05). Every milestone, submission and feedback lookup
  resolves its team and calls the same check.
- Team listing: student gets the one team they belong to; supervisor gets assigned teams, ordered by name.

## UI

`/` lists visible teams as cards (name, supervisor, members). Empty state for a supervisor with no teams.
Supervisor-only controls (New milestone, Feedback form) are hidden for students, but the API enforces the rules.

## API

| Method and path | Success | Errors |
|---|---|---|
| GET /api/teams | 200 `{ "teams": [ { "id", "name", "supervisor": {id,name}, "members": [ {id,name,email} ] } ] }` | 401 |
| GET /api/teams/:teamId | 200 `{ "team": { ... } }` | 401, 404 |

## Data

`Team.supervisorId`, `TeamMember (teamId, userId)` from seed. No migration beyond `init`.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-10 | A student sees only their own team in `GET /api/teams` and only their team's milestones; requesting another team (`GET /api/teams/:otherId` or its milestones) returns 404 without data. A supervisor sees only assigned teams. |

Role and ownership criteria for the domain operations are AC-08, AC-09, AC-15 and AC-19 in F-03 to F-05.
