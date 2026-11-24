import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import { CURRENT_VERSION, currentState, loadMilestoneInScope } from './submission-service.js';
import {
  computeMilestoneStatus,
  validateMilestoneUpdate,
  type MilestoneStatus,
  type ValidatedMilestoneData,
} from '../domain/milestone.js';
import type { PublicUser } from './auth-service.js';

const USER = { select: { id: true, name: true } } as const;

export type MilestoneView = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  closedAt: string | null;
  closedBy: { id: string; name: string } | null;
  status: MilestoneStatus;
};

export type CreatedMilestoneView = {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  dueAt: string;
  closedAt: string | null;
  closedBy: { id: string; name: string } | null;
  createdById: string;
  createdAt: string;
  status: MilestoneStatus;
};

export type ManagedMilestoneView = {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  dueAt: string;
  closedAt: string | null;
  closedBy: { id: string; name: string } | null;
  status: MilestoneStatus;
};

// FR-06: lists milestones of a team, sorted by due date ascending, with calculated status.
export async function listTeamMilestones(teamId: string, now: Date = new Date()): Promise<MilestoneView[]> {
  const milestones = await prisma.milestone.findMany({
    where: { teamId },
    include: {
      closedBy: USER,
      submission: {
        select: { versions: CURRENT_VERSION },
      },
    },
    orderBy: { dueAt: 'asc' },
  });

  return milestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    dueAt: m.dueAt.toISOString(),
    closedAt: m.closedAt ? m.closedAt.toISOString() : null,
    closedBy: m.closedBy,
    status: computeMilestoneStatus(m, m.submission && currentState(m.submission, now), now),
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
    closedAt: null,
    closedBy: null,
    createdById: milestone.createdById,
    createdAt: milestone.createdAt.toISOString(),
    status: computeMilestoneStatus(milestone, null, now),
  };
}

// PATCH /api/milestones/:milestoneId (FR-14, BR-04, BR-13, AC-36..AC-38, AC-40, AC-42)
export async function updateMilestone(
  user: PublicUser,
  milestoneId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<ManagedMilestoneView> {
  await loadMilestoneInScope(user, milestoneId);

  const validation = validateMilestoneUpdate(input, now);
  if (!validation.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', validation.fields);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "Milestone" WHERE id = ${milestoneId}::uuid FOR UPDATE`;
    const locked = await tx.milestone.findUniqueOrThrow({ where: { id: milestoneId }, select: { closedAt: true } });
    if (locked.closedAt !== null) {
      throw new AppError(409, 'MILESTONE_CLOSED', 'This milestone is closed');
    }

    return tx.milestone.update({
      where: { id: milestoneId },
      data: validation.data,
      include: {
        closedBy: USER,
        submission: { select: { versions: CURRENT_VERSION } },
      },
    });
  });

  return {
    id: updated.id,
    teamId: updated.teamId,
    title: updated.title,
    description: updated.description,
    dueAt: updated.dueAt.toISOString(),
    closedAt: updated.closedAt ? updated.closedAt.toISOString() : null,
    closedBy: updated.closedBy,
    status: computeMilestoneStatus(updated, updated.submission && currentState(updated.submission, now), now),
  };
}

// POST /api/milestones/:milestoneId/close (FR-14, BR-13, AC-38, AC-40)
export async function closeMilestone(
  user: PublicUser,
  milestoneId: string,
  now: Date = new Date(),
): Promise<ManagedMilestoneView> {
  await loadMilestoneInScope(user, milestoneId);

  const closed = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "Milestone" WHERE id = ${milestoneId}::uuid FOR UPDATE`;
    const locked = await tx.milestone.findUniqueOrThrow({ where: { id: milestoneId }, select: { closedAt: true } });
    if (locked.closedAt !== null) {
      throw new AppError(409, 'MILESTONE_CLOSED', 'This milestone is closed');
    }

    return tx.milestone.update({
      where: { id: milestoneId },
      data: { closedAt: now, closedById: user.id },
      include: {
        closedBy: USER,
        submission: { select: { versions: CURRENT_VERSION } },
      },
    });
  });

  return {
    id: closed.id,
    teamId: closed.teamId,
    title: closed.title,
    description: closed.description,
    dueAt: closed.dueAt.toISOString(),
    closedAt: closed.closedAt ? closed.closedAt.toISOString() : null,
    closedBy: closed.closedBy,
    status: computeMilestoneStatus(closed, closed.submission && currentState(closed.submission, now), now),
  };
}
