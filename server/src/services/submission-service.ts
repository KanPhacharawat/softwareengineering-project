import { Role } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import { computeMilestoneStatus, type MilestoneStatus } from '../domain/milestone.js';
import { canChangeSubmission } from '../domain/submission.js';

type UserSession = { id: string; role: Role };

export type SubmissionView = {
  id: string;
  milestoneId: string;
  title: string;
  description: string | null;
  link: string;
  submittedBy: { id: string; name: string };
  submittedAt: string;
  updatedAt: string;
  feedback: null | unknown;
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

async function loadMilestoneInScope(user: UserSession, milestoneId: string) {
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
  user: UserSession,
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
    submission: milestone.submission
      ? {
          id: milestone.submission.id,
          milestoneId: milestone.submission.milestoneId,
          title: milestone.submission.title,
          description: milestone.submission.description,
          link: milestone.submission.link,
          submittedBy: milestone.submission.submittedBy,
          submittedAt: milestone.submission.submittedAt.toISOString(),
          updatedAt: milestone.submission.updatedAt.toISOString(),
          feedback: null,
        }
      : null,
  };
}

// POST /api/milestones/:milestoneId/submission (FR-07, BR-05, BR-06, BR-07, AC-11..AC-14, NFR-09)
export async function createSubmission(
  user: UserSession,
  milestoneId: string,
  data: { title: string; description?: string; link: string },
  now: Date = new Date(),
): Promise<SubmissionView> {
  const milestone = await loadMilestoneInScope(user, milestoneId);

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

    return {
      id: sub.id,
      milestoneId: sub.milestoneId,
      title: sub.title,
      description: sub.description,
      link: sub.link,
      submittedBy: sub.submittedBy,
      submittedAt: sub.submittedAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
      feedback: null,
    };
  } catch (err: unknown) {
    // P2002: unique constraint violation on milestoneId under concurrent requests (NFR-09)
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      throw new AppError(409, 'SUBMISSION_EXISTS', 'Submission already exists for this milestone');
    }
    throw err;
  }
}

// PUT /api/milestones/:milestoneId/submission (FR-09, BR-06, BR-07, AC-16)
export async function updateSubmission(
  user: UserSession,
  milestoneId: string,
  data: { title: string; description?: string; link: string },
  now: Date = new Date(),
): Promise<SubmissionView> {
  const milestone = await loadMilestoneInScope(user, milestoneId);

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

  const sub = await prisma.submission.update({
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

  return {
    id: sub.id,
    milestoneId: sub.milestoneId,
    title: sub.title,
    description: sub.description,
    link: sub.link,
    submittedBy: sub.submittedBy,
    submittedAt: sub.submittedAt.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
    feedback: null,
  };
}

