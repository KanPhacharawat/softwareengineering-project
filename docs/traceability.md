# Requirements Traceability Matrix

Version 1.4, 2026-11-07 (F-04 rows marked Implemented). Version 1.3, 2026-11-06 (F-03 rows marked Implemented). Version 1.2, 2026-11-06 (F-02 rows updated). Version 1.1, 2026-11-06 (F-01 rows marked Implemented). Version 1.0, 2026-11-05. Requirement to feature to sprint to verification.
Sprint 1 AC and TEST IDs are defined in [sprints/sprint-1/](sprints/sprint-1/). Later sprints have feature and
sprint allocation now; their AC/tests are elaborated in their own contracts.

| Requirement | Feature / responsibility | Sprint | Acceptance criteria | Tests | Status |
|---|---|---|---|---|---|
| FR-01 | F-01 | 1 | AC-01, AC-02 | TEST-01, TEST-02, TEST-03 | Implemented (F-01, tests pass) |
| FR-02 | F-01 | 1 | AC-04, AC-22 | TEST-05, TEST-E2E-02 | Implemented (F-01, tests pass) |
| FR-03 | F-01 | 1 | AC-01 | TEST-01 | Implemented (F-01, tests pass) |
| FR-04 | F-02 | 1 | AC-10 | TEST-11, TEST-12 | Implemented (F-02, tests pass) |
| FR-05 | F-03 | 1 | AC-06, AC-07 | TEST-07, TEST-08, TEST-U01 | Implemented (F-03, tests pass) |
| FR-06 | F-03 | 1 | AC-06, AC-10 | TEST-07, TEST-11, TEST-12 | Implemented (F-03, tests pass) |
| FR-07 | F-04 | 1 | AC-11, AC-12 | TEST-13, TEST-14, TEST-15 | Implemented (F-04, tests pass) |
| FR-08 | F-04 | 1 | AC-16 | TEST-19 | Implemented (F-04, tests pass) |
| FR-09 | F-04, F-05 | 1 | AC-11, AC-17 | TEST-13, TEST-21 | Implemented (F-04 submitter edit, F-05 submission locked after feedback, tests pass) |
| FR-10 | F-05 | 1 | AC-17 | TEST-21 | Implemented (F-05, tests pass) |
| FR-11 | F-06 | 2 | Sprint 2 contract | Sprint 2 | Allocated |
| FR-12 | F-06 | 2 | Sprint 2 contract | Sprint 2 | Allocated |
| FR-13 | F-06 | 2 | Sprint 2 contract | Sprint 2 | Allocated |
| FR-14 | F-07 | 2 | Sprint 2 contract | Sprint 2 | Allocated |
| FR-15 | F-08 | 2 | Sprint 2 contract | Sprint 2 | Allocated |
| FR-16 | F-08 | 2 | Sprint 2 contract | Sprint 2 | Allocated |
| FR-17 | F-09 | 3 | Sprint 3 contract | Sprint 3 | Allocated |
| FR-18 | F-10 | 3 | Sprint 3 contract | Sprint 3 | Allocated |
| FR-19 | F-09 | 3 | Sprint 3 contract | Sprint 3 | Allocated |
| BR-01 | F-02 | 1 | AC-10, AC-15 | TEST-11, TEST-12, TEST-18 | F-02 check implemented; applied to milestones/submissions/feedback in F-03..F-05 |
| BR-02 | F-02, F-03, F-05 | 1 | AC-08, AC-19 | TEST-09, TEST-23 | F-02 check implemented; applied to milestones/submissions/feedback in F-03..F-05 |
| BR-03 | F-02, F-03, F-04, F-05 | 1 | AC-09, AC-19 | TEST-10, TEST-20, TEST-22 | F-02 check implemented; applied to milestones/submissions/feedback in F-03..F-05 |
| BR-04 | F-03 | 1 | AC-07 | TEST-08, TEST-U01 | Implemented (F-03, tests pass) |
| BR-05 | F-04 | 1 | AC-12 | TEST-14, TEST-15 | Implemented (F-04, tests pass) |
| BR-06 | F-04 | 1 | AC-13 | TEST-16, TEST-U02 | Implemented (F-04, tests pass) |
| BR-07 | F-05 | 1 | AC-18 | TEST-24, TEST-U02 | Implemented (F-05, tests pass) |
| BR-08 | F-05 | 1 | AC-20 | TEST-25 | Implemented (F-05, tests pass) |
| BR-09 | F-04 | 1 | AC-14 | TEST-17, TEST-U03 | Implemented (F-04, tests pass) |
| BR-10 | F-06 | 2 | Sprint 2 contract | Sprint 2 | Allocated |
| BR-11 | F-06 | 2 | Sprint 2 contract | Sprint 2 | Allocated |
| BR-12 | F-08 | 2 | Sprint 2 contract | Sprint 2 | Allocated |
| BR-13 | F-07 | 2 | Sprint 2 contract | Sprint 2 | Allocated |
| NFR-01 | F-01 | 1 | AC-05 | TEST-06 | Implemented (F-01, tests pass) |
| NFR-02 | F-01, F-02 | 1 | AC-03 | TEST-04 | F-01 part implemented (401 on all /api routes); F-02 adds routes |
| NFR-03 | F-02 | 1 | AC-08, AC-09, AC-15, AC-19 | TEST-09, TEST-10, TEST-18, TEST-20, TEST-22, TEST-23 | F-02 requireRole (403) + loadTeamInScope (404) implemented; used by F-03..F-05 |
| NFR-04 | F-01 | 1 | AC-04 | TEST-05 | Implemented (F-01, tests pass) |
| NFR-05 | F-00, R-01 | 1 (local), 2 (deployed restart, Lab 5) | AC-11 | TEST-13 (persistence); Lab 5 restart check | Planned |
| NFR-06 | F-11 | 3 | Sprint 3 contract | Load test, Sprint 3 | Allocated |
| NFR-07 | F-11 (core screens in F-03 to F-05) | 1 (core), 3 (all) | AC-21, AC-22 | TEST-E2E-01, TEST-E2E-02 | Planned |
| NFR-08 | F-00, R-01 | 1 | Review checklist in DoD | Secret scan (manual check MC-01) | Planned |
| NFR-09 | F-04 | 1 | AC-12 | TEST-15 | Implemented (F-04, tests pass) |

## Coverage gaps

None at baseline: every FR, BR and NFR is allocated to a feature or system responsibility and a sprint.
NFR-06 cannot be verified before deployment (Lab 5) and is verified in Sprint 3.
NFR-08 is verified by a manual check in Sprint 1 and becomes an automated CI check in Lab 5.

## Approved changes

| Date | Change | Affected IDs |
|---|---|---|
| 2026-11-05 | Baseline created | all |
| 2026-11-07 | F-04 Team submission implemented | FR-07, FR-08, FR-09, BR-05, BR-06, BR-09, NFR-09 |
| 2026-11-09 | F-05 Supervisor feedback implemented (migration 20261109145639_feedback adds Feedback table) | FR-09, FR-10, BR-07, BR-08 |
