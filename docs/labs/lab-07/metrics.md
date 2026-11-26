# Lab 7 Objective Engineering Metrics and Interpretation (#86)

Scope: repository `KanPhacharawat/softwareengineering-project` and deployed Cloud Run service `cpms` (`https://cpms-wpsgfzameq-as.a.run.app`) only.
Observation window: **2026-11-11 00:00 to 2026-11-26 20:15 Asia/Bangkok** (post-`v0.1.0` through the `v0.2.0` release and Lab 7 evidence PRs).
Snapshot time: **2026-11-26 20:15 Asia/Bangkok** (`staging` `73f846a`, `main` `4b4b7e0` / tag `v0.2.0`, Cloud Run revision `cpms-00007-7sf`).

## 1. Summary of five metrics

| ID | Metric | Definition | Scope | Window / snapshot (Asia/Bangkok) | Value | Source / Evidence ID |
|---|---|---|---|---|---|---|
| **M-01** | Completed issues | GitHub issues closed with `stateReason = COMPLETED` (distinguishing `NOT_PLANNED` / duplicates) | This repo | 2026-11-11 to 2026-11-26 20:15 | **36 completed** (0 not planned / duplicate; 4 Lab 7 issues open at snapshot) | GitHub Issues (`gh issue list --state all`), embedded table §2.1 |
| **M-02** | Merged PRs | Pull requests merged into any repository branch in the window, grouped by target branch | This repo | 2026-11-11 to 2026-11-26 20:15 | **36 merged** (`staging`: 29, `main`: 4, `lab6-exercise`: 3) | GitHub PRs (`gh pr list --state merged`), embedded table §2.2 |
| **M-03** | Automated test results | Passed / failed / skipped counts for the full automated test suite (Vitest + Supertest server suite and Playwright E2E suite) on one identified post-release snapshot commit | `cpms` (`server` + `web`) | Snapshot `staging` `9e28431` (identical app code to `v0.2.0` `4b4b7e0`), 2026-11-26 13:31 | **Server: 132 passed / 0 failed / 0 skipped** (15 files, 132/132 = 100%); **E2E: 24 passed / 0 failed / 0 skipped** (24/24 = 100%) | [readiness-tests.txt](../../evidence/lab-07/readiness-tests.txt), CI run `45671569032`, embedded summary §2.3 |
| **M-04** | UAT defect status | UAT findings received since `v0.1.0` (Lab 6 UAT + Sprint 2 / Lab 7 post-deploy), classified by triage outcome; **resolved** = fix merged, re-tested, and issue closed | `cpms` | Snapshot 2026-11-26 20:15 | **0 open defects**; 1 accepted controlled defect resolved (`#61` / `UF-EX-01`, 1/1 = 100%); 3 non-defect/enhancement UAT items closed (`#54`, `#55`) | GitHub issues `#45`, `#54`, `#55`, `#61`; [change-register.md](../../change-register.md), embedded table §2.4 |
| **M-05** | CI & deploy run outcomes | Completed GitHub Actions runs for `ci-docker.yml` (`CI & Docker Build`) and `deploy.yml` (`Deploy demo`) in the window, excluding Dependabot | This repo (`ci-docker.yml`, `deploy.yml`) | 2026-11-11 to 2026-11-26 20:15 | **66 runs total**: **62 success** (62/66 = 93.9%), **2 failure** (2/66 = 3.0%), **2 cancelled** (2/66 = 3.0%) — `CI & Docker Build`: 57/61 success, 2 fail, 2 cancel; `Deploy demo`: 5/5 success (100%) | GitHub Actions (`gh run list`), embedded table §2.5 |

---

## 2. Underlying source evidence (for direct reconciliation)

### 2.1 M-01 — Completed issues (`2026-11-11` to `2026-11-26`, Asia/Bangkok)

Command: `gh issue list --state all --limit 200 --json number,title,state,stateReason,closedAt`

