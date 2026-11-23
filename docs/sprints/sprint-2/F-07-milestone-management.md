# F-07 Milestone management: feature contract

Version history

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-22 | Initial contract: edit milestone (title, description, due date) and close milestone (FR-14, BR-13). Written before any F-07 code (D2 Part B). |

Linked requirements: FR-14, BR-13, BR-04, BR-06, BR-02, BR-03, NFR-02, NFR-03, NFR-05, NFR-07.
Depends on: F-03, F-04.
Interacts with:
- F-06 (`MILESTONE_CLOSED` on resubmit and revision request; both F-06 v0.2 and F-07 modify `canChangeSubmission` — whichever implementation PR lands second must keep the `closedAt` check as the **first** branch before deadline/lock checks).
- F-08 (grading remains allowed when closed; **follow-up for F-08 (#66)**: F-08's contract and STS must include a test case verifying `PUT /api/submissions/:id/grade` succeeds on a closed milestone).
Implementation: S2-04 #70.

## Design decisions (agreed 2026-11-21)

1. New nullable columns `Milestone.closedAt` and `Milestone.closedById`. Existing milestones stay open (`null`). No backfill.
2. **Close is final** in Sprint 2 (no reopen endpoint and no delete-milestone endpoint — explicit exclusions).
3. A closed milestone rejects student submit (`POST /submission`), student edit (`PUT /submission`), and student resubmit (`POST /versions`, F-06) per BR-13, and by F-07 design decision also rejects supervisor revision request (`POST /revision-request`, F-06) and supervisor milestone edit (`PATCH /milestones/:id`). It **still allows** supervisor feedback (F-05) and grading (F-08): the supervisor can close a milestone and then finish marking.
4. The closed check runs **before** duplicate-submission, deadline, and lock checks, so a milestone that is closed returns `409 MILESTONE_CLOSED` (never `422 DEADLINE_PASSED` or `409 SUBMISSION_EXISTS`).
5. Changing the due date is allowed only to a time strictly after server `now` (BR-13). Extending a past-due open milestone to a future date reopens the submit window (BR-06 uses the stored `dueAt`). Shortening a due date is allowed as long as the new date is still strictly in the future.
6. `PATCH /api/milestones/:milestoneId` is partial: accepts any subset of `title`, `description`, `dueAt`, with at least one recognized field required. Unknown fields are ignored. Passing `description: ""` or `description: null` clears the description to `null` (Prisma update writes `null` explicitly, not `undefined`). The UI edit form sends **only dirty (changed) fields**, comparing `dueAt` at minute precision in Asia/Bangkok, so editing only `title` or `description` on a past-due milestone omits `dueAt` and does not trigger the future-due check or reopen submissions.
7. `CLOSED` is **not** a new value of `MilestoneStatus`. Every milestone response gains `closedAt` (`null` or ISO string) and `closedBy` (`{ id, name }` or `null`). The UI renders a separate **Closed** badge next to the status badge. When a milestone with an open F-06 revision request is closed, **closed wins in the UI**: the student sees `"This milestone is closed."` and the revision alert / resubmit form are hidden (and the supervisor's waiting block is hidden), while `milestone.status` remains unchanged and the Closed badge is shown; in History, the request retains its derived status (`OPEN` until its `dueAt`, then `EXPIRED`).

## Workflow

```mermaid
stateDiagram-v2
  [*] --> NotClosed: supervisor creates milestone (F-03)
  NotClosed --> NotClosed: supervisor PATCH title / description / future dueAt
  NotClosed --> Closed: supervisor POST close (final, no reopen)
  Closed --> [*]: feedback (F-05) and grading (F-08) still allowed
```

**W1 Edit milestone**

1. Sup1 opens `/milestones/:id` of an unclosed Team Alpha milestone and clicks **Edit milestone**.
2. Sup1 changes any subset of title, description, or due date (Asia/Bangkok) and clicks **Save changes**. The client sends only changed fields.
3. System checks, in order: session (401) → role `SUPERVISOR` (403) → valid UUID and milestone's team assigned to Sup1 (404) → body validation (400 `VALIDATION_ERROR`) → inside a transaction locking the `Milestone` row, milestone not closed (409 `MILESTONE_CLOSED`).
4. System updates the provided fields in `Milestone` and returns `200` with the updated milestone (including recomputed `status`, `closedAt`, `closedBy`). Page reloads with the new values; S1 sees them on GET. If a past-due unclosed milestone is extended to a future `dueAt`, students can submit again (BR-06); if only `title` or `description` is changed, `dueAt` stays unchanged and `MISSED` remains `MISSED`.

**W2 Close milestone**

1. Sup1 opens `/milestones/:id` of an unclosed Team Alpha milestone, clicks **Close milestone**, and confirms in the inline confirmation panel.
2. System checks, in order: session (401) → role `SUPERVISOR` (403) → valid UUID and milestone's team assigned to Sup1 (404) → inside a transaction locking the `Milestone` row, milestone not already closed (409 `MILESTONE_CLOSED`).
3. System sets `closedAt = now` and `closedById = Sup1.id`, and returns `200` with the updated milestone including `closedAt` and `closedBy`. Two parallel close requests return one `200` and one `409 MILESTONE_CLOSED`, with `closedById` set once.
4. Both team page and milestone page show the **Closed** badge; Sup1 no longer sees Edit/Close buttons; S1 sees `"This milestone is closed."` and no submission, edit, or resubmit form.

**W3 Closed milestone enforcement**

1. A student attempts `POST /api/milestones/:id/submission`, `PUT /api/milestones/:id/submission`, or `POST /api/submissions/:id/versions` (F-06), or a supervisor attempts `PATCH /api/milestones/:id` or `POST /api/submissions/:id/revision-request` (F-06), on a closed milestone.
2. Server acquires the milestone row lock (see Concurrency below), checks `milestone.closedAt !== null` before duplicate/deadline/state checks, and rejects with `409 MILESTONE_CLOSED`; nothing is written.
3. Supervisor `POST /api/submissions/:id/feedback` (F-05) and `PUT /api/submissions/:id/grade` (F-08) still succeed when `closedAt` is set.

### Concurrency and locking

All write paths whose validity depends on milestone state (`POST /api/milestones/:id/submission`, `PUT /api/milestones/:id/submission`, `POST /api/submissions/:id/versions`, `POST /api/submissions/:id/revision-request`, `PATCH /api/milestones/:id`, `POST /api/milestones/:id/close`) run inside a database transaction that:
1. Acquires `SELECT 1 FROM "Milestone" WHERE id = $1 FOR UPDATE` first.
2. Re-reads `Milestone.closedAt` and `Milestone.dueAt` inside the transaction before checking business rules and writing.

Lock ordering across tables is always **Milestone first, then Submission** (preventing deadlocks with the existing Submission row lock). `POST /api/submissions/:id/feedback` keeps only the Submission lock because closing does not affect feedback.

## Validation, boundaries and errors

Rules for `PATCH /api/milestones/:milestoneId` (reuse `validateMilestoneInput` wording from F-03 / BR-04). Field presence is defined as `Object.hasOwn(body, key)`.

| Field | Rule | Error (`fields.*`) |
|---|---|---|
| body | plain JSON object with at least one of `title`, `description`, `dueAt` present; unknown keys ignored | non-object (array, string, `null`) or `{}` / no recognized keys: `fields.form`: `"At least one field is required"` |
| `title` (if present) | string, trimmed, 3..120 characters (BR-04) | non-string (incl. `null`) or length < 3 or > 120: `"Title must be between 3 and 120 characters"` |
| `description` (if present) | `null`, `""` (clears to `null`), or string trimmed ≤ 2000 characters (BR-04) | non-string/non-null: `"Description must be text"`; > 2000: `"Description cannot exceed 2000 characters"` |
| `dueAt` (if present) | string parseable by `Date.parse` (matching `validateMilestoneInput`), strictly after server `now` (BR-04, BR-13) | non-string (incl. `null`) or `NaN` from `Date.parse`: `"Invalid due date"`; `<= now`: `"Due date must be in the future"` |

Boundaries:
- `title`: 2 / 3 / 120 / 121 characters (after trim); `null`.
- `description`: `null` / `""` / 2000 / 2001 characters (after trim).
- `dueAt`: invalid string / `null` / `now - 1 s` / `now` (unit test with fixed `now`) / `now + 1 min`. Server time decides every deadline.
- Closed + past due (or closed + existing submission): `409 MILESTONE_CLOSED` takes precedence over `422 DEADLINE_PASSED` and `409 SUBMISSION_EXISTS`.

New error code:

| Status | Code | Message |
|---|---|---|
| 409 | `MILESTONE_CLOSED` | This milestone is closed |

Existing codes keep their messages: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND` (`"Not found or you do not have access"`), `DEADLINE_PASSED`, `SUBMISSION_LOCKED`, `SUBMISSION_EXISTS`.

## Data definition

| Table | Column | Type | Rule |
|---|---|---|---|
| `Milestone` | `closedAt` | `DateTime? @db.Timestamptz(3)` | `null` = not closed; set once on close |
| `Milestone` | `closedById` | `String? @db.Uuid` → `User` (`@relation("MilestoneClosedBy", fields: [closedById], references: [id], onDelete: Restrict)`) | set together with `closedAt` |

Note on Prisma relations: `User` already has the `milestones` relation for milestone creator (`createdById`), so the new relation uses the explicit name `"MilestoneClosedBy"` on both `Milestone.closedBy` and `User.closedMilestones`, with explicit `onDelete: Restrict` (overriding Prisma's `SetNull` default for optional relations so the pair invariant cannot be broken).

Migration `milestone_close` (one additive SQL migration):
1. `ALTER TABLE "Milestone" ADD COLUMN "closedAt" TIMESTAMPTZ(3);`
2. `ALTER TABLE "Milestone" ADD COLUMN "closedById" UUID;`
3. Add FK constraint `Milestone.closedById` → `User(id)` with `ON DELETE RESTRICT ON UPDATE CASCADE`.
4. Add pair-invariant CHECK constraint:
   ```sql
   ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_closed_pair_chk"
     CHECK (("closedAt" IS NULL) = ("closedById" IS NULL));
   ```

Safe on production data: nullable columns require no backfill and no rewrite of existing rows; all existing milestones remain unclosed (`closedAt = null`, `closedById = null`).

## Domain functions (pure, unit tested)

- `validateMilestoneUpdate(input, now)` in `server/src/domain/milestone.ts`:
  - Returns `{ success: true; data: Partial<{ title: string; description: string | null; dueAt: Date }> } | { success: false; fields: Record<string, string> }`.
  - Rejects non-object or empty/no-known-field bodies with `fields.form = "At least one field is required"`.
  - Checks key presence with `Object.hasOwn`; maps `description: ""` or `null` to `data.description = null` (so Prisma clears it).
  - Reuses the exact field error messages from `validateMilestoneInput`.
- `canChangeSubmission(milestone, submission, now)` in `server/src/domain/submission.ts`:
  - `milestone` parameter requires `closedAt: Date | string | null` (non-optional, so TypeScript forces every caller—including F-06's `canResubmit` / `POST /versions`—to load and pass `closedAt`; existing Sprint 1 unit tests add `closedAt: null`).
  - New rejection reason `'MILESTONE_CLOSED'`, checked **first** (before `'DEADLINE_PASSED'` and `'SUBMISSION_LOCKED'`).

## API definition

Every endpoint returning a milestone uses the same shape for close fields: `closedAt: string | null` and `closedBy: { id: string, name: string } | null`.

| Method + path | Role | Body | Success | Errors |
|---|---|---|---|---|
| `PATCH /api/milestones/:milestoneId` | Supervisor (assigned) | Partial `{ "title"?, "description"?, "dueAt"? }`, e.g. `{ "title": "Sprint 2 demo", "dueAt": "2026-12-05T17:00:00+07:00" }` | 200 `{ milestone: { id, teamId, title, description, dueAt, closedAt, closedBy, status } }` | 400 `VALIDATION_ERROR` (`fields.title`, `fields.description`, `fields.dueAt`, `fields.form`); 401; 403 `FORBIDDEN`; 404 `NOT_FOUND`; 409 `MILESTONE_CLOSED` |
| `POST /api/milestones/:milestoneId/close` | Supervisor (assigned) | none | 200 `{ milestone: { id, teamId, title, description, dueAt, closedAt, closedBy, status } }` | 401; 403 `FORBIDDEN`; 404 `NOT_FOUND`; 409 `MILESTONE_CLOSED` (already closed) |
| `GET /api/milestones/:milestoneId` (existing) | unchanged | – | `milestone` gains `closedAt` and `closedBy` | unchanged |
| `GET /api/teams/:teamId/milestones` (existing) | unchanged | – | each milestone item gains `closedAt` and `closedBy` | unchanged |
| `POST` / `PUT /api/milestones/:milestoneId/submission` (existing) | Student (member) | unchanged | unchanged | **new** 409 `MILESTONE_CLOSED` (checked under milestone lock before `SUBMISSION_EXISTS` and 422 `DEADLINE_PASSED`) |
| `POST /api/submissions/:submissionId/versions`, `POST /api/submissions/:submissionId/revision-request` (F-06) | unchanged | unchanged | unchanged | **new** 409 `MILESTONE_CLOSED` (checked under milestone lock) |
| `POST /api/submissions/:submissionId/feedback`, `PUT /api/submissions/:submissionId/grade` (F-05, F-08) | Supervisor (assigned) | unchanged | still allowed when milestone is closed | unchanged |

Order of checks in `PATCH` and `POST .../close`: auth (`401`) → role (`403`) → scope/UUID (`404`) → body validation (`400`, PATCH only) → milestone lock + closed state (`409`).

Example: `PATCH /api/milestones/:milestoneId` response (200):

```json
{
  "milestone": {
    "id": "a1b2…",
    "teamId": "t1a2…",
    "title": "Sprint 2 demo",
    "description": "Updated scope",
    "dueAt": "2026-12-05T10:00:00.000Z",
    "closedAt": null,
    "closedBy": null,
    "status": "OPEN"
  }
}
```

Example: `POST /api/milestones/:milestoneId/close` response (200):

```json
{
  "milestone": {
    "id": "a1b2…",
    "teamId": "t1a2…",
    "title": "Sprint 2 demo",
    "description": "Updated scope",
    "dueAt": "2026-12-05T10:00:00.000Z",
    "closedAt": "2026-11-26T09:30:00.000Z",
    "closedBy": { "id": "u1…", "name": "Supervisor One" },
    "status": "FEEDBACK_GIVEN"
  }
}
```

## Permission matrix

Fixture per cell: unclosed Team Alpha milestone. S1 = Alpha student, S3 = Beta student, Sup1 = Alpha supervisor, Sup2 = Gamma supervisor.

| Endpoint | S1 (Alpha) | S3 (Beta) | Sup1 (Alpha) | Sup2 (Gamma) | anonymous |
|---|---|---|---|---|---|
| `PATCH /api/milestones/:id` (Alpha) | 403 | 403 | 200 | 404 | 401 |
| `POST /api/milestones/:id/close` (Alpha) | 403 | 403 | 200 | 404 | 401 |

The role check (`403`) runs before the team scope check (`404`), matching F-03 and F-05. A malformed or unknown `:milestoneId` returns `404` for every authenticated supervisor.

## UI definition (English only)

- **Supervisor, milestone page header (not closed)**: buttons **Edit milestone** and **Close milestone**.
- **Edit form** (inline card, prefilled with current values): **Title**, **Description**, **Due date** (`datetime-local`, Asia/Bangkok). Reuses the `+07:00` submit conversion from `MilestoneForm` in `web/src/pages/team-page.tsx`, and adds a new reverse helper `toBangkokDateTimeLocal(iso)` in `web/src/lib/api.ts` (UTC ISO → `YYYY-MM-DDTHH:mm` in Asia/Bangkok, with a unit test) for prefilling and minute-precision dirty comparison. Submits **only dirty fields** (if nothing changed, **Save changes** is disabled or shows no-op feedback). Buttons **Save changes** (disabled while saving) and **Cancel**. Server field errors (`fields.*`) appear under each input; form-level errors appear in an alert above the actions.
- **Close confirmation** (inline confirm panel — no `window.confirm`, which blocks Playwright automation): text `"Close this milestone? Students will no longer be able to submit or edit."` with buttons **Close milestone** (disabled while saving) and **Cancel**.
- **Closed state (everyone)**: grey badge **Closed** shown next to the status badge on `web/src/pages/team-page.tsx` milestone rows and on `web/src/pages/milestone-page.tsx`.
- **Closed state (student)**: alert `"This milestone is closed."` and no submission, edit, or resubmit form. If an F-06 revision request was open when closed, closed wins: the revision alert and resubmit form are hidden.
- **Closed state (supervisor)**: **Edit milestone**, **Close milestone**, and F-06 **Request revision** / waiting blocks are hidden; feedback (F-05) and grading (F-08) controls remain available.
- Dates are displayed in Asia/Bangkok time using `formatBangkokDateTime` (`web/src/lib/api.ts`).

## Acceptance criteria

| ID | Acceptance criterion |
|---|---|
| AC-36 | Given an unclosed Alpha milestone, when Sup1 PATCHes title, description and a future `dueAt`, then 200 is returned, the values are stored, and S1's GET returns the new values (including `closedAt: null, closedBy: null`). |
| AC-37 | A PATCH with title of 2 or 121 characters (or `null`), description of 2001 characters, `dueAt` now, in the past, `null` or not a date, or an empty/non-object body returns 400 with field errors and the row is unchanged; titles of 3 and 120 characters and clearing description with `""` or `null` are accepted. |
| AC-38 | Sup1 closes the milestone: 200 with `closedAt` and `closedBy` Sup1; closing again returns 409 `MILESTONE_CLOSED`; two parallel closes return one 200 and one 409 with `closedById` set once; a PATCH on a closed milestone returns 409 `MILESTONE_CLOSED`. |
| AC-39 | On a closed milestone, student submit, edit and resubmit and supervisor revision request return 409 `MILESTONE_CLOSED` and change nothing; parallel close + submit never stores a submission created after `closedAt`; supervisor feedback still succeeds. |
| AC-40 | A student PATCH or close returns 403; Sup2 on an Alpha milestone gets 404; a malformed id gets 404; no session gets 401. |
| AC-41 | In the UI the supervisor edits and closes a milestone; the team page and milestone page show `"Closed"` and the student sees `"This milestone is closed."` with no submission or resubmit form. |
| AC-42 | A milestone whose due date has passed, extended by Sup1 to a future due date, accepts a student submission again; patching only `title` on a past-due milestone returns 200, keeps `dueAt` unchanged, keeps status `MISSED`, and student submit still returns 422 `DEADLINE_PASSED`. |

## STS (test design)

Fixtures: Sprint 1 seed (`docs/sprints/sprint-1/sts.md`); no new seed data. Levels as in Sprint 1. Past dates are set directly through Prisma in tests, never by waiting.

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-U06 | AC-37, AC-39 | Unit | fixed `now` | `validateMilestoneUpdate` with title 2/3/120/121/`null`, description 2000/2001/`""`/`null`, `dueAt` now/past/invalid/`null`/+1min, `{}`, non-object; `canChangeSubmission` with `closedAt` set and due past; `toBangkokDateTimeLocal` | field errors as listed; valid inputs pass (`""`/`null` → `description: null`); `MILESTONE_CLOSED` returned before `DEADLINE_PASSED`; UTC ISO formats to Bangkok `YYYY-MM-DDTHH:mm` |
| TEST-39 | AC-36 | API/DB | Alpha milestone +7d | Sup1 PATCH title, description, dueAt; S1 GET milestone and GET team milestones | 200; DB row updated; S1 sees new values with `closedAt: null, closedBy: null` |
| TEST-40 | AC-37 | API/DB | as TEST-39 | Sup1 PATCH each invalid body (title 2/121/`null`, desc 2001, `dueAt` `now - 1 s`/invalid/`null`, `{}`); then valid titles 3 and 120 chars and `description: ""` / `null` | 400 + fields, DB row deep-equal to before; 200 for valid 3/120 char titles and cleared description (`null` in DB) |
| TEST-41 | AC-38 | API/DB | unclosed Alpha milestones | Sup1 POST close; Sup1 POST close again; Sup1 PATCH; 2 parallel POST closes on a fresh milestone | 200 with `closedAt` and `closedBy`; 409 `MILESTONE_CLOSED`; 409 `MILESTONE_CLOSED`; parallel gives one 200 + one 409, `closedById` set once |
| TEST-42 | AC-39 | API/DB | milestones prepared before closing: (1) empty, (2) submission without feedback, (3) submission + feedback + open revision request; plus (4) fresh empty milestone for parallel close + submit | (1) S1 POST submission; (2) S1 PUT submission; (3) S2 POST versions & Sup1 POST revision-request & S1 GET milestone; (2) Sup1 POST feedback; (4) parallel Sup1 POST close + S1 POST submission | 409 `MILESTONE_CLOSED` ×4, row counts unchanged, GET on (3) shows `closedAt != null`; feedback returns 201; parallel (4) either returns 201 before `closedAt` or 409 (never a submission with `submittedAt > closedAt`) |
| TEST-43 | AC-40 | API | unclosed Alpha milestone | S1 PATCH, S1 close, Sup2 PATCH, Sup2 close, malformed id, no cookie | 403, 403, 404, 404, 404, 401; DB row unchanged |
| TEST-44 | AC-42 | API/DB | Alpha milestone `dueAt` set to past via Prisma | Sup1 PATCH `title` only → S1 POST (422) → Sup1 PATCH `dueAt` to +7d → S1 POST | 200 (`dueAt` unchanged, status `MISSED`), 422 `DEADLINE_PASSED`, 200, 201 |
| TEST-E2E-04 | AC-41 | E2E | seed | Sup1 edits title + due date, closes milestone via inline confirm; S1 opens team page + milestone page | `"Closed"` badge on team and milestone pages, student sees `"This milestone is closed."` and no form, new title shown |

Coverage: AC-36..AC-42 each have at least one test; every test row points to an AC in this range.

## Layers with no change

Auth (`routes/auth.ts`, `auth-service.ts`), session config, teams listing and detail (`GET /api/teams`, `GET /api/teams/:teamId`), milestone creation (`POST /api/teams/:teamId/milestones`), feedback rules, seed data (no new fixtures).

## Definition of Done (F-07)

Product DoD (`docs/sprints/sprint-1/dod.md`) applies. F-07 extra: every student write path (and supervisor milestone edit / revision request) locks the milestone row and checks `closedAt` on the **server** (not only hidden in UI).
