// F-08 Grading: TEST-U07, TEST-45..TEST-50 (AC-43..AC-48, FR-15, FR-16, BR-12, BR-01..BR-03, NFR-02, NFR-03)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { seedTeams, seedUsers } from '../prisma/seed.js';
import { createRevisionRequestedSubmission, loginCookie } from './helpers.js';
import { canGrade, validateGradeInput } from '../src/domain/grade.js';

const app = createApp();
const [SUP1, SUP2, S1, S2, S3] = seedUsers;
const [ALPHA] = seedTeams;

let sup1: string;
let sup2: string;
let s1: string;
let s2: string;
let s3: string;

beforeAll(async () => {
  [sup1, sup2, s1, s2, s3] = await Promise.all([SUP1, SUP2, S1, S2, S3].map((u) => loginCookie(app, u.email)));
});

const get = (path: string, cookie: string) => request(app).get(path).set('Cookie', cookie);
const post = (path: string, cookie: string, body?: object) =>
  body === undefined ? request(app).post(path).set('Cookie', cookie) : request(app).post(path).set('Cookie', cookie).send(body);
const put = (path: string, cookie: string, body: unknown) =>
  request(app).put(path).set('Cookie', cookie).send(body as object);

const DAY = 86400000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();
const gradeUrl = (submissionId: string) => `/api/submissions/${submissionId}/grade`;

async function createFeedbackGivenFixture() {
  return createRevisionRequestedSubmission(app, { sup1, s1 }, { withRequest: false });
}

