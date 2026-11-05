import { Prisma, type PrismaClient } from '@prisma/client';
import type { CurrentUser } from '../middleware/auth.js';
import { AppError, notFound } from '../lib/errors.js';
import { isUuid } from '../lib/validate.js';
import {
  canChangeSubmission,
  milestoneStatus,
  validateMilestone,
  validateSubmission,
  type MilestoneInput,
  type SubmissionInput,
} from '../domain/rules.js';
import { getTeamInScope, teamScope } from './teams.js';

type Clock = () => Date;

const person = { select: { id: true, name: true } } as const;
const submissionView = {
  id: true,
  title: true,
  description: true,
  link: true,
  submittedAt: true,
  updatedAt: true,
  submittedBy: person,
  feedback: { select: { id: true, comment: true, createdAt: true, author: person } },
} as const;

function fail(r: { ok: false; code: string; fields?: Record<string, string> }): never {
  const status = { VALIDATION_ERROR: 400, DEADLINE_PASSED: 422, SUBMISSION_LOCKED: 409 }[r.code] ?? 400;
  const message = {
    VALIDATION_ERROR: 'Some fields are invalid',
    DEADLINE_PASSED: 'The milestone due date has passed',
    SUBMISSION_LOCKED: 'The submission is locked after feedback',
  }[r.code] ?? r.code;
  throw new AppError(status, r.code, message, r.fields);
}

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

export function milestoneService(prisma: PrismaClient, now: Clock) {
  /** Loads a milestone only if its team is in the user's scope (BR-01, BR-02). */
  async function loadMilestone(user: CurrentUser, milestoneId: string) {
    if (!isUuid(milestoneId)) throw notFound();
    const m = await prisma.milestone.findFirst({
      where: { id: milestoneId, team: teamScope(user) },
      include: { team: { select: { id: true, name: true } }, submission: { select: submissionView } },
    });
    if (!m) throw notFound();
    return m;
  }

  const dto = (m: { id: string; teamId: string; title: string; description: string; dueAt: Date; createdAt: Date }, sub: { feedback: unknown } | null) => ({
    id: m.id,
    teamId: m.teamId,
    title: m.title,
    description: m.description,
    dueAt: m.dueAt,
    createdAt: m.createdAt,
    status: milestoneStatus(m.dueAt, sub && { hasFeedback: !!sub.feedback }, now()),
  });

  return {
    async list(user: CurrentUser, teamId: string) {
      await getTeamInScope(prisma, user, teamId);
      const rows = await prisma.milestone.findMany({
        where: { teamId },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
        include: { submission: { select: { feedback: { select: { id: true } } } } },
      });
      return rows.map((m) => dto(m, m.submission));
    },

    async create(user: CurrentUser, teamId: string, input: MilestoneInput) {
      await getTeamInScope(prisma, user, teamId);
      const r = validateMilestone(input, now());
      if (!r.ok) fail(r);
      const m = await prisma.milestone.create({
        data: {
          teamId,
          title: input.title.trim(),
          description: (input.description ?? '').trim(),
          dueAt: new Date(input.dueAt),
          createdById: user.id,
        },
      });
      return dto(m, null);
    },

    async get(user: CurrentUser, milestoneId: string) {
      const m = await loadMilestone(user, milestoneId);
      return { milestone: dto(m, m.submission), team: m.team, submission: m.submission };
    },

    async submit(user: CurrentUser, milestoneId: string, input: SubmissionInput) {
      const m = await loadMilestone(user, milestoneId);
      const v = validateSubmission(input);
      if (!v.ok) fail(v);
      const rule = canChangeSubmission(m, m.submission && { hasFeedback: !!m.submission.feedback }, now());
      if (!rule.ok) fail(rule);
      if (m.submission) throw new AppError(409, 'SUBMISSION_EXISTS', 'This milestone already has a submission; edit it instead');
      try {
        return await prisma.submission.create({
          data: {
            milestoneId: m.id,
            title: input.title.trim(),
            description: (input.description ?? '').trim(),
            link: input.link.trim(),
            submittedById: user.id,
          },
          select: submissionView,
        });
      } catch (e) {
        // Unique constraint on milestoneId catches concurrent submits (NFR-09).
        if (isUniqueViolation(e)) throw new AppError(409, 'SUBMISSION_EXISTS', 'This milestone already has a submission; edit it instead');
        throw e;
      }
    },

    async edit(user: CurrentUser, milestoneId: string, input: SubmissionInput) {
      const m = await loadMilestone(user, milestoneId);
      if (!m.submission) throw notFound();
      const v = validateSubmission(input);
      if (!v.ok) fail(v);
      const rule = canChangeSubmission(m, { hasFeedback: !!m.submission.feedback }, now());
      if (!rule.ok) fail(rule);
      // Conditional update guards against feedback arriving between the check and the write.
      const updated = await prisma.submission.updateMany({
        where: { id: m.submission.id, feedback: null },
        data: {
          title: input.title.trim(),
          description: (input.description ?? '').trim(),
          link: input.link.trim(),
          submittedById: user.id,
        },
      });
      if (updated.count === 0) fail({ ok: false, code: 'SUBMISSION_LOCKED' });
      return prisma.submission.findUniqueOrThrow({ where: { id: m.submission.id }, select: submissionView });
    },

    async addFeedback(user: CurrentUser, submissionId: string, comment: string) {
      if (!isUuid(submissionId)) throw notFound();
      const sub = await prisma.submission.findFirst({
        where: { id: submissionId, milestone: { team: teamScope(user) } },
        select: { id: true, feedback: { select: { id: true } } },
      });
      if (!sub) throw notFound();
      const text = comment.trim();
      if (text.length < 1 || text.length > 2000) {
        fail({ ok: false, code: 'VALIDATION_ERROR', fields: { comment: 'Feedback must be 1 to 2000 characters' } });
      }
      if (sub.feedback) throw new AppError(409, 'FEEDBACK_EXISTS', 'Feedback was already recorded for this submission');
      try {
        return await prisma.feedback.create({
          data: { submissionId: sub.id, authorId: user.id, comment: text },
          select: { id: true, comment: true, createdAt: true, author: person },
        });
      } catch (e) {
        if (isUniqueViolation(e)) throw new AppError(409, 'FEEDBACK_EXISTS', 'Feedback was already recorded for this submission');
        throw e;
      }
    },
  };
}
