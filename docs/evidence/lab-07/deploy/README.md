# Lab 7 #85: release and post-deploy checks for CR-01 (BR-06 v2)

## 1. Release

CR-01 shipped inside Sprint 2 release **v0.2.0** (#74). Full record: [../../release-v0.2.0/notes.md](../../release-v0.2.0/notes.md).

| Item | Value |
|---|---|
| Lab 7 commits (separate from Sprint 2) | #82 PR #90 `df81ecc`, #83 PR #91 `492957a`, #84 PR #93 `69598c8` (red `081f8a6`, green `668a349`) |
| Release PR | #96 `staging → main`, merge commit `4b4b7e058a70ca0c8b25d8b8c4b9ea0a519232e1` |
| Tag | `v0.2.0` → `4b4b7e0` |
| CI run (`test-and-docker`) | [45671569032](https://github.com/KanPhacharawat/softwareengineering-project/actions/runs/45671569032) |
| Deploy run ("Deploy demo") | [45676139537](https://github.com/KanPhacharawat/softwareengineering-project/actions/runs/45676139537) |
| Image | `cpms:4b4b7e058a70ca0c8b25d8b8c4b9ea0a519232e1`, digest `sha256:6fc6cd1e…0f5dd9` |
| Migration | `cpms-migrate-hqjd4` succeeded; includes `20261125120000_submission_late_at` |
| Cloud SQL backup before release | `1795628796635` (`cpms-pg`) |
| Cloud Run revision | `cpms-00007-7sf`, 100 % traffic |

## 2. Post-deploy checks on https://cpms-wpsgfzameq-as.a.run.app (synthetic data)

| ID | Check | Expected | Actual | Time (Bangkok) | Revision | Evidence |
|---|---|---|---|---|---|---|
| L7-DEP-01 | Student submits after `dueAt`, inside grace ("L7 grace check 2026-11-26", due 13:19) | 201, `lateAt` set, Late badge for student, teammate, supervisor | s1 submitted via the form at 13:21: `SUBMITTED`, `lateAt` 06:21:17Z, `editableUntil` = due + 24 h; Late badge for s1, s2 and sup1 (milestone page and team list) | 2026-11-26 13:21–13:24 | `cpms-00007-7sf` | [s1](L7-DEP-01a-student-late-badge.jpg), [sup1 list](L7-DEP-01b-supervisor-team-list-late.jpg), [sup1 page](L7-DEP-01c-supervisor-milestone-late.jpg), [s2](L7-DEP-06-teammate-late-locked.jpg), [api](api-output.txt) |
| L7-DEP-02 | No submission, `dueAt` passed, inside grace | `OPEN`, grace message | s1 at 13:21 (2 min after due): `OPEN`, `submission: null`, "Due date passed. Late submissions accepted until 27 Nov 2026, 13:19 (Bangkok time)." | 2026-11-26 13:21 | `cpms-00007-7sf` | [jpg](L7-DEP-02-open-grace-message.jpg), [api](api-output.txt) |
| L7-DEP-03 | Grace ended ("UAT-Alpha-02 Boundary Sandbox", no submission, due 22 Nov 14:00, grace ended 23 Nov 14:00) | POST 422 `DEADLINE_PASSED`, status `MISSED` | s1: status `MISSED`, POST → `[422, "DEADLINE_PASSED"]`, submission still `null` | 2026-11-26 13:12 | `cpms-00007-7sf` | [jpg](L7-DEP-03-missed-after-grace.jpg), [api](api-output.txt) |
| L7-DEP-04 | Existing Sprint 1 submission ("UAT-Alpha-05", submitted 17 Nov) | `lateAt = null`, no Late badge | `lateAt: null`, version 1, `FEEDBACK_GIVEN`, no Late badge | 2026-11-26 13:12 | `cpms-00007-7sf` | [jpg](L7-DEP-04-sprint1-not-late.jpg), [api](api-output.txt) |
| L7-DEP-05 | Other-team student opens the milestone | 404, no data | s3 (Beta): GET → 404 `NOT_FOUND`, PUT → 404; page shows "Not found or you do not have access" | 2026-11-26 13:25 | `cpms-00007-7sf` | [jpg](L7-DEP-05-other-team-404.jpg), [api](api-output.txt) |
| L7-DEP-06 | Edit after feedback inside grace | 409 `SUBMISSION_LOCKED` | sup1 feedback at 13:22; s2 PUT at 13:24 → `[409, "SUBMISSION_LOCKED"]`, title and `lateAt` unchanged | 2026-11-26 13:24 | `cpms-00007-7sf` | [jpg](L7-DEP-06-teammate-late-locked.jpg), [api](api-output.txt) |
| L7-DEP-07 | `deploy/smoke_test.py` | health + ready OK | PASS `/api/health`, `/api/ready`, `/` (login skipped: no smoke credentials) | 2026-11-26 01:36 | `cpms-00007-7sf` | [L7-DEP-07-smoke.txt](L7-DEP-07-smoke.txt) |

Version table: [../../../labs/lab-07/versions.md](../../../labs/lab-07/versions.md).

Result: **7 of 7 checks passed** on revision `cpms-00007-7sf`. All data is synthetic (seed users, example.com/github.com/example links).
API output is from the browser console of the logged-in user (session cookie); the password was typed by the user, never stored.
