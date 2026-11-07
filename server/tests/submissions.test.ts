// F-04 Team submission with deadline rule: TEST-13..TEST-20, TEST-U02, TEST-U03 (AC-11..AC-16, AC-09, FR-07..FR-09, BR-01, BR-03, BR-05, BR-06, BR-09, NFR-09)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { seedTeams, seedUsers } from '../prisma/seed.js';
import { loginCookie } from './helpers.js';
import { canChangeSubmission, validateSubmissionInput } from '../src/domain/submission.js';

const app = createApp();
const [SUP1, , S1, S2, S3] = seedUsers;
const [ALPHA, BETA] = seedTeams;

let sup1: string;
let s1: string;
let s2: string;
let s3: string;

beforeAll(async () => {
  [sup1, s1, s2, s3] = await Promise.all([
    loginCookie(app, SUP1.email),
    loginCookie(app, S1.email),
    loginCookie(app, S2.email),
    loginCookie(app, S3.email),
  ]);
});

const get = (path: string, cookie: string) => request(app).get(path).set('Cookie', cookie);
const post = (path: string, cookie: string, body: unknown) =>
  request(app).post(path).set('Cookie', cookie).send(body as object);
const put = (path: string, cookie: string, body: unknown) =>
  request(app).put(path).set('Cookie', cookie).send(body as object);

describe('TEST-U02 (AC-13, AC-18) canChangeSubmission unit tests', () => {
  const fixedNow = new Date('2026-11-06T12:00:00.000Z');
  const futureDue = new Date('2026-11-13T12:00:00.000Z');
  const pastDue = new Date('2026-11-05T12:00:00.000Z');
  const equalDue = new Date('2026-11-06T12:00:00.000Z');

  it('allows submission when now < dueAt and no feedback', () => {
    const res = canChangeSubmission({ dueAt: futureDue }, null, fixedNow);
    expect(res.allowed).toBe(true);

    const resWithSubNoFeedback = canChangeSubmission({ dueAt: futureDue }, { hasFeedback: false }, fixedNow);
    expect(resWithSubNoFeedback.allowed).toBe(true);
  });

  it('rejects with DEADLINE_PASSED when now >= dueAt', () => {
    const resPast = canChangeSubmission({ dueAt: pastDue }, null, fixedNow);
    expect(resPast.allowed).toBe(false);
    if (!resPast.allowed) expect(resPast.reason).toBe('DEADLINE_PASSED');

    const resEqual = canChangeSubmission({ dueAt: equalDue }, null, fixedNow);
    expect(resEqual.allowed).toBe(false);
    if (!resEqual.allowed) expect(resEqual.reason).toBe('DEADLINE_PASSED');
  });

  it('rejects with SUBMISSION_LOCKED when submission has feedback, even before due', () => {
    const resFeedback = canChangeSubmission({ dueAt: futureDue }, { hasFeedback: true }, fixedNow);
    expect(resFeedback.allowed).toBe(false);
    if (!resFeedback.allowed) expect(resFeedback.reason).toBe('SUBMISSION_LOCKED');
  });
});

describe('TEST-U03 (AC-14, BR-09) validateSubmissionInput unit tests', () => {
  it('validates title: rejects < 3 chars, accepts 3..120, rejects > 120', () => {
    const resShort = validateSubmissionInput({ title: 'ab', link: 'https://example.com' });
    expect(resShort.success).toBe(false);
    if (!resShort.success) expect(resShort.fields.title).toBeDefined();

    const resValid = validateSubmissionInput({ title: 'abc', link: 'https://example.com' });
    expect(resValid.success).toBe(true);

    const res120 = validateSubmissionInput({ title: 'a'.repeat(120), link: 'https://example.com' });
    expect(res120.success).toBe(true);

    const res121 = validateSubmissionInput({ title: 'a'.repeat(121), link: 'https://example.com' });
    expect(res121.success).toBe(false);
    if (!res121.success) expect(res121.fields.title).toBeDefined();
  });

  it('validates description: optional, allows empty, allows up to 2000 chars, rejects > 2000', () => {
    const resNoDesc = validateSubmissionInput({ title: 'Title', link: 'https://example.com' });
    expect(resNoDesc.success).toBe(true);

    const res2000 = validateSubmissionInput({ title: 'Title', link: 'https://example.com', description: 'd'.repeat(2000) });
    expect(res2000.success).toBe(true);

    const res2001 = validateSubmissionInput({ title: 'Title', link: 'https://example.com', description: 'd'.repeat(2001) });
    expect(res2001.success).toBe(false);
    if (!res2001.success) expect(res2001.fields.description).toBeDefined();
  });

  it('validates link: accepts absolute http/https up to 500 chars, rejects ftp, relative, and > 500 chars', () => {
    const resHttp = validateSubmissionInput({ title: 'Title', link: 'http://example.com' });
    expect(resHttp.success).toBe(true);

    const resHttps = validateSubmissionInput({ title: 'Title', link: 'https://github.com/repo/pull/1' });
    expect(resHttps.success).toBe(true);

    const resFtp = validateSubmissionInput({ title: 'Title', link: 'ftp://ftp.example.com' });
    expect(resFtp.success).toBe(false);
    if (!resFtp.success) expect(resFtp.fields.link).toBeDefined();

    const resRel = validateSubmissionInput({ title: 'Title', link: '/relative/path' });
    expect(resRel.success).toBe(false);
    if (!resRel.success) expect(resRel.fields.link).toBeDefined();

    const resInvalid = validateSubmissionInput({ title: 'Title', link: 'not a url' });
    expect(resInvalid.success).toBe(false);
    if (!resInvalid.success) expect(resInvalid.fields.link).toBeDefined();

    const base = 'https://example.com/';
    const link500 = base + 'a'.repeat(500 - base.length);
    expect(link500.length).toBe(500);
    const res500 = validateSubmissionInput({ title: 'Title', link: link500 });
    expect(res500.success).toBe(true);

    const link501 = base + 'a'.repeat(501 - base.length);
    expect(link501.length).toBe(501);
    const res501 = validateSubmissionInput({ title: 'Title', link: link501 });
    expect(res501.success).toBe(false);
    if (!res501.success) expect(res501.fields.link).toBeDefined();
  });
});

