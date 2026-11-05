# Three-Sprint Plan

Version 1.0, 2026-11-05. Feature IDs from [../features.md](../features.md).

| Sprint | Dates | Goal | Features | Dependencies | Completion outcome | Checkpoint |
|---|---|---|---|---|---|---|
| 1 | 5 to 8 Nov | Small working domain slice with authentication, permissions and persistence: a supervisor sets a milestone, the team submits, the supervisor gives feedback. | F-00, F-01, F-02, F-03, F-04, F-05 | F-00 first, then F-01; F-02 used by all; F-03 then F-04 then F-05 | Release `v0.1.0` on `main`: seeded users can complete the journey, deadline and lock rules reject bad requests, all Sprint 1 tests pass locally | Deliverable 1, 8 Nov |
| 2 | 9 to 29 Nov | Complete the core supervision loop: revisions with history, milestone management and grading; deployed via Lab 5 pipeline. | F-06, F-07, F-08, R-01 (deploy) | F-06 and F-08 need F-05; F-07 needs F-03; Lab 5 pipeline needs v0.1.0 | Deployed release candidate with full revision/grade flow, CI green, Lab 6 UAT defects triaged | Deliverable 2, 29 Nov |
| 3 | 22 Nov to 13 Dec | Remaining features, integration and hardening: progress board, supervisor report, performance and usability. | F-09, F-10, F-11 | F-09 and F-10 need F-06 to F-08 data | Final release with all features, regression suite, NFR-06 load test result | Progress at 29 Nov, complete 13 Dec |

## Sprint 1 scope explanation

Sprint 1 covers exactly the theme's Sprint 1 example: seeded teams and membership, a supervisor creates a
milestone for a supervised team, a student submits title/description/link and views it, the supervisor records
feedback. The chosen rule is the deadline rule (BR-06) plus the feedback lock (BR-07). Revision, grading and
milestone editing wait for Sprint 2 because they extend the same records and need the Sprint 1 rules first.
Docker, CI and GCP are designed now (SDS section 7) and built in Lab 5.

Work split (both students take part in spec, tests, code and review for each feature):

| Feature | Author | Reviewer |
|---|---|---|
| Docs baseline (A to E) | pair | pair |
| F-01, F-02 | Student A | Student B |
| F-03, F-04, F-05 | Student B | Student A |