| # | Closed (Bangkok) | Reason | Title |
|---|---|---|---|
| #22 | 2026-11-12 | COMPLETED | Lab 5 setup: workflow, staging branch, board and repo safety |
| #23 | 2026-11-13 | COMPLETED | Lab 5 #1 GCP account, project and budget alert (Ep. 1) |
| #24 | 2026-11-13 | COMPLETED | Lab 5 #2 Make the app cloud-ready (Ep. 2) |
| #25 | 2026-11-13 | COMPLETED | Lab 5 #3 Containerize the app with Docker (Ep. 3) |
| #26 | 2026-11-13 | COMPLETED | Lab 5 #4 CI on Pull Requests (Ep. 4) |
| #27 | 2026-11-15 | COMPLETED | Lab 5 #5 First deploy to GCP (Ep. 5) |
| #28 | 2026-11-15 | COMPLETED | Lab 5 #6 Connect GitHub to GCP and set the merge gate (Ep. 6) |
| #29 | 2026-11-15 | COMPLETED | Lab 5 #7 Deploy workflow and first pipeline release (Ep. 7) |
| #30 | 2026-11-15 | COMPLETED | Lab 5 #8 Check persistence after restart and redeploy (Ep. 8) |
| #31 | 2026-11-19 | COMPLETED | Lab 5 #9 Finish deployment.md and the PDF evidence index |
| #41 | 2026-11-21 | COMPLETED | Lab 6 Tracking: Sprint 1 UAT (due Sun 22 Nov 23:59) |
| #42 | 2026-11-17 | COMPLETED | [Lab6][A] Write Sprint 1 UAT cases UAT-01..06 |
| #43 | 2026-11-19 | COMPLETED | Lab 6 Part A Handoff package for partner team |
| #44 | 2026-11-19 | COMPLETED | Lab 6 Part B Execute partner's UAT cases and record evidence |
| #45 | 2026-11-19 | COMPLETED | Lab 6 Part C Triage all received findings |
| #46 | 2026-11-21 | COMPLETED | Lab 6 Part D Controlled defect exercise |
| #47 | 2026-11-21 | COMPLETED | Lab 6 Part D Partner retest and final Sprint 1 decision |
| #48 | 2026-11-21 | COMPLETED | Lab 6 Compile and submit PDF |
| #54 | 2026-11-19 | COMPLETED | Lab 6 Part C UF-01/UF-02/UF-03: correct UAT-05 and UAT-06 expected text (not-defect) |
| #55 | 2026-11-19 | COMPLETED | F-06 Keep original submitter and editor history on submission edits (UF-03 enhancement) |
| #61 | 2026-11-21 | COMPLETED | [UAT-EX-01] Teammate can edit a submission after feedback (UI and API) |
| #63 | 2026-11-22 | COMPLETED | S2-C1 F-06 contract v0.2: revision request, resubmission and history |
| #64 | 2026-11-23 | COMPLETED | S2-C2 F-07 contract: milestone edit and close |
| #66 | 2026-11-23 | COMPLETED | S2-C3 F-08 contract: grading |
| #67 | 2026-11-24 | COMPLETED | S2-01 F-06a Revision request |
| #68 | 2026-11-24 | COMPLETED | S2-02 F-06b Resubmission as a new version |
| #69 | 2026-11-24 | COMPLETED | S2-03 F-06c Revision history view |
| #70 | 2026-11-25 | COMPLETED | S2-04 F-07 Milestone edit and close |
| #71 | 2026-11-25 | COMPLETED | S2-05 F-08 Grading |
| #72 | 2026-11-25 | COMPLETED | S2-06 Port TEST-27 (teammate lock after feedback) to staging |
| #73 | 2026-11-26 | COMPLETED | S2-07 Sprint 2 cross-feature regression and E2E journeys |
| #74 | 2026-11-26 | COMPLETED | S2-08 Release Sprint 2 v0.2.0 to main and GCP |
| #75 | 2026-11-26 | COMPLETED | S2-09 Sprint 2 docs: SRS, features, SDS, traceability v2, change/defect register |
| #82 | 2026-11-25 | COMPLETED | L7-01 Change request: 24-hour late submission grace window (BR-06) + team approval |
| #83 | 2026-11-26 | COMPLETED | L7-02 Impact analysis and revised contract for the late grace window (SRS, SDS, AC, STS) |
| #84 | 2026-11-25 | COMPLETED | L7-03 Implement the late grace window with TDD red/green and Sprint 1 regression |

Reconciliation: **36** closed issues in window = **36** `COMPLETED` + **0** `NOT_PLANNED`/duplicate. (Historical note: `#1`, `#2`, `#3` were closed `NOT_PLANNED` on `2026-11-05` before Sprint 1 and are outside this window; `#85`, `#86`, `#87`, `#88` remain `OPEN` at snapshot time, although `#85` and `#87` already have merged PRs `#98` and `#99` into `staging`.)

