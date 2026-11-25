# F-04 Team submission: feature contract

Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Contract written before implementation |
| 1.1 | 2026-11-25 | Lab 7 CR-01 (#82, #83): BR-06 v2 grace window (version 1 editable until `dueAt + 24 h`), `Submission.lateAt`, `Late` badge and grace texts, API fields `lateAt` / `editableUntil`; AC-13 superseded by AC-49; AC-50, AC-52 |

Linked requirements: FR-07, FR-08, FR-09, BR-01, BR-03, BR-05, BR-06, BR-09, NFR-09. Depends on: F-03.

## Behaviour and workflow

1. Student opens `/milestones/:id` of their team. If there is no submission and the milestone is before due,
   a form (title, description, link) is shown.
2. Submit: API checks role STUDENT (else 403), milestone in the student's team (else 404), validates BR-09,
   checks the domain rule `canChangeSubmission(milestone, submission, now)`:
   - now >= dueAt + 24 h -> 422 `DEADLINE_PASSED` (BR-06 v2; v1.0: now >= dueAt). Version >= 2 (F-06) uses the
     revision due date with no grace. F-07 `MILESTONE_CLOSED` is checked before this.
   - submission has feedback -> 409 `SUBMISSION_LOCKED` (BR-07, F-05)
   then inserts. A second insert for the same milestone gives 409 `SUBMISSION_EXISTS` (BR-05), including under
   concurrent requests via the unique constraint on `Submission.milestoneId` (NFR-09).
3. Edit (PUT) follows the same checks and updates the existing submission; `submittedById` and `updatedAt` record
   the last editor.
3a. Late mark (v1.1): when a POST or PUT is accepted with `now >= dueAt` and the submission has no `lateAt`, the
   service sets `lateAt = now` in the same transaction (PUT under the existing `FOR UPDATE` row lock). `lateAt` is
   never cleared or recomputed, also when F-07 later changes `dueAt`. Existing rows keep `lateAt = null`.
4. Any member and the assigned supervisor can open the milestone and see the submission and its feedback.

Validation (BR-09): title trimmed 3..120; description max 2000 (may be empty); link absolute `http://` or
`https://` URL, max 500.

## UI

Milestone page shows title, description, due date and status. Student view: form when editable; after submit, a
card with the saved values, "Last updated by NAME at TIME" and an Edit button while editable. After the deadline or
after feedback, a notice "Submission closed: deadline passed" or "Locked after feedback" and no form.
v1.1 (BR-06 v2): "deadline" means `editableUntil` (= `dueAt + 24 h` for version 1). With no submission and
`dueAt <= now < dueAt + 24 h` the form stays and an alert says "Due date passed. Late submissions accepted until
<time> (Bangkok time)." A late submission shows a `Late` badge and the line "Submitted late at <lateAt>
(Bangkok time)" for students and the supervisor.
Supervisor view: the card read-only, or "No submission yet".

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| GET /api/milestones/:milestoneId | none | 200 `{ "milestone": {...,"status"}, "team": {id,name}, "submission": null or {id,title,description,link,submittedBy:{id,name},submittedAt,updatedAt,feedback: null or {...}} }`; v1.1 adds `milestone.graceEndsAt` and `submission.lateAt` (ISO or `null`), `submission.editableUntil` = `dueAt + 24 h` for version 1 | 401, 404 |
| POST /api/milestones/:milestoneId/submission | `{ "title", "description", "link" }` | 201 `{ "submission": {...} }` | 400, 401, 403 (supervisor), 404, 409 SUBMISSION_EXISTS / SUBMISSION_LOCKED, 422 DEADLINE_PASSED |
| PUT /api/milestones/:milestoneId/submission | same | 200 `{ "submission": {...} }` | 400, 401, 403, 404 (also when no submission yet), 409 SUBMISSION_LOCKED, 422 DEADLINE_PASSED |

## Data

`Submission(id, milestoneId UNIQUE FK, title, description, link, submittedById FK, submittedAt, updatedAt)`.
Migration `init`. v1.1 adds `lateAt timestamptz NULL` (migration `<timestamp>_submission_late_at`, no backfill:
under v1.0 no save at or after `dueAt` was possible, so `NULL` is correct for every existing row).

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-11 | Given an OPEN milestone of Team Alpha, when student S1 submits a valid title/description/link, then 201 is returned, and a later `GET /api/milestones/:id` (also by teammate S2 and by Sup1) returns the stored values with submittedBy S1. |
| AC-12 | Given the milestone already has a submission, another POST returns 409 `SUBMISSION_EXISTS`; when two POSTs are sent at the same time, exactly one succeeds and one submission row exists. |
| AC-13 | ~~Given the milestone due date has passed, POST and PUT return 422 `DEADLINE_PASSED` and the stored data is unchanged.~~ **Superseded by AC-49** (Lab 7 CR-01, v1.1). |
| AC-14 | Given a link that is not http/https (for example `ftp://x` or `not a url`) or a title under 3 characters, the request returns 400 with the field in `fields`, and nothing is stored. |
| AC-15 | Given student S3 of Team Beta, reading or submitting to a Team Alpha milestone returns 404 with no submission data. |
| AC-16 | Given an existing submission without feedback before the due date, a PUT by a team member returns 200 and the new values are stored with the new submittedBy and updatedAt. |
| AC-49 | *(Lab 7, v1.1, revises AC-13)* For version 1 of a submission with milestone due `D`, POST and PUT are accepted at `D - 1 ms`, `D` and `D + 24 h - 1 ms`, and return 422 `DEADLINE_PASSED` at `D + 24 h` and later, with the stored data unchanged (no row created on POST). |
| AC-50 | *(Lab 7)* A save accepted at or after `D` sets `lateAt` to the server time of that save if it is `null`; a later save keeps the first `lateAt`, and a later F-07 due-date change does not change it; saves before `D` leave it `null` (an on-time submission edited in the grace window becomes late). `GET /api/milestones/:id` returns `lateAt` to S1, S2 and Sup1, the team list returns it, and the UI shows the `Late` badge and "Submitted late at <time> (Bangkok time)". |
| AC-52 | *(Lab 7)* Inside the grace window, the unchanged rules still apply: a closed milestone returns 409 `MILESTONE_CLOSED`, a submission with feedback returns 409 `SUBMISSION_LOCKED`, a second POST returns 409 `SUBMISSION_EXISTS`, Sup1 POST returns 403, S3 (Team Beta) gets 404, a version >= 2 after its revision due returns 422 (no grace); submissions stored before the migration have `lateAt = null`. |
