import { Role } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import { computeMilestoneStatus, type MilestoneStatus } from '../domain/milestone.js';
import { canChangeSubmission, validateSubmissionInput } from '../domain/submission.js';
import { UUID } from './team-service.js';
import type { PublicUser } from './auth-service.js';

export type FeedbackView = {
  id: string;
  comment: string;
  author: { id: string; name: string };
  createdAt: string;
};

export type SubmissionView = {
  id: string;
  milestoneId: string;
  title: string;
  description: string | null;
  link: string;
  submittedBy: { id: string; name: string };
  submittedAt: string;
  updatedAt: string;
  feedback: FeedbackView | null;
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

function toSubmissionView(sub: {
  id: string;
  milestoneId: string;
  title: string;
  description: string | null;
  link: string;
  submittedBy: { id: string; name: string };
  submittedAt: Date;
  updatedAt: Date;
  feedback?: {
    id: string;
    comment: string;
    author: { id: string; name: string };
    createdAt: Date;
  } | null;
}): SubmissionView {
  return {
    id: sub.id,
    milestoneId: sub.milestoneId,
    title: sub.title,
    description: sub.description,
    link: sub.link,
    submittedBy: sub.submittedBy,
    submittedAt: sub.submittedAt.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
    feedback: sub.feedback
      ? {
          id: sub.feedback.id,
          comment: sub.feedback.comment,
          author: sub.feedback.author,
          createdAt: sub.feedback.createdAt.toISOString(),
        }
      : null,
  };
}

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
        include: {
          submittedBy: { select: { id: true, name: true } },
          feedback: {
            include: {
              author: { select: { id: true, name: true } },
            },
          },
        },
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
      status: computeMilestoneStatus(milestone, milestone.submission, now),
    },
    team: {
      id: milestone.team.id,
      name: milestone.team.name,
    },
    submission: milestone.submission ? toSubmissionView(milestone.submission) : null,
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
        title: data.title,
        description: data.description ?? null,
        link: data.link,
      },
      include: {
        submittedBy: { select: { id: true, name: true } },
      },
    });

    return toSubmissionView(sub);
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

  const changeCheck = canChangeSubmission(milestone, milestone.submission, now);
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
    const existingFeedback = await tx.feedback.findUnique({ where: { submissionId } });
    if (existingFeedback) {
      throw new AppError(409, 'SUBMISSION_LOCKED', 'Submission is locked after feedback');
    }
    return tx.submission.update({
      where: { milestoneId },
      data: {
        title: data.title,
        description: data.description ?? null,
        link: data.link,
        submittedById: user.id,
      },
      include: {
        submittedBy: { select: { id: true, name: true } },
      },
    });
  });

  return toSubmissionView(sub);
}
