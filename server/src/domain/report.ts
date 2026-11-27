// F-10 Supervisor summary report (contract docs/sprints/sprint-3/F-10-supervisor-report.md). Pure functions, no I/O.
// Reuses BoardCard and summarizeProgress() from F-09 so status counts and rounding have one source of truth.
import { summarizeProgress, type BoardCard } from './board.js';

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

function summarizeMetrics(cards: BoardCard[]) {
  const summary = summarizeProgress(cards);
  return {
    milestonesTotal: summary.total,
    submitted: cards.filter((c) => c.versionNumber !== null).length,
    late: cards.filter((c) => c.lateAt !== null).length,
    missing: summary.byStatus.MISSED,
    feedbackPending: summary.byStatus.SUBMITTED,
    revisionRequested: summary.byStatus.REVISION_REQUESTED,
    closed: summary.closed,
    graded: summary.graded,
    averageScore: summary.averageScore,
  };
}

export function buildTeamReportRow(team: { id: string; name: string }, cards: BoardCard[]): TeamReportRow {
  return {
    teamId: team.id,
    teamName: team.name,
    ...summarizeMetrics(cards),
  };
}

export function buildSupervisorReport(
  teamsWithCards: { id: string; name: string; cards: BoardCard[] }[],
): SupervisorSummaryReport {
  const sorted = [...teamsWithCards].sort((a, b) => a.name.localeCompare(b.name));
  const teams = sorted.map((t) => buildTeamReportRow({ id: t.id, name: t.name }, t.cards));
  const allCards = sorted.flatMap((t) => t.cards);
  return {
    overall: {
      teamCount: teams.length,
      ...summarizeMetrics(allCards),
    },
    teams,
  };
}
