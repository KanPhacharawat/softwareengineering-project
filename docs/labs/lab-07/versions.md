# Lab 7 version table: CR-01 (BR-06 v2 late grace window)

Refs #85. Every row is a real commit on `staging` or `main`; check with `git log --oneline --first-parent origin/staging` and `origin/main`.

| # | Version | Ref | Date | What it is |
|---|---|---|---|---|
| 1 | Accepted Sprint 1 baseline | tag `v0.1.0` → `3da07d0` | 2026-11-10 | Old BR-06: no save at or after `dueAt` |
| 2 | Sprint 1 accepted in Lab 6 UAT | `main` `a11fdc0`, Cloud Run `cpms-00006-xfg` | 2026-11-15 | Production before this change |
| 3 | Change request approved | `staging` `df81ecc` (PR #90, #82) | 2026-11-25 | CR-01, team approval by review |
| 4 | Contract reviewed and merged | `staging` `492957a` (PR #91, #83) | 2026-11-25 | SRS/SDS/STS/traceability for BR-06 v2. Also the actual pre-change implementation: `npm test` 115/115 |
| 5 | TDD red | `081f8a6` (branch `feature/84-late-grace-window`) | 2026-11-25 | 8 new tests fail on assertions, 115 pass |
| 6 | TDD green | `668a349` (same branch) | 2026-11-25 | server 123/123, Playwright 21/21 |
| 7 | Change merged to `staging` | `69598c8` (PR #93, #84, reviewed by James) | 2026-11-25 | |
| 8 | Release to `main` | `4b4b7e0` (PR #96 `staging → main`), tag `v0.2.0` | 2026-11-26 | Ships CR-01 inside Sprint 2 release (#74) |
| 9 | Deployed | image `cpms:4b4b7e0…`, revision `cpms-00007-7sf`, migrate `cpms-migrate-hqjd4` | 2026-11-26 01:36 Bangkok | Deploy run 45676139537; migration `20261125120000_submission_late_at` applied |

## Merge commits

The project uses merge commits (no squash), so each PR shows as one first-parent commit and keeps its own commits
(red `081f8a6` and green `668a349` are visible as separate commits under `69598c8`). `main` gets one merge commit
per release (`4b4b7e0` has parents `a11fdc0` = old production and `ebb177c` = `staging` head).

## Unrelated Sprint 2 changes between the baseline and the release

These are in the same `v0.2.0` release but are not part of CR-01:

| Ref | Change |
|---|---|
| PR #65, #79, #80, #81 | F-06 revision request, resubmission, history (#55, #67, #68, #69) |
| `37d8913` PR #89 | F-07 milestone edit and close (#70); merged before the red commit, so the baseline already has it |
| `7bb4d03` PR #92 | F-08 grading (#71); merged after the green commit, merged with CR-01 without conflicts (131/131 on the merged result) |
| `c9b2d2b` PR #94 | Sprint 2 cross-feature regression (#73), includes CR-01 tests |
| `ebb177c` PR #95, `9e28431` PR #97 | v0.2.0 version bump, release notes, post-deploy evidence (#74) |
| PR #50, #51, #53, #56, #57 | Lab 6 docs |
