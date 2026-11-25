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
  | { allowed: false; reason: 'MILESTONE_CLOSED' | 'DEADLINE_PASSED' | 'SUBMISSION_LOCKED' };

// BR-09: title trimmed 3..120; description max 2000 (may be empty); link absolute http(s) URL max 500
export function validateSubmissionInput(input: unknown): SubmissionValidationResult {
  const fields: Record<string, string> = {};

  if (!input || typeof input !== 'object') {
    return { success: false, fields: { form: 'Invalid submission data' } };
  }

  const raw = input as Record<string, unknown>;

  // Title: trimmed 3..120
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) {
    fields.title = 'Title is required';
  } else if (title.length < 3 || title.length > 120) {
    fields.title = 'Title must be between 3 and 120 characters';
  }

  // Description: optional, max 2000
  let description: string | undefined;
  if (typeof raw.description === 'string') {
    const trimmedDesc = raw.description.trim();
    if (trimmedDesc.length > 2000) {
      fields.description = 'Description cannot exceed 2000 characters';
    } else {
      description = trimmedDesc || undefined;
    }
  }

  // Link: absolute http/https URL, max 500
  if (typeof raw.link !== 'string' || !raw.link.trim()) {
    fields.link = 'Link is required';
  } else {
    const trimmedLink = raw.link.trim();
    if (trimmedLink.length > 500) {
      fields.link = 'Link cannot exceed 500 characters';
    } else {
      try {
        const parsed = new URL(trimmedLink);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          fields.link = 'Link must be an http or https URL';
        }
      } catch {
        fields.link = 'Link must be a valid URL';
      }
    }
  }

  if (Object.keys(fields).length > 0) {
    return { success: false, fields };
  }

  return {
    success: true,
    data: {
      title,
      description,
      link: (raw.link as string).trim(),
    },
  };
}

// BR-13 (F-07): closedAt !== null -> MILESTONE_CLOSED (checked first);
// BR-06 v2 (Lab 7 CR-01): now >= dueAt + 24 h (version 1) -> DEADLINE_PASSED; BR-07: current version has feedback -> SUBMISSION_LOCKED.
// BR-11 (F-06): version >= 2 uses the revision due of the request on the previous version instead of the milestone due.
export function canChangeSubmission(
  milestone: { dueAt: Date | string; closedAt: Date | string | null },
  submission?: { feedback?: unknown; versionNumber?: number; revisionDueAt?: Date | null } | null,
  now: Date = new Date(),
): ChangeSubmissionResult {
  if (milestone.closedAt !== null) {
    return { allowed: false, reason: 'MILESTONE_CLOSED' };
  }

  if (now.getTime() >= effectiveDueAt(milestone, submission).getTime()) {
    return { allowed: false, reason: 'DEADLINE_PASSED' };
  }

  if (submission?.feedback) {
    return { allowed: false, reason: 'SUBMISSION_LOCKED' };
  }

  return { allowed: true };
}

// BR-06 v2: version 1 may still be saved for 24 h after the milestone due time (marked late).
export const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

export function graceEndsAt(dueAt: Date | string): Date {
  return new Date(new Date(dueAt).getTime() + GRACE_PERIOD_MS);
}

// Last instant (exclusive) a save is accepted: revision due for v>=2 (no grace, BR-11), else dueAt + grace.
export function effectiveDueAt(
  milestone: { dueAt: Date | string },
  submission?: { versionNumber?: number; revisionDueAt?: Date | null } | null,
): Date {
  const revisionDue = (submission?.versionNumber ?? 1) >= 2 ? submission?.revisionDueAt : null;
  return revisionDue ? new Date(revisionDue) : graceEndsAt(milestone.dueAt);
}
