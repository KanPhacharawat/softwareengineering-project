// F-09 Team progress board (contract docs/sprints/sprint-3/F-09-progress-board.md). Pure functions, no I/O.
// The column is always the milestone's computeMilestoneStatus() result: the board never re-implements the status rule.
import type { MilestoneStatus } from './milestone.js';

export const BOARD_COLUMNS = ['OPEN', 'SUBMITTED', 'REVISION_REQUESTED', 'FEEDBACK_GIVEN', 'MISSED'] as const satisfies readonly MilestoneStatus[];

export type BoardCard = {
  id: string;
  title: string;
  dueAt: string;
  status: MilestoneStatus;
  closedAt: string | null;
  lateAt: string | null;
  versionNumber: number | null;
  score: number | null;
};

export type ProgressSummary = {
  total: number;
  byStatus: Record<MilestoneStatus, number>;
  closed: number;
  graded: number;
  averageScore: number | null;
};

export type ProgressBoard = {
  summary: ProgressSummary;
  columns: { status: MilestoneStatus; cards: BoardCard[] }[];
};

// FR-19 summary; F-10 reuses it per team.
export function summarizeProgress(cards: BoardCard[]): ProgressSummary {
  const byStatus = Object.fromEntries(BOARD_COLUMNS.map((s) => [s, 0])) as Record<MilestoneStatus, number>;
  for (const c of cards) byStatus[c.status]++;
  const scores = cards.flatMap((c) => (c.score === null ? [] : [c.score]));
  return {
    total: cards.length,
    byStatus,
    closed: cards.filter((c) => c.closedAt !== null).length,
    graded: scores.length,
    // Half-up to 1 decimal (80.25 -> 80.3).
    averageScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
  };
}

export function buildProgressBoard(cards: BoardCard[]): ProgressBoard {
  const sorted = [...cards].sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.title.localeCompare(b.title));
  return {
    summary: summarizeProgress(cards),
    columns: BOARD_COLUMNS.map((status) => ({ status, cards: sorted.filter((c) => c.status === status) })),
  };
}
