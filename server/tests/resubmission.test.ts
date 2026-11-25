// F-06b Resubmission as a new version: TEST-U05, TEST-32..TEST-35 (AC-28..AC-31, FR-12, BR-07, BR-08, BR-10, BR-11)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { seedUsers } from '../prisma/seed.js';
import { createRevisionRequestedSubmission, loginCookie } from './helpers.js';
import { canResubmit } from '../src/domain/revision.js';
import { canChangeSubmission } from '../src/domain/submission.js';
import { computeMilestoneStatus } from '../src/domain/milestone.js';

const app = createApp();
const [SUP1, , S1, S2, S3] = seedUsers;

let sup1: string;
let s1: string;
let s2: string;
let s3: string;

beforeAll(async () => {
  [sup1, s1, s2, s3] = await Promise.all([SUP1, S1, S2, S3].map((u) => loginCookie(app, u.email)));
});

const get = (path: string, cookie: string) => request(app).get(path).set('Cookie', cookie);
const post = (path: string, cookie: string, body: object) => request(app).post(path).set('Cookie', cookie).send(body);
const put = (path: string, cookie: string, body: object) => request(app).put(path).set('Cookie', cookie).send(body);

const DAY = 86400000;
const versionsUrl = (submissionId: string) => `/api/submissions/${submissionId}/versions`;
const v2Body = { title: 'Revised report', link: 'https://example.com/v2' };
const fixture = (opts?: { withRequest?: boolean }) => createRevisionRequestedSubmission(app, { sup1, s1 }, opts);
const version = (submissionId: string, versionNumber: number) =>
  prisma.submissionVersion.findUnique({
    where: { submissionId_versionNumber: { submissionId, versionNumber } },
    include: { feedback: true },
  });

describe('TEST-U05 canResubmit / canChangeSubmission / computeMilestoneStatus (AC-29, AC-30)', () => {
  const now = new Date('2026-11-24T00:00:00Z');
  const at = (ms: number) => new Date(now.getTime() + ms);

  it('TEST-U05 canResubmit: no request, answered request, open, due -1 s / = / +1 s', () => {
    expect(canResubmit({ revisionDueAt: null, previousHadRequest: false }, now)).toEqual({ allowed: false, reason: 'NO_REVISION_REQUEST' });
    expect(canResubmit({ revisionDueAt: null, previousHadRequest: true }, now)).toEqual({ allowed: false, reason: 'RESUBMISSION_EXISTS' });
    expect(canResubmit({ revisionDueAt: at(1000), previousHadRequest: false }, now)).toEqual({ allowed: true });
    expect(canResubmit({ revisionDueAt: at(0), previousHadRequest: false }, now)).toEqual({ allowed: false, reason: 'REVISION_DUE_PASSED' });
    expect(canResubmit({ revisionDueAt: at(-1000), previousHadRequest: true }, now)).toEqual({ allowed: false, reason: 'REVISION_DUE_PASSED' });
  });

  it('TEST-U05 canChangeSubmission uses the revision due for v >= 2 (BR-11) and locks on current feedback (BR-07)', () => {
    const pastMilestone = { dueAt: at(-2 * DAY), closedAt: null }; // Lab 7 BR-06 v2 (CR-01, #82): was -DAY, now past the 24 h grace for v1
    expect(canChangeSubmission(pastMilestone, { feedback: null }, now)).toEqual({ allowed: false, reason: 'DEADLINE_PASSED' });
    expect(canChangeSubmission(pastMilestone, { versionNumber: 2, revisionDueAt: at(DAY) }, now)).toEqual({ allowed: true });
    expect(canChangeSubmission(pastMilestone, { versionNumber: 2, revisionDueAt: at(0) }, now)).toEqual({ allowed: false, reason: 'DEADLINE_PASSED' });
    expect(canChangeSubmission({ dueAt: at(DAY), closedAt: null }, { versionNumber: 2, revisionDueAt: at(-1000) }, now)).toEqual({ allowed: false, reason: 'DEADLINE_PASSED' });
    expect(canChangeSubmission(pastMilestone, { versionNumber: 2, revisionDueAt: at(DAY), feedback: { id: 'x' } }, now)).toEqual({ allowed: false, reason: 'SUBMISSION_LOCKED' });
  });

  it('TEST-U05 computeMilestoneStatus: open request -> REVISION_REQUESTED, expired -> FEEDBACK_GIVEN', () => {
    const milestone = { dueAt: at(DAY) };
    const withRequest = (dueAt: Date) => ({ feedback: { id: 'x' }, revisionRequest: { dueAt } });
    expect(computeMilestoneStatus(milestone, withRequest(at(1000)), now)).toBe('REVISION_REQUESTED');
    expect(computeMilestoneStatus(milestone, withRequest(at(0)), now)).toBe('FEEDBACK_GIVEN');
    expect(computeMilestoneStatus(milestone, withRequest(at(-1000)), now)).toBe('FEEDBACK_GIVEN');
  });
});

