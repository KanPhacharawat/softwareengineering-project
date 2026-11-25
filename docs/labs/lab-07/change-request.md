# Lab 7 Change Request CR-01: 24-hour late submission grace window (BR-06 v2)

| | |
|---|---|
| Change ID | CR-01 |
| Issue | #82 (change request), followed by #83 (impact + contract), #84 (implementation), #85 (release) |
| Requested by | Phacharawat Eakgawatphokhin (Kan), 67070503426 |
| Team approver | Chaiyaphoom Chenchirotphiphat (James), 67070503410, by review of the PR that adds this file |
| Status | Approved by the team (PR #90 review, 2026-11-25) |

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-24 | First draft in #82: BR-09 link must be https only. |
| 0.2 | 2026-11-25 | Replaced by the BR-06 late grace window (this document). The https-only change was judged too small for the Lab 7 criterion that the change must be complex enough and cover the Sprint 1 slice. Open questions 1 to 5 answered by Kan (section 3.3). |
| 0.3 | 2026-11-25 | Review fixes from PR #90 (section reference, exact-`D` status note) and team approval recorded. |
| 0.4 | 2026-11-25 | Section 7: actual pre-change baseline filled in by #84. |

## 1. Summary

Today a submission is rejected from the exact second the milestone is due. This change lets a team still submit or
edit the first version of its work for **24 hours after the due time**, and records that the work was **late**.
A milestone becomes `MISSED` only after that grace window ends.

## 2. Original requirement and implemented rule (accepted Sprint 1)

| Item | Sprint 1 (tag `v0.1.0`) |
|---|---|
| Requirements | FR-06 (milestone list with status), FR-07 (submit), FR-08 (edit), FR-09 (view) |
| Business rule | **BR-06**: "A submission can be created or edited only before the milestone due date/time, judged by server time." |
| Acceptance criterion | **AC-13**: "Given the milestone due date has passed, POST and PUT return 422 `DEADLINE_PASSED` and the stored data is unchanged." |
| Status rule (F-03) | `OPEN` = no submission, before due; `MISSED` = no submission, past due |
| Tests | TEST-16 (AC-13), unit test `rejects with DEADLINE_PASSED when now >= dueAt`, status unit test (`MISSED`) |
| Code | `server/src/domain/submission.ts` `canChangeSubmission`: `now >= dueAt` → `DEADLINE_PASSED`. `server/src/domain/milestone.ts` `computeMilestoneStatus`: no submission and `now > dueAt` → `MISSED`. |

## 3. Proposed new rule

**BR-06 v2:** The first version of a submission can be created or edited until **`dueAt + 24 hours` (exclusive)**,
judged by server time. A save at or after `dueAt` inside that window is accepted and marks the submission **late**:
`Submission.lateAt` is set to the server time of the first late save and is never cleared. A milestone with no
submission is `OPEN` until the grace window ends and `MISSED` after it.

### 3.1 Reason

The SRS problem statement says "late submissions are argued about afterwards". In Sprint 2 the only remedy is that
the supervisor moves the due date by hand (F-07), which hides that the work was late. A fixed, visible grace window
with a stored late time keeps the record honest and gives the Sprint 3 supervisor report (FR-18, "late/missing")
real data.

### 3.2 Boundaries (server time, milestone due `D`)

| Save time (version 1) | Sprint 1 result | New result |
|---|---|---|
| `D - 1 ms` | 201/200, on time | 201/200, on time, `lateAt = null` |
| `D` | 422 `DEADLINE_PASSED` | 201/200, `lateAt = D` |
| `D + 24 h - 1 ms` | 422 `DEADLINE_PASSED` | 201/200, late |
| `D + 24 h` | 422 `DEADLINE_PASSED` | 422 `DEADLINE_PASSED`, nothing stored |

| Milestone status, no submission | Sprint 1 | New |
|---|---|---|
| `now < D` | `OPEN` | `OPEN` |
| `D <= now < D + 24 h` | `MISSED` (`OPEN` at exactly `now = D`, because the code uses `now > dueAt`) | `OPEN`, UI shows the grace message |
| `now >= D + 24 h` | `MISSED` | `MISSED` |

### 3.3 Decisions (answered by Kan, 2026-11-25)

1. **Status in the grace window** stays `OPEN` (no new status value). The UI shows "Due date passed. Late submissions accepted until <time> (Bangkok time)."
2. **An on-time submission edited in the grace window becomes late.** `lateAt` is set on that save, because the content changed after the deadline.
3. **`lateAt` is stored, not derived.** If the supervisor later moves `dueAt` (F-07), `lateAt` and the Late badge stay. The record shows the truth at the time of saving; a derived value would change silently when `dueAt` changes.
4. **Feedback in the grace window is allowed as before.** Once feedback is recorded the submission is locked (BR-07), also inside the grace window.
5. **UI text (English only):** badge `Late` with "Submitted late at <time> (Bangkok time)" on the milestone page, and a `Late` badge on the team milestone list. Students of the team and the assigned supervisor see the same.

### 3.4 Rules that must not change

Checked in this order, as today:

1. `409 MILESTONE_CLOSED` (F-07, BR-13) wins over everything, also inside the grace window.
2. `422 DEADLINE_PASSED`, now judged at `D + 24 h` for version 1.
3. `409 SUBMISSION_LOCKED` after feedback (BR-07).

Also unchanged: one submission per milestone (BR-05), validation (BR-09), ownership and roles (BR-01 to BR-03:
supervisor 403, other team 404), original submitter `createdById`, and F-06 resubmissions (version 2 and later
keep the revision due date with **no** grace, BR-11).

## 4. Scope

| In scope | Out of scope |
|---|---|
| POST and PUT of submission version 1 | Grace for F-06 resubmissions (version >= 2) |
| Milestone status `OPEN` / `MISSED` | Grade penalty for late work (F-08 unchanged) |
| New nullable column `Submission.lateAt` + migration | Configurable grace length (fixed 24 h) |
| API fields `lateAt`, `graceEndsAt`, `editableUntil` | Changing or rewriting existing submissions |
| UI Late badge and grace message (student and supervisor) | New roles or permissions |
| SRS, Feature SDS, System SDS, STS, traceability, tests | |

## 5. Historical data

Existing submissions get `lateAt = NULL`. This is correct and needs no backfill: under the Sprint 1 rule no save
at or after `dueAt` was possible, so every stored submission was on time.

## 6. Acceptance criteria (draft; final text and tests in #83)

| ID | Criterion |
|---|---|
| AC-49 | Version-1 POST and PUT are accepted before `dueAt + 24 h` and rejected with 422 `DEADLINE_PASSED` at or after it; a rejected request stores nothing (boundaries in 3.2). Revises AC-13. |
| AC-50 | The first save at or after `dueAt` sets `lateAt` to server time; later saves keep it; saves before `dueAt` leave it `null`. GET returns `lateAt` to team members and the assigned supervisor, and the UI shows a `Late` badge. |
| AC-51 | With no submission, milestone status is `OPEN` until `dueAt + 24 h` and `MISSED` after it; milestone responses include `graceEndsAt`. |
| AC-52 | Preserved: closed milestone 409 `MILESTONE_CLOSED`, feedback lock 409 `SUBMISSION_LOCKED` (both inside the grace window), version >= 2 has no grace, supervisor 403, other team 404, existing rows keep `lateAt = null`. |

IDs reserved for Lab 7: AC-49..52, TEST-52..56, TEST-U08, TEST-E2E-08.

## 7. Baselines

| Version | Ref | Note |
|---|---|---|
| Accepted Sprint 1 baseline | tag `v0.1.0` → `3da07d0` | old BR-06 behavior |
| Sprint 1 accepted in Lab 6 UAT | `main` `a11fdc0`, Cloud Run revision `cpms-00006-xfg` | partner team PMELS accepted, no limitations |
| Actual pre-change implementation | `staging` `492957a` (after #70 F-07 and #91), right before the #84 red commit `081f8a6` | baseline `npm test` 115/115 passed |
| Intervening development | F-06 (#67, #68, #69), F-07 (#70) on `staging` | Sprint 2 work, not part of this change |

## 8. Approval

| Role | Name | Date | Record |
|---|---|---|---|
| Requester | Phacharawat Eakgawatphokhin (Kan) | 2026-11-25 | this document, #82 |
| Team approver | Chaiyaphoom Chenchirotphiphat (James) | 2026-11-25 | approved PR #90 review |
| Instructor / TA | not required | 2026-11-24 | Prof. Suthep Madarasmi announced in the course Facebook group on 24 November 2026 that instructor/TA approval of the Lab 7 change is not required, provided the change is complex enough and covers the Sprint 1 slice. |

No code for this change may be committed before this file is approved and merged into `staging`.
