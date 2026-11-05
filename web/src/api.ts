export type Role = 'STUDENT' | 'SUPERVISOR';
export type User = { id: string; email: string; name: string; role: Role };
export type Person = { id: string; name: string };
export type Team = { id: string; name: string; supervisor: Person; members: (Person & { email: string })[] };
export type MilestoneStatus = 'OPEN' | 'SUBMITTED' | 'FEEDBACK_GIVEN' | 'MISSED';
export type Milestone = { id: string; teamId: string; title: string; description: string; dueAt: string; status: MilestoneStatus };
export type Feedback = { id: string; comment: string; createdAt: string; author: Person };
export type Submission = {
  id: string; title: string; description: string; link: string;
  submittedAt: string; updatedAt: string; submittedBy: Person; feedback: Feedback | null;
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: Record<string, string> = {}) {
    super(message);
  }
}

/** Fetch wrapper: same-origin JSON, session cookie, uniform error shape. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? 'GET',
    credentials: 'same-origin',
    headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.error ?? {};
    if (res.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event('cpms:unauthenticated'));
    throw new ApiError(res.status, e.code ?? 'ERROR', e.message ?? 'Request failed', e.fields);
  }
  return data as T;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' });