describe('TEST-32..TEST-35 Resubmission API (AC-28..AC-31)', () => {
  it('TEST-32 (AC-28) S2 resubmits before revision due -> 201 v2, createdBy S1, v1 + v1 feedback unchanged', async () => {
    const { milestoneId, submissionId, revisionDueAt } = await fixture();
    const before = await version(submissionId, 1);

    const res = await post(versionsUrl(submissionId), s2, v2Body);
    expect(res.status).toBe(201);
    const sub = res.body.submission;
    expect(sub.currentVersion).toBe(2);
    expect(sub.title).toBe(v2Body.title);
    expect(sub.submittedBy).toEqual({ id: S2.id, name: S2.name });
    expect(sub.createdBy).toEqual({ id: S1.id, name: S1.name });
    expect(sub.feedback).toBeNull();
    expect(sub.revisionRequest).toBeNull();
    expect(sub.editableUntil).toBe(revisionDueAt);

    expect(await prisma.submissionVersion.count({ where: { submissionId } })).toBe(2);
    expect(await version(submissionId, 1)).toEqual(before);
    const v2 = await version(submissionId, 2);
    expect(v2?.submittedById).toBe(S2.id);
    expect(v2?.link).toBe(v2Body.link);
    const row = await prisma.submission.findUniqueOrThrow({ where: { id: submissionId } });
    expect(row.createdById).toBe(S1.id);
    expect(row.submittedById).toBe(S2.id);

    const detail = await get(`/api/milestones/${milestoneId}`, s1);
    expect(detail.body.milestone.status).toBe('SUBMITTED');
    expect(detail.body.submission.currentVersion).toBe(2);
  });

  it('TEST-33 (AC-29) at/after revision due -> 422 REVISION_DUE_PASSED, status FEEDBACK_GIVEN, request EXPIRED', async () => {
    const { milestoneId, submissionId } = await fixture();
    await prisma.revisionRequest.updateMany({ where: { submissionId }, data: { dueAt: new Date(Date.now() - 1000) } });

    const res = await post(versionsUrl(submissionId), s1, v2Body);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('REVISION_DUE_PASSED');
    expect(res.body.error.message).toBe('Revision due date has passed');
    expect(await prisma.submissionVersion.count({ where: { submissionId } })).toBe(1);

    const detail = await get(`/api/milestones/${milestoneId}`, s1);
    expect(detail.body.milestone.status).toBe('FEEDBACK_GIVEN');
    expect(detail.body.submission.revisionRequest.status).toBe('EXPIRED');
  });

  it('TEST-33 (AC-29) milestone due passed but revision due in the future -> 201', async () => {
    const { milestoneId, submissionId } = await fixture();
    await prisma.milestone.update({ where: { id: milestoneId }, data: { dueAt: new Date(Date.now() - DAY) } });

    const res = await post(versionsUrl(submissionId), s1, v2Body);
    expect(res.status).toBe(201);
    expect(res.body.submission.currentVersion).toBe(2);
  });

  it('TEST-34 (AC-30) no request 409, second 409 RESUBMISSION_EXISTS, Sup1 403, S3 404, malformed 404', async () => {
    const noRequest = await fixture({ withRequest: false });
    const res1 = await post(versionsUrl(noRequest.submissionId), s1, v2Body);
    expect(res1.status).toBe(409);
    expect(res1.body.error).toMatchObject({ code: 'NO_REVISION_REQUEST', message: 'No revision has been requested for this submission' });

    const { submissionId } = await fixture();
    expect((await post(versionsUrl(submissionId), s1, { title: 'x', link: 'nope' })).status).toBe(400);
    expect((await post(versionsUrl(submissionId), sup1, v2Body)).status).toBe(403);
    expect((await post(versionsUrl(submissionId), s3, v2Body)).status).toBe(404);
    expect((await post(versionsUrl('not-a-uuid'), s1, v2Body)).status).toBe(404);
    expect((await request(app).post(versionsUrl(submissionId)).send(v2Body)).status).toBe(401);

    expect((await post(versionsUrl(submissionId), s1, v2Body)).status).toBe(201);
    const res2 = await post(versionsUrl(submissionId), s2, v2Body);
    expect(res2.status).toBe(409);
    expect(res2.body.error).toMatchObject({ code: 'RESUBMISSION_EXISTS', message: 'This revision request has already been answered' });
    expect(await prisma.submissionVersion.count({ where: { submissionId } })).toBe(2);
  });

  it('TEST-34 (AC-30) two parallel resubmissions store exactly one version', async () => {
    const { submissionId } = await fixture();
    const results = await Promise.all([post(versionsUrl(submissionId), s1, v2Body), post(versionsUrl(submissionId), s2, v2Body)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409)!.body.error.code).toBe('RESUBMISSION_EXISTS');
    expect(await prisma.submissionVersion.count({ where: { submissionId } })).toBe(2);
  });

  it('TEST-34 (AC-30) S1 PUT edits v2 only before feedback; after revision due -> 422 DEADLINE_PASSED', async () => {
    const { milestoneId, submissionId } = await fixture();
    expect((await post(versionsUrl(submissionId), s2, v2Body)).status).toBe(201);
    const v1Before = await version(submissionId, 1);

    const edit = { title: 'Revised report v2b', link: 'https://example.com/v2b' };
    const res = await put(`/api/milestones/${milestoneId}/submission`, s1, edit);
    expect(res.status).toBe(200);
    expect(res.body.submission.title).toBe(edit.title);
    expect(res.body.submission.currentVersion).toBe(2);
    expect((await version(submissionId, 2))?.title).toBe(edit.title);
    expect(await version(submissionId, 1)).toEqual(v1Before);

    await prisma.revisionRequest.updateMany({ where: { submissionId }, data: { dueAt: new Date(Date.now() - 1000) } });
    const late = await put(`/api/milestones/${milestoneId}/submission`, s1, edit);
    expect(late.status).toBe(422);
    expect(late.body.error.code).toBe('DEADLINE_PASSED');
  });

  it('TEST-35 (AC-31) feedback on v2 is stored on v2 and locks it; second feedback 409; v1 feedback unchanged', async () => {
    const { milestoneId, submissionId } = await fixture();
    expect((await post(versionsUrl(submissionId), s2, v2Body)).status).toBe(201);
    const v1Before = await version(submissionId, 1);

    const fb = await post(`/api/submissions/${submissionId}/feedback`, sup1, { comment: 'Looks good now' });
    expect(fb.status).toBe(201);
    expect(fb.body.feedback.versionNumber).toBe(2);
    const v2 = await version(submissionId, 2);
    expect(await prisma.feedback.findUnique({ where: { versionId: v2!.id } })).toMatchObject({ comment: 'Looks good now' });

    const locked = await put(`/api/milestones/${milestoneId}/submission`, s2, v2Body);
    expect(locked.status).toBe(409);
    expect(locked.body.error.code).toBe('SUBMISSION_LOCKED');

    const again = await post(`/api/submissions/${submissionId}/feedback`, sup1, { comment: 'Again' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('FEEDBACK_EXISTS');

    expect(await version(submissionId, 1)).toEqual(v1Before);
  });
});