async function createUnreviewedFixture() {
  const ms = await post(`/api/teams/${ALPHA.id}/milestones`, sup1, {
    title: `Grade ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dueAt: inDays(7),
  });
  expect(ms.status).toBe(201);
  const milestoneId = ms.body.milestone.id as string;
  const sub = await post(`/api/milestones/${milestoneId}/submission`, s1, {
    title: 'Ungraded work',
    link: 'https://github.com/example/cpms/pull/90',
  });
  expect(sub.status).toBe(201);
  return { milestoneId, submissionId: sub.body.submission.id as string };
}

describe('TEST-U07 validateGradeInput & canGrade (AC-44, AC-45, BR-12)', () => {
  it('TEST-U07 validates score boundaries and rejects non-integer / non-number / out-of-range values', () => {
    for (const score of [0, 1, 99, 100]) {
      expect(validateGradeInput({ score })).toEqual({ success: true, data: { score } });
    }
    const invalidInputs: unknown[] = [
      { score: -1 },
      { score: 101 },
      { score: 85.5 },
      { score: '85' },
      { score: null },
      { score: undefined },
      { score: Number.NaN },
      { score: Number.POSITIVE_INFINITY },
      { score: true },
      { score: false },
      {},
      null,
      '85',
    ];
    for (const input of invalidInputs) {
      const res = validateGradeInput(input);
      expect(res.success, JSON.stringify(input)).toBe(false);
      if (!res.success) {
        expect(res.fields.score).toBe('Score must be a whole number from 0 to 100');
      }
    }
  });

  it('TEST-U07 canGrade checks FEEDBACK_REQUIRED first and blocks only OPEN + unclosed milestone', () => {
    // No feedback always returns FEEDBACK_REQUIRED regardless of revision request or milestoneClosed
    for (const revisionRequestStatus of [null, 'OPEN', 'EXPIRED', 'RESUBMITTED'] as const) {
      for (const milestoneClosed of [false, true]) {
        expect(canGrade({ currentVersionHasFeedback: false, revisionRequestStatus, milestoneClosed })).toEqual({
          allowed: false,
          reason: 'FEEDBACK_REQUIRED',
        });
      }
    }

    // With feedback: OPEN + unclosed blocks with REVISION_PENDING
    expect(canGrade({ currentVersionHasFeedback: true, revisionRequestStatus: 'OPEN', milestoneClosed: false })).toEqual({
      allowed: false,
      reason: 'REVISION_PENDING',
    });

    // With feedback: OPEN + closed, EXPIRED, RESUBMITTED, or null are all allowed
    expect(canGrade({ currentVersionHasFeedback: true, revisionRequestStatus: 'OPEN', milestoneClosed: true })).toEqual({
      allowed: true,
    });
    expect(canGrade({ currentVersionHasFeedback: true, revisionRequestStatus: 'EXPIRED', milestoneClosed: false })).toEqual({
      allowed: true,
    });
    expect(canGrade({ currentVersionHasFeedback: true, revisionRequestStatus: 'RESUBMITTED', milestoneClosed: false })).toEqual({
      allowed: true,
    });
    expect(canGrade({ currentVersionHasFeedback: true, revisionRequestStatus: null, milestoneClosed: false })).toEqual({
      allowed: true,
    });
    expect(canGrade({ currentVersionHasFeedback: true, revisionRequestStatus: null, milestoneClosed: true })).toEqual({
      allowed: true,
    });
  });
});

describe('TEST-45..TEST-50 Grading API (AC-43..AC-48)', () => {
  it('TEST-45 (AC-43) Sup1 PUTs grade 85 on open, closed, expired-revision, and closed+open-revision milestones -> 200', async () => {
    // (1) Open milestone with feedback
    const f1 = await createFeedbackGivenFixture();
    const res1 = await put(gradeUrl(f1.submissionId), sup1, { score: 85 });
    expect(res1.status).toBe(200);
    expect(res1.body.grade).toMatchObject({
      score: 85,
      versionNumber: 1,
      gradedBy: { id: SUP1.id, name: SUP1.name },
    });
    expect(res1.body.grade.gradedAt).toBeTruthy();
    expect(res1.body.grade.updatedAt).toBeTruthy();

    const row1 = await prisma.grade.findUnique({ where: { submissionId: f1.submissionId } });
    expect(row1?.score).toBe(85);
    expect(row1?.gradedById).toBe(SUP1.id);
    expect(row1?.versionNumber).toBe(1);

    // (2) Closed milestone with feedback (F-07 interaction)
    const f2 = await createFeedbackGivenFixture();
    expect((await post(`/api/milestones/${f2.milestoneId}/close`, sup1)).status).toBe(200);
    const res2 = await put(gradeUrl(f2.submissionId), sup1, { score: 85 });
    expect(res2.status).toBe(200);
    expect(res2.body.grade.score).toBe(85);

    // (3) Expired revision request (F-06 interaction)
    const f3 = await createRevisionRequestedSubmission(app, { sup1, s1 });
    await prisma.revisionRequest.updateMany({
      where: { submissionId: f3.submissionId },
      data: { dueAt: new Date(Date.now() - DAY) },
    });
    const res3 = await put(gradeUrl(f3.submissionId), sup1, { score: 85 });
    expect(res3.status).toBe(200);
    expect(res3.body.grade.score).toBe(85);

    // (4) Feedback + OPEN revision request (future dueAt), then milestone closed -> grading allowed
    const f4 = await createRevisionRequestedSubmission(app, { sup1, s1 });
    expect((await post(`/api/milestones/${f4.milestoneId}/close`, sup1)).status).toBe(200);
    const res4 = await put(gradeUrl(f4.submissionId), sup1, { score: 85 });
    expect(res4.status).toBe(200);
    expect(res4.body.grade.score).toBe(85);
  });

  it('TEST-46 (AC-44) invalid scores -> 400 fields.score, nothing stored; 0 and 100 -> 200', async () => {
    const { submissionId } = await createFeedbackGivenFixture();
    const invalidBodies: unknown[] = [
      { score: -1 },
      { score: 101 },
      { score: 85.5 },
      { score: '85' },
      { score: null },
      { score: true },
      {},
    ];
    for (const body of invalidBodies) {
      const res = await put(gradeUrl(submissionId), sup1, body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.score).toBe('Score must be a whole number from 0 to 100');
    }
    expect(await prisma.grade.count({ where: { submissionId } })).toBe(0);

    const zero = await put(gradeUrl(submissionId), sup1, { score: 0 });
    expect(zero.status).toBe(200);
    expect(zero.body.grade.score).toBe(0);

    const hundred = await put(gradeUrl(submissionId), sup1, { score: 100 });
    expect(hundred.status).toBe(200);
    expect(hundred.body.grade.score).toBe(100);
  });

  it('TEST-47 (AC-45) FEEDBACK_REQUIRED, REVISION_PENDING, SUBMISSION_GRADED, and parallel grade vs revision-request', async () => {
    // (a) No feedback -> 409 FEEDBACK_REQUIRED
    const unreviewed = await createUnreviewedFixture();
    const noFb = await put(gradeUrl(unreviewed.submissionId), sup1, { score: 80 });
    expect(noFb.status).toBe(409);
    expect(noFb.body.error.code).toBe('FEEDBACK_REQUIRED');

    // (b) Feedback + OPEN revision request on unclosed milestone -> 409 REVISION_PENDING
    const revOpen = await createRevisionRequestedSubmission(app, { sup1, s1 });
    const revPending = await put(gradeUrl(revOpen.submissionId), sup1, { score: 80 });
    expect(revPending.status).toBe(409);
    expect(revPending.body.error.code).toBe('REVISION_PENDING');

    // (c) Graded -> POST revision-request -> 409 SUBMISSION_GRADED
    const graded = await createFeedbackGivenFixture();
    expect((await put(gradeUrl(graded.submissionId), sup1, { score: 85 })).status).toBe(200);
    const revAfterGrade = await post(`/api/submissions/${graded.submissionId}/revision-request`, sup1, {
      reason: 'Too late',
      dueAt: inDays(3),
    });
    expect(revAfterGrade.status).toBe(409);
    expect(revAfterGrade.body.error.code).toBe('SUBMISSION_GRADED');

    // (d) Parallel PUT grade + POST revision-request -> never both succeed
    const race = await createFeedbackGivenFixture();
    const [gradeRes, revRes] = await Promise.all([
      put(gradeUrl(race.submissionId), sup1, { score: 88 }),
      post(`/api/submissions/${race.submissionId}/revision-request`, sup1, {
        reason: 'Race revision',
        dueAt: inDays(3),
      }),
    ]);
    const succeeded = [gradeRes.status === 200, revRes.status === 201].filter(Boolean).length;
    expect(succeeded).toBe(1);
    if (gradeRes.status === 200) {
      expect(revRes.status).toBe(409);
      expect(revRes.body.error.code).toBe('SUBMISSION_GRADED');
    } else {
      expect(gradeRes.status).toBe(409);
      expect(gradeRes.body.error.code).toBe('REVISION_PENDING');
    }
  });

  it('TEST-48 (AC-46) updating grade 85 -> 90 keeps one row with later updatedAt; parallel PUTs keep one row', async () => {
    const { submissionId } = await createFeedbackGivenFixture();
    const first = await put(gradeUrl(submissionId), sup1, { score: 85 });
    expect(first.status).toBe(200);
    const firstGradedAt = first.body.grade.gradedAt as string;

    await new Promise((r) => setTimeout(r, 10));

    const second = await put(gradeUrl(submissionId), sup1, { score: 90 });
    expect(second.status).toBe(200);
    expect(second.body.grade.score).toBe(90);
    expect(second.body.grade.gradedAt).toBe(firstGradedAt);
    expect(new Date(second.body.grade.updatedAt).getTime()).toBeGreaterThan(new Date(firstGradedAt).getTime());
    expect(await prisma.grade.count({ where: { submissionId } })).toBe(1);

    const [p1, p2] = await Promise.all([
      put(gradeUrl(submissionId), sup1, { score: 80 }),
      put(gradeUrl(submissionId), sup1, { score: 95 }),
    ]);
    expect(p1.status).toBe(200);
    expect(p2.status).toBe(200);
    expect(await prisma.grade.count({ where: { submissionId } })).toBe(1);
    const finalRow = await prisma.grade.findUniqueOrThrow({ where: { submissionId } });
    expect([80, 95]).toContain(finalRow.score);
  });

  it('TEST-49 (AC-47) S1 403, Sup2 404, malformed 404, unknown 404, no cookie 401; Grade count 0', async () => {
    const { submissionId } = await createFeedbackGivenFixture();
    expect((await put(gradeUrl(submissionId), s1, { score: 85 })).status).toBe(403);
    expect((await put(gradeUrl(submissionId), sup2, { score: 85 })).status).toBe(404);
    expect((await put(gradeUrl('not-a-uuid'), sup1, { score: 85 })).status).toBe(404);
    expect((await put(gradeUrl('6f0c0000-0000-4000-8000-000000000000'), sup1, { score: 85 })).status).toBe(404);
    expect((await request(app).put(gradeUrl(submissionId)).send({ score: 85 })).status).toBe(401);
    expect(await prisma.grade.count({ where: { submissionId } })).toBe(0);
  });

  it('TEST-50 (AC-48) S1 and S2 see grade in GET milestone, S3 gets 404, ungraded returns grade: null', async () => {
    const graded = await createFeedbackGivenFixture();
    expect((await put(gradeUrl(graded.submissionId), sup1, { score: 85 })).status).toBe(200);

    for (const cookie of [s1, s2]) {
      const res = await get(`/api/milestones/${graded.milestoneId}`, cookie);
      expect(res.status).toBe(200);
      expect(res.body.submission.grade.score).toBe(85);
      expect(res.body.submission.grade.versionNumber).toBe(1);
    }

    const otherTeam = await get(`/api/milestones/${graded.milestoneId}`, s3);
    expect(otherTeam.status).toBe(404);

    const ungraded = await createFeedbackGivenFixture();
    const resUngraded = await get(`/api/milestones/${ungraded.milestoneId}`, s1);
    expect(resUngraded.status).toBe(200);
    expect(resUngraded.body.submission.grade).toBeNull();
  });
});