---

### 2.2 M-02 — Merged PRs (`2026-11-11` to `2026-11-26`, Asia/Bangkok)

Command: `gh pr list --state merged --limit 200 --json number,title,baseRefName,mergedAt`

| PR | Merged (Bangkok) | Target | Title |
|---|---|---|---|
| #32 | 2026-11-13 | `staging` | Lab 5 #2: make the app cloud-ready |
| #33 | 2026-11-13 | `staging` | build: containerize the app with Docker (Lab 5 Ep. 3) |
| #34 | 2026-11-13 | `staging` | ci: PR checks (test-and-docker) + deploy scripts (#26) |
| #35 | 2026-11-13 | `main` | release: Lab 5 Ep. 2–4 (cloud-ready, Docker, CI) staging → main |
| #37 | 2026-11-15 | `staging` | Add Deploy demo workflow (Ep. 7) |
| #38 | 2026-11-15 | `main` | Release: Deploy demo workflow (Ep. 7) |
| #39 | 2026-11-15 | `staging` | Show deploy note on login page (deploy proof) |
| #40 | 2026-11-15 | `main` | Release: deploy proof (Ep. 7.7) |
| #50 | 2026-11-16 | `staging` | docs: add UAT defect issue template for Lab 6 |
| #51 | 2026-11-17 | `staging` | docs(uat): add executable UAT test cases UAT-01..06 (#42) |
| #53 | 2026-11-17 | `staging` | docs(lab5): finish deployment.md (#31) |
| #56 | 2026-11-19 | `staging` | docs(uat): partner handoff package and coordination sessions (#43) |
| #57 | 2026-11-19 | `staging` | docs(uat): align UAT-03/05/06 expected text with Sprint 1 spec (#54) |
| #58 | 2026-11-19 | `staging` | F-06 part 1: keep original submitter on edits (#55) |
| #59 | 2026-11-20 | `lab6-exercise` | ci(lab6): isolated Deploy lab6 workflow for cpms-lab6 (#46) |
| #60 | 2026-11-20 | `lab6-exercise` | test(lab6): inject controlled F-05 regression for TA exercise (#46) |
| #62 | 2026-11-20 | `lab6-exercise` | fix(submission): feedback lock applies to every team student (UF-EX-01, #61) |
| #76 | 2026-11-22 | `staging` | docs(F-06): contract v0.2 parts 2-4 (revision request, resubmission, history) |
| #77 | 2026-11-23 | `staging` | docs(F-07): milestone edit/close contract v0.1 (#64) |
| #78 | 2026-11-23 | `staging` | docs(F-08): grading contract v0.1 (#66) |
| #65 | 2026-11-23 | `staging` | test(submission): port TEST-27 teammate feedback lock to staging (#61) |
| #79 | 2026-11-24 | `staging` | F-06a: revision request (#67) |
| #80 | 2026-11-24 | `staging` | F-06b: resubmission as new version (#68) |
| #81 | 2026-11-24 | `staging` | F-06c: revision history (#69) |
| #90 | 2026-11-25 | `staging` | Lab 7 CR-01: change request for 24-hour late submission grace window (BR-06 v2) |
| #89 | 2026-11-25 | `staging` | F-07: milestone edit and close (#70) |
| #91 | 2026-11-25 | `staging` | Lab 7 CR-01: impact analysis and revised contract for the BR-06 grace window |
| #93 | 2026-11-25 | `staging` | feat(lab7): 24-hour late submission grace window (BR-06 v2) #84 |
| #92 | 2026-11-25 | `staging` | F-08: grading (#71) |
| #94 | 2026-11-26 | `staging` | test(S2-07): Sprint 2 cross-feature regression and E2E journeys |
| #95 | 2026-11-26 | `staging` | chore(release): prepare v0.2.0 (version bump, notes, migration rehearsal) |
| #96 | 2026-11-26 | `main` | Release v0.2.0 (Sprint 2) |
| #97 | 2026-11-26 | `staging` | docs(release): v0.2.0 post-deploy evidence and final notes (S2-08) |
| #98 | 2026-11-26 | `staging` | docs(lab7): release record, version table and live deploy checks for CR-01 #85 |
| #99 | 2026-11-26 | `staging` | docs(lab7): release readiness checklist, technical debt and retrospective #87 |
| #100 | 2026-11-26 | `staging` | docs: Sprint 2 baseline docs (SRS 1.2, features 1.1, SDS 1.2, traceability 2.0, completion, change register) #75 |

