// F-08 Grading service (FR-15, BR-02, BR-12, AC-43..AC-47)
import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import { canGrade, validateGradeInput } from '../domain/grade.js';
import { UUID } from './team-service.js';
import { CURRENT_VERSION, currentState, type GradeView } from './submission-service.js';
import type { PublicUser } from './auth-service.js';

const NOT_FOUND = () => new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');
const USER = { select: { id: true, name: true } } as const;

function rejectGradeState(reason: 'FEEDBACK_REQUIRED' | 'REVISION_PENDING'): never {
  if (reason === 'FEEDBACK_REQUIRED') {
    throw new AppError(409, 'FEEDBACK_REQUIRED', 'Record feedback before grading');
  }
  throw new AppError(
    409,
    'REVISION_PENDING',
    'A revision is requested; grade after the team resubmits and you give feedback',
  );
}

// PUT /api/submissions/:submissionId/grade. Order: 404 scope -> 400 body -> Submission lock + 409 state.
export async function setGrade(
  user: PublicUser,
  submissionId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<GradeView> {
  if (!UUID.test(submissionId)) throw NOT_FOUND();

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { milestone: { select: { team: { select: { supervisorId: true } } } } },
  });
  if (!submission || submission.milestone.team.supervisorId !== user.id) throw NOT_FOUND();

  const validation = validateGradeInput(input);
  if (!validation.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', validation.fields);
  }
  const { score } = validation.data;

  const grade = await prisma.$transaction(async (tx) => {
    // Submission-only lock (like feedback): serializes against POST /revision-request and POST /versions without deadlocking F-07.
    await tx.$queryRaw`SELECT 1 FROM "Submission" WHERE id = ${submissionId}::uuid FOR UPDATE`;
    const locked = await tx.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: {
        milestone: { select: { closedAt: true } },
        versions: CURRENT_VERSION,
      },
    });
    const current = currentState(locked, now);
    const check = canGrade({
      currentVersionHasFeedback: current.feedback !== null,
      revisionRequestStatus: current.revisionRequestView?.status ?? null,
      milestoneClosed: locked.milestone.closedAt !== null,
    });
    if (!check.allowed) rejectGradeState(check.reason);

    return tx.grade.upsert({
      where: { submissionId },
      create: {
        submissionId,
        score,
        versionNumber: locked.currentVersion,
        gradedById: user.id,
      },
      update: {
        score,
        versionNumber: locked.currentVersion,
        gradedById: user.id,
      },
      include: { gradedBy: USER },
    });
  });

  return {
    score: grade.score,
    versionNumber: grade.versionNumber,
    gradedBy: grade.gradedBy,
    gradedAt: grade.gradedAt.toISOString(),
    updatedAt: grade.updatedAt.toISOString(),
  };
}
