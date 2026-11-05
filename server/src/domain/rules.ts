// Pure business rules for Sprint 1 (no I/O), unit tested in tests/unit/rules.test.ts.
export type Result<C extends string = string> = { ok: true } | { ok: false; code: C; fields?: Record<string, string> };

export type MilestoneInput = { title: string; description?: string; dueAt: string };
export type SubmissionInput = { title: string; description?: string; link: string };

export const LIMITS = { titleMin: 3, titleMax: 120, descriptionMax: 2000, linkMax: 500, commentMax: 2000 } as const;

function checkTitle(title: string, fields: Record<string, string>) {
  const t = title.trim();
  if (t.length < LIMITS.titleMin || t.length > LIMITS.titleMax) {
    fields.title = `Title must be ${LIMITS.titleMin} to ${LIMITS.titleMax} characters`;
  }
}

function checkDescription(description: string | undefined, fields: Record<string, string>) {
  if ((description ?? '').length > LIMITS.descriptionMax) {
    fields.description = `Description must be at most ${LIMITS.descriptionMax} characters`;
  }
}

const done = (fields: Record<string, string>): Result<'VALIDATION_ERROR'> =>
  Object.keys(fields).length ? { ok: false, code: 'VALIDATION_ERROR', fields } : { ok: true };

/** BR-04: title 3..120, description <= 2000, due date strictly in the future. */
export function validateMilestone(input: MilestoneInput, now: Date): Result<'VALIDATION_ERROR'> {
  const fields: Record<string, string> = {};
  checkTitle(input.title, fields);
  checkDescription(input.description, fields);
  const due = new Date(input.dueAt);
  if (Number.isNaN(due.getTime())) fields.dueAt = 'Due date must be a valid date and time';
  else if (due.getTime() <= now.getTime()) fields.dueAt = 'Due date must be in the future';
  return done(fields);
}

/** BR-09: title 3..120, description <= 2000, absolute http(s) link <= 500 chars. */
export function validateSubmission(input: SubmissionInput): Result<'VALIDATION_ERROR'> {
  const fields: Record<string, string> = {};
  checkTitle(input.title, fields);
  checkDescription(input.description, fields);
  const link = input.link.trim();
  let valid = false;
  try {
    const url = new URL(link);
    valid = (url.protocol === 'http:' || url.protocol === 'https:') && link.length <= LIMITS.linkMax;
  } catch {
    valid = false;
  }
  if (!valid) fields.link = `Link must be an http or https URL of at most ${LIMITS.linkMax} characters`;
  return done(fields);
}

/** BR-06 deadline rule and BR-07 feedback lock. */
export function canChangeSubmission(
  milestone: { dueAt: Date },
  submission: { hasFeedback: boolean } | null,
  now: Date,
): Result<'DEADLINE_PASSED' | 'SUBMISSION_LOCKED'> {
  if (submission?.hasFeedback) return { ok: false, code: 'SUBMISSION_LOCKED' };
  if (now.getTime() >= milestone.dueAt.getTime()) return { ok: false, code: 'DEADLINE_PASSED' };
  return { ok: true };
}

export type MilestoneStatus = 'OPEN' | 'SUBMITTED' | 'FEEDBACK_GIVEN' | 'MISSED';

export function milestoneStatus(dueAt: Date, submission: { hasFeedback: boolean } | null, now: Date): MilestoneStatus {
  if (submission) return submission.hasFeedback ? 'FEEDBACK_GIVEN' : 'SUBMITTED';
  return now.getTime() >= dueAt.getTime() ? 'MISSED' : 'OPEN';
}
