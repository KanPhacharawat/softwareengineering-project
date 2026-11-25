import { Prisma, Role } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import { computeMilestoneStatus, type MilestoneStatus } from '../domain/milestone.js';
import { canChangeSubmission, effectiveDueAt, graceEndsAt, validateSubmissionInput } from '../domain/submission.js';
import { canResubmit, revisionStatus, type RevisionStatus } from '../domain/revision.js';
import { UUID } from './team-service.js';
import type { PublicUser } from './auth-service.js';

export type FeedbackView = {
  id: string;
  comment: string;
  author: { id: string; name: string };
  createdAt: string;
  versionNumber: number;
};

export type RevisionRequestView = {
  id: string;
  submissionId: string;
  versionNumber: number;
  reason: string;
  dueAt: string;
  status: RevisionStatus;
  requestedBy: { id: string; name: string };
  createdAt: string;
};

const USER = { select: { id: true, name: true } } as const;

// F-06: versions[0] is the current (latest) version; its feedback and revision request drive status and locks.
// versions[1] is the previous version: its request gives the edit deadline of the current one (BR-11).
export const CURRENT_VERSION = {
  orderBy: { versionNumber: 'desc' },
  take: 2,
  include: {
    feedback: { include: { author: USER } },
    revisionRequest: { include: { requestedBy: USER } },
  },
} satisfies Prisma.Submission$versionsArgs;

type CurrentVersionRow = Prisma.SubmissionVersionGetPayload<{ include: typeof CURRENT_VERSION.include }>;

// Flattens the current version so callers see { feedback, revisionRequest } like in Sprint 1.
export function currentState(sub: { versions: CurrentVersionRow[] }, now: Date = new Date()) {
  const [v, previous] = sub.versions;
  return {
    versionNumber: v?.versionNumber,
    revisionDueAt: previous?.revisionRequest?.dueAt ?? null,
    previousHadRequest: !!previous?.revisionRequest,
    feedback: v?.feedback ?? null,
    revisionRequest: v?.revisionRequest ?? null,
    feedbackView: v?.feedback
      ? {
          id: v.feedback.id,
          comment: v.feedback.comment,
          author: v.feedback.author,
          createdAt: v.feedback.createdAt.toISOString(),
          versionNumber: v.versionNumber,
        }
      : null,
    revisionRequestView: v?.revisionRequest ? toRevisionRequestView(v.revisionRequest, v.versionNumber, now) : null,
  };
}

export function toRevisionRequestView(
  r: { id: string; submissionId: string; reason: string; dueAt: Date; createdAt: Date; requestedBy: { id: string; name: string } },
  versionNumber: number,
  now: Date = new Date(),
): RevisionRequestView {
  return {
    id: r.id,
    submissionId: r.submissionId,
    versionNumber,
    reason: r.reason,
    dueAt: r.dueAt.toISOString(),
    status: revisionStatus(r, false, now),
    requestedBy: r.requestedBy,
    createdAt: r.createdAt.toISOString(),
  };
}

export type SubmissionView = {
  id: string;
  milestoneId: string;
  title: string;
  description: string | null;
  link: string;
  createdBy: { id: string; name: string };
  submittedBy: { id: string; name: string };
  submittedAt: string;
  updatedAt: string;
  currentVersion: number;
  editableUntil: string;
  /** Lab 7 BR-06 v2: first save at or after dueAt; null = on time. */
  lateAt: string | null;
  feedback: FeedbackView | null;
  revisionRequest: RevisionRequestView | null;
};

export type MilestoneDetailView = {
  milestone: {
    id: string;
    title: string;
    description: string | null;
    dueAt: string;
    closedAt: string | null;
    closedBy: { id: string; name: string } | null;
    status: MilestoneStatus;
    graceEndsAt: string;
  };
  team: {
    id: string;
    name: string;
  };
  submission: SubmissionView | null;
};