Reconciliation: **29** (`staging`) + **4** (`main`) + **3** (`lab6-exercise`) = **36 merged PRs**. Note: **12 of 36** (33.3%) merged on `2026-11-25`–`2026-11-26` (PRs `#89`–`#100`, including the `v0.2.0` release `#96`).

---

### 2.3 M-03 — Automated test results (snapshot on `v0.2.0` release code)

Tested commit: `staging` `9e28431` (identical application code to `main` `4b4b7e0` / tag `v0.2.0`, plus post-deploy doc PR `#97`), run on **2026-11-26 13:31:32 Asia/Bangkok**.
Tool versions: Node `v22.23.5`, Vitest `4.0.18`, Playwright `1.63.0` (Chromium, 1 worker), PostgreSQL `16.15`.
Source file: [docs/evidence/lab-07/readiness-tests.txt](../../evidence/lab-07/readiness-tests.txt) (corroborated by release PR `#96` CI run `45671569032` on `ebb177c`).

```text
$ npm test                  # server (Vitest + Supertest)
 Test Files  15 passed (15)
      Tests  132 passed (132)   # 0 failed, 0 skipped (132/132 = 100%)

$ npm run typecheck         # pass (exit 0)
$ npm run build             # pass (exit 0)

$ npm run test:e2e          # web (Playwright chromium, 1 worker)
  24 passed (1.2m)              # 0 failed, 0 skipped (24/24 = 100%)
```

*(Note: `ci-docker.yml` executes `npm test`, `typecheck`, `build`, and `docker build`, but does **not** run `npm run test:e2e`; the 24 Playwright tests were executed locally before release and re-verified on `9e28431`.)*

---

### 2.4 M-04 — UAT defect status (snapshot `2026-11-26 20:15` Asia/Bangkok)

Definition of **resolved**: fix or contract correction merged via reviewed PR, re-tested (automated test and/or partner re-test), and the tracking GitHub issue closed.

| Finding / Issue | Source | Classification | Status at snapshot | Resolution & re-test evidence |
|---|---|---|---|---|
| `UF-01`, `UF-02`, `UF-03` (`#54`) | Lab 6 UAT (PMELS, 2026-11-17 on `a11fdc0`) | Not-defect (UAT doc wording mismatch) | Closed (`2026-11-19`) | PR `#57` aligned UAT-03/05/06 expected text with Sprint 1 spec |
| `UF-03` enhancement (`#55`) | Lab 6 UAT (PMELS, 2026-11-17) | Enhancement (F-06 part 1, `createdBy`) | Closed (`2026-11-19`) | PR `#58` (`cf07680`), shipped in `v0.2.0`; verified by `TEST-26` |
| `UF-EX-01` (`#61`) | Lab 6 controlled defect exercise (`#46`, on `lab6-exercise`) | Accepted defect (**Critical**) | **Resolved & Closed** (`2026-11-21`) | Fixed in PR `#62` (`05c6fb5`), PMELS re-test round 2 PASS (2026-11-21); `TEST-27` ported to `staging` in PR `#65` (`#72`) and passes in `v0.2.0` |
| Sprint 2 / Lab 7 post-deploy (`#73`, `#74`, `#85`) | S2-07 regression + live checks `r01`–`r14`, `L7-DEP-01`–`07` | 0 defects opened | **0 open** | All 132 server + 24 E2E + 20 live checks passed; 0 GitHub issues labeled `bug` |

Reconciliation: **1** accepted UAT defect opened (`#61`) → **1** resolved (**1/1 = 100%**); **0** open defects at snapshot; **2** non-defect/enhancement follow-up issues (`#54`, `#55`) closed (**2/2 = 100%**).

---

### 2.5 M-05 — CI & deploy run outcomes (`2026-11-11` to `2026-11-26`, Asia/Bangkok)

