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

// BR-06: now >= dueAt -> DEADLINE_PASSED; BR-07: submission has feedback -> SUBMISSION_LOCKED
export function canChangeSubmission(
  milestone: { dueAt: Date | string },
  submission?: { hasFeedback?: boolean; feedback?: unknown; [key: string]: unknown } | null,
  now: Date = new Date(),
): ChangeSubmissionResult {
  const due = new Date(milestone.dueAt).getTime();
  if (now.getTime() >= due) {
    return { allowed: false, reason: 'DEADLINE_PASSED' };
  }

  if (submission?.hasFeedback || (submission?.feedback !== undefined && submission?.feedback !== null)) {
    return { allowed: false, reason: 'SUBMISSION_LOCKED' };
  }

  return { allowed: true };
}
