// F-07 Milestone management (edit and close): TEST-U06, TEST-39..TEST-44 (AC-36..AC-42, FR-14, BR-13, BR-04, BR-06)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { seedTeams, seedUsers } from '../prisma/seed.js';
import { createRevisionRequestedSubmission, loginCookie } from './helpers.js';
import { validateMilestoneUpdate } from '../src/domain/milestone.js';
import { canChangeSubmission } from '../src/domain/submission.js';

const app = createApp();
const [SUP1, SUP2, S1, S2] = seedUsers;
const [ALPHA] = seedTeams;

let sup1: string;
let sup2: string;
let s1: string;
let s2: string;

beforeAll(async () => {
  [sup1, sup2, s1, s2] = await Promise.all([SUP1, SUP2, S1, S2].map((u) => loginCookie(app, u.email)));
});

const get = (path: string, cookie: string) => request(app).get(path).set('Cookie', cookie);
const post = (path: string, cookie: string, body?: object) =>
  body === undefined ? request(app).post(path).set('Cookie', cookie) : request(app).post(path).set('Cookie', cookie).send(body);
const put = (path: string, cookie: string, body: object) => request(app).put(path).set('Cookie', cookie).send(body);
const patch = (path: string, cookie: string, body: unknown) =>
  request(app).patch(path).set('Cookie', cookie).send(body as object);

const DAY = 86400000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

