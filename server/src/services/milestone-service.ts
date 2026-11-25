import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import { CURRENT_VERSION, currentState, loadMilestoneInScope } from './submission-service.js';
import {
  computeMilestoneStatus,
  validateMilestoneUpdate,
  type MilestoneStatus,
  type ValidatedMilestoneData,
} from '../domain/milestone.js';
import { graceEndsAt } from '../domain/submission.js';
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
  /** Lab 7 BR-06 v2: dueAt + 24 h; lateAt of the submission (null = none or on time). */
  graceEndsAt: string;
  lateAt: string | null;
};

export type CreatedMilestoneView = MilestoneView & {
  teamId: string;
  createdById: string;
  createdAt: string;
};

export type ManagedMilestoneView = MilestoneView & {
  teamId: string;
};

function toMilestoneView(
  m: {
    id: string;
    title: string;
    description: string | null;
    dueAt: Date;
    closedAt: Date | null;
    closedBy: { id: string; name: string } | null;
    submission: (Parameters<typeof currentState>[0] & { lateAt: Date | null }) | null;
  },
  now: Date,
): MilestoneView {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    dueAt: m.dueAt.toISOString(),
    closedAt: m.closedAt ? m.closedAt.toISOString() : null,
    closedBy: m.closedBy,
    status: computeMilestoneStatus(m, m.submission && currentState(m.submission, now), now),
    graceEndsAt: graceEndsAt(m.dueAt).toISOString(),
    lateAt: m.submission?.lateAt?.toISOString() ?? null,
  };
}

// FR-06: lists milestones of a team, sorted by due date ascending, with calculated status.
export async function listTeamMilestones(teamId: string, now: Date = new Date()): Promise<MilestoneView[]> {
  const milestones = await prisma.milestone.findMany({
    where: { teamId },
    include: {
      closedBy: USER,
      submission: {
        select: { lateAt: true, versions: CURRENT_VERSION },
      },
    },
    orderBy: { dueAt: 'asc' },
  });

  return milestones.map((m) => toMilestoneView(m, now));
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
    ...toMilestoneView({ ...milestone, closedBy: null, submission: null }, now),
    teamId: milestone.teamId,
    createdById: milestone.createdById,
    createdAt: milestone.createdAt.toISOString(),
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
        submission: { select: { lateAt: true, versions: CURRENT_VERSION } },
      },
    });
  });

  return { ...toMilestoneView(updated, now), teamId: updated.teamId };
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

    // Use DB clock_timestamp() *after* acquiring FOR UPDATE so closedAt is always >= any submission committed before close.
    const [{ closedAt }] = await tx.$queryRaw<[{ closedAt: Date }]>`SELECT clock_timestamp() AS "closedAt"`;

    return tx.milestone.update({
      where: { id: milestoneId },
      data: { closedAt, closedById: user.id },
      include: {
        closedBy: USER,
        submission: { select: { lateAt: true, versions: CURRENT_VERSION } },
      },
    });
  });

  return { ...toMilestoneView(closed, now), teamId: closed.teamId };
}
