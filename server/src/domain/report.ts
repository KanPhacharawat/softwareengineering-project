// F-10 Supervisor summary report (contract docs/sprints/sprint-3/F-10-supervisor-report.md).
// TDD red stub: types match the contract; functions throw until implementation.
import type { BoardCard } from './board.js';

export type TeamReportRow = {
  teamId: string;
  teamName: string;
  milestonesTotal: number;
  submitted: number;
  late: number;
  missing: number;
  feedbackPending: number;
  revisionRequested: number;
  closed: number;
  graded: number;
  averageScore: number | null;
};

export type OverallReportSummary = {
  teamCount: number;
  milestonesTotal: number;
  submitted: number;
  late: number;
  missing: number;
  feedbackPending: number;
  revisionRequested: number;
  closed: number;
  graded: number;
  averageScore: number | null;
};

export type SupervisorSummaryReport = {
  overall: OverallReportSummary;
  teams: TeamReportRow[];
};

export function buildTeamReportRow(_team: { id: string; name: string }, _cards: BoardCard[]): TeamReportRow {
  throw new Error('Not implemented');
}

export function buildSupervisorReport(
  _teamsWithCards: { id: string; name: string; cards: BoardCard[] }[],
): SupervisorSummaryReport {
  throw new Error('Not implemented');
}
