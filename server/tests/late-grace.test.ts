// Lab 7 CR-01 (BR-06 v2): 24-hour late submission grace window.
// TEST-U08, TEST-52..TEST-56 (AC-49..AC-52), see docs/sprints/sprint-1/sts.md v1.1 and docs/labs/lab-07/impact.md.
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { seedTeams, seedUsers } from '../prisma/seed.js';
import { createRevisionRequestedSubmission, loginCookie } from './helpers.js';
import { canChangeSubmission } from '../src/domain/submission.js';
import { computeMilestoneStatus } from '../src/domain/milestone.js';

const app = createApp();
const [SUP1, , S1, S2, S3] = seedUsers;
const [ALPHA] = seedTeams;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

let sup1: string;
let s1: string;
let s2: string;
let s3: string;

beforeAll(async () => {
  [sup1, s1, s2, s3] = await Promise.all([SUP1, S1, S2, S3].map((u) => loginCookie(app, u.email)));
});

const get = (path: string, cookie: string) => request(app).get(path).set('Cookie', cookie);
const post = (path: string, cookie: string, body?: object) =>
  body === undefined ? request(app).post(path).set('Cookie', cookie) : request(app).post(path).set('Cookie', cookie).send(body);
const put = (path: string, cookie: string, body: object) => request(app).put(path).set('Cookie', cookie).send(body);
const patch = (path: string, cookie: string, body: object) => request(app).patch(path).set('Cookie', cookie).send(body);

const body = (title: string) => ({ title, link: 'https://github.com/example/cpms/pull/84' });
const submitUrl = (milestoneId: string) => `/api/milestones/${milestoneId}/submission`;

