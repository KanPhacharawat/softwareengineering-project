// F-09 Team progress board (contract docs/sprints/sprint-3/F-09-progress-board.md). TDD red stub: types only.
import type { MilestoneStatus } from './milestone.js';

export const BOARD_COLUMNS: readonly MilestoneStatus[] = [];

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

export function summarizeProgress(_cards: BoardCard[]): ProgressSummary {
  throw new Error('not implemented');
}

export function buildProgressBoard(_cards: BoardCard[]): ProgressBoard {
  throw new Error('not implemented');
}
