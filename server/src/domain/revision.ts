// F-06a Revision request domain rules (FR-11, BR-10). Pure functions, no DB.
export type RevisionRequestValidation =
  | { success: true; data: { reason: string; dueAt: Date } }
  | { success: false; fields: Record<string, string> };

export type RevisionStatus = 'OPEN' | 'EXPIRED' | 'RESUBMITTED';

// BR-10: reason trimmed 1..1000; dueAt ISO date strictly after `now` (server time decides).
export function validateRevisionRequestInput(input: unknown, now: Date = new Date()): RevisionRequestValidation {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const fields: Record<string, string> = {};

  const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
  if (!reason) fields.reason = 'Reason is required';
  else if (reason.length > 1000) fields.reason = 'Reason cannot exceed 1000 characters';

  const ts = typeof raw.dueAt === 'string' && raw.dueAt ? Date.parse(raw.dueAt) : undefined;
  if (ts === undefined) fields.dueAt = 'Revision due is required';
  else if (Number.isNaN(ts)) fields.dueAt = 'Invalid revision due';
  else if (ts <= now.getTime()) fields.dueAt = 'Revision due must be in the future';

  if (Object.keys(fields).length > 0) return { success: false, fields };
  return { success: true, data: { reason, dueAt: new Date(ts!) } };
}

// Derived, never stored: RESUBMITTED when a newer version exists, else OPEN before dueAt, else EXPIRED.
export function revisionStatus(request: { dueAt: Date }, hasNewerVersion: boolean, now: Date = new Date()): RevisionStatus {
  if (hasNewerVersion) return 'RESUBMITTED';
  return now.getTime() < request.dueAt.getTime() ? 'OPEN' : 'EXPIRED';
}

// W1: the current version needs feedback and no request yet (an expired request still counts, contract decision 7).
export function canRequestRevision(current: { feedback?: unknown; revisionRequest?: unknown } | null | undefined):
  | { allowed: true }
  | { allowed: false; reason: 'FEEDBACK_REQUIRED' | 'REVISION_EXISTS' } {
  if (!current?.feedback) return { allowed: false, reason: 'FEEDBACK_REQUIRED' };
  if (current.revisionRequest) return { allowed: false, reason: 'REVISION_EXISTS' };
  return { allowed: true };
}
