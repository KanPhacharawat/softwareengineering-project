import { prisma } from '../db.js';
import { CURRENT_VERSION, currentState } from './submission-service.js';
import { computeMilestoneStatus } from '../domain/milestone.js';
import { buildProgressBoard, type BoardCard, type ProgressBoard } from '../domain/board.js';

// Shared milestone include + BoardCard mapper reused by F-09 (board) and F-10 (supervisor report).
export const BOARD_MILESTONE_INCLUDE = {
  submission: { select: { lateAt: true, versions: CURRENT_VERSION, grade: { select: { score: true } } } },
} as const;

type BoardMilestoneRow = {
  id: string;
  title: string;
  dueAt: Date;
  closedAt: Date | null;
  submission: (Parameters<typeof currentState>[0] & { lateAt: Date | null; grade: { score: number } | null }) | null;
};

export function toBoardCard(m: BoardMilestoneRow, now: Date): BoardCard {
  const state = m.submission && currentState(m.submission, now);
  return {
    id: m.id,
    title: m.title,
    dueAt: m.dueAt.toISOString(),
    status: computeMilestoneStatus(m, state, now),
    closedAt: m.closedAt?.toISOString() ?? null,
    lateAt: m.submission?.lateAt?.toISOString() ?? null,
    versionNumber: state?.versionNumber ?? null,
    score: m.submission?.grade?.score ?? null,
  };
}

// F-09 (FR-17, FR-19): read-only board of one team's milestones. Team scope is checked by the teams router.
export async function getTeamBoard(teamId: string, now: Date = new Date()): Promise<ProgressBoard> {
  const milestones = await prisma.milestone.findMany({
    where: { teamId },
    include: BOARD_MILESTONE_INCLUDE,
  });

  return buildProgressBoard(milestones.map((m) => toBoardCard(m, now)));
}
