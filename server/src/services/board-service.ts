import { prisma } from '../db.js';
import { CURRENT_VERSION, currentState } from './submission-service.js';
import { computeMilestoneStatus } from '../domain/milestone.js';
import { buildProgressBoard, type ProgressBoard } from '../domain/board.js';

// F-09 (FR-17, FR-19): read-only board of one team's milestones. Team scope is checked by the teams router.
export async function getTeamBoard(teamId: string, now: Date = new Date()): Promise<ProgressBoard> {
  const milestones = await prisma.milestone.findMany({
    where: { teamId },
    include: {
      submission: { select: { lateAt: true, versions: CURRENT_VERSION, grade: { select: { score: true } } } },
    },
  });

  return buildProgressBoard(
    milestones.map((m) => {
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
    }),
  );
}
