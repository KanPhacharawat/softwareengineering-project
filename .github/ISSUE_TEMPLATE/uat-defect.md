---
name: UAT defect
about: Defect found or received during Lab 6 Sprint 1 UAT
title: "[UAT-xx] <short summary>"
labels: defect, lab6, uat
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

## Severity and user impact
- [ ] Critical  - [ ] Major  - [ ] Minor
Reason (by user impact):

## Evidence
<!-- evidence IDs / screenshots / log excerpts -->

## Triage (Product Team fills in)
- Classification: accepted defect / duplicate (of #) / not-defect / enhancement
- Reason tied to BR/AC:
- Owner:
- Fix status:
- Disposition:

## Fix chain (accepted defects)
- [ ] Branch `fix/UAT-xx-...` from `staging`
- [ ] RED test commit (test name, command, failing output)
- [ ] GREEN fix commit (same test passing + full regression)
- [ ] PR to staging reviewed by teammate, CI passing
- [ ] Release PR to main, deploy.yml run ID, deployed revision
- [ ] Smoke check done
- [ ] Partner retest: tester, version, result, date
