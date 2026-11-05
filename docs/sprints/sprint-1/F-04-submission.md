# F-04 Team submission: feature contract

Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Contract written before implementation |

Linked requirements: FR-07, FR-08, FR-09, BR-01, BR-03, BR-05, BR-06, BR-09, NFR-09. Depends on: F-03.

## Behaviour and workflow

1. Student opens `/milestones/:id` of their team. If there is no submission and the milestone is before due,
   a form (title, description, link) is shown.
2. Submit: API checks role STUDENT (else 403), milestone in the student's team (else 404), validates BR-09,
   checks the domain rule `canChangeSubmission(milestone, submission, now)`:
   - now >= dueAt -> 422 `DEADLINE_PASSED` (BR-06)
   - submission has feedback -> 409 `SUBMISSION_LOCKED` (BR-07, F-05)
   then inserts. A second insert for the same milestone gives 409 `SUBMISSION_EXISTS` (BR-05), including under
   concurrent requests via the unique constraint on `Submission.milestoneId` (NFR-09).
3. Edit (PUT) follows the same checks and updates the existing submission; `submittedById` and `updatedAt` record
   the last editor.
4. Any member and the assigned supervisor can open the milestone and see the submission and its feedback.

Validation (BR-09): title trimmed 3..120; description max 2000 (may be empty); link absolute `http://` or
`https://` URL, max 500.

## UI

Milestone page shows title, description, due date and status. Student view: form when editable; after submit, a
card with the saved values, "Last updated by NAME at TIME" and an Edit button while editable. After the deadline or
after feedback, a notice "Submission closed: deadline passed" or "Locked after feedback" and no form.
Supervisor view: the card read-only, or "No submission yet".

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| GET /api/milestones/:milestoneId | none | 200 `{ "milestone": {...,"status"}, "team": {id,name}, "submission": null or {id,title,description,link,submittedBy:{id,name},submittedAt,updatedAt,feedback: null or {...}} }` | 401, 404 |
| POST /api/milestones/:milestoneId/submission | `{ "title", "description", "link" }` | 201 `{ "submission": {...} }` | 400, 401, 403 (supervisor), 404, 409 SUBMISSION_EXISTS / SUBMISSION_LOCKED, 422 DEADLINE_PASSED |
| PUT /api/milestones/:milestoneId/submission | same | 200 `{ "submission": {...} }` | 400, 401, 403, 404 (also when no submission yet), 409 SUBMISSION_LOCKED, 422 DEADLINE_PASSED |

## Data

`Submission(id, milestoneId UNIQUE FK, title, description, link, submittedById FK, submittedAt, updatedAt)`.
Migration `init`.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-11 | Given an OPEN milestone of Team Alpha, when student S1 submits a valid title/description/link, then 201 is returned, and a later `GET /api/milestones/:id` (also by teammate S2 and by Sup1) returns the stored values with submittedBy S1. |
| AC-12 | Given the milestone already has a submission, another POST returns 409 `SUBMISSION_EXISTS`; when two POSTs are sent at the same time, exactly one succeeds and one submission row exists. |
| AC-13 | Given the milestone due date has passed, POST and PUT return 422 `DEADLINE_PASSED` and the stored data is unchanged. |
| AC-14 | Given a link that is not http/https (for example `ftp://x` or `not a url`) or a title under 3 characters, the request returns 400 with the field in `fields`, and nothing is stored. |
| AC-15 | Given student S3 of Team Beta, reading or submitting to a Team Alpha milestone returns 404 with no submission data. |
| AC-16 | Given an existing submission without feedback before the due date, a PUT by a team member returns 200 and the new values are stored with the new submittedBy and updatedAt. |
