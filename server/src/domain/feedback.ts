// F-05 Feedback domain logic (FR-10, BR-08)
export type FeedbackValidationResult =
  | { success: true; data: { comment: string } }
  | { success: false; fields: Record<string, string> };

// BR-08: comment 1..2000 chars after trim
export function validateFeedbackInput(_input: unknown): FeedbackValidationResult {
  return { success: false, fields: { comment: 'Not implemented' } };
}

