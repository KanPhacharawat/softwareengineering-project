## A.1 Approved change request CR-01

Evidence **L7-A01**. Issue #82, PR #90 (merged into `staging` as `df81ecc`, 25 Nov 2026 16:22 Bangkok, approved by James).

The change revises a business rule that Sprint 1 already implemented and accepted: **BR-06** (submission deadline) in
F-04, together with the F-03 milestone status that depends on it. Old rule: no save at or after the due time. New rule:
version 1 may still be saved for 24 hours after the due time and is then recorded as late.

**Revision note (kept as part of the change history).** The first draft of #82 (24 Nov 2026) proposed a smaller change,
"BR-09 link must be https only". It was replaced on 25 Nov 2026 by the grace window because the course requires the
change to be complex enough and to cover the Sprint 1 slice. Prof. Suthep Madarasmi announced in the course Facebook
group on 24 Nov 2026 that instructor/TA approval of the Lab 7 change is not required; approval is therefore recorded as a
team sign-off (James's approving review of PR #90, A.4).

The change request document is embedded in full below.

{{include docs/labs/lab-07/change-request.md}}

## A.2 Impact analysis

Evidence **L7-A02**. Issue #83, PR #91 (merged as `492957a`, 25 Nov 2026 19:26 Bangkok). Written before any CR-01 code;
the first implementation commit (`081f8a6`, tests only) is 5 minutes after this merge (sequence in A.5).

{{include docs/labs/lab-07/impact.md}}

## A.3 Revised contract: old and new text

Evidence **L7-A03**. The revised SRS, Feature SDS (F-03, F-04), System-Level SDS and STS sections are shown below as the
exact change made by PR #91: `git diff 37d8913 492957a` (staging before and after the merge of #91). Red lines are the
accepted Sprint 1 text (v1.0), green lines the reviewed v1.1 text. Each revised file carries a new version row.

| Document | Version | Assessed change |
|---|---|---|
| `docs/srs.md` | 1.0 → 1.1 | BR-06 v2 text, decision D-10 |
| `docs/sprints/sprint-1/F-03-milestones.md` | 1.0 → 1.1 | `MISSED` only after the grace end; `graceEndsAt`; `Late` badge in the list; **AC-51** |
| `docs/sprints/sprint-1/F-04-submission.md` | 1.0 → 1.1 | grace window, `lateAt`, UI texts, API fields; **AC-13 superseded by AC-49**; **AC-50**, **AC-52** |
| `docs/sprints/sprint-1/sts.md` | 1.0 → 1.1 | TEST-16 and TEST-U02 revised; new **TEST-U08**, **TEST-52..56**, **TEST-E2E-08** |
| `docs/system-sds.md` | 1.0 → 1.1 | `Submission.lateAt`; meaning of `DEADLINE_PASSED` |

{{diff 37d8913 492957a -- docs/srs.md docs/sprints/sprint-1/F-03-milestones.md docs/sprints/sprint-1/F-04-submission.md docs/sprints/sprint-1/sts.md docs/system-sds.md}}

The same PR also added notes to the Sprint 2 contracts that touch the rule (F-06 v0.3: version ≥ 2 has no grace;
F-07 v0.2: closed wins inside the grace window, a due-date change does not recompute `lateAt`) and BR-06 rows in
`docs/traceability.md` v1.7.

## A.4 Teammate review before implementation

Evidence **L7-A04**. Both contract PRs were reviewed by James (Chaiyaphoom, `maneejames`) before any code. Review text
copied from GitHub; times in Bangkok (UTC+7).

### PR #90 (change request), review 1: Approved, 25 Nov 2026 16:12, on `cc00c3d`

> Reviewed **CR-01** against the Lab 7 Part A requirements and verified the baseline references (`v0.1.0` / `3da07d0`,
> `main` / `a11fdc0`, `server/src/domain/submission.ts`, `server/src/domain/milestone.ts`, and `docs/traceability.md`).
>
> **Overall.** Approved for CR-01 scope and design: this is a well-bounded change to an existing Sprint 1 rule (`BR-06`),
> with clear boundaries, preserved rules, historical data handling, and reserved IDs (`AC-49..52`, `TEST-52..56`,
> `TEST-U08`, `TEST-E2E-08`).
>
> **Answers to your review questions.** (1) Grace boundary and precedence: `D + 24 h` (exclusive) is consistent with the
> existing `now >= dueAt` boundary, and the precedence order (`MILESTONE_CLOSED` → `DEADLINE_PASSED` →
> `SUBMISSION_LOCKED`) matches F-07. (2) Decision 3 (stored `lateAt`): Agreed, storing `lateAt` on the first late save
> rather than deriving it keeps the submission record accurate even if a supervisor later extends `dueAt` via F-07.
> (3) Keeping F-06 resubmissions (`version >= 2`) out of scope for the grace window is clean and avoids mixing Sprint 2
> revision rules with Sprint 1 `BR-06`. [...]
>
> **Two minor nits before merge.** (1) Version history: the five decisions are in Section 3.3, not Section 6.
> (2) Section 3.2: for Sprint 1, `computeMilestoneStatus` uses `now > dueAt`, so at exact `now === D` Sprint 1 returns
> `OPEN`. Please note `MISSED (OPEN at exact D)`.

### PR #90, review 2: Approved, 25 Nov 2026 16:21, on `379afe5`

> Verified the updates in `68fcb8f` and `379afe5`: version history now points to Section 3.3 and cleanly logs `0.3` in
> order; Section 3.2 now accurately reflects the Sprint 1 `now > dueAt` boundary (`OPEN` at exact `now = D`); status and
> Section 8 approval date (`2026-11-25`) are recorded, and CI (`test-and-docker`) is green on `379afe5`.
> LGTM, ready to merge into `staging` and proceed with #83.

### PR #91 (impact + contract), review 1: Changes requested, 25 Nov 2026 16:33, on `54a97d9`

> **What looks good.** Impact and callers: thorough coverage of requirements, callers, persistence/migration (`NULL`
> without backfill), concurrency (`FOR UPDATE`), N/A reasons, unchanged behaviors with protecting tests, and the 5
> legitimately revised existing test expectations. Catching the `milestone-page.tsx` fallback to `milestone.dueAt`
> upfront is a great call. AC-49..52 wording is clear. TEST-52..56 fixtures (`D = now - 1 h` / `now - 25 h`) are a good
> flake-free choice while keeping exact millisecond boundaries in `TEST-U08` with a fixed `now`. TEST-55 covers the
> in-grace guards.
>
> **Changes requested before merge.** (1) Version `docs/system-sds.md`: it still reads `Version 1.0`; bump it to 1.1 so
> all revised specifications are versioned consistently. (2) Cover CR-01 Decision 3 in STS: none of `TEST-52..56`
> asserts that a stored `lateAt` is not cleared or recomputed when a supervisor later extends `dueAt` via F-07. Please
> add one step where Sup1 extends `dueAt` on a late submission and `GET` verifies `lateAt` stays unchanged.
>
> **Optional nit.** F-03 Behaviour step 3: `OPEN (no submission, before due)` next to the new `MISSED` text reads
> slightly contradictory.

### PR #91, review 2: Approved, 25 Nov 2026 17:11, on `d82c85b`

> Verified all updates in `51c4cbc`: `docs/system-sds.md` is now versioned 1.1 and tracked as `1.0 -> 1.1` in
> `impact.md`; `TEST-53`, `AC-50` and `impact.md` v1.1 now explicitly cover CR-01 Decision 3 (`lateAt` stays unchanged
> after an F-07 `dueAt` extension); F-03 step 3 wording is clean; CI (`test-and-docker`) is green on `51c4cbc`.
> Approved, ready to merge into `staging` before starting #84.

## A.5 Recorded sequence: contract before code

Evidence **L7-A05**. From `git log --first-parent origin/staging`, `origin/main` and the GitHub PR records. Times in
Bangkok (UTC+7).

| # | When (Bangkok) | Event | Ref |
|---|---|---|---|
| 1 | 24 Nov | First draft of #82 (https-only), replaced next day | Issue #82 revision note |
| 2 | 25 Nov 16:12 / 16:21 | James approves the change request (2 reviews) | PR #90 |
| 3 | 25 Nov 16:22 | Change request merged | `df81ecc` |
| 4 | 25 Nov 16:33 | James requests changes on impact + contract | PR #91 |
| 5 | 25 Nov 17:11 | James approves the revised contract | PR #91 |
| 6 | 25 Nov 19:26 | Contract merged; this commit is also the actual pre-change implementation | `492957a` |
| 7 | 25 Nov 19:31 | TDD red: tests only, 8 fail on assertions | `081f8a6` |
| 8 | 25 Nov 19:35 | TDD green: implementation | `668a349` |
| 9 | 25 Nov 22:04 / 22:05 | James approves and merges the change into `staging` | PR #93, `69598c8` |
| 10 | 26 Nov 01:30 / 01:32 | James approves the release; merged to `main`, tag `v0.2.0` | PR #96, `4b4b7e0` |
| 11 | 26 Nov 01:36 | Deployed, revision `cpms-00007-7sf` | Deploy run 45676139537 |
| 12 | 26 Nov 13:12–13:25 | Post-deploy checks L7-DEP-01..06 (manual, live site) | B.8 |
