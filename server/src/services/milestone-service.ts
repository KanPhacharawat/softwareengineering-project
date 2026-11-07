import { prisma } from '../db.js';
import { computeMilestoneStatus, type MilestoneStatus, type ValidatedMilestoneData } from '../domain/milestone.js';

export type MilestoneView = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  status: MilestoneStatus;
};

export type CreatedMilestoneView = {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  dueAt: string;
  createdById: string;
  createdAt: string;
  status: MilestoneStatus;
};

// FR-06: lists milestones of a team, sorted by due date ascending, with calculated status.
export async function listTeamMilestones(teamId: string, now: Date = new Date()): Promise<MilestoneView[]> {
  const milestones = await prisma.milestone.findMany({
    where: { teamId },
    orderBy: { dueAt: 'asc' },
  });

  return milestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    dueAt: m.dueAt.toISOString(),
    status: computeMilestoneStatus(m, null, now),
  }));
}

// FR-05: stores a new milestone for an assigned team.
export async function createMilestone(
  teamId: string,
  createdById: string,
  data: ValidatedMilestoneData,
  now: Date = new Date(),
): Promise<CreatedMilestoneView> {
  const milestone = await prisma.milestone.create({
    data: {
      teamId,
      createdById,
      title: data.title,
      description: data.description ?? null,
      dueAt: data.dueAt,
    },
  });

  return {
    id: milestone.id,
    teamId: milestone.teamId,
    title: milestone.title,
    description: milestone.description,
    dueAt: milestone.dueAt.toISOString(),
    createdById: milestone.createdById,
    createdAt: milestone.createdAt.toISOString(),
    status: computeMilestoneStatus(milestone, null, now),
  };
}

