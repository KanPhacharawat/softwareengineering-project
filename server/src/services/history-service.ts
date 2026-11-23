// F-06c Revision history (FR-13, BR-01, BR-02, BR-10, AC-32, AC-33). Read-only.
import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import { revisionStatus } from '../domain/revision.js';
import { UUID } from './team-service.js';
import type { PublicUser } from './auth-service.js';

const USER = { select: { id: true, name: true } } as const;

// GET /api/submissions/:submissionId/history: member of the team or its supervisor, else 404 (no existence leak)
export async function getSubmissionHistory(user: PublicUser, submissionId: string, now: Date = new Date()) {
  const notFound = () => new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');
  if (!UUID.test(submissionId)) throw notFound();

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      milestone: { select: { team: { select: { supervisorId: true, members: { select: { userId: true } } } } } },
      createdBy: USER,
      versions: {
        orderBy: { versionNumber: 'asc' },
        include: {
          submittedBy: USER,
          feedback: { include: { author: USER } },
          revisionRequest: { include: { requestedBy: USER } },
        },
      },
    },
  });
  const team = sub?.milestone.team;
  if (!sub || !(team!.supervisorId === user.id || team!.members.some((m) => m.userId === user.id))) throw notFound();

  return {
    submission: { id: sub.id, milestoneId: sub.milestoneId, createdBy: sub.createdBy },
    versions: sub.versions.map((v) => ({
      versionNumber: v.versionNumber,
      title: v.title,
      description: v.description,
      link: v.link,
      submittedBy: v.submittedBy,
      submittedAt: v.submittedAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      feedback: v.feedback && {
        id: v.feedback.id,
        comment: v.feedback.comment,
        author: v.feedback.author,
        createdAt: v.feedback.createdAt.toISOString(),
      },
      revisionRequest: v.revisionRequest && {
        id: v.revisionRequest.id,
        reason: v.revisionRequest.reason,
        dueAt: v.revisionRequest.dueAt.toISOString(),
        // older versions always have a newer one, so their request reads RESUBMITTED
        status: revisionStatus(v.revisionRequest, v.versionNumber < sub.currentVersion, now),
        requestedBy: v.revisionRequest.requestedBy,
        createdAt: v.revisionRequest.createdAt.toISOString(),
      },
    })),
  };
}
