# F-05 Supervisor feedback: feature contract

Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Contract written before implementation |

Linked requirements: FR-09, FR-10, BR-02, BR-03, BR-07, BR-08. Depends on: F-04.

## Behaviour and workflow

1. Supervisor opens `/milestones/:id` of an assigned team that has a submission without feedback; a feedback
   textarea is shown.
2. API checks role SUPERVISOR (else 403), submission's team assigned to the supervisor (else 404), comment
   1..2000 chars after trim (else 400), no existing feedback (else 409 `FEEDBACK_EXISTS`, unique constraint).
3. Feedback is stored with author and time and linked to the submission. From now on the submission is locked
   (BR-07): student edits return 409 `SUBMISSION_LOCKED`.
4. Team members see the feedback under their submission. Feedback may be given after the deadline.

## UI

Supervisor: textarea + "Save feedback" under the submission card; after save it shows the feedback card.
Student: feedback card (author, time, text) and the notice "Locked after feedback".

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| POST /api/submissions/:submissionId/feedback | `{ "comment" }` | 201 `{ "feedback": { "id", "comment", "author": {id,name}, "createdAt" } }` | 400, 401, 403 (student), 404 (not assigned / missing), 409 FEEDBACK_EXISTS |

## Data

`Feedback(id, submissionId UNIQUE FK, authorId FK, comment, createdAt)`. Migration `init`.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-17 | Given a submission of Team Alpha, when Sup1 posts a valid comment, then 201 is returned and `GET /api/milestones/:id` by a Team Alpha student shows the feedback linked to that submission with author Sup1. |
| AC-18 | Given a submission with feedback, a student PUT returns 409 `SUBMISSION_LOCKED` and the submission is unchanged, even before the due date. |
| AC-19 | A student posting feedback gets 403 and nothing is stored; supervisor Sup2, not assigned to Team Alpha, gets 404 and nothing is stored. |
| AC-20 | An empty or whitespace-only comment gets 400; a second feedback on the same submission gets 409 `FEEDBACK_EXISTS`. |
| AC-21 | End-to-end in the browser: Sup1 logs in and creates a milestone for Team Alpha; S1 logs in, submits work and sees it saved; Sup1 records feedback; S1 reloads and sees the feedback and the locked notice. |
