import { prisma } from '../db.js';
import { CURRENT_VERSION, currentState } from './submission-service.js';
import { computeMilestoneStatus } from '../domain/milestone.js';
import { buildSupervisorReport, type SupervisorSummaryReport } from '../domain/report.js';

// F-10 (FR-18, BR-02): read-only summary across teams assigned to the authenticated supervisor.
export async function getSupervisorSummaryReport(
  supervisorId: string,
  now: Date = new Date(),
): Promise<SupervisorSummaryReport> {
  const teams = await prisma.team.findMany({
    where: { supervisorId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      milestones: {
        include: {
          submission: { select: { lateAt: true, versions: CURRENT_VERSION, grade: { select: { score: true } } } },
        },
      },
    },
  });

  return buildSupervisorReport(
    teams.map((team) => ({
      id: team.id,
      name: team.name,
      cards: team.milestones.map((m) => {
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
    })),
  );
}
