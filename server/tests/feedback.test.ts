// F-05 Supervisor feedback: TEST-21..TEST-25 (AC-17..AC-20, FR-09, FR-10, BR-02, BR-03, BR-07, BR-08, D-05)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { seedTeams, seedUsers } from '../prisma/seed.js';
import { loginCookie } from './helpers.js';
import { validateFeedbackInput } from '../src/domain/feedback.js';

const app = createApp();
const [SUP1, SUP2, S1, S2] = seedUsers;
const [ALPHA] = seedTeams;

let sup1: string;
let sup2: string;
let s1: string;
let s2: string;

beforeAll(async () => {
  [sup1, sup2, s1, s2] = await Promise.all([
    loginCookie(app, SUP1.email),
    loginCookie(app, SUP2.email),
    loginCookie(app, S1.email),
    loginCookie(app, S2.email),
  ]);
});

const get = (path: string, cookie: string) => request(app).get(path).set('Cookie', cookie);
const post = (path: string, cookie: string, body: unknown) =>
  request(app).post(path).set('Cookie', cookie).send(body as object);
const put = (path: string, cookie: string, body: unknown) =>
  request(app).put(path).set('Cookie', cookie).send(body as object);

describe('validateFeedbackInput unit tests (BR-08)', () => {
  it('accepts valid comments (1..2000 chars after trim)', () => {
    const resSingleChar = validateFeedbackInput({ comment: 'A' });
    expect(resSingleChar.success).toBe(true);
    if (resSingleChar.success) expect(resSingleChar.data.comment).toBe('A');

    const resTrim = validateFeedbackInput({ comment: '  Good job!  ' });
    expect(resTrim.success).toBe(true);
    if (resTrim.success) expect(resTrim.data.comment).toBe('Good job!');

    const comment2000 = 'x'.repeat(2000);
    const res2000 = validateFeedbackInput({ comment: comment2000 });
    expect(res2000.success).toBe(true);
  });

  it('rejects empty, whitespace-only, missing, or > 2000 char comments', () => {
    const resEmpty = validateFeedbackInput({ comment: '' });
    expect(resEmpty.success).toBe(false);
    if (!resEmpty.success) expect(resEmpty.fields.comment).toBeDefined();

    const resWhitespace = validateFeedbackInput({ comment: '   ' });
    expect(resWhitespace.success).toBe(false);
    if (!resWhitespace.success) expect(resWhitespace.fields.comment).toBeDefined();

    const resMissing = validateFeedbackInput({});
    expect(resMissing.success).toBe(false);
    if (!resMissing.success) expect(resMissing.fields.comment).toBeDefined();

    const resNonString = validateFeedbackInput({ comment: 12345 });
    expect(resNonString.success).toBe(false);
    if (!resNonString.success) expect(resNonString.fields.comment).toBeDefined();

    const comment2001 = 'x'.repeat(2001);
    const res2001 = validateFeedbackInput({ comment: comment2001 });
    expect(res2001.success).toBe(false);
    if (!res2001.success) expect(res2001.fields.comment).toBeDefined();
  });
});

