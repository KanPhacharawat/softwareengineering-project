// F-05 Feedback domain logic (FR-10, BR-08)
export type FeedbackValidationResult =
  | { success: true; data: { comment: string } }
  | { success: false; fields: Record<string, string> };

// BR-08: comment 1..2000 chars after trim
export function validateFeedbackInput(input: unknown): FeedbackValidationResult {
  const fields: Record<string, string> = {};

  if (!input || typeof input !== 'object') {
    return { success: false, fields: { comment: 'Invalid feedback data' } };
  }

  const raw = input as Record<string, unknown>;

  if (typeof raw.comment !== 'string') {
    fields.comment = 'Comment is required';
  } else {
    const trimmed = raw.comment.trim();
    if (!trimmed) {
      fields.comment = 'Comment is required';
    } else if (trimmed.length > 2000) {
      fields.comment = 'Comment cannot exceed 2000 characters';
    } else {
      return { success: true, data: { comment: trimmed } };
    }
  }

  return { success: false, fields };
}
