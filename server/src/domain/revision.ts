// F-06a Revision request domain rules (FR-11, BR-10). TDD red stub, implemented in the green commit.
export type RevisionRequestValidation =
  | { success: true; data: { reason: string; dueAt: Date } }
  | { success: false; fields: Record<string, string> };

export function validateRevisionRequestInput(_input: unknown, _now: Date = new Date()): RevisionRequestValidation {
  throw new Error('not implemented');
}