describe('TEST-13..TEST-20 (AC-11..AC-16, AC-09) Submission API tests', () => {
  async function createMilestone(teamId: string, dueAt: Date) {
    return prisma.milestone.create({
      data: {
        teamId,
        title: 'Milestone for submission test',
        dueAt,
        createdById: SUP1.id,
      },
    });
  }

  it('TEST-13 (AC-11) S1 submits to Alpha milestone; S2 and Sup1 GET milestone returning submission', async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const milestone = await createMilestone(ALPHA.id, future);

    const postRes = await post(`/api/milestones/${milestone.id}/submission`, s1, {
      title: 'Initial Submission',
      description: 'First version of report',
      link: 'https://github.com/example/report',
    });

    expect(postRes.status).toBe(201);
    expect(postRes.body.submission).toBeDefined();
    expect(postRes.body.submission.title).toBe('Initial Submission');
    expect(postRes.body.submission.link).toBe('https://github.com/example/report');
    expect(postRes.body.submission.submittedBy.id).toBe(S1.id);
    expect(postRes.body.submission.submittedBy.name).toBe(S1.name);

    // S2 (teammate) GETs milestone
    const getS2 = await get(`/api/milestones/${milestone.id}`, s2);
    expect(getS2.status).toBe(200);
    expect(getS2.body.milestone.status).toBe('SUBMITTED');
    expect(getS2.body.submission.title).toBe('Initial Submission');
    expect(getS2.body.submission.submittedBy.id).toBe(S1.id);

    // Sup1 (supervisor) GETs milestone
    const getSup = await get(`/api/milestones/${milestone.id}`, sup1);
    expect(getSup.status).toBe(200);
    expect(getSup.body.milestone.status).toBe('SUBMITTED');
    expect(getSup.body.submission.title).toBe('Initial Submission');
    expect(getSup.body.submission.submittedBy.id).toBe(S1.id);
  });

  it('TEST-14 (AC-12, BR-05) S2 submits again to milestone with existing submission -> 409 SUBMISSION_EXISTS', async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const milestone = await createMilestone(ALPHA.id, future);

    // First submission
    const firstRes = await post(`/api/milestones/${milestone.id}/submission`, s1, {
      title: 'First Submission',
      link: 'https://github.com/example/1',
    });
    expect(firstRes.status).toBe(201);

    // Second submission by S2
    const secondRes = await post(`/api/milestones/${milestone.id}/submission`, s2, {
      title: 'Duplicate Submission',
      link: 'https://github.com/example/2',
    });
    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe('SUBMISSION_EXISTS');

    // Only one row in DB
    const count = await (prisma as any).submission.count({ where: { milestoneId: milestone.id } });
    expect(count).toBe(1);
  });

  it('TEST-15 (AC-12, NFR-09) simultaneous POST submissions: exactly one succeeds and one gets 409', async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const milestone = await createMilestone(ALPHA.id, future);

    const [resA, resB] = await Promise.all([
      post(`/api/milestones/${milestone.id}/submission`, s1, { title: 'Concurrent A', link: 'https://github.com/a' }),
      post(`/api/milestones/${milestone.id}/submission`, s2, { title: 'Concurrent B', link: 'https://github.com/b' }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const count = await (prisma as any).submission.count({ where: { milestoneId: milestone.id } });
    expect(count).toBe(1);
  });

  it('TEST-16 (AC-13, BR-06) past dueAt returns 422 DEADLINE_PASSED on POST and PUT', async () => {
    const past = new Date(Date.now() - 3600000); // 1 hour ago
    const milestone = await createMilestone(ALPHA.id, past);

    // POST on expired milestone
    const postRes = await post(`/api/milestones/${milestone.id}/submission`, s1, {
      title: 'Late Submission',
      link: 'https://github.com/example/late',
    });
    expect(postRes.status).toBe(422);
    expect(postRes.body.error.code).toBe('DEADLINE_PASSED');

    // PUT on milestone moved past due
    const future = new Date(Date.now() + 3600000);
    const milestoneForPut = await createMilestone(ALPHA.id, future);
    await post(`/api/milestones/${milestoneForPut.id}/submission`, s1, {
      title: 'On-time Submission',
      link: 'https://github.com/example/ontime',
    });

    // Move milestone to past in database
    await prisma.milestone.update({
      where: { id: milestoneForPut.id },
      data: { dueAt: new Date(Date.now() - 1000) },
    });

    const putRes = await put(`/api/milestones/${milestoneForPut.id}/submission`, s1, {
      title: 'Edit After Deadline',
      link: 'https://github.com/example/edited',
    });
    expect(putRes.status).toBe(422);
    expect(putRes.body.error.code).toBe('DEADLINE_PASSED');
  });

  it('TEST-17 (AC-14, BR-09) rejects invalid inputs (ftp, not a url, short title) with 400 VALIDATION_ERROR', async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const milestone = await createMilestone(ALPHA.id, future);

    const badFtp = await post(`/api/milestones/${milestone.id}/submission`, s1, {
      title: 'Valid Title',
      link: 'ftp://ftp.example.com',
    });
    expect(badFtp.status).toBe(400);
    expect(badFtp.body.error.code).toBe('VALIDATION_ERROR');
    expect(badFtp.body.error.fields.link).toBeDefined();

    const badUrl = await post(`/api/milestones/${milestone.id}/submission`, s1, {
      title: 'Valid Title',
      link: 'not a url',
    });
    expect(badUrl.status).toBe(400);
    expect(badUrl.body.error.fields.link).toBeDefined();

    const badTitle = await post(`/api/milestones/${milestone.id}/submission`, s1, {
      title: 'ab',
      link: 'https://example.com',
    });
    expect(badTitle.status).toBe(400);
    expect(badTitle.body.error.fields.title).toBeDefined();
  });

  it('TEST-18 (AC-15, BR-01) student S3 of Team Beta accessing Team Alpha milestone gets 404', async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const milestone = await createMilestone(ALPHA.id, future);

    const getRes = await get(`/api/milestones/${milestone.id}`, s3);
    expect(getRes.status).toBe(404);

    const postRes = await post(`/api/milestones/${milestone.id}/submission`, s3, {
      title: 'Cross-team Post',
      link: 'https://example.com',
    });
    expect(postRes.status).toBe(404);

    const putRes = await put(`/api/milestones/${milestone.id}/submission`, s3, {
      title: 'Cross-team Put',
      link: 'https://example.com',
    });
    expect(putRes.status).toBe(404);
  });

  it('TEST-19 (AC-16) S2 PUT updates existing submission before due date', async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const milestone = await createMilestone(ALPHA.id, future);

    // Initial submission by S1
    await post(`/api/milestones/${milestone.id}/submission`, s1, {
      title: 'Version 1',
      description: 'First draft',
      link: 'https://example.com/v1',
    });

    // Update by S2
    const putRes = await put(`/api/milestones/${milestone.id}/submission`, s2, {
      title: 'Version 2 Updated',
      description: 'Second draft with fixes',
      link: 'https://example.com/v2',
    });

    expect(putRes.status).toBe(200);
    expect(putRes.body.submission.title).toBe('Version 2 Updated');
    expect(putRes.body.submission.description).toBe('Second draft with fixes');
    expect(putRes.body.submission.link).toBe('https://example.com/v2');
    expect(putRes.body.submission.submittedBy.id).toBe(S2.id);
  });

  it('TEST-20 (AC-09, BR-03) supervisor cannot create a submission (403 FORBIDDEN)', async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const milestone = await createMilestone(ALPHA.id, future);

    const supPost = await post(`/api/milestones/${milestone.id}/submission`, sup1, {
      title: 'Supervisor submitting',
      link: 'https://example.com',
    });
    expect(supPost.status).toBe(403);
    expect(supPost.body.error.code).toBe('FORBIDDEN');
  });
});

