// F-06a Revision request service (FR-11, BR-02, BR-10, AC-24..AC-27)
import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import { canRequestRevision, validateRevisionRequestInput } from '../domain/revision.js';
import { UUID } from './team-service.js';
import { CURRENT_VERSION, currentState, toRevisionRequestView, type RevisionRequestView } from './submission-service.js';
import type { PublicUser } from './auth-service.js';

const NOT_FOUND = () => new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');

function rejectState(reason: 'FEEDBACK_REQUIRED' | 'REVISION_EXISTS'): never {
  if (reason === 'FEEDBACK_REQUIRED') {
    throw new AppError(409, 'FEEDBACK_REQUIRED', 'Record feedback on the current version before requesting a revision');
  }
  throw new AppError(409, 'REVISION_EXISTS', 'A revision has already been requested for this version');
}

// POST /api/submissions/:submissionId/revision-request. Order: 404 scope -> 400 body -> 409 state (W1).
export async function createRevisionRequest(
  user: PublicUser,
  submissionId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<RevisionRequestView> {
  if (!UUID.test(submissionId)) throw NOT_FOUND();

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      milestone: { select: { id: true, closedAt: true, team: { select: { supervisorId: true } } } },
      grade: { select: { id: true } },
      versions: CURRENT_VERSION,
    },
  });
  if (!submission || submission.milestone.team.supervisorId !== user.id) throw NOT_FOUND();

  const validation = validateRevisionRequestInput(input, now);
  if (!validation.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', validation.fields);
  }

  if (submission.milestone.closedAt !== null) {
    throw new AppError(409, 'MILESTONE_CLOSED', 'This milestone is closed');
  }
  if (submission.grade) {
    throw new AppError(409, 'SUBMISSION_GRADED', 'Submission has already been graded');
  }

  const check = canRequestRevision(currentState(submission));
  if (!check.allowed) rejectState(check.reason);

  const milestoneId = submission.milestone.id;
  try {
    const created = await prisma.$transaction(async (tx) => {
      // Lock order: Milestone first, then Submission (F-07 concurrency rule, prevents deadlocks)
      await tx.$queryRaw`SELECT 1 FROM "Milestone" WHERE id = ${milestoneId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT 1 FROM "Submission" WHERE id = ${submissionId}::uuid FOR UPDATE`;
      const lockedMilestone = await tx.milestone.findUniqueOrThrow({ where: { id: milestoneId }, select: { closedAt: true } });
      if (lockedMilestone.closedAt !== null) {
        throw new AppError(409, 'MILESTONE_CLOSED', 'This milestone is closed');
      }
      const locked = await tx.submission.findUniqueOrThrow({
        where: { id: submissionId },
        include: { grade: { select: { id: true } }, versions: CURRENT_VERSION },
      });
      if (locked.grade) {
        throw new AppError(409, 'SUBMISSION_GRADED', 'Submission has already been graded');
      }
      const recheck = canRequestRevision(currentState(locked));
      if (!recheck.allowed) rejectState(recheck.reason);
      const version = locked.versions[0];
      const row = await tx.revisionRequest.create({
        data: {
          submissionId,
          versionId: version.id,
          reason: validation.data.reason,
          dueAt: validation.data.dueAt,
          requestedById: user.id,
        },
        include: { requestedBy: { select: { id: true, name: true } } },
      });
      return { row, versionNumber: version.versionNumber };
    });
    return toRevisionRequestView(created.row, created.versionNumber, now);
  } catch (err: unknown) {
    // P2002: unique versionId under parallel requests (AC-26)
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') rejectState('REVISION_EXISTS');
    throw err;
  }
}
