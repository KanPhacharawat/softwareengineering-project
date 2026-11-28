# F-11 NFR-07 screen inventory, re-checked after S3-03 (#108), 2026-11-28

Re-check of the inventory in `docs/sprints/sprint-3/F-11-hardening.md` against the code on `feature/108-hardening`.
Bold = changed in #108.

| Screen | Loading (`aria-busy="true"`) | Empty | Error | Field errors (`aria-describedby`) | Try again (status 0 / 5xx only) | E2E state check |
|---|---|---|---|---|---|---|
| Login `/login` | button disabled + spinner | n/a | form alert | email, password (already linked) | n/a (form) | `auth.spec.ts`; TEST-68 |
| Home `/` | `TeamCardsSkeleton` "Loading teams" | "No teams assigned to you yet" / "You are not in a team yet" | `ErrorState` | n/a | **added** | **TEST-67** |
| Team `/teams/:id` | `TeamPageSkeleton` "Loading team"; **`MilestonesSkeleton` "Loading milestones" (aria-busy added)** | "No members yet", "No milestones yet" | `ErrorState` (team and milestones GET) | **milestone create: title, description, dueAt linked** | **added** (both GETs) | **TEST-67, TEST-68** |
| Milestone `/milestones/:id` | `MilestonePageSkeleton` "Loading milestone"; history "Loading history" | "No submission yet" | `ErrorState`; history "Could not load history" + Retry (F-06) | **edit milestone (title, description, dueAt), submission (title, link, description), feedback (comment), revision request (reason, dueAt), grade (score) linked** | **added** | **TEST-67, TEST-68**; history in TEST-E2E-03 |
| Board `/teams/:id/board` | `BoardSkeleton` "Loading board" | "No milestones yet." | `ErrorState` | n/a | **added** | TEST-E2E-09; **TEST-67, TEST-70** |
| Report `/reports` | `ReportSkeleton` "Loading report" | "No assigned teams yet." | `ErrorState` (403 for students: no Try again) | n/a | **added** | TEST-E2E-10; **TEST-67** |

404 (not found / no access) and 403 keep their message and show no Try again (TEST-70, 404 case).
No gaps left from the contract list.
