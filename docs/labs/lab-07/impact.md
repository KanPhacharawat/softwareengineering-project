# Lab 7 CR-01 Impact analysis: 24-hour late submission grace window (BR-06 v2)

| | |
|---|---|
| Change | CR-01, [change-request.md](change-request.md) (approved by the team in PR #90, 2026-11-25) |
| Issue | #83 (this analysis and the contract revision). Implementation follows in #84 |
| Written against | `staging` @ `df81ecc` (after #90). F-07 code (#70, branch `feature/70-milestone-edit-close`) is not merged yet; its contract is. Rows that name F-07 code describe it as specified in `F-07-milestone-management.md` v0.1 |

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Impact table, unchanged-behavior list and contract revision list, written before any CR-01 code |
| 1.1 | 2026-11-25 | PR #91 review: system SDS versioned 1.1; TEST-53 covers `lateAt` after an F-07 due-date extension |

## 1. Impact table

`D` = milestone `dueAt`. `G` = grace end = `D + 24 h`. "Changed" means the artifact is revised in this PR (docs) or in #84 (code/tests).

| Req ID | Feature | SRS / Feature SDS / System SDS section | AC | STS tests | Code module(s) | Impact |
|---|---|---|---|---|---|---|
| BR-06 | F-04 | SRS §5 BR-06; F-04 Behaviour step 2; System SDS §4 error table | AC-13 (superseded), **AC-49** | TEST-16 (revised), TEST-U02 (revised), **TEST-U08**, **TEST-52** | `server/src/domain/submission.ts` `canChangeSubmission`, `effectiveDueAt` | **Changed.** Version-1 deadline moves from `D` to `G`. |
| FR-07, FR-08 | F-04 | F-04 Behaviour 2–3, API table | AC-11, AC-16 (unchanged), **AC-50** | TEST-13, TEST-19 (unchanged), **TEST-53** | `server/src/services/submission-service.ts` create / update | **Changed.** A save with `now >= D` sets `Submission.lateAt` once, inside the existing transaction. |
| FR-06 | F-03 | F-03 Behaviour 3 (status list), API table | AC-06 (unchanged), **AC-51** | TEST-07 (unchanged), `milestones.test.ts` status unit test (revised), **TEST-U08**, **TEST-54** | `server/src/domain/milestone.ts` `computeMilestoneStatus`; `milestone-service.ts` responses | **Changed.** No submission → `OPEN` until `G`, `MISSED` from `G`. Milestone responses add `graceEndsAt`. |
| FR-09 | F-04, F-05 | F-04 UI, API GET | AC-11 | TEST-13 | `submission-service.ts` `SubmissionView`; `web/src/pages/milestone-page.tsx` | **Changed.** GET returns `lateAt`; `editableUntil` = `G` for version 1. UI shows `Late` badge, "Submitted late at <time> (Bangkok time)", and before a submission exists "Due date passed. Late submissions accepted until <time> (Bangkok time)." |
| FR-06 (UI) | F-03 | F-03 UI | **AC-50**, **AC-51** | **TEST-E2E-08** | `web/src/pages/team-page.tsx`, `web/src/lib/api.ts` types | **Changed.** Team milestone list shows a `Late` badge next to the status badge. List items carry `lateAt` (null when no submission). |
| BR-07, FR-10 | F-05 | F-05 contract | AC-17, AC-18 | TEST-21, TEST-24, TEST-27 | `feedback-service.ts` | **Unchanged.** Feedback may be recorded on a late submission and locks it, also inside the grace window (precedence: lock is checked after the deadline). New case covered by **TEST-55**. |
| BR-05, NFR-09 | F-04 | F-04 Behaviour 2 | AC-12 | TEST-14, TEST-15 | unique `Submission.milestoneId` | **Unchanged.** Parallel POSTs inside the grace window still store one row (TEST-15 runs before `D`; the unique constraint does not depend on time). |
| BR-09 | F-04 | F-04 validation | AC-14 | TEST-17, TEST-U03 | `validateSubmissionInput` | **Unchanged.** Validation runs before the deadline check. |
| BR-01..03, NFR-03 | F-02 | System SDS §5 | AC-09, AC-15, AC-19 | TEST-18, TEST-20, TEST-22, TEST-23 | `require-role`, team scope in services | **Unchanged.** Grace does not widen access: supervisor 403, other team 404. New in-grace cases in **TEST-55**. |
| FR-12, BR-11 | F-06 | F-06 contract (resubmission, `effectiveDueAt`) | AC-29, AC-30 | TEST-33, TEST-34, TEST-U05 | `effectiveDueAt`, `revision-service.ts` | **Unchanged rule, touched code.** Version >= 2 keeps the revision due date with no grace. `effectiveDueAt` gets the grace only for version 1. Note added to the F-06 contract. |
| FR-11 | F-06 | F-06 revision request | AC-24..27 | TEST-28..31 | `revision-service.ts` | **Unchanged.** A revision request needs feedback; it does not read the submit deadline. |
| FR-14, BR-13 | F-07 | F-07 contract | AC-36..42 | TEST-39..44, TEST-U06 | `canChangeSubmission` (`MILESTONE_CLOSED` first), `milestone-service.ts` | **Unchanged rule, one fixture revised.** Closed still wins inside the grace window (**TEST-55**). A due-date change does not touch a stored `lateAt` (decision 3). F-07 AC-42 / TEST-44 expect `MISSED` for a milestone "set to past": the fixture must be past `G`; the AC text gets a note. |
| FR-15, BR-12 | F-08 | F-08 contract | AC-43..48 | TEST-45..50 | none yet (F-08 code is #71) | **N/A.** No grade penalty for late work (out of scope in CR-01). Grading needs feedback, which is unaffected. |
| FR-17..19 | F-09, F-10 | Sprint 3 (not yet specified) | Sprint 3 | Sprint 3 | none yet | **Forward dependency.** The Sprint 3 supervisor report (FR-18, "late/missing") reads `lateAt` and `MISSED`. Noted in traceability. |
| NFR-05 | Persistence | System SDS §2 data model | **AC-52** | **TEST-56** | `server/prisma/schema.prisma`, new migration `<timestamp>_submission_late_at` | **Changed.** New nullable column `Submission.lateAt timestamptz(3)`. |
| NFR-07 | UI states | F-04 UI | AC-21 | TEST-E2E-01 | `milestone-page.tsx` | **Unchanged.** Loading/empty/error states unchanged; the new texts are extra lines. TEST-E2E-01 runs before `D`. |
| NFR-01, 02, 04, 06, 08 | Auth, session, config | System SDS §6, §7 | various | various | none | **N/A.** No auth, session, config or secret change. The 24 h value is a code constant, not an environment variable (CR-01 scope out: not configurable). |

### 1.1 Callers and dependencies

| Function / module | Callers | What #84 changes |
|---|---|---|
| `canChangeSubmission(milestone, submission, now)` | `submission-service.ts` create + update; `revision-service.ts` resubmission path (version >= 2) | Deadline uses `effectiveDueAt`, which returns `G` for version 1 and the revision due for version >= 2. Order stays `MILESTONE_CLOSED` → `DEADLINE_PASSED` → `SUBMISSION_LOCKED`. |
| `effectiveDueAt(milestone, submission)` | `canChangeSubmission`; `submission-service.ts` (`editableUntil`) | Version 1: `dueAt + 24 h`. Version >= 2: unchanged. |
| new `graceEndsAt(dueAt)` + constant `GRACE_PERIOD_MS` | domain + services | One place for the 24 h value (no copy in the web app; the web reads `graceEndsAt` / `editableUntil` from the API). |
| `computeMilestoneStatus(milestone, submission, now)` | `milestone-service.ts` (team list + milestone GET), `submission-service.ts` | No submission: `MISSED` only when `now >= G`. Other branches unchanged. |
| `submission-service.ts` create / update | routes `POST` / `PUT /api/milestones/:id/submission` | Inside the existing transaction and `FOR UPDATE` row lock: if `now >= D` and `lateAt IS NULL`, set `lateAt = now`. Never clear it. |
| `milestone-page.tsx` | browser | Uses `submission.editableUntil ?? milestone.graceEndsAt` (today it falls back to `milestone.dueAt`, which would hide the form inside the grace window). |

### 1.2 Persistence, historical data, migration

| Topic | Decision | Reason |
|---|---|---|
| Schema | `Submission.lateAt DateTime? @db.Timestamptz(3)` | Stored, not derived (CR-01 decision 3): a later F-07 due-date change must not change the record. |
| Migration | `ALTER TABLE "Submission" ADD COLUMN "lateAt" TIMESTAMPTZ(3);` nullable, no default, no backfill | Safe on the production `cpms-migrate` job (no lock-heavy rewrite, no NOT NULL step). |
| Existing rows | stay `NULL` | Under Sprint 1 BR-06 no save at or after `D` was possible, so every existing submission was on time. |
| `SubmissionVersion` | no column | Lateness is about version 1 against the milestone due date; versions >= 2 have no grace. |
| Concurrency | `lateAt` is written only when it is `NULL`, under the existing `FOR UPDATE` lock on the submission row | Two late PUTs at the same time set it once (first save wins). |
| Seed | unchanged | Seed creates no submissions. |

### 1.3 Roles and ownership

No role gains or loses a permission. Students of the team see `lateAt` of their own team only (BR-01); the assigned
supervisor sees it for assigned teams only (BR-02); everyone else gets 404 as today. The grace window applies only
to students' own submissions (supervisors still get 403 on POST/PUT).

## 2. Behavior that must stay unchanged, and the tests that protect it

| Unchanged behavior | Rule | Existing tests (must stay green, not edited) | New tests (#84) |
|---|---|---|---|
| Submit and edit before `D` work as before, `lateAt = null` | BR-06, FR-07, FR-08 | TEST-13, TEST-19, TEST-E2E-01 | TEST-U08 (`D - 1 ms`), TEST-52 |
| One submission per milestone, also under parallel requests | BR-05, NFR-09 | TEST-14, TEST-15 | TEST-55 (second POST in grace → 409 `SUBMISSION_EXISTS`) |
| Validation of title/description/link | BR-09 | TEST-17, TEST-U03 | |
| Feedback locks the submission | BR-07 | TEST-24, TEST-27, TEST-U02 (lock part) | TEST-55 (feedback in grace → PUT 409 `SUBMISSION_LOCKED`) |
| Supervisor cannot submit; other team gets 404 | BR-01, BR-03, NFR-03 | TEST-18, TEST-20 | TEST-55 (in grace) |
| Closed milestone rejects everything first | BR-13 (F-07) | F-07 closed tests (TEST-41/42) | TEST-55 (closed in grace → 409 `MILESTONE_CLOSED`) |
| Resubmission deadline = revision due, no grace | BR-11 (F-06) | TEST-34, TEST-U05 | TEST-U08 (v2 case) |
| Original submitter `createdById` is kept | #55 | TEST-26 | |
| Feedback/revision/grade flows | F-05, F-06, F-08 | all F-05..F-08 API tests | |
| Existing rows read unchanged | NFR-05 | | TEST-56 |
| A stored `lateAt` is not cleared or recomputed when F-07 extends `dueAt` | CR-01 decision 3 | | TEST-53 (extension step) |

Regression suite for #84: the whole server suite (`npm test`), `npm run typecheck`, `npm run build`, and all
Playwright specs. Only the expectations listed in section 3 change; each changed line gets the comment
`// Lab 7 BR-06 v2 (CR-01, #82)`.

## 3. Existing tests whose expected result legitimately changes

| File : line (staging @ df81ecc) | Today | After CR-01 | Kept |
|---|---|---|---|
| `server/tests/submissions.test.ts:49-56` "rejects with DEADLINE_PASSED when now >= dueAt" (TEST-U02) | `now == D` and `now > D` → `DEADLINE_PASSED` | the same assertions at `now == G` and `now > G`; `now == D` is now allowed | the deadline rejection itself |
| `server/tests/submissions.test.ts:212` TEST-16 | `dueAt` in the past → POST/PUT 422 | `dueAt` more than 24 h in the past → 422 | 422 + row unchanged |
| `server/tests/milestones.test.ts:87-90` status unit test | past `dueAt`, no submission → `MISSED` | `MISSED` at `now >= G`; `OPEN` inside the grace window | OPEN/SUBMITTED/FEEDBACK_GIVEN cases |
| `server/tests/resubmission.test.ts:52` (TEST-U05) | `pastMilestone` with v1 → `DEADLINE_PASSED` | `pastMilestone` past `G` | v2 lines unchanged |
| F-07 TEST-44 (`milestone-management.test.ts`, lands with #70) | Prisma sets `dueAt` to the past → `MISSED`, POST 422 | set `dueAt` more than 24 h in the past | the extend-then-submit flow |

## 4. Contract revisions in this PR (#83)

| Document | Version | Change |
|---|---|---|
| `docs/srs.md` | 1.0 → 1.1 | BR-06 text v2; decision D-10; version row |
| `docs/sprints/sprint-1/F-03-milestones.md` | 1.0 → 1.1 | status rule (`MISSED` after grace), `graceEndsAt` in API, Late badge in list UI, AC-51 |
| `docs/sprints/sprint-1/F-04-submission.md` | 1.0 → 1.1 | Behaviour step 2–3 (grace + `lateAt`), UI texts, API fields, data column, AC-13 superseded by AC-49, AC-50, AC-52 |
| `docs/sprints/sprint-1/sts.md` | 1.0 → 1.1 | Lab 7 section: TEST-U08, TEST-52..56, TEST-E2E-08; revised TEST-16 / TEST-U02 rows |
| `docs/sprints/sprint-2/F-06-revision-history.md` | 0.2 → 0.3 | note: version >= 2 has no grace; status rule refers to BR-06 v2 |
| `docs/sprints/sprint-2/F-07-milestone-management.md` | 0.1 → 0.2 | note: closed wins in grace; stored `lateAt` not recomputed on due change; AC-42/TEST-44 fixture past grace |
| `docs/system-sds.md` | 1.0 → 1.1 | `Submission.lateAt`; `DEADLINE_PASSED` meaning |
| `docs/traceability.md` | 1.6 → 1.7 | BR-06 → AC-49..52, TEST-U08, TEST-52..56, TEST-E2E-08; FR-18 forward note |

## 5. Old and new excerpts (for the Lab 7 report)

**SRS BR-06**
- Old (v1.0): "A submission can be created or edited only before the milestone due date/time, judged by server time."
- New (v1.1): "The first version of a submission can be created or edited until 24 hours after the milestone due date/time (exclusive), judged by server time. A save at or after the due date/time marks the submission late (`lateAt`, set once, never cleared). Resubmissions (BR-11) have no grace period."

**F-04 AC-13 → AC-49**
- Old AC-13: "Given the milestone due date has passed, POST and PUT return 422 `DEADLINE_PASSED` and the stored data is unchanged."
- New AC-49: see F-04 v1.1. Boundaries `D - 1 ms`, `D`, `G - 1 ms` accepted; `G` rejected with nothing stored.

**F-03 status**
- Old: "`MISSED` (no submission, past due)".
- New: "`MISSED` (no submission, at or after the grace end `dueAt + 24 h`); before that the milestone stays `OPEN`".
