import { prisma } from '../db.js';
import { BOARD_MILESTONE_INCLUDE, toBoardCard } from './board-service.js';
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
      milestones: { include: BOARD_MILESTONE_INCLUDE },
    },
  });

  return buildSupervisorReport(
    teams.map((team) => ({
      id: team.id,
      name: team.name,
      cards: team.milestones.map((m) => toBoardCard(m, now)),
    })),
  );
}