function toSubmissionView(
  sub: {
    id: string;
    milestoneId: string;
    title: string;
    description: string | null;
    link: string;
    createdBy: { id: string; name: string };
    submittedBy: { id: string; name: string };
    submittedAt: Date;
    updatedAt: Date;
    currentVersion: number;
    lateAt: Date | null;
    versions: CurrentVersionRow[];
  },
  milestone: { dueAt: Date },
  now: Date = new Date(),
): SubmissionView {
  const current = currentState(sub, now);
  return {
    id: sub.id,
    milestoneId: sub.milestoneId,
    title: sub.title,
    description: sub.description,
    link: sub.link,
    createdBy: sub.createdBy,
    submittedBy: sub.submittedBy,
    submittedAt: sub.submittedAt.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
    currentVersion: sub.currentVersion,
    editableUntil: effectiveDueAt(milestone, current).toISOString(),
    lateAt: sub.lateAt?.toISOString() ?? null,
    feedback: current.feedbackView,
    revisionRequest: current.revisionRequestView,
  };
}

const SUBMISSION_INCLUDE = { createdBy: USER, submittedBy: USER, versions: CURRENT_VERSION } as const;

export async function loadMilestoneInScope(user: PublicUser, milestoneId: string) {
  if (!UUID.test(milestoneId)) {
    throw new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');
  }

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      closedBy: USER,
      team: {
        select: {
          id: true,
          name: true,
          supervisorId: true,
          members: { select: { userId: true } },
        },
      },
      submission: {
        include: SUBMISSION_INCLUDE,
      },
    },
  });

  if (!milestone) {
    throw new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');
  }

  // Check role & team scope (BR-01, BR-02, AC-15)
  if (user.role === Role.STUDENT) {
    const isMember = milestone.team.members.some((m) => m.userId === user.id);
    if (!isMember) {
      throw new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');
    }
  } else if (user.role === Role.SUPERVISOR) {
    if (milestone.team.supervisorId !== user.id) {
      throw new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');
    }
  }

  return milestone;
}

// GET /api/milestones/:milestoneId (FR-08, AC-11, AC-15)
export async function getMilestoneDetail(
  user: PublicUser,
  milestoneId: string,
  now: Date = new Date(),
): Promise<MilestoneDetailView> {
  const milestone = await loadMilestoneInScope(user, milestoneId);

  return {
    milestone: {
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      dueAt: milestone.dueAt.toISOString(),
      closedAt: milestone.closedAt ? milestone.closedAt.toISOString() : null,
      closedBy: milestone.closedBy,
      status: computeMilestoneStatus(milestone, milestone.submission && currentState(milestone.submission), now),
      graceEndsAt: graceEndsAt(milestone.dueAt).toISOString(),
    },
    team: {
      id: milestone.team.id,
      name: milestone.team.name,
    },
    submission: milestone.submission ? toSubmissionView(milestone.submission, milestone, now) : null,
  };
}

function rejectChangeSubmission(reason: 'MILESTONE_CLOSED' | 'DEADLINE_PASSED' | 'SUBMISSION_LOCKED'): never {
  if (reason === 'MILESTONE_CLOSED') {
    throw new AppError(409, 'MILESTONE_CLOSED', 'This milestone is closed');
  }
  if (reason === 'DEADLINE_PASSED') {
    throw new AppError(422, 'DEADLINE_PASSED', 'Submission deadline has passed');
  }
  throw new AppError(409, 'SUBMISSION_LOCKED', 'Submission is locked after feedback');
}