async function createAlphaMilestone(daysAhead = 7) {
  const res = await post(`/api/teams/${ALPHA.id}/milestones`, sup1, {
    title: `F07 Milestone ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: 'Initial description',
    dueAt: inDays(daysAhead),
  });
  expect(res.status).toBe(201);
  return res.body.milestone as { id: string; title: string; description: string | null; dueAt: string };
}

describe('TEST-U06 validateMilestoneUpdate & canChangeSubmission closed check (AC-37, AC-39)', () => {
  const fixedNow = new Date('2026-11-24T12:00:00.000Z');
  const futureIso = new Date(fixedNow.getTime() + 60_000).toISOString();
  const pastIso = new Date(fixedNow.getTime() - 1_000).toISOString();

  it('TEST-U06 rejects empty, unknown-only, and non-object bodies with fields.form', () => {
    for (const body of [{}, { foo: 'bar' }, null, [], 'text']) {
      const res = validateMilestoneUpdate(body, fixedNow);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.fields.form).toBe('At least one field is required');
    }
  });

  it('TEST-U06 validates partial title, description, and dueAt boundaries', () => {
    for (const title of ['ab', '  ab  ', 'x'.repeat(121), null, 42]) {
      const res = validateMilestoneUpdate({ title }, fixedNow);
      expect(res.success, String(title)).toBe(false);
      if (!res.success) expect(res.fields.title).toBe('Title must be between 3 and 120 characters');
    }
    for (const title of ['abc', 'x'.repeat(120)]) {
      const res = validateMilestoneUpdate({ title }, fixedNow);
      expect(res.success).toBe(true);
    }

    const desc2000 = validateMilestoneUpdate({ description: 'd'.repeat(2000) }, fixedNow);
    expect(desc2000.success).toBe(true);
    const desc2001 = validateMilestoneUpdate({ description: 'd'.repeat(2001) }, fixedNow);
    expect(desc2001.success).toBe(false);
    if (!desc2001.success) expect(desc2001.fields.description).toBe('Description cannot exceed 2000 characters');

    for (const emptyDesc of ['', '   ', null]) {
      const res = validateMilestoneUpdate({ description: emptyDesc }, fixedNow);
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.description).toBeNull();
    }

    for (const dueAt of [fixedNow.toISOString(), pastIso, 'not-a-date', null]) {
      const res = validateMilestoneUpdate({ dueAt }, fixedNow);
      expect(res.success, String(dueAt)).toBe(false);
      if (!res.success) expect(res.fields.dueAt).toBeDefined();
    }
    const validDue = validateMilestoneUpdate({ dueAt: futureIso }, fixedNow);
    expect(validDue.success).toBe(true);
  });

  it('TEST-U06 canChangeSubmission returns MILESTONE_CLOSED before DEADLINE_PASSED', () => {
    const milestone = { dueAt: pastIso, closedAt: new Date(fixedNow.getTime() - 5_000) } as Parameters<
      typeof canChangeSubmission
    >[0];
    expect(canChangeSubmission(milestone, null, fixedNow)).toEqual({
      allowed: false,
      reason: 'MILESTONE_CLOSED',
    });
  });
});

describe('TEST-39..TEST-44 Milestone edit and close API (AC-36..AC-40, AC-42)', () => {
  it('TEST-39 (AC-36) Sup1 PATCHes title, description, dueAt -> 200, DB updated, S1 GET sees new values', async () => {
    const ms = await createAlphaMilestone(7);
    const newDue = inDays(10);

    const res = await patch(`/api/milestones/${ms.id}`, sup1, {
      title: 'Updated Sprint 2 Demo',
      description: 'Updated scope details',
      dueAt: newDue,
    });
    expect(res.status).toBe(200);
    expect(res.body.milestone).toMatchObject({
      id: ms.id,
      title: 'Updated Sprint 2 Demo',
      description: 'Updated scope details',
      dueAt: newDue,
      closedAt: null,
      closedBy: null,
      status: 'OPEN',
    });

    const row = await prisma.milestone.findUniqueOrThrow({ where: { id: ms.id } });
    expect(row.title).toBe('Updated Sprint 2 Demo');
    expect(row.description).toBe('Updated scope details');
    expect(row.dueAt.toISOString()).toBe(newDue);

    const detail = await get(`/api/milestones/${ms.id}`, s1);
    expect(detail.status).toBe(200);
    expect(detail.body.milestone).toMatchObject({
      title: 'Updated Sprint 2 Demo',
      description: 'Updated scope details',
      dueAt: newDue,
      closedAt: null,
      closedBy: null,
    });

    const list = await get(`/api/teams/${ALPHA.id}/milestones`, s1);
    const item = list.body.milestones.find((m: { id: string }) => m.id === ms.id);
    expect(item).toMatchObject({ title: 'Updated Sprint 2 Demo', closedAt: null, closedBy: null });
  });

  it('TEST-40 (AC-37) invalid PATCH bodies -> 400 + fields, row unchanged; valid 3/120 titles and clear description -> 200', async () => {
    const ms = await createAlphaMilestone(7);
    const before = await prisma.milestone.findUniqueOrThrow({ where: { id: ms.id } });

    const invalidCases: [unknown, string][] = [
      [{ title: 'ab' }, 'title'],
      [{ title: 'x'.repeat(121) }, 'title'],
      [{ title: null }, 'title'],
      [{ description: 'd'.repeat(2001) }, 'description'],
      [{ dueAt: new Date(Date.now() - 1000).toISOString() }, 'dueAt'],
      [{ dueAt: 'not-a-date' }, 'dueAt'],
      [{ dueAt: null }, 'dueAt'],
      [{}, 'form'],
    ];

    for (const [body, field] of invalidCases) {
      const res = await patch(`/api/milestones/${ms.id}`, sup1, body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields[field]).toBeDefined();
    }
    expect(await prisma.milestone.findUniqueOrThrow({ where: { id: ms.id } })).toEqual(before);

    expect((await patch(`/api/milestones/${ms.id}`, sup1, { title: 'abc' })).status).toBe(200);
    expect((await patch(`/api/milestones/${ms.id}`, sup1, { title: 'x'.repeat(120) })).status).toBe(200);
    expect((await patch(`/api/milestones/${ms.id}`, sup1, { description: '' })).status).toBe(200);
    expect((await prisma.milestone.findUniqueOrThrow({ where: { id: ms.id } })).description).toBeNull();
    expect((await patch(`/api/milestones/${ms.id}`, sup1, { description: 'temp' })).status).toBe(200);
    expect((await patch(`/api/milestones/${ms.id}`, sup1, { description: null })).status).toBe(200);
    expect((await prisma.milestone.findUniqueOrThrow({ where: { id: ms.id } })).description).toBeNull();
  });

  it('TEST-41 (AC-38) Sup1 closes milestone -> 200; close again -> 409; PATCH closed -> 409; parallel closes -> one 200 + one 409', async () => {
    const ms = await createAlphaMilestone(7);

    const close1 = await post(`/api/milestones/${ms.id}/close`, sup1);
    expect(close1.status).toBe(200);
    expect(close1.body.milestone.closedAt).toBeTruthy();
    expect(close1.body.milestone.closedBy).toEqual({ id: SUP1.id, name: SUP1.name });

    const close2 = await post(`/api/milestones/${ms.id}/close`, sup1);
    expect(close2.status).toBe(409);
    expect(close2.body.error.code).toBe('MILESTONE_CLOSED');

    const editClosed = await patch(`/api/milestones/${ms.id}`, sup1, { title: 'After close' });
    expect(editClosed.status).toBe(409);
    expect(editClosed.body.error.code).toBe('MILESTONE_CLOSED');

    const fresh = await createAlphaMilestone(7);
    const parallel = await Promise.all([
      post(`/api/milestones/${fresh.id}/close`, sup1),
      post(`/api/milestones/${fresh.id}/close`, sup1),
    ]);
    expect(parallel.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(parallel.find((r) => r.status === 409)!.body.error.code).toBe('MILESTONE_CLOSED');
  });

  it('TEST-42 (AC-39) closed milestone blocks submit, edit, resubmit, revision-request (409 MILESTONE_CLOSED) but allows feedback (201)', async () => {
    // (1) Empty milestone -> close -> S1 POST submission -> 409
    const emptyMs = await createAlphaMilestone(7);
    expect((await post(`/api/milestones/${emptyMs.id}/close`, sup1)).status).toBe(200);
    const subOnClosed = await post(`/api/milestones/${emptyMs.id}/submission`, s1, {
      title: 'Late submit',
      link: 'https://example.com/late',
    });
    expect(subOnClosed.status).toBe(409);
    expect(subOnClosed.body.error.code).toBe('MILESTONE_CLOSED');
    expect(await prisma.submission.count({ where: { milestoneId: emptyMs.id } })).toBe(0);

    // (2) Submission without feedback -> close -> S1 PUT -> 409; Sup1 feedback -> 201
    const unreviewedMs = await createAlphaMilestone(7);
    const createdSub = await post(`/api/milestones/${unreviewedMs.id}/submission`, s1, {
      title: 'Initial work',
      link: 'https://example.com/init',
    });
    expect(createdSub.status).toBe(201);
    const unreviewedSubId = createdSub.body.submission.id as string;
    expect((await post(`/api/milestones/${unreviewedMs.id}/close`, sup1)).status).toBe(200);

    const putOnClosed = await put(`/api/milestones/${unreviewedMs.id}/submission`, s1, {
      title: 'Edited after close',
      link: 'https://example.com/edited',
    });
    expect(putOnClosed.status).toBe(409);
    expect(putOnClosed.body.error.code).toBe('MILESTONE_CLOSED');

    const fbOnClosed = await post(`/api/submissions/${unreviewedSubId}/feedback`, sup1, {
      comment: 'Marking after close',
    });
    expect(fbOnClosed.status).toBe(201);

    // (3) Submission + feedback + open revision request -> close -> S2 POST versions -> 409
    const revFixture = await createRevisionRequestedSubmission(app, { sup1, s1 });
    expect((await post(`/api/milestones/${revFixture.milestoneId}/close`, sup1)).status).toBe(200);
    const resubmitClosed = await post(`/api/submissions/${revFixture.submissionId}/versions`, s2, {
      title: 'Resubmit after close',
      link: 'https://example.com/v2',
    });
    expect(resubmitClosed.status).toBe(409);
    expect(resubmitClosed.body.error.code).toBe('MILESTONE_CLOSED');
    expect(await prisma.submissionVersion.count({ where: { submissionId: revFixture.submissionId } })).toBe(1);
    const revDetail = await get(`/api/milestones/${revFixture.milestoneId}`, s1);
    expect(revDetail.body.milestone.closedAt).toBeTruthy();

    // (4) Submission + feedback (no request) -> close -> Sup1 POST revision-request -> 409
    const fbFixture = await createRevisionRequestedSubmission(app, { sup1, s1 }, { withRequest: false });
    expect((await post(`/api/milestones/${fbFixture.milestoneId}/close`, sup1)).status).toBe(200);
    const revReqClosed = await post(`/api/submissions/${fbFixture.submissionId}/revision-request`, sup1, {
      reason: 'Please revise',
      dueAt: inDays(3),
    });
    expect(revReqClosed.status).toBe(409);
    expect(revReqClosed.body.error.code).toBe('MILESTONE_CLOSED');
    expect(await prisma.revisionRequest.count({ where: { submissionId: fbFixture.submissionId } })).toBe(0);

    // (5) Parallel close + submit: never a submission created after closedAt
    const raceMs = await createAlphaMilestone(7);
    const [closeRes, submitRes] = await Promise.all([
      post(`/api/milestones/${raceMs.id}/close`, sup1),
      post(`/api/milestones/${raceMs.id}/submission`, s1, {
        title: 'Race submit',
        link: 'https://example.com/race',
      }),
    ]);
    expect(closeRes.status).toBe(200);
    expect([201, 409]).toContain(submitRes.status);
    if (submitRes.status === 409) {
      expect(submitRes.body.error.code).toBe('MILESTONE_CLOSED');
      expect(await prisma.submission.count({ where: { milestoneId: raceMs.id } })).toBe(0);
    } else {
      const savedSub = await prisma.submission.findUniqueOrThrow({ where: { milestoneId: raceMs.id } });
      expect(savedSub.submittedAt.getTime()).toBeLessThanOrEqual(new Date(closeRes.body.milestone.closedAt).getTime());
    }
  });

  it('TEST-43 (AC-40) S1 403, Sup2 404, malformed 404, no cookie 401; DB row unchanged', async () => {
    const ms = await createAlphaMilestone(7);
    const before = await prisma.milestone.findUniqueOrThrow({ where: { id: ms.id } });

    expect((await patch(`/api/milestones/${ms.id}`, s1, { title: 'Hacked' })).status).toBe(403);
    expect((await post(`/api/milestones/${ms.id}/close`, s1)).status).toBe(403);
    expect((await patch(`/api/milestones/${ms.id}`, sup2, { title: 'Other sup' })).status).toBe(404);
    expect((await post(`/api/milestones/${ms.id}/close`, sup2)).status).toBe(404);
    expect((await patch('/api/milestones/not-a-uuid', sup1, { title: 'Bad id' })).status).toBe(404);
    expect((await post('/api/milestones/not-a-uuid/close', sup1)).status).toBe(404);
    expect((await request(app).patch(`/api/milestones/${ms.id}`).send({ title: 'No auth' })).status).toBe(401);
    expect((await request(app).post(`/api/milestones/${ms.id}/close`)).status).toBe(401);

    expect(await prisma.milestone.findUniqueOrThrow({ where: { id: ms.id } })).toEqual(before);
  });

  it('TEST-44 (AC-42) past-due milestone: title-only PATCH keeps MISSED; extending dueAt reopens submit window', async () => {
    const ms = await createAlphaMilestone(7);
    const pastDue = new Date(Date.now() - DAY - 3600000); // Lab 7 BR-06 v2 (CR-01, #82): past the 24 h grace window, so MISSED and 422
    await prisma.milestone.update({ where: { id: ms.id }, data: { dueAt: pastDue } });

    // Title-only PATCH on past-due milestone succeeds and keeps dueAt & MISSED status
    const renameRes = await patch(`/api/milestones/${ms.id}`, sup1, { title: 'Renamed missed milestone' });
    expect(renameRes.status).toBe(200);
    expect(renameRes.body.milestone.dueAt).toBe(pastDue.toISOString());
    expect(renameRes.body.milestone.status).toBe('MISSED');

    // Submit still rejected with 422 DEADLINE_PASSED
    const rejected = await post(`/api/milestones/${ms.id}/submission`, s1, {
      title: 'Too late',
      link: 'https://example.com/late',
    });
    expect(rejected.status).toBe(422);
    expect(rejected.body.error.code).toBe('DEADLINE_PASSED');

    // Extending dueAt to +7d reopens submissions
    const extended = await patch(`/api/milestones/${ms.id}`, sup1, { dueAt: inDays(7) });
    expect(extended.status).toBe(200);
    expect(extended.body.milestone.status).toBe('OPEN');

    const accepted = await post(`/api/milestones/${ms.id}/submission`, s1, {
      title: 'Submitted after extension',
      link: 'https://example.com/extended',
    });
    expect(accepted.status).toBe(201);
  });
});
