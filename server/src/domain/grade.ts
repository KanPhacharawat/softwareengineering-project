// F-08 Grading domain rules (FR-15, BR-12, AC-44, AC-45). Pure functions, no DB.
import type { RevisionStatus } from './revision.js';

export type GradeValidationResult =
  | { success: true; data: { score: number } }
  | { success: false; fields: { score: string } };

export type CanGradeInput = {
  currentVersionHasFeedback: boolean;
  revisionRequestStatus: RevisionStatus | null;
  milestoneClosed: boolean;
};

export type CanGradeResult =
  | { allowed: true }
  | { allowed: false; reason: 'FEEDBACK_REQUIRED' | 'REVISION_PENDING' };

const SCORE_ERROR = 'Score must be a whole number from 0 to 100';

// BR-12: JSON integer 0..100 (rejects strings, decimals, booleans, null, NaN, out-of-range).
export function validateGradeInput(input: unknown): GradeValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { success: false, fields: { score: SCORE_ERROR } };
  }
  const raw = input as Record<string, unknown>;
  const score = raw.score;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 100) {
    return { success: false, fields: { score: SCORE_ERROR } };
  }
  return { success: true, data: { score } };
}

// F-08 Decision 3: feedback on current version required first; OPEN revision blocks only on an unclosed milestone.
export function canGrade(state: CanGradeInput): CanGradeResult {
  if (!state.currentVersionHasFeedback) {
    return { allowed: false, reason: 'FEEDBACK_REQUIRED' };
  }
  if (state.revisionRequestStatus === 'OPEN' && !state.milestoneClosed) {
    return { allowed: false, reason: 'REVISION_PENDING' };
  }
  return { allowed: true };
}