Command: `gh run list --limit 200 --json databaseId,workflowName,headBranch,conclusion,createdAt`
Scope: `ci-docker.yml` (`CI & Docker Build`) and `deploy.yml` (`Deploy demo`). Excluded: 1 `Dependabot Updates` run (`43411710091`).

| Workflow | Success | Failure | Cancelled | Total | Success rate |
|---|---:|---:|---:|---:|---:|
| `CI & Docker Build` (`ci-docker.yml`) | 57 | 2 | 2 | 61 | 93.4% (`57 / 61`) |
| `Deploy demo` (`deploy.yml`) | 5 | 0 | 0 | 5 | 100.0% (`5 / 5`) |
| **Total** | **62** | **2** | **2** | **66** | **93.9% (`62 / 66`)** |

Non-success runs (4 of 66) and Deploy runs (5 of 66):

| Run ID | Created (Bangkok) | Workflow | Branch | Outcome | Cause |
|---|---|---|---|---|---|
| `43711500043` | 2026-11-15 18:58 | CI & Docker Build | `test/prove-gate` | `failure` | Deliberate broken test to prove Lab 5 merge gate |
| `44764013086` | 2026-11-20 22:30 | CI & Docker Build | `fix/UAT-EX-01-feedback-lock-teammate` | `failure` | Expected TDD red commit before green run `44764264030` |
| `45186088535` | 2026-11-23 20:39 | CI & Docker Build | `claude/project-thread-12ixns` | `cancelled` | Superseded by immediate follow-up push (`45186320842`) |
| `45583283195` | 2026-11-25 16:12 | CI & Docker Build | `docs/82-lab7-change-request` | `cancelled` | Superseded by immediate follow-up push (`45583303223`) |
| `43714413857` | 2026-11-15 19:33 | Deploy demo | `main` | `success` | Lab 5 Ep. 7 first pipeline deploy (`cd48e2e`) |
| `43715758117` | 2026-11-15 19:49 | Deploy demo | `main` | `success` | Lab 5 Ep. 7.7 deploy proof (`a11fdc0`) |
| `43719428740` | 2026-11-15 20:31 | Deploy demo | `main` | `success` | Lab 5 manual rollback drill (`workflow_dispatch`) |
| `43719708355` | 2026-11-15 20:34 | Deploy demo | `main` | `success` | Lab 5 restore latest image (`workflow_dispatch`) |
| `45676139537` | 2026-11-26 01:32 | Deploy demo | `main` | `success` | Sprint 2 + Lab 7 `v0.2.0` deploy (`4b4b7e0`, `cpms-00007-7sf`) |

All 57 successful `CI & Docker Build` run IDs (chronological):
`43397390405`, `43410535360`, `43712386984`, `43714012531`, `43714625760`, `43715592309`, `43825118599`, `43825277169`, `43850681213`, `43936003229`, `44032404831`, `44107367227`, `44540844976`, `44541074056`, `44542892611`, `44542928204`, `44545683827`, `44549661324`, `44706608915`, `44707015428`, `44712479950`, `44764264030`, `44919611800`, `44925125961`, `44930174283`, `45045180570`, `45048041496`, `45050303808`, `45147616558`, `45186320842`, `45228845018`, `45235208688`, `45239507592`, `45248245255`, `45348609939`, `45569857453`, `45579667274`, `45583303223`, `45584772550`, `45585196637`, `45586565585`, `45603404940`, `45613332211`, `45613940001`, `45615332623`, `45642383143`, `45648124117`, `45657112182`, `45657520944`, `45667955791`, `45671569032`, `45758092714`, `45768115755`, `45769143267`, `45769774900`, `45770209008`, `45807154644`.

---

## 3. Interpretation (≤ 100 words)

All 132 server tests and 24 E2E tests pass (M-03), 0 UAT defects remain open (M-04), and 62/66 CI and deploy runs succeeded (M-05). However, M-02, M-03, and M-05 expose a delivery risk: 12 of 36 PRs (33.3%) merged within 48 hours around `v0.2.0`, while `ci-docker.yml` runs only server tests—leaving all 24 Playwright E2E checks manual—and `deploy.yml` skips authenticated smoke login. **Action:** before Sprint 3 freeze (6 Dec 2026), James will configure `SMOKE_EMAIL`/`SMOKE_PASSWORD` in `deploy.yml` and add a Playwright E2E job to `ci-docker.yml` so UI regressions cannot reach `main`.
