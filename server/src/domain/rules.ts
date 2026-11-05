// Pure business rules for Sprint 1 (no I/O). Implemented after the tests (TDD).
export type Result<C extends string = string> = { ok: true } | { ok: false; code: C; fields?: Record<string, string> };

export type MilestoneInput = { title: string; description?: string; dueAt: string };
export type SubmissionInput = { title: string; description?: string; link: string };

export function validateMilestone(_input: MilestoneInput, _now: Date): Result<'VALIDATION_ERROR'> {
  throw new Error('not implemented');
}

export function validateSubmission(_input: SubmissionInput): Result<'VALIDATION_ERROR'> {
  throw new Error('not implemented');
}

export function canChangeSubmission(
  _milestone: { dueAt: Date },
  _submission: { hasFeedback: boolean } | null,
  _now: Date,
): Result<'DEADLINE_PASSED' | 'SUBMISSION_LOCKED'> {
  throw new Error('not implemented');
}
