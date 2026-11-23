// F-06a Revision request: TEST-U04, TEST-28..TEST-31, TEST-36 invariant (AC-24..AC-27, AC-35, FR-11, BR-10)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { seedTeams, seedUsers } from '../prisma/seed.js';
import { loginCookie } from './helpers.js';
import { validateRevisionRequestInput } from '../src/domain/revision.js';

const app = createApp();
const [SUP1, SUP2, S1] = seedUsers;
const [ALPHA] = seedTeams;

let sup1: string;
let sup2: string;
let s1: string;

beforeAll(async () => {
  [sup1, sup2, s1] = await Promise.all([
    loginCookie(app, SUP1.email),
    loginCookie(app, SUP2.email),
    loginCookie(app, S1.email),
  ]);
});

const get = (path: string, cookie: string) => request(app).get(path).set('Cookie', cookie);
const post = (path: string, cookie: string, body: unknown) =>
  request(app).post(path).set('Cookie', cookie).send(body as object);

const DAY = 86400000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();
const validBody = () => ({ reason: 'Add test evidence', dueAt: inDays(3) });
const revisionUrl = (submissionId: string) => `/api/submissions/${submissionId}/revision-request`;

// Milestone (+7d) + submission by S1 + optional feedback by Sup1, all through the API so v1 is created by the service.
async function fixture({ withFeedback = true } = {}) {
  const ms = await post(`/api/teams/${ALPHA.id}/milestones`, sup1, {
    title: `Revision ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dueAt: inDays(7),
  });
  expect(ms.status).toBe(201);
  const milestoneId = ms.body.milestone.id as string;
  const sub = await post(`/api/milestones/${milestoneId}/submission`, s1, {
    title: 'Sprint 2 demo',
    link: 'https://github.com/example/cpms/pull/70',
  });
  expect(sub.status).toBe(201);
  const submissionId = sub.body.submission.id as string;
  if (withFeedback) {
    const fb = await post(`/api/submissions/${submissionId}/feedback`, sup1, { comment: 'Tests are missing' });
    expect(fb.status).toBe(201);
  }
  return { milestoneId, submissionId };
}

describe('TEST-U04 validateRevisionRequestInput (AC-25, BR-10)', () => {
  const now = new Date('2026-11-24T00:00:00Z');
  const later = new Date(now.getTime() + 60000).toISOString();
  const check = (input: unknown) => validateRevisionRequestInput(input, now);

  it('TEST-U04 rejects bad reasons with fields.reason', () => {
    for (const reason of ['', '   ', 'x'.repeat(1001), 42, undefined]) {
      const res = check({ reason, dueAt: later });
      expect(res.success, String(reason)).toBe(false);
      if (!res.success) {
        expect(res.fields.reason).toBeDefined();
        expect(res.fields.dueAt).toBeUndefined();
      }
    }
  });

  it('TEST-U04 rejects bad dueAt with fields.dueAt (missing, not a date, now, now - 1s)', () => {
    const minus1s = new Date(now.getTime() - 1000).toISOString();
    for (const dueAt of [undefined, 'abc', now.toISOString(), minus1s]) {
      const res = check({ reason: 'ok', dueAt });
      expect(res.success, String(dueAt)).toBe(false);
      if (!res.success) {
        expect(res.fields.dueAt).toBeDefined();
        expect(res.fields.reason).toBeUndefined();
      }
    }
    const nonObject = check(null);
    expect(nonObject.success).toBe(false);
  });

  it('TEST-U04 accepts reasons of 1 and 1000 characters and dueAt now + 1 min; returns trimmed data', () => {
    for (const reason of ['x', 'x'.repeat(1000), '  Add tests  ']) {
      const res = check({ reason, dueAt: later });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.reason).toBe(reason.trim());
        expect(res.data.dueAt.toISOString()).toBe(later);
      }
    }
  });
});

describe('TEST-28..TEST-31 Revision request API (AC-24..AC-27)', () => {
  it('TEST-28 (AC-24) Sup1 requests a revision -> 201, stored, status REVISION_REQUESTED for S1 and Sup1', async () => {
    const { milestoneId, submissionId } = await fixture();
    const body = validBody();

    const res = await post(revisionUrl(submissionId), sup1, body);
    expect(res.status).toBe(201);
    const rr = res.body.revisionRequest;
    expect(rr.requestedBy).toEqual({ id: SUP1.id, name: SUP1.name });
    expect(rr.versionNumber).toBe(1);
    expect(rr.submissionId).toBe(submissionId);
    expect(rr.reason).toBe(body.reason);
    expect(rr.dueAt).toBe(body.dueAt);
    expect(rr.status).toBe('OPEN');

    const row = await prisma.revisionRequest.findFirst({ where: { submissionId }, include: { version: true } });
    expect(row?.reason).toBe(body.reason);
    expect(row?.dueAt.toISOString()).toBe(body.dueAt);
    expect(row?.requestedById).toBe(SUP1.id);
    expect(row?.version.versionNumber).toBe(1);

    for (const cookie of [s1, sup1]) {
      const detail = await get(`/api/milestones/${milestoneId}`, cookie);
      expect(detail.status).toBe(200);
      expect(detail.body.milestone.status).toBe('REVISION_REQUESTED');
      expect(detail.body.submission.currentVersion).toBe(1);
      expect(detail.body.submission.revisionRequest.reason).toBe(body.reason);
      expect(detail.body.submission.revisionRequest.status).toBe('OPEN');
      expect(detail.body.submission.feedback.versionNumber).toBe(1);

      const list = await get(`/api/teams/${ALPHA.id}/milestones`, cookie);
      const item = list.body.milestones.find((m: { id: string }) => m.id === milestoneId);
      expect(item.status).toBe('REVISION_REQUESTED');
    }
  });

  it('TEST-29 (AC-25) invalid bodies -> 400 VALIDATION_ERROR with fields, nothing stored; 1 and 1000 chars -> 201', async () => {
    const { submissionId } = await fixture();
    const before = await prisma.revisionRequest.count();
    const cases: [unknown, string][] = [
      [{ reason: '', dueAt: inDays(3) }, 'reason'],
      [{ reason: '   ', dueAt: inDays(3) }, 'reason'],
      [{ reason: 'x'.repeat(1001), dueAt: inDays(3) }, 'reason'],
      [{ reason: 'Add tests', dueAt: new Date(Date.now() - 1000).toISOString() }, 'dueAt'],
      [{ reason: 'Add tests', dueAt: 'abc' }, 'dueAt'],
      [{ reason: 'Add tests' }, 'dueAt'],
    ];
    for (const [body, field] of cases) {
      const res = await post(revisionUrl(submissionId), sup1, body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields[field]).toBeDefined();
    }
    expect(await prisma.revisionRequest.count()).toBe(before);

    for (const reason of ['x', 'x'.repeat(1000)]) {
      const fresh = await fixture();
      const res = await post(revisionUrl(fresh.submissionId), sup1, { reason, dueAt: inDays(3) });
      expect(res.status).toBe(201);
    }
  });

  it('TEST-30 (AC-26) no feedback -> 409 FEEDBACK_REQUIRED; second request (open or expired) -> 409 REVISION_EXISTS', async () => {
    const noFeedback = await fixture({ withFeedback: false });
    const res1 = await post(revisionUrl(noFeedback.submissionId), sup1, validBody());
    expect(res1.status).toBe(409);
    expect(res1.body.error.code).toBe('FEEDBACK_REQUIRED');
    expect(await prisma.revisionRequest.count({ where: { submissionId: noFeedback.submissionId } })).toBe(0);

    const { milestoneId, submissionId } = await fixture();
    expect((await post(revisionUrl(submissionId), sup1, validBody())).status).toBe(201);
    const res2 = await post(revisionUrl(submissionId), sup1, validBody());
    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('REVISION_EXISTS');

    // Expired request: due moved into the past directly in the DB (never by waiting)
    await prisma.revisionRequest.updateMany({ where: { submissionId }, data: { dueAt: new Date(Date.now() - DAY) } });
    const res3 = await post(revisionUrl(submissionId), sup1, validBody());
    expect(res3.status).toBe(409);
    expect(res3.body.error.code).toBe('REVISION_EXISTS');
    expect(await prisma.revisionRequest.count({ where: { submissionId } })).toBe(1);

    const detail = await get(`/api/milestones/${milestoneId}`, s1);
    expect(detail.body.milestone.status).toBe('FEEDBACK_GIVEN');
    expect(detail.body.submission.revisionRequest.status).toBe('EXPIRED');
  });

  it('TEST-30 (AC-26) two parallel requests store exactly one', async () => {
    const { submissionId } = await fixture();
    const results = await Promise.all([
      post(revisionUrl(submissionId), sup1, validBody()),
      post(revisionUrl(submissionId), sup1, validBody()),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409)!.body.error.code).toBe('REVISION_EXISTS');
    expect(await prisma.revisionRequest.count({ where: { submissionId } })).toBe(1);
  });

  it('TEST-31 (AC-27) S1 403, Sup2 404, malformed 404, unknown 404, no session 401; nothing stored', async () => {
    const { submissionId } = await fixture();
    const before = await prisma.revisionRequest.count();

    const student = await post(revisionUrl(submissionId), s1, validBody());
    expect(student.status).toBe(403);
    expect(student.body.error.code).toBe('FORBIDDEN');

    const other = await post(revisionUrl(submissionId), sup2, validBody());
    expect(other.status).toBe(404);
    expect(other.body.error.code).toBe('NOT_FOUND');

    expect((await post(revisionUrl('not-a-uuid'), sup1, validBody())).status).toBe(404);
    expect((await post(revisionUrl('6f0c0000-0000-4000-8000-000000000000'), sup1, validBody())).status).toBe(404);

    const anon = await request(app).post(revisionUrl(submissionId)).send(validBody());
    expect(anon.status).toBe(401);

    expect(await prisma.revisionRequest.count()).toBe(before);
  });
});

describe('TEST-36 (AC-35) version invariant after the flows above', () => {
  it('TEST-36 every Submission has its current version row and every Feedback points to a version', async () => {
    const submissions = await prisma.submission.findMany({ include: { versions: true } });
    expect(submissions.length).toBeGreaterThan(0);
    for (const s of submissions) {
      expect(s.versions.some((v) => v.versionNumber === s.currentVersion)).toBe(true);
    }
    const feedbacks = await prisma.feedback.findMany();
    expect(feedbacks.length).toBeGreaterThan(0);
    for (const f of feedbacks) expect(f.versionId).toBeTruthy();
  });
});
