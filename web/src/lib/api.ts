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

export type MilestoneStatus = 'OPEN' | 'SUBMITTED' | 'FEEDBACK_GIVEN' | 'MISSED';

export type Milestone = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  status: MilestoneStatus;
};

export type Submission = {
  id: string;
  milestoneId: string;
  title: string;
  description: string | null;
  link: string;
  submittedBy: { id: string; name: string };
  submittedAt: string;
  updatedAt: string;
  feedback: null | unknown;
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
