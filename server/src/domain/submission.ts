// Pure domain logic for submissions (FR-07, FR-09, BR-06, BR-07, BR-09).
// Keeps domain rules independent of database and HTTP transport for fast, deterministic unit testing.

export type SubmissionInput = {
  title: string;
  description?: string | null;
  link: string;
};

export type SubmissionValidationResult =
  | { success: true; data: { title: string; description?: string; link: string } }
  | { success: false; fields: Record<string, string> };

export type ChangeSubmissionResult =
  | { allowed: true }
  | { allowed: false; reason: 'DEADLINE_PASSED' | 'SUBMISSION_LOCKED' };

// BR-09: title trimmed 3..120; description max 2000 (may be empty); link absolute http(s) URL max 500
export function validateSubmissionInput(_input: unknown): SubmissionValidationResult {
  // Stub for TDD red
  return { success: false, fields: {} };
}

// BR-06: now >= dueAt -> DEADLINE_PASSED; BR-07: submission has feedback -> SUBMISSION_LOCKED
export function canChangeSubmission(
  _milestone: { dueAt: Date | string },
  _submission: { hasFeedback?: boolean } | null | undefined,
  _now: Date = new Date(),
): ChangeSubmissionResult {
  // Stub for TDD red
  return { allowed: false, reason: 'DEADLINE_PASSED' };
}

