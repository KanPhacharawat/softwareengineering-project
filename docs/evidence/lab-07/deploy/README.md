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
| L7-DEP-01 | Student submits after `dueAt`, inside grace | 201, `lateAt` set, Late badge for student, teammate, supervisor | _pending_ | | `cpms-00007-7sf` | |
| L7-DEP-02 | No submission, `dueAt` passed, inside grace | `OPEN`, grace message | _pending_ | | `cpms-00007-7sf` | |
| L7-DEP-03 | Grace ended | POST 422 `DEADLINE_PASSED`, status `MISSED` | _pending_ | | `cpms-00007-7sf` | |
| L7-DEP-04 | Existing Sprint 1 submission | `lateAt = null`, no Late badge | _pending_ | | `cpms-00007-7sf` | |
| L7-DEP-05 | Other-team student opens the milestone | 404, no data | _pending_ | | `cpms-00007-7sf` | |
| L7-DEP-06 | Edit after feedback inside grace | 409 `SUBMISSION_LOCKED` | _pending_ | | `cpms-00007-7sf` | |
| L7-DEP-07 | `deploy/smoke_test.py` | health + ready OK | PASS `/api/health`, `/api/ready`, `/` (login skipped: no smoke credentials) | 2026-11-26 01:36 | `cpms-00007-7sf` | [L7-DEP-07-smoke.txt](L7-DEP-07-smoke.txt) |

Version table: [../../../labs/lab-07/versions.md](../../../labs/lab-07/versions.md).
