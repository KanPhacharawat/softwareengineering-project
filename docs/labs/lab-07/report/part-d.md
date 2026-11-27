## D.1 Release readiness checklist, defects, debt and retrospective

Evidence **L7-D01** (checklist and decision), **D-1** to **D-6** (debt), **L7-D02** (test output, embedded in B.5).
Issue #87, PR #99 (author Kan, approved by James 26 Nov 15:10 Bangkok, merged 15:12). The retrospective wording was
agreed by both students. The readiness document is embedded in full.

Scope reminder: the READY decision covers the **maintained Sprint 1 functionality (F-01 to F-05) plus CR-01** in the
deployed release `v0.2.0` / revision `cpms-00007-7sf`. F-06 to F-08 run in the same release but are Sprint 2 work and are
not used as Sprint 1 maintenance evidence.

{{include docs/labs/lab-07/readiness.md}}

## D.2 Contribution table

| Work item | Phacharawat (Kan, Student A) | Chaiyaphoom (James, Student B) |
|---|---|---|
| #82 Change request CR-01 (Part A) | Wrote the request, answered the five design decisions | Reviewed (2 nits) and approved: team sign-off |
| #83 Impact analysis and contract revision (Part A) | Wrote impact table and SRS/SDS/STS revisions, fixed review points | Reviewed: requested changes (SDS version, TEST-53 step for decision 3), then approved |
| Prerequisite F-07 milestone edit/close (#70, PR #89) | Reviewed and merged | Implemented (Sprint 2 work the change builds on) |
| #84 TDD red/green, implementation, regression (Part B) | Wrote tests and implementation, ran regression | Reviewed full diff and evidence, approved, merged |
| #74 Release `v0.2.0` / PR #96 (Part B) | Prepared release, backup, created tag and GitHub Release | Release gate review, approved, merged (triggered deploy) |
| #85 Post-deploy checks and version table (Part B) | Ran L7-DEP-01..06 on the live site | Reviewed every SHA and check, approved, merged |
| #86 Metrics (Part C) | Reviewed (2 rounds), merged | Collected the five metrics and wrote the interpretation |
| #87 Readiness and retrospective (Part D) | Drafted checklist and debt table | Reviewed, accepted debt owner D-4, approved, merged |
| Retrospective answers | Pair | Pair |
| #88 This report | Compiled the PDF | Reviews the PDF before submission |

## D.3 AI-use declaration

Both students used AI coding assistants under their own direction:

| Student | Tool | Used for |
|---|---|---|
| Phacharawat (Kan) | **Claude Code** (Anthropic) | drafting the change request, impact analysis, contract revisions, readiness checklist and this report; writing the CR-01 tests and implementation; running the test suites and collecting evidence files; drafting review comments that Kan then edited and posted |
| Chaiyaphoom (James) | **Antigravity** (Google) | James's Lab 7 work: the metrics (#86) and his reviews of the Lab 7 pull requests |

- **Not delegated:** choosing the change and the five design decisions (Kan, 25 Nov), approving the contract and code
  (James's reviews in A.4 and B.6), merging, the production release, and typing passwords for the live checks.
- **Not delegated:** choosing the change and the five design decisions (Kan, 25 Nov), approving the contract and code
  (James's reviews in A.4 and B.6), merging, the production release, and typing passwords for the live checks.
- **How output was checked:** every AI-produced change went through a pull request with CI and a teammate review; tests
  were run on the recorded commits shown in Part B; the post-deploy checks were observed in the browser by a student.
- No real personal data, passwords, tokens or secrets were given to either assistant or included in this PDF. All data
  shown is synthetic (seed users `s1`, `s2`, `s3`, `sup1`; example links).

## D.4 Known limitations

1. **Approval.** Instructor/TA approval was not recorded per team because Prof. Suthep Madarasmi announced on 24 Nov 2026
   (course Facebook group) that it is not required; the approval record is the teammate review of PR #90.
2. **CI scope.** CI (`test-and-docker`) runs the server suite, typecheck, build and Docker build, but not the 24 Playwright
   E2E tests; those were run locally on the recorded commits (B.5). Action owned by James before 13 Dec (Part C).
3. **Smoke login skipped.** The pipeline smoke test does not log in because `SMOKE_EMAIL` / `SMOKE_PASSWORD` are not set
   (L7-DEP-07); the authenticated checks were done manually (L7-DEP-01..06).
4. **Clock in API tests.** The API has no injectable clock, so API/DB and E2E tests use due dates relative to real time
   (`now - 1 h`, `now - 25 h`); millisecond boundaries are covered only by the unit test TEST-U08.
5. **Partial UAT re-run.** Only the UAT steps touched by the deadline rule were re-run manually (UAT-02 Test 2.3, UAT-03
   edit and lock steps); the other UAT cases rely on the automated suite (D.1).
6. **Release contains Sprint 2 work.** The change shipped inside `v0.2.0` together with F-06 to F-08; B.9 lists the
   unrelated commits. The Lab 7 documents written after the release (#86, #87, this report) are on `staging` and reach
   `main` with the next release; they do not change application code.
7. **Debt.** D-1 (deadline comparison repeated in the UI) and D-2 (fixed 24 h constant) remain by decision (D.1).
