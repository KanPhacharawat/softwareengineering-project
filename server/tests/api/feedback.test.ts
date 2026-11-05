import { beforeEach, describe, expect, it } from 'vitest';
import { prisma, resetDb, loginAs, createMilestone } from '../helpers.js';
import type { Seeded } from '../../prisma/seed-data.js';

let seed: Seeded;
let milestoneId: string;
let submissionId: string;
const work = { title: 'Sprint 1 demo', description: 'Repo', link: 'https://github.com/team-alpha/app' };

beforeEach(async () => {
  seed = await resetDb();
  const m = await createMilestone(seed, 'alpha');
  milestoneId = m.id;
  const res = await (await loginAs('s1')).post(`/api/milestones/${m.id}/submission`).send(work);
  submissionId = res.body.submission.id;
});

describe('F-05 supervisor feedback', () => {
  it('TEST-21 AC-17 assigned supervisor records feedback that the team sees linked to the submission', async () => {
    const sup1 = await loginAs('sup1');
    const res = await sup1.post(`/api/submissions/${submissionId}/feedback`).send({ comment: 'Good scope. Add tests for BR-06.' });
    expect(res.status).toBe(201);
    expect(res.body.feedback).toMatchObject({ comment: 'Good scope. Add tests for BR-06.', author: { id: seed.users.sup1.id } });

    const got = await (await loginAs('s1')).get(`/api/milestones/${milestoneId}`);
    expect(got.body.milestone.status).toBe('FEEDBACK_GIVEN');
    expect(got.body.submission.id).toBe(submissionId);
    expect(got.body.submission.feedback).toMatchObject({ comment: 'Good scope. Add tests for BR-06.', author: { name: 'Dr. Anan Supervisor' } });
    const row = await prisma.feedback.findUniqueOrThrow({ where: { submissionId } });
    expect(row.authorId).toBe(seed.users.sup1.id);
  });

  it('TEST-22 AC-19 a student cannot record feedback', async () => {
    const res = await (await loginAs('s1')).post(`/api/submissions/${submissionId}/feedback`).send({ comment: 'Great job, us!' });
    expect(res.status).toBe(403);
    expect(await prisma.feedback.count()).toBe(0);
  });

  it('TEST-23 AC-19 an unassigned supervisor gets 404 and nothing is stored', async () => {
    const res = await (await loginAs('sup2')).post(`/api/submissions/${submissionId}/feedback`).send({ comment: 'Not my team' });
    expect(res.status).toBe(404);
    expect(await prisma.feedback.count()).toBe(0);
  });

  it('TEST-24 AC-18 feedback locks the submission even before the deadline', async () => {
    await (await loginAs('sup1')).post(`/api/submissions/${submissionId}/feedback`).send({ comment: 'Reviewed' }).expect(201);
    const res = await (await loginAs('s1')).put(`/api/milestones/${milestoneId}/submission`).send({ ...work, title: 'Sneaky change' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SUBMISSION_LOCKED');
    expect((await prisma.submission.findUniqueOrThrow({ where: { id: submissionId } })).title).toBe(work.title);
  });

  it('TEST-25 AC-20 empty feedback is rejected and feedback can be given only once', async () => {
    const sup1 = await loginAs('sup1');
    const blank = await sup1.post(`/api/submissions/${submissionId}/feedback`).send({ comment: '   ' });
    expect(blank.status).toBe(400);
    expect(blank.body.error.fields).toHaveProperty('comment');
    await sup1.post(`/api/submissions/${submissionId}/feedback`).send({ comment: 'First' }).expect(201);
    const second = await sup1.post(`/api/submissions/${submissionId}/feedback`).send({ comment: 'Second' });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('FEEDBACK_EXISTS');
    expect(await prisma.feedback.count()).toBe(1);
  });
});
