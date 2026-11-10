// F-03 Milestone creation by supervisor: TEST-07..TEST-10, TEST-U01 (AC-06..AC-09, FR-05, FR-06, BR-02..BR-04)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { seedTeams, seedUsers } from '../prisma/seed.js';
import { loginCookie } from './helpers.js';
import { computeMilestoneStatus, validateMilestoneInput } from '../src/domain/milestone.js';

const app = createApp();
const [SUP1, , S1] = seedUsers;
const [ALPHA, , GAMMA] = seedTeams;

let sup1: string;
let s1: string;

beforeAll(async () => {
  [sup1, s1] = await Promise.all([loginCookie(app, SUP1.email), loginCookie(app, S1.email)]);
});

const post = (path: string, cookie: string, body: unknown) =>
  request(app).post(path).set('Cookie', cookie).send(body as object);

const get = (path: string, cookie: string) => request(app).get(path).set('Cookie', cookie);

describe('TEST-U01 (AC-07, BR-04) milestone input and status unit tests', () => {
  const fixedNow = new Date('2026-11-06T12:00:00.000Z');
  const futureIso = '2026-11-13T12:00:00.000Z';
  const pastIso = '2026-11-05T12:00:00.000Z';
  const equalIso = '2026-11-06T12:00:00.000Z';

  it('validates title lengths: rejects 2 chars, accepts 3..120, rejects 121', () => {
    const res2 = validateMilestoneInput({ title: 'ab', dueAt: futureIso }, fixedNow);
    expect(res2.success).toBe(false);
    if (!res2.success) expect(res2.fields.title).toBeDefined();

    const resTrim2 = validateMilestoneInput({ title: '  ab  ', dueAt: futureIso }, fixedNow);
    expect(resTrim2.success).toBe(false);
    if (!resTrim2.success) expect(resTrim2.fields.title).toBeDefined();

    const res3 = validateMilestoneInput({ title: 'abc', dueAt: futureIso }, fixedNow);
    expect(res3.success).toBe(true);

    const res120 = validateMilestoneInput({ title: 'x'.repeat(120), dueAt: futureIso }, fixedNow);
    expect(res120.success).toBe(true);

    const res121 = validateMilestoneInput({ title: 'x'.repeat(121), dueAt: futureIso }, fixedNow);
    expect(res121.success).toBe(false);
    if (!res121.success) expect(res121.fields.title).toBeDefined();
  });

  it('validates dueAt: rejects past and equal date, accepts future date', () => {
    const resPast = validateMilestoneInput({ title: 'Valid title', dueAt: pastIso }, fixedNow);
    expect(resPast.success).toBe(false);
    if (!resPast.success) expect(resPast.fields.dueAt).toBeDefined();

    const resEqual = validateMilestoneInput({ title: 'Valid title', dueAt: equalIso }, fixedNow);
    expect(resEqual.success).toBe(false);
    if (!resEqual.success) expect(resEqual.fields.dueAt).toBeDefined();

    const resInvalid = validateMilestoneInput({ title: 'Valid title', dueAt: 'not-a-date' }, fixedNow);
    expect(resInvalid.success).toBe(false);
    if (!resInvalid.success) expect(resInvalid.fields.dueAt).toBeDefined();

    const resFuture = validateMilestoneInput({ title: 'Valid title', dueAt: futureIso }, fixedNow);
    expect(resFuture.success).toBe(true);
  });

  it('validates description: optional, allows empty, allows up to 2000 chars, rejects >2000', () => {
    const resEmpty = validateMilestoneInput({ title: 'Valid title', dueAt: futureIso, description: '' }, fixedNow);
    expect(resEmpty.success).toBe(true);

    const res2000 = validateMilestoneInput(
      { title: 'Valid title', dueAt: futureIso, description: 'd'.repeat(2000) },
      fixedNow,
    );
    expect(res2000.success).toBe(true);

    const res2001 = validateMilestoneInput(
      { title: 'Valid title', dueAt: futureIso, description: 'd'.repeat(2001) },
      fixedNow,
    );
    expect(res2001.success).toBe(false);
    if (!res2001.success) expect(res2001.fields.description).toBeDefined();
  });

  it('computes milestone status: OPEN, MISSED, SUBMITTED, FEEDBACK_GIVEN', () => {
    expect(computeMilestoneStatus({ dueAt: futureIso }, null, fixedNow)).toBe('OPEN');
    expect(computeMilestoneStatus({ dueAt: equalIso }, null, fixedNow)).toBe('OPEN');
    expect(computeMilestoneStatus({ dueAt: pastIso }, null, fixedNow)).toBe('MISSED');
    expect(computeMilestoneStatus({ dueAt: futureIso }, { feedback: null }, fixedNow)).toBe('SUBMITTED');
    expect(computeMilestoneStatus({ dueAt: futureIso }, { feedback: { id: 'f1' } }, fixedNow)).toBe('FEEDBACK_GIVEN');
  });
});

