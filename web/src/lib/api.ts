// Small fetch wrapper for the CPMS API (SDS section 4). Errors always arrive as
// { error: { code, message, fields? } } and are thrown as ApiError.
export type Role = 'STUDENT' | 'SUPERVISOR';
export type User = { id: string; email: string; name: string; role: Role };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

let onUnauthenticated: (() => void) | undefined;

// The auth provider registers this so a 401 from any call sends the user back to /login (design.md section 8).
export function setUnauthenticatedHandler(handler: (() => void) | undefined) {
  onUnauthenticated = handler;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const error = body?.error ?? {};
    const apiError = new ApiError(
      res.status,
      error.code ?? 'INTERNAL_ERROR',
      error.message ?? 'Something went wrong',
      error.fields,
    );
    if (res.status === 401 && apiError.code === 'UNAUTHENTICATED') onUnauthenticated?.();
    throw apiError;
  }
  return body as T;
}

export const roleLabel: Record<Role, string> = { STUDENT: 'Student', SUPERVISOR: 'Supervisor' };

export type TeamMember = { id: string; name: string; email: string };
export type Team = {
  id: string;
  name: string;
  supervisor: { id: string; name: string };
  members: TeamMember[];
};

export type MilestoneStatus = 'OPEN' | 'SUBMITTED' | 'FEEDBACK_GIVEN' | 'REVISION_REQUESTED' | 'MISSED';

// F-09 GET /api/teams/:teamId/board
export type BoardCard = {
  id: string;
  title: string;
  dueAt: string;
  status: MilestoneStatus;
  closedAt: string | null;
  lateAt: string | null;
  versionNumber: number | null;
  score: number | null;
};

export type ProgressBoard = {
  team: { id: string; name: string };
  summary: {
    total: number;
    byStatus: Record<MilestoneStatus, number>;
    closed: number;
    graded: number;
    averageScore: number | null;
  };
  columns: { status: MilestoneStatus; cards: BoardCard[] }[];
};

export type Milestone = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  closedAt: string | null;
  closedBy: { id: string; name: string } | null;
  status: MilestoneStatus;
  /** Lab 7 BR-06 v2: dueAt + 24 h, last moment a late version 1 is accepted. */
  graceEndsAt: string;
  /** Team list only: lateAt of the submission (null = none or on time). */
  lateAt?: string | null;
};

export type Feedback = {
  id: string;
  comment: string;
  createdAt: string;
  author: { id: string; name: string };
  versionNumber: number;
};

// F-06: revision request on the current version; status is derived by the server.
export type RevisionRequest = {
  id: string;
  submissionId: string;
  versionNumber: number;
  reason: string;
  dueAt: string;
  status: 'OPEN' | 'EXPIRED' | 'RESUBMITTED';
  requestedBy: { id: string; name: string };
  createdAt: string;
};

// F-08: one grade per submission (BR-12).
export type Grade = {
  score: number;
  versionNumber: number;
  gradedBy: { id: string; name: string };
  gradedAt: string;
  updatedAt: string;
};

export type Submission = {
  id: string;
  milestoneId: string;
  title: string;
  description: string | null;
  link: string;
  createdBy: { id: string; name: string };
  submittedBy: { id: string; name: string };
  submittedAt: string;
  updatedAt: string;
  currentVersion: number;
  /** End of the edit window of the current version: milestone due + 24 h grace for v1, revision due for v >= 2 (BR-11). */
  editableUntil: string;
  /** Lab 7 BR-06 v2: first save at or after the due time; null = on time. */
  lateAt: string | null;
  feedback: Feedback | null;
  revisionRequest: RevisionRequest | null;
  grade: Grade | null;
};

// F-06c: GET /api/submissions/:id/history, versions oldest first
export type SubmissionVersionView = {
  versionNumber: number;
  title: string;
  description: string | null;
  link: string;
  submittedBy: { id: string; name: string };
  submittedAt: string;
  updatedAt: string;
  feedback: Omit<Feedback, 'versionNumber'> | null;
  revisionRequest: Omit<RevisionRequest, 'submissionId' | 'versionNumber'> | null;
};

export type SubmissionHistory = {
  submission: { id: string; milestoneId: string; createdBy: { id: string; name: string } };
  versions: SubmissionVersionView[];
};

export type MilestoneDetail = {
  milestone: Milestone;
  team: { id: string; name: string };
  submission: Submission | null;
};

export function formatBangkokDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')}`;
}

// F-07: converts a UTC ISO string to "YYYY-MM-DDTHH:mm" in Asia/Bangkok for <input type="datetime-local"> prefill & dirty checks.
export function toBangkokDateTimeLocal(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}
