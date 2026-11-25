import request from 'supertest';
import type { Express } from 'express';
import { SEED_PASSWORD, seedTeams } from '../prisma/seed.js';

// Logs in a seeded user and returns the `cpms.sid=...` cookie to send with later requests.
export async function loginCookie(app: Express, email: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password: SEED_PASSWORD });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status}`);
  const raw = res.headers['set-cookie'] as unknown as string[];
  return raw.find((c) => c.startsWith('cpms.sid='))!.split(';')[0];
}

const DAY = 86400000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

// F-06 fixture through the API: Alpha milestone (+7d) -> S1 submission (v1) -> Sup1 feedback -> Sup1 revision request (+3d).
export async function createRevisionRequestedSubmission(
  app: Express,
  cookies: { sup1: string; s1: string },
  { withRequest = true } = {},
) {
  const post = async (path: string, cookie: string, body: object) => {
    const res = await request(app).post(path).set('Cookie', cookie).send(body);
    if (res.status !== 201) throw new Error(`POST ${path} -> ${res.status} ${JSON.stringify(res.body)}`);
    return res.body;
  };
  const { milestone } = await post(`/api/teams/${seedTeams[0].id}/milestones`, cookies.sup1, {
    title: `Resubmit ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dueAt: inDays(7),
  });
  const { submission } = await post(`/api/milestones/${milestone.id}/submission`, cookies.s1, {
    title: 'Sprint 2 demo',
    link: 'https://github.com/example/cpms/pull/70',
  });
  await post(`/api/submissions/${submission.id}/feedback`, cookies.sup1, { comment: 'Tests are missing' });
  const revisionDueAt = inDays(3);
  if (withRequest) {
    await post(`/api/submissions/${submission.id}/revision-request`, cookies.sup1, {
      reason: 'Add test evidence',
      dueAt: revisionDueAt,
    });
  }
  return { milestoneId: milestone.id as string, submissionId: submission.id as string, revisionDueAt };
}