describe('TEST-21..TEST-25 Feedback API and integration tests', () => {
  async function createMilestoneWithSubmission(teamId: string, dueAt: Date) {
    const milestone = await prisma.milestone.create({
      data: {
        teamId,
        title: `Milestone for feedback test ${Date.now()}-${Math.random()}`,
        dueAt,
        createdById: SUP1.id,
      },
    });

    const submission = await prisma.submission.create({
      data: {
        milestoneId: milestone.id,
        submittedById: S1.id,
        title: 'Initial Submission',
        link: 'https://example.com/repo',
        description: 'Initial draft for review',
      },
    });

    return { milestone, submission };
  }

  it('TEST-21 (AC-17) Sup1 posts feedback; S1 GET milestone shows feedback linked to submission with author Sup1 and status FEEDBACK_GIVEN', async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const { milestone, submission } = await createMilestoneWithSubmission(ALPHA.id, future);

    const postRes = await post(`/api/submissions/${submission.id}/feedback`, sup1, {
      comment: 'Excellent work on the deliverable.',
    });

    expect(postRes.status).toBe(201);
    expect(postRes.body.feedback).toBeDefined();
    expect(postRes.body.feedback.comment).toBe('Excellent work on the deliverable.');
    expect(postRes.body.feedback.author).toEqual({ id: SUP1.id, name: SUP1.name });
    expect(postRes.body.feedback.createdAt).toBeDefined();

    const getRes = await get(`/api/milestones/${milestone.id}`, s1);
    expect(getRes.status).toBe(200);
    expect(getRes.body.milestone.status).toBe('FEEDBACK_GIVEN');
    expect(getRes.body.submission).toBeDefined();
    expect(getRes.body.submission.feedback).toBeDefined();
    expect(getRes.body.submission.feedback.comment).toBe('Excellent work on the deliverable.');
    expect(getRes.body.submission.feedback.author).toEqual({ id: SUP1.id, name: SUP1.name });

    // DB verification (STS Expected)
    const feedbackInDb = await (prisma as any).feedback?.findUnique({
      where: { submissionId: submission.id },
    });
    expect(feedbackInDb).toBeDefined();
    expect(feedbackInDb?.comment).toBe('Excellent work on the deliverable.');
    expect(feedbackInDb?.authorId).toBe(SUP1.id);
  });

  it('TEST-22 (AC-19, BR-03) S1 POST feedback -> 403 FORBIDDEN, no feedback row in DB', async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const { submission } = await createMilestoneWithSubmission(ALPHA.id, future);

    const res = await post(`/api/submissions/${submission.id}/feedback`, s1, {
      comment: 'Student trying to give feedback',
    });

    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('FORBIDDEN');

    // DB verification
    const feedbackInDb = await (prisma as any).feedback?.findUnique({
      where: { submissionId: submission.id },
    });
    expect(feedbackInDb).toBeFalsy();
  });

  it('TEST-23 (AC-19, BR-02) Sup2 POST feedback on Alpha submission -> 404 NOT_FOUND, no feedback row in DB', async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const { submission } = await createMilestoneWithSubmission(ALPHA.id, future);

    const res = await post(`/api/submissions/${submission.id}/feedback`, sup2, {
      comment: 'Unassigned supervisor feedback',
    });

    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');

    // DB verification
    const feedbackInDb = await (prisma as any).feedback?.findUnique({
      where: { submissionId: submission.id },
    });
    expect(feedbackInDb).toBeFalsy();
  });

  it('TEST-24 (AC-18, BR-07) Alpha submission with feedback, before due -> S1 PUT submission -> 409 SUBMISSION_LOCKED, row unchanged', async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const { milestone, submission } = await createMilestoneWithSubmission(ALPHA.id, future);

    // Sup1 records feedback first
    const fbRes = await post(`/api/submissions/${submission.id}/feedback`, sup1, {
      comment: 'Review finished. Please do not modify.',
    });
    expect(fbRes.status).toBe(201);

    // S1 attempts PUT to update submission before due date
    const putRes = await put(`/api/milestones/${milestone.id}/submission`, s1, {
      title: 'Attempted Update After Feedback',
      link: 'https://example.com/updated',
    });

    expect(putRes.status).toBe(409);
    expect(putRes.body.error?.code).toBe('SUBMISSION_LOCKED');

    // DB verification: submission row remains unchanged
    const subInDb = await prisma.submission.findUnique({
      where: { id: submission.id },
    });
    expect(subInDb?.title).toBe('Initial Submission');
    expect(subInDb?.link).toBe('https://example.com/repo');
  });

  it('TEST-25 (AC-20, BR-08) Sup1 POST comment "   " -> 400; then valid -> 201; then valid again -> 409 FEEDBACK_EXISTS', async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const { submission } = await createMilestoneWithSubmission(ALPHA.id, future);

    // 1. Whitespace comment -> 400
    const resWhitespace = await post(`/api/submissions/${submission.id}/feedback`, sup1, {
      comment: '   ',
    });
    expect(resWhitespace.status).toBe(400);
    expect(resWhitespace.body.error?.code).toBe('VALIDATION_ERROR');

    const noFbInDb = await (prisma as any).feedback?.findUnique({
      where: { submissionId: submission.id },
    });
    expect(noFbInDb).toBeFalsy();

    // 2. Valid comment -> 201
    const resValid = await post(`/api/submissions/${submission.id}/feedback`, sup1, {
      comment: 'First valid feedback comment',
    });
    expect(resValid.status).toBe(201);
    expect(resValid.body.feedback?.comment).toBe('First valid feedback comment');

    // 3. Second feedback on same submission -> 409 FEEDBACK_EXISTS
    const resDuplicate = await post(`/api/submissions/${submission.id}/feedback`, sup1, {
      comment: 'Second feedback attempt',
    });
    expect(resDuplicate.status).toBe(409);
    expect(resDuplicate.body.error?.code).toBe('FEEDBACK_EXISTS');

    // DB verification: exactly one feedback exists
    const count = await (prisma as any).feedback?.count({
      where: { submissionId: submission.id },
    });
    expect(count).toBe(1);
  });

  it('D-05 malformed submission ID returns 404 NOT_FOUND before database query', async () => {
    const res = await post('/api/submissions/not-a-uuid/feedback', sup1, {
      comment: 'Valid comment text',
    });

    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });
});

