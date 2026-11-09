// F-05 Supervisor feedback service (FR-10, BR-02, BR-08, AC-17, AC-19, AC-20, D-05)
import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import { validateFeedbackInput } from '../domain/feedback.js';
import { UUID } from './team-service.js';
import type { PublicUser } from './auth-service.js';
import type { FeedbackView } from './submission-service.js';

export async function createFeedback(
  user: PublicUser,
  submissionId: string,
  input: unknown,
): Promise<FeedbackView> {
  // D-05: malformed submissionId returns 404 before querying the database
  if (!UUID.test(submissionId)) {
    throw new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      milestone: {
        include: {
          team: {
            select: { id: true, supervisorId: true },
          },
        },
      },
      feedback: { select: { id: true } },
    },
  });

  if (!submission) {
    throw new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');
  }

  // BR-02, AC-19: supervisor only acts on assigned teams; cross-team submission yields 404
  if (submission.milestone.team.supervisorId !== user.id) {
    throw new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');
  }

  // Input validation (comment: 1..2000 chars after trim)
  const validation = validateFeedbackInput(input);
  if (!validation.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', validation.fields);
  }

  // BR-08: single feedback per submission
  if (submission.feedback) {
    throw new AppError(409, 'FEEDBACK_EXISTS', 'Feedback already exists for this submission');
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        submissionId,
        authorId: user.id,
        comment: validation.data.comment,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return {
      id: feedback.id,
      comment: feedback.comment,
      author: feedback.author,
      createdAt: feedback.createdAt.toISOString(),
    };
  } catch (err: unknown) {
    // P2002: unique constraint violation under concurrent requests (BR-08)
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      throw new AppError(409, 'FEEDBACK_EXISTS', 'Feedback already exists for this submission');
    }
    throw err;
  }
}