// POST /api/milestones/:milestoneId/submission (FR-07, BR-05, BR-06, BR-07, BR-09, BR-13, AC-11..AC-14, NFR-09)
export async function createSubmission(
  user: PublicUser,
  milestoneId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<SubmissionView> {
  await loadMilestoneInScope(user, milestoneId);

  const validation = validateSubmissionInput(input);
  if (!validation.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', validation.fields);
  }
  const data = validation.data;

  try {
    const { sub, lockedMilestone } = await prisma.$transaction(async (tx) => {
      // F-07 concurrency rule: lock Milestone first so a concurrent close cannot slip in before insert
      await tx.$queryRaw`SELECT 1 FROM "Milestone" WHERE id = ${milestoneId}::uuid FOR UPDATE`;
      const lockedMilestone = await tx.milestone.findUniqueOrThrow({
        where: { id: milestoneId },
        select: { dueAt: true, closedAt: true, submission: { select: { id: true } } },
      });

      // BR-13 (F-07): closed check runs before duplicate and deadline checks
      if (lockedMilestone.closedAt !== null) {
        rejectChangeSubmission('MILESTONE_CLOSED');
      }

      // BR-05: duplicate submission check
      if (lockedMilestone.submission) {
        throw new AppError(409, 'SUBMISSION_EXISTS', 'Submission already exists for this milestone');
      }

      // BR-06: deadline check
      const changeCheck = canChangeSubmission(lockedMilestone, null, now);
      if (!changeCheck.allowed) {
        rejectChangeSubmission(changeCheck.reason);
      }

      const created = await tx.submission.create({
        data: {
          milestoneId,
          submittedById: user.id,
          createdById: user.id,
          title: data.title,
          description: data.description ?? null,
          link: data.link,
          // BR-06 v2: saved inside the grace window -> late
          lateAt: now >= lockedMilestone.dueAt ? now : null,
          // F-06: version 1 is created in the same statement (one transaction)
          versions: {
            create: {
              versionNumber: 1,
              title: data.title,
              description: data.description ?? null,
              link: data.link,
              submittedById: user.id,
            },
          },
        },
        include: SUBMISSION_INCLUDE,
      });

      return { sub: created, lockedMilestone };
    });

    return toSubmissionView(sub, lockedMilestone, now);
  } catch (err: unknown) {
    // P2002: unique constraint violation on milestoneId under concurrent requests (NFR-09)
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      throw new AppError(409, 'SUBMISSION_EXISTS', 'Submission already exists for this milestone');
    }
    throw err;
  }
}

