// F-06c Revision history: TEST-37, TEST-38 (AC-32, AC-33, FR-13, BR-01, BR-02, BR-10, NFR-03, NFR-07)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { seedUsers } from '../prisma/seed.js';
import { createRevisionRequestedSubmission, loginCookie } from './helpers.js';

const app = createApp();
const [SUP1, SUP2, S1, S2, S3] = seedUsers;

let sup1: string;
let sup2: string;
let s1: string;
let s2: string;
let s3: string;

beforeAll(async () => {
  [sup1, sup2, s1, s2, s3] = await Promise.all([SUP1, SUP2, S1, S2, S3].map((u) => loginCookie(app, u.email)));
});

const historyUrl = (submissionId: string) => `/api/submissions/${submissionId}/history`;
const user = (u: { id: string; name: string }) => ({ id: u.id, name: u.name });

// v1 by S1 -> feedback -> revision request -> v2 by S2 -> feedback on v2, all through the API
async function twoVersionFixture() {
  const { milestoneId, submissionId } = await createRevisionRequestedSubmission(app, { sup1, s1 });
  const v2 = await request(app).post(`/api/submissions/${submissionId}/versions`).set('Cookie', s2)
    .send({ title: 'Sprint 2 demo v2', description: 'Added test evidence', link: 'https://example.com/v2' });
  expect(v2.status).toBe(201);
  const fb = await request(app).post(`/api/submissions/${submissionId}/feedback`).set('Cookie', sup1).send({ comment: 'Good now' });
  expect(fb.status).toBe(201);
  return { milestoneId, submissionId };
}

describe('TEST-37..TEST-38 History API (AC-32, AC-33)', () => {
  it('TEST-37 (AC-32) S1, S2, Sup1 get every version ascending with submitter, feedback and revision request', async () => {
    const { milestoneId, submissionId } = await twoVersionFixture();

    for (const cookie of [s1, s2, sup1]) {
      const res = await request(app).get(historyUrl(submissionId)).set('Cookie', cookie);
      expect(res.status).toBe(200);
      const { submission, versions } = res.body;
      expect(submission).toEqual({ id: submissionId, milestoneId, createdBy: user(S1) });
      expect(versions.map((v: { versionNumber: number }) => v.versionNumber)).toEqual([1, 2]);

      const [v1, v2] = versions;
      expect(v1.title).toBe('Sprint 2 demo');
      expect(v1.submittedBy).toEqual(user(S1));
      expect(v1.feedback.comment).toBe('Tests are missing');
      expect(v1.feedback.author).toEqual(user(SUP1));
      expect(v1.revisionRequest.reason).toBe('Add test evidence');
      expect(v1.revisionRequest.status).toBe('RESUBMITTED');
      expect(v1.revisionRequest.requestedBy).toEqual(user(SUP1));

      expect(v2.title).toBe('Sprint 2 demo v2');
      expect(v2.description).toBe('Added test evidence');
      expect(v2.submittedBy).toEqual(user(S2));
      expect(v2.feedback.comment).toBe('Good now');
      expect(v2.revisionRequest).toBeNull();
      expect(Date.parse(v2.submittedAt)).toBeGreaterThanOrEqual(Date.parse(v1.submittedAt));

      // NFR-07: users are only { id, name }
      expect(JSON.stringify(res.body)).not.toMatch(/email|passwordHash/);
    }
  });

  it('TEST-38 (AC-33) S3 404, Sup2 404, malformed 404, unknown 404, no session 401; error bodies carry no data', async () => {
    const { submissionId } = await createRevisionRequestedSubmission(app, { sup1, s1 });

    for (const cookie of [s3, sup2]) {
      const res = await request(app).get(historyUrl(submissionId)).set('Cookie', cookie);
      expect(res.status).toBe(404);
      expect(Object.keys(res.body)).toEqual(['error']);
    }
    const malformed = await request(app).get(historyUrl('not-a-uuid')).set('Cookie', s1);
    expect(malformed.status).toBe(404);
    expect(Object.keys(malformed.body)).toEqual(['error']);
    const unknown = await request(app).get(historyUrl('6f0c0000-0000-4000-8000-000000000000')).set('Cookie', s1);
    expect(unknown.status).toBe(404);
    expect(Object.keys(unknown.body)).toEqual(['error']);
    const anon = await request(app).get(historyUrl(submissionId));
    expect(anon.status).toBe(401);
    expect(Object.keys(anon.body)).toEqual(['error']);
  });
});
