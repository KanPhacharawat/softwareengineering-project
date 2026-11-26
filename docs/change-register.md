# Change and defect register

Version 1.0, 2026-11-29 (S2-09 #75, D2 Part A). One row per change or finding received since release v0.1.0.
Sources: Lab 5 deployment guide ([labs/lab-05/deployment.md](labs/lab-05/deployment.md)), Lab 6 triage issues
#45, #54, #55, #61 and their PRs, the S2-07 regression ([evidence/sprint-2/regression.txt](evidence/sprint-2/regression.txt)),
Lab 7 CR-01 ([labs/lab-07/change-request.md](labs/lab-07/change-request.md)) and release v0.2.0
([evidence/release-v0.2.0/notes.md](evidence/release-v0.2.0/notes.md)).

Status words: **Closed** = decision carried out and re-tested; **Open** = still to do. Releases: `v0.1.0` = Sprint 1
(`3da07d0`); `v0.1.0 + Lab 5` = `main` `a11fdc0` (PR #40, revision `cpms-00006-xfg`, the version PMELS tested in
Lab 6); `v0.2.0` = `main` `4b4b7e0` (revision `cpms-00007-7sf`).

| ID | Source | Affected requirement / feature | Decision | Status | Fix / change release | Re-test outcome |
|---|---|---|---|---|---|---|
| CH-01 | Lab 5 (cloud readiness, #24) | R-01, NFR-05, NFR-08 | Change: one container. Express serves `web/dist`; the separate web origin (`WEB_ORIGIN`, CORS) is removed (`fb6ca15`) | Closed | v0.1.0 + Lab 5 (`a11fdc0`) | Lab 5 deploy and smoke `/` PASS; same-origin cookie login works in Lab 6 UAT and in v0.2.0 checks r06..r13 |
| CH-02 | Lab 5 | R-01, NFR-05 | Change: `GET /api/ready` checks PostgreSQL (200 / 503), used as startup probe and smoke check | Closed | v0.1.0 + Lab 5 (`a11fdc0`) | Smoke `/api/ready` PASS on every deploy, last on `cpms-00007-7sf` (deploy run 45676139537) |
| CH-03 | Lab 5 | R-01, NFR-08 | Change: seed upserts the demo accounts and keeps app data; password from `SEED_PASSWORD` (Secret Manager), refused in production if unset or the default | Closed | v0.1.0 + Lab 5 (`a11fdc0`) | Migrate job re-ran the seed on v0.2.0 (`cpms-migrate-hqjd4`); Sprint 1 data kept (r05a/r05b) |
| CH-04 | Lab 5/6 (operations) | R-01 | Disclosed: a Cloud Console redeploy created revision `cpms-00006-xfg` with the same image digest as `cpms-00005-78z` (no code change). Not repeated; v0.2.0 was deployed only by the workflow | Closed | none (no code) | Same digest confirmed; v0.2.0 revision `cpms-00007-7sf` comes from deploy run 45676139537 |
| UF-01 | Lab 6 UAT (PMELS, report 17 Nov 2026, tested `a11fdc0`) | F-01, FR-03, AC-01 | Not-defect: header shows name and role as specified; email comes from `GET /api/auth/me`. UAT-06 expected text corrected (#54) | Closed | docs only, PR #57 | Case text re-read against the app; no code re-test needed |
| UF-02 | Lab 6 UAT (PMELS) | F-04, AC-16 | Not-defect: card says "Last updated by NAME at TIME" as specified. UAT-05 text corrected (#54) | Closed | docs only, PR #57 | as UF-01 |
| UF-03 | Lab 6 UAT (PMELS) | F-04 AC-16; F-06 FR-13 | Not-defect for Sprint 1 (AC-16 says the editor replaces `submittedBy`); UAT-05/03 text corrected (#54). Logged as enhancement #55: keep the original submitter (`createdBy`) = F-06 part 1, AC-23 | Closed | text: PR #57; enhancement: PR #58 (`cf07680`), released in v0.2.0 | TEST-26 pass on `c066576` (API). Not re-tested by PMELS (enhancement, not a UAT case) |
| UF-EX-01 | Lab 6 controlled defect exercise (#46, PMELS on `cpms-lab6`) | F-05, BR-07, AC-18 | Accepted defect, **Critical**: a teammate (not the stored submitter) could edit after feedback, injected by PR #60 on `lab6-exercise`. Fix (#61): lock for every team student (domain, service re-check, UI) | Closed | `lab6-exercise` only: RED `54fbee9`, GREEN `61e59c3`, PR #62 `05c6fb5`, revision `cpms-lab6-00004-c2m`. Production never had the defect; TEST-27 ported to `staging` (#72, PR #65 `45af544`) and is in v0.2.0 | PMELS retest round 2 PASS, 21 Nov 2026 (direct PUT as s2 -> 409). TEST-27 pass on `c066576` |
| D2-01 | S2-07 regression (#73) | all Sprint 1 and 2 | No defect found: 132 tests + 24 E2E passed, 0 failed, 0 skipped; Sprint 1 specs unchanged | Closed | none | n/a |
| D2-02 | Review of release PR #95 (James) | release docs (v0.2.0 notes) | Doc finding: rollback note incomplete (v0.1.0 also cannot create submissions after migration 5, `createdById` NOT NULL; its edits skip `SubmissionVersion`) and a wrong Tests row. Fixed after merge to keep the approval | Closed | `77dec80` via PR #97 | Re-read in PR #97 review (merged 26 Nov 2026) |
| L7-01 | Lab 7 CR-01 (#82, approved PR #90) | BR-06 v2, F-03, F-04; FR-06..FR-09; AC-49..AC-52 (AC-13 superseded) | Change: 24 h late grace window for version 1, `Submission.lateAt` stored once, `MISSED` after grace | Closed | #84 / PR #93 (`69598c8`), released in v0.2.0 | TEST-U08, TEST-52..TEST-56, TEST-E2E-08 pass on `c066576`; live L7-DEP-01..07 PASS on `cpms-00007-7sf` (PR #98) |

Open items: none. New findings from Lab 7 readiness (#87) or Sprint 3 get the next ID (`L7-02`, `D3-01`, ...).