// PUT /api/milestones/:milestoneId/submission (FR-09, BR-06, BR-07, BR-09, BR-13, AC-16)
export async function updateSubmission(
  user: PublicUser,
  milestoneId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<SubmissionView> {
  const milestone = await loadMilestoneInScope(user, milestoneId);

  const validation = validateSubmissionInput(input);
  if (!validation.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', validation.fields);
  }
  const data = validation.data;

  if (!milestone.submission) {
    throw new AppError(404, 'NOT_FOUND', 'No submission exists for this milestone');
  }

  const changeCheck = canChangeSubmission(milestone, currentState(milestone.submission), now);
  if (!changeCheck.allowed) {
    rejectChangeSubmission(changeCheck.reason);
  }

  const submissionId = milestone.submission.id;
  const { sub, lockedMilestone } = await prisma.$transaction(async (tx) => {
    // Lock order: Milestone first, then Submission (F-07 concurrency rule + BR-07 feedback lock)
    await tx.$queryRaw`SELECT 1 FROM "Milestone" WHERE id = ${milestoneId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT 1 FROM "Submission" WHERE id = ${submissionId}::uuid FOR UPDATE`;
    const lockedMilestone = await tx.milestone.findUniqueOrThrow({
      where: { id: milestoneId },
      select: { dueAt: true, closedAt: true },
    });
    // F-06: re-check on the locked row; deadline and lock are per current version (a resubmit may have just landed)
    const locked = await tx.submission.findUniqueOrThrow({ where: { id: submissionId }, include: { versions: CURRENT_VERSION } });
    const recheck = canChangeSubmission(lockedMilestone, currentState(locked), now);
    if (!recheck.allowed) {
      rejectChangeSubmission(recheck.reason);
    }
    const versionKey = { submissionId_versionNumber: { submissionId, versionNumber: locked.currentVersion } };
    const fields = { title: data.title, description: data.description ?? null, link: data.link, submittedById: user.id };
    await tx.submissionVersion.update({ where: versionKey, data: fields });
    // BR-06 v2: first version-1 save at or after dueAt marks it late; never cleared or moved (CR-01 3.3)
    const lateAt = locked.currentVersion === 1 && !locked.lateAt && now >= lockedMilestone.dueAt ? now : undefined;
    const updated = await tx.submission.update({ where: { milestoneId }, data: { ...fields, lateAt }, include: SUBMISSION_INCLUDE });
    return { sub: updated, lockedMilestone };
  });

  return toSubmissionView(sub, lockedMilestone, now);
}

function rejectResubmit(reason: 'NO_REVISION_REQUEST' | 'RESUBMISSION_EXISTS' | 'REVISION_DUE_PASSED'): never {
  if (reason === 'REVISION_DUE_PASSED') throw new AppError(422, 'REVISION_DUE_PASSED', 'Revision due date has passed');
  if (reason === 'RESUBMISSION_EXISTS') {
    throw new AppError(409, 'RESUBMISSION_EXISTS', 'This revision request has already been answered');
  }
  throw new AppError(409, 'NO_REVISION_REQUEST', 'No revision has been requested for this submission');
}

// POST /api/submissions/:submissionId/versions (FR-12, BR-10, BR-11, BR-13, AC-28..AC-30). Order: 404 scope -> 400 body -> 409/422 state (W2).
export async function resubmit(
  user: PublicUser,
  submissionId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<SubmissionView> {
  const notFound = () => new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');
  if (!UUID.test(submissionId)) throw notFound();

  const found = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { milestone: { select: { id: true, dueAt: true, closedAt: true, team: { select: { members: { select: { userId: true } } } } } } },
  });
  if (!found || !found.milestone.team.members.some((m) => m.userId === user.id)) throw notFound();

  const validation = validateSubmissionInput(input);
  if (!validation.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', validation.fields);
  }
  const data = validation.data;

  const milestoneId = found.milestone.id;
  try {
    const { sub, lockedMilestone } = await prisma.$transaction(async (tx) => {
      // Lock order: Milestone first, then Submission (F-07 concurrency rule)
      await tx.$queryRaw`SELECT 1 FROM "Milestone" WHERE id = ${milestoneId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT 1 FROM "Submission" WHERE id = ${submissionId}::uuid FOR UPDATE`;
      const lockedMilestone = await tx.milestone.findUniqueOrThrow({
        where: { id: milestoneId },
        select: { dueAt: true, closedAt: true },
      });
      if (lockedMilestone.closedAt !== null) {
        rejectChangeSubmission('MILESTONE_CLOSED');
      }
      const locked = await tx.submission.findUniqueOrThrow({ where: { id: submissionId }, include: { versions: CURRENT_VERSION } });
      const current = currentState(locked, now);
      const check = canResubmit(
        { revisionDueAt: current.revisionRequest?.dueAt ?? null, previousHadRequest: current.previousHadRequest },
        now,
      );
      if (!check.allowed) rejectResubmit(check.reason);

      const versionNumber = locked.currentVersion + 1;
      const fields = { title: data.title, description: data.description ?? null, link: data.link, submittedById: user.id };
      // Insert only: older versions, their feedback and requests are never changed (BR-10). createdById/submittedAt stay.
      await tx.submissionVersion.create({ data: { submissionId, versionNumber, ...fields } });
      const updated = await tx.submission.update({
        where: { id: submissionId },
        data: { ...fields, currentVersion: versionNumber },
        include: SUBMISSION_INCLUDE,
      });
      return { sub: updated, lockedMilestone };
    });
    return toSubmissionView(sub, lockedMilestone, now);
  } catch (err: unknown) {
    // P2002: unique (submissionId, versionNumber) under parallel resubmissions (AC-30)
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') rejectResubmit('RESUBMISSION_EXISTS');
    throw err;
  }
}
