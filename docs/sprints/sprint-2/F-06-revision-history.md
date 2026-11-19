# F-06 Revision and history: feature contract

Version history

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-19 | Part 1 only: keep the original submitter (#55, from Lab 6 UAT finding UF-03). Revision request, resubmission and version history follow in later parts. |

Linked requirements: FR-13, BR-10 (history: who submitted what is kept unchanged). Depends on: F-04, F-05.

## Part 1: original submitter

Sprint 1 keeps one `submittedById`, which a teammate's edit replaces (AC-16), so the history lost who
submitted first. Part 1 adds the original submitter; AC-16 is unchanged.

- Data: `Submission.createdById -> User`, set on POST and never changed. Migration
  `20261119150000_submission_created_by` backfills existing rows from `submittedById` (the only author known).
- API: the submission object gains `createdBy: {id, name}`. `submittedBy` keeps meaning "last saved by".
- UI: the submission card reads "Submitted by NAME at TIME · Last updated by NAME at TIME".
- Per-edit history is not kept: edits before feedback stay in place. Each resubmitted version (later parts)
  will carry its own submitter.

| ID | Acceptance criterion |
|---|---|
| AC-23 | Given S1 submits and S2 edits before feedback, GET returns `createdBy` S1, `submittedBy` S2, and the original `submittedAt`. |

| Test | AC | Level | Setup | Steps | Expected |
|---|---|---|---|---|---|
| TEST-26 | AC-23 | API | Alpha milestone before due | S1 POST; S2 PUT; Sup1 GET | `createdBy` S1, `submittedBy` S2, `submittedAt` unchanged |
