import { Prisma, Role } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import { computeMilestoneStatus, type MilestoneStatus } from '../domain/milestone.js';
import { canChangeSubmission, validateSubmissionInput } from '../domain/submission.js';
import { revisionStatus, type RevisionStatus } from '../domain/revision.js';
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

// F-06: the current version is the latest one; its feedback and revision request drive status and locks.
export const CURRENT_VERSION = {
  orderBy: { versionNumber: 'desc' },
  take: 1,
  include: {
    feedback: { include: { author: USER } },
    revisionRequest: { include: { requestedBy: USER } },
  },
} satisfies Prisma.Submission$versionsArgs;

type CurrentVersionRow = Prisma.SubmissionVersionGetPayload<{ include: typeof CURRENT_VERSION.include }>;

// Flattens the current version so callers see { feedback, revisionRequest } like in Sprint 1.
export function currentState(sub: { versions: CurrentVersionRow[] }, now: Date = new Date()) {
  const v = sub.versions[0];
  return {
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
  feedback: FeedbackView | null;
  revisionRequest: RevisionRequestView | null;
};

export type MilestoneDetailView = {
  milestone: {
    id: string;
    title: string;
    description: string | null;
    dueAt: string;
    status: MilestoneStatus;
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
    versions: CurrentVersionRow[];
  },
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
    feedback: current.feedbackView,
    revisionRequest: current.revisionRequestView,
  };
}

const SUBMISSION_INCLUDE = { createdBy: USER, submittedBy: USER, versions: CURRENT_VERSION } as const;

async function loadMilestoneInScope(user: PublicUser, milestoneId: string) {
  if (!UUID.test(milestoneId)) {
    throw new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');
  }

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
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
      status: computeMilestoneStatus(milestone, milestone.submission && currentState(milestone.submission), now),
    },
    team: {
      id: milestone.team.id,
      name: milestone.team.name,
    },
    submission: milestone.submission ? toSubmissionView(milestone.submission, now) : null,
  };
}

// POST /api/milestones/:milestoneId/submission (FR-07, BR-05, BR-06, BR-07, BR-09, AC-11..AC-14, NFR-09)
export async function createSubmission(
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

  // BR-05: duplicate submission check
  if (milestone.submission) {
    throw new AppError(409, 'SUBMISSION_EXISTS', 'Submission already exists for this milestone');
  }

  // BR-06: deadline check
  const changeCheck = canChangeSubmission(milestone, milestone.submission, now);
  if (!changeCheck.allowed) {
    if (changeCheck.reason === 'DEADLINE_PASSED') {
      throw new AppError(422, 'DEADLINE_PASSED', 'Submission deadline has passed');
    }
    throw new AppError(409, 'SUBMISSION_LOCKED', 'Submission is locked after feedback');
  }

  try {
    const sub = await prisma.submission.create({
      data: {
        milestoneId,
        submittedById: user.id,
        createdById: user.id,
        title: data.title,
        description: data.description ?? null,
        link: data.link,
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

    return toSubmissionView(sub, now);
  } catch (err: unknown) {
    // P2002: unique constraint violation on milestoneId under concurrent requests (NFR-09)
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      throw new AppError(409, 'SUBMISSION_EXISTS', 'Submission already exists for this milestone');
    }
    throw err;
  }
}

// PUT /api/milestones/:milestoneId/submission (FR-09, BR-06, BR-07, BR-09, AC-16)
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
    if (changeCheck.reason === 'DEADLINE_PASSED') {
      throw new AppError(422, 'DEADLINE_PASSED', 'Submission deadline has passed');
    }
    throw new AppError(409, 'SUBMISSION_LOCKED', 'Submission is locked after feedback');
  }

  const submissionId = milestone.submission.id;
  const sub = await prisma.$transaction(async (tx) => {
    // BR-07: lock the row so a concurrent feedback insert cannot slip in between the check and the update
    await tx.$queryRaw`SELECT 1 FROM "Submission" WHERE id = ${submissionId}::uuid FOR UPDATE`;
    // F-06: the lock is per version, so only feedback on the current version blocks the edit
    const { currentVersion } = await tx.submission.findUniqueOrThrow({ where: { id: submissionId } });
    const versionKey = { submissionId_versionNumber: { submissionId, versionNumber: currentVersion } };
    const current = await tx.submissionVersion.findUniqueOrThrow({ where: versionKey, include: { feedback: true } });
    if (current.feedback) {
      throw new AppError(409, 'SUBMISSION_LOCKED', 'Submission is locked after feedback');
    }
    const fields = { title: data.title, description: data.description ?? null, link: data.link, submittedById: user.id };
    await tx.submissionVersion.update({ where: versionKey, data: fields });
    return tx.submission.update({ where: { milestoneId }, data: fields, include: SUBMISSION_INCLUDE });
  });

  return toSubmissionView(sub, now);
}