describe('TEST-07 (AC-06, FR-05, FR-06) POST and GET milestones for an assigned team', () => {
  it('Sup1 creates a milestone for Team Alpha with future dueAt; returns 201; S1 sees it with status OPEN', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const payload = {
      title: 'Milestone 1: Prototype',
      description: 'First deliverable with working UI',
      dueAt: futureDate,
    };

    const res = await post(`/api/teams/${ALPHA.id}/milestones`, sup1, payload);
    expect(res.status).toBe(201);
    expect(res.body.milestone).toBeDefined();
    expect(res.body.milestone.title).toBe(payload.title);
    expect(res.body.milestone.description).toBe(payload.description);
    expect(res.body.milestone.teamId).toBe(ALPHA.id);

    // Stored in the database
    const count = await (prisma as any).milestone?.count({ where: { teamId: ALPHA.id } });
    if (count !== undefined) {
      expect(count).toBeGreaterThanOrEqual(1);
    }

    // S1 lists Team Alpha milestones and sees it with status OPEN
    const listRes = await get(`/api/teams/${ALPHA.id}/milestones`, s1);
    expect(listRes.status).toBe(200);
    expect(listRes.body.milestones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: res.body.milestone.id,
          title: payload.title,
          description: payload.description,
          status: 'OPEN',
        }),
      ]),
    );
  });
});

describe('TEST-08 (AC-07, BR-04) POST milestone validation rejects invalid inputs', () => {
  it.each([
    ['past due date', { title: 'Valid Title', dueAt: '2020-01-01T00:00:00.000Z' }, 'dueAt'],
    ['title too short (2 chars)', { title: 'ab', dueAt: new Date(Date.now() + 86400000).toISOString() }, 'title'],
    ['title too long (121 chars)', { title: 'x'.repeat(121), dueAt: new Date(Date.now() + 86400000).toISOString() }, 'title'],
    ['description > 2000 chars', { title: 'Valid Title', dueAt: new Date(Date.now() + 86400000).toISOString(), description: 'x'.repeat(2001) }, 'description'],
  ])('rejects %s with 400 VALIDATION_ERROR and does not store it', async (_label, body, expectedField) => {
    const beforeCount = (await (prisma as any).milestone?.count?.({ where: { teamId: ALPHA.id } })) ?? 0;
    const res = await post(`/api/teams/${ALPHA.id}/milestones`, sup1, body);

    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(res.body.error?.fields?.[expectedField]).toBeDefined();

    const afterCount = (await (prisma as any).milestone?.count?.({ where: { teamId: ALPHA.id } })) ?? 0;
    expect(afterCount).toBe(beforeCount);
  });
});

describe('TEST-09 (AC-08, BR-02) POST milestone to an unassigned team returns 404', () => {
  it('Sup1 cannot create a milestone for Team Gamma', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const payload = { title: 'Unauthorized milestone', dueAt: futureDate };

    const beforeCount = (await (prisma as any).milestone?.count?.({ where: { teamId: GAMMA.id } })) ?? 0;
    const res = await post(`/api/teams/${GAMMA.id}/milestones`, sup1, payload);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });

    const afterCount = (await (prisma as any).milestone?.count?.({ where: { teamId: GAMMA.id } })) ?? 0;
    expect(afterCount).toBe(beforeCount);
  });
});

describe('TEST-10 (AC-09, BR-03) student cannot create a milestone', () => {
  it('S1 posting a milestone to Alpha returns 403 FORBIDDEN', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const payload = { title: 'Student milestone', dueAt: futureDate };

    const beforeCount = (await (prisma as any).milestone?.count?.({ where: { teamId: ALPHA.id } })) ?? 0;
    const res = await post(`/api/teams/${ALPHA.id}/milestones`, s1, payload);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: { code: 'FORBIDDEN', message: expect.any(String) } });

    const afterCount = (await (prisma as any).milestone?.count?.({ where: { teamId: ALPHA.id } })) ?? 0;
    expect(afterCount).toBe(beforeCount);
  });
});