// Milestone with a due date relative to real now (the API has no injectable clock).
async function milestoneDue(offsetMs: number) {
  return prisma.milestone.create({
    data: {
      teamId: ALPHA.id,
      title: `Grace ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dueAt: new Date(Date.now() + offsetMs),
      createdById: SUP1.id,
    },
  });
}
const moveDue = (id: string, offsetMs: number) =>
  prisma.milestone.update({ where: { id }, data: { dueAt: new Date(Date.now() + offsetMs) } });

describe('TEST-U08 (AC-49, AC-51, AC-52) grace window boundaries with a fixed now', () => {
  const D = new Date('2026-11-20T10:00:00.000Z');
  const G = new Date(D.getTime() + DAY);
  const at = (ms: number) => new Date(ms);
  const open = { dueAt: D, closedAt: null };

  it('version 1: D - 1 ms, D, G - 1 ms allowed; G rejected', () => {
    expect(canChangeSubmission(open, null, at(D.getTime() - 1))).toEqual({ allowed: true });
    expect(canChangeSubmission(open, null, at(D.getTime()))).toEqual({ allowed: true });
    expect(canChangeSubmission(open, { feedback: null }, at(G.getTime() - 1))).toEqual({ allowed: true });
    expect(canChangeSubmission(open, null, at(G.getTime()))).toEqual({ allowed: false, reason: 'DEADLINE_PASSED' });
  });

  it('unchanged rules inside the grace window: closed first, feedback lock, v2 has no grace', () => {
    const inGrace = at(D.getTime() + HOUR);
    expect(canChangeSubmission({ dueAt: D, closedAt: D }, null, inGrace)).toEqual({ allowed: false, reason: 'MILESTONE_CLOSED' });
    expect(canChangeSubmission(open, { feedback: { id: 'f' } }, inGrace)).toEqual({ allowed: false, reason: 'SUBMISSION_LOCKED' });
    expect(canChangeSubmission(open, { versionNumber: 2, revisionDueAt: at(D.getTime() + 1000) }, inGrace)).toEqual({
      allowed: false,
      reason: 'DEADLINE_PASSED',
    });
  });

  it('status with no submission: OPEN until G, MISSED from G', () => {
    expect(computeMilestoneStatus({ dueAt: D }, null, at(D.getTime() - 1))).toBe('OPEN');
    expect(computeMilestoneStatus({ dueAt: D }, null, at(D.getTime()))).toBe('OPEN');
    expect(computeMilestoneStatus({ dueAt: D }, null, at(D.getTime() + 1))).toBe('OPEN');
    expect(computeMilestoneStatus({ dueAt: D }, null, at(G.getTime() - 1))).toBe('OPEN');
    expect(computeMilestoneStatus({ dueAt: D }, null, at(G.getTime()))).toBe('MISSED');
  });
});

describe('TEST-52..TEST-56 grace window API/DB (AC-49..AC-52)', () => {
  it('TEST-52 (AC-49, AC-50) POST inside the grace window -> 201 with lateAt; after it -> 422, no row', async () => {
    const inGrace = await milestoneDue(-HOUR);
    const before = Date.now();
    const res = await post(submitUrl(inGrace.id), s1, body('Late but in grace'));
    const after = Date.now();
    expect(res.status).toBe(201);
    expect(res.body.submission.submittedBy.id).toBe(S1.id);
    const lateAt = Date.parse(res.body.submission.lateAt);
    expect(lateAt).toBeGreaterThanOrEqual(before);
    expect(lateAt).toBeLessThanOrEqual(after);
    expect(await prisma.submission.count({ where: { milestoneId: inGrace.id } })).toBe(1);

    const expired = await milestoneDue(-25 * HOUR);
    const rejected = await post(submitUrl(expired.id), s1, body('Too late'));
    expect(rejected.status).toBe(422);
    expect(rejected.body.error.code).toBe('DEADLINE_PASSED');
    expect(await prisma.submission.count({ where: { milestoneId: expired.id } })).toBe(0);
  });

  it('TEST-53 (AC-49, AC-50) on-time then late edit sets lateAt once; F-07 extension keeps it; after grace 422', async () => {
    const ms = await milestoneDue(HOUR);
    const created = await post(submitUrl(ms.id), s1, body('On time'));
    expect(created.status).toBe(201);
    expect(created.body.submission.lateAt).toBeNull();

    await moveDue(ms.id, -HOUR);
    const lateEdit = await put(submitUrl(ms.id), s2, body('Edited in grace'));
    expect(lateEdit.status).toBe(200);
    const lateAt = lateEdit.body.submission.lateAt;
    expect(typeof lateAt).toBe('string');

    const secondEdit = await put(submitUrl(ms.id), s1, body('Edited again in grace'));
    expect(secondEdit.status).toBe(200);
    expect(secondEdit.body.submission.lateAt).toBe(lateAt);

    // CR-01 decision 3: a later due-date change (F-07) does not recompute lateAt
    const extended = await patch(`/api/milestones/${ms.id}`, sup1, { dueAt: new Date(Date.now() + 7 * DAY).toISOString() });
    expect(extended.status).toBe(200);
    for (const cookie of [s1, sup1]) {
      const detail = await get(`/api/milestones/${ms.id}`, cookie);
      expect(detail.body.submission.lateAt).toBe(lateAt);
    }

    await moveDue(ms.id, -25 * HOUR);
    const expired = await put(submitUrl(ms.id), s1, body('After grace'));
    expect(expired.status).toBe(422);
    expect(expired.body.error.code).toBe('DEADLINE_PASSED');
    const row = await prisma.submission.findUniqueOrThrow({ where: { milestoneId: ms.id } });
    expect(row.title).toBe('Edited again in grace');
  });

  it('TEST-54 (AC-51, AC-50) team list: OPEN + graceEndsAt in grace, MISSED after, lateAt for team and supervisor only', async () => {
    const empty = await milestoneDue(-HOUR);
    const missed = await milestoneDue(-25 * HOUR);
    const late = await milestoneDue(-HOUR);
    const lateRes = await post(submitUrl(late.id), s1, body('Late one'));
    expect(lateRes.status).toBe(201);

    const list = await get(`/api/teams/${ALPHA.id}/milestones`, sup1);
    expect(list.status).toBe(200);
    const byId = (id: string) => list.body.milestones.find((m: { id: string }) => m.id === id);
    expect(byId(empty.id).status).toBe('OPEN');
    expect(byId(empty.id).graceEndsAt).toBe(new Date(empty.dueAt.getTime() + DAY).toISOString());
    expect(byId(empty.id).lateAt).toBeNull();
    expect(byId(missed.id).status).toBe('MISSED');
    expect(byId(late.id).lateAt).toBe(lateRes.body.submission.lateAt);

    const detailS1 = await get(`/api/milestones/${late.id}`, s1);
    const detailSup1 = await get(`/api/milestones/${late.id}`, sup1);
    expect(detailS1.body.milestone.graceEndsAt).toBe(new Date(late.dueAt.getTime() + DAY).toISOString());
    expect(detailS1.body.submission.lateAt).toBe(lateRes.body.submission.lateAt);
    expect(detailSup1.body.submission.lateAt).toBe(lateRes.body.submission.lateAt);
    expect(detailS1.body.submission.editableUntil).toBe(new Date(late.dueAt.getTime() + DAY).toISOString());

    const other = await get(`/api/milestones/${late.id}`, s3);
    expect(other.status).toBe(404);
    expect(other.body.submission).toBeUndefined();
  });

  it('TEST-55 (AC-52) unchanged rules inside the grace window', async () => {
    // Closed wins
    const closed = await milestoneDue(-HOUR);
    expect((await post(`/api/milestones/${closed.id}/close`, sup1)).status).toBe(200);
    const closedRes = await post(submitUrl(closed.id), s1, body('Closed'));
    expect(closedRes.status).toBe(409);
    expect(closedRes.body.error.code).toBe('MILESTONE_CLOSED');

    // Feedback recorded in grace locks the late submission
    const locked = await milestoneDue(-HOUR);
    const sub = await post(submitUrl(locked.id), s1, body('Late, then feedback'));
    expect(sub.status).toBe(201);
    expect((await post(`/api/submissions/${sub.body.submission.id}/feedback`, sup1, { comment: 'Late but fine' })).status).toBe(201);
    const lockedRes = await put(submitUrl(locked.id), s2, body('Edit after feedback'));
    expect(lockedRes.status).toBe(409);
    expect(lockedRes.body.error.code).toBe('SUBMISSION_LOCKED');

    // One submission per milestone, roles and team scope
    const dup = await post(submitUrl(locked.id), s2, body('Second'));
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('SUBMISSION_EXISTS');
    const empty = await milestoneDue(-HOUR);
    expect((await post(submitUrl(empty.id), sup1, body('Supervisor'))).status).toBe(403);
    expect((await post(submitUrl(empty.id), s3, body('Other team'))).status).toBe(404);
    expect(await prisma.submission.count({ where: { milestoneId: empty.id } })).toBe(0);

    // Version 2 keeps the revision due date, no grace
    const { milestoneId, submissionId } = await createRevisionRequestedSubmission(app, { sup1, s1 });
    expect((await post(`/api/submissions/${submissionId}/versions`, s1, body('Version 2'))).status).toBe(201);
    await moveDue(milestoneId, -HOUR);
    await prisma.revisionRequest.updateMany({ where: { submissionId }, data: { dueAt: new Date(Date.now() - 1000) } });
    const v2 = await put(submitUrl(milestoneId), s1, body('Version 2 edit'));
    expect(v2.status).toBe(422);
    expect(v2.body.error.code).toBe('DEADLINE_PASSED');
  });

  it('TEST-56 (AC-50, AC-52) on-time row has lateAt null; parallel late PUTs set lateAt once', async () => {
    const ms = await milestoneDue(HOUR);
    expect((await post(submitUrl(ms.id), s1, body('On time'))).status).toBe(201);
    const onTime = await get(`/api/milestones/${ms.id}`, s1);
    expect(onTime.body.submission.lateAt).toBeNull();

    await moveDue(ms.id, -HOUR);
    const [a, b] = await Promise.all([put(submitUrl(ms.id), s1, body('Parallel A')), put(submitUrl(ms.id), s2, body('Parallel B'))]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const first = [a, b].sort((x, y) => Date.parse(x.body.submission.updatedAt) - Date.parse(y.body.submission.updatedAt))[0];
    const final = await get(`/api/milestones/${ms.id}`, sup1);
    expect(typeof final.body.submission.lateAt).toBe('string');
    expect(a.body.submission.lateAt).toBe(final.body.submission.lateAt);
    expect(b.body.submission.lateAt).toBe(final.body.submission.lateAt);
    expect(Date.parse(final.body.submission.lateAt)).toBeLessThanOrEqual(Date.parse(first.body.submission.updatedAt));
  });
});
