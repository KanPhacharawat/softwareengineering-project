---
name: UAT defect
about: Defect found or received during Lab 6 Sprint 1 UAT
title: "[UAT-xx] <short summary>"
labels: lab6, uat
---

## Issue ID / owner
- Issue ID: UAT-xx
- Product team (owner of the app):
- Reporter (name / team):
- Tested version (tag / commit / Cloud Run revision):

## Linked case / requirement
- UAT case ID:
- AC / BR reference:

## Preconditions and data
<!-- accounts by label only, synthetic data. NO passwords -->

## Steps to reproduce
1.
2.
3.

## Expected result (per Sprint 1 contract)

## Actual result
- Defect against specified behavior or feature request? (cite the AC/BR that fails):

## Severity and user impact
<!-- Critical: core flow unusable, or data/security rule broken (e.g. BR-01/BR-02 leak). Major: a Sprint 1 AC/BR fails but the user can still finish the task. Minor: cosmetic or wording, no AC broken. Critical and Major block acceptance. -->
- [ ] Critical
- [ ] Major
- [ ] Minor

Reason (by user impact):

## Evidence
<!-- E-xx | action | expected | actual | time (Asia/Bangkok) | version -->

## Triage (Product Team fills in)
- Classification: accepted defect / duplicate (of #) / not-defect / enhancement
- Reason tied to BR/AC:
- Owner:
- Fix status:
- Disposition: fix / accepted as known limitation (accepted by: ___, date: ___) / closed as duplicate / closed as not-defect / deferred enhancement

## Fix chain (accepted defects)
- [ ] Branch `fix/UAT-xx-...` from `staging`
- [ ] RED test commit (commit SHA, test name, command, failing output)
- [ ] GREEN fix commit (commit SHA, same test passing + full regression)
- [ ] PR to staging reviewed by teammate, CI passing
- [ ] Release PR to main, deploy.yml run ID, deployed revision
- [ ] Smoke check done
- [ ] Partner retest: tester, version/revision, actual result, evidence ID, date, re-run cases: ___
