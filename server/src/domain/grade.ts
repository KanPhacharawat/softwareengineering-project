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

// Stubs for TDD RED (#71): implemented in the GREEN commit.
export function validateGradeInput(_input: unknown): GradeValidationResult {
  throw new Error('not implemented');
}

export function canGrade(_state: CanGradeInput): CanGradeResult {
  throw new Error('not implemented');
}
