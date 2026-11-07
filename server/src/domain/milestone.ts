// F-03 Milestone domain rules (BR-04, FR-05, FR-06)
export type MilestoneStatus = 'OPEN' | 'SUBMITTED' | 'FEEDBACK_GIVEN' | 'MISSED';

export type ValidatedMilestoneData = {
  title: string;
  description?: string;
  dueAt: Date;
};

export type ValidationResult =
  | { success: true; data: ValidatedMilestoneData }
  | { success: false; fields: Record<string, string> };

// BR-04: title trimmed 3..120, description <= 2000, dueAt valid ISO and in the future relative to `now`.
export function validateMilestoneInput(input: unknown, now: Date = new Date()): ValidationResult {
  const fields: Record<string, string> = {};
  const record = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;

  const rawTitle = typeof record.title === 'string' ? record.title.trim() : '';
  if (!rawTitle || rawTitle.length < 3 || rawTitle.length > 120) {
    fields.title = 'Title must be between 3 and 120 characters';
  }

  let description: string | undefined = undefined;
  if (record.description !== undefined && record.description !== null) {
    if (typeof record.description === 'string') {
      const trimmedDesc = record.description.trim();
      if (trimmedDesc.length > 2000) {
        fields.description = 'Description cannot exceed 2000 characters';
      } else if (trimmedDesc.length > 0) {
        description = trimmedDesc;
      }
    } else {
      fields.description = 'Description must be text';
    }
  }

  let dueAt: Date | undefined;
  if (!record.dueAt || typeof record.dueAt !== 'string') {
    fields.dueAt = 'Due date is required';
  } else {
    const timestamp = Date.parse(record.dueAt);
    if (isNaN(timestamp)) {
      fields.dueAt = 'Invalid due date';
    } else {
      const parsed = new Date(timestamp);
      if (parsed.getTime() <= now.getTime()) {
        fields.dueAt = 'Due date must be in the future';
      } else {
        dueAt = parsed;
      }
    }
  }

  if (Object.keys(fields).length > 0 || !dueAt) {
    return { success: false, fields };
  }

  return {
    success: true,
    data: {
      title: rawTitle,
      description,
      dueAt,
    },
  };
}

// F-03 status computation:
// - SUBMITTED / FEEDBACK_GIVEN when submission exists (F-04/F-05)
// - OPEN before due date with no submission
// - MISSED past due date with no submission
export function computeMilestoneStatus(
  milestone: { dueAt: Date | string },
  submission?: { feedback?: unknown } | null,
  now: Date = new Date(),
): MilestoneStatus {
  if (submission) {
    return submission.feedback ? 'FEEDBACK_GIVEN' : 'SUBMITTED';
  }
  const due = typeof milestone.dueAt === 'string' ? new Date(milestone.dueAt) : milestone.dueAt;
  return now.getTime() > due.getTime() ? 'MISSED' : 'OPEN';
}
