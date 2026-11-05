import { beforeEach, describe, expect, it } from 'vitest';
import { prisma, resetDb, loginAs, createMilestone, DAY } from '../helpers.js';
import type { Seeded } from '../../prisma/seed-data.js';

let seed: Seeded;
beforeEach(async () => {
  seed = await resetDb();
});

const work = { title: 'Sprint 1 demo', description: 'Repository and video', link: 'https://github.com/team-alpha/app' };

describe('F-04 team submission', () => {
  it('TEST-13 AC-11 student submits and teammates and supervisor retrieve the persisted submission', async () => {
    const m = await createMilestone(seed, 'alpha');
    const s1 = await loginAs('s1');
    const res = await s1.post(`/api/milestones/${m.id}/submission`).send(work);
    expect(res.status).toBe(201);
    expect(res.body.submission).toMatchObject({ ...work, submittedBy: { id: seed.users.s1.id } });

    for (const who of ['s2', 'sup1'] as const) {
      const agent = await loginAs(who);
      const got = await agent.get(`/api/milestones/${m.id}`);
      expect(got.status, who).toBe(200);
      expect(got.body.milestone.status).toBe('SUBMITTED');
      expect(got.body.submission).toMatchObject({ ...work, submittedBy: { id: seed.users.s1.id }, feedback: null });
    }
    const row = await prisma.submission.findUniqueOrThrow({ where: { milestoneId: m.id } });
    expect(row.link).toBe(work.link);
  });

  it('TEST-14 AC-12 a second submission for the same milestone is rejected', async () => {
    const m = await createMilestone(seed, 'alpha');
    await (await loginAs('s1')).post(`/api/milestones/${m.id}/submission`).send(work).expect(201);
    const again = await (await loginAs('s2')).post(`/api/milestones/${m.id}/submission`).send({ ...work, title: 'Other' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('SUBMISSION_EXISTS');
    expect(await prisma.submission.count()).toBe(1);
  });

  it('TEST-15 AC-12 concurrent submissions store exactly one row (NFR-09)', async () => {
    const m = await createMilestone(seed, 'alpha');
    const [s1, s2] = await Promise.all([loginAs('s1'), loginAs('s2')]);
    const results = await Promise.all([
      s1.post(`/api/milestones/${m.id}/submission`).send(work),
      s2.post(`/api/milestones/${m.id}/submission`).send({ ...work, title: 'Parallel' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.submission.count({ where: { milestoneId: m.id } })).toBe(1);
  });

  it('TEST-16 AC-13 submit and edit after the due date are rejected and data is unchanged', async () => {
    const pastDue = await createMilestone(seed, 'alpha', -60_000);
    const s1 = await loginAs('s1');
    const post = await s1.post(`/api/milestones/${pastDue.id}/submission`).send(work);
    expect(post.status).toBe(422);
    expect(post.body.error.code).toBe('DEADLINE_PASSED');
    expect(await prisma.submission.count()).toBe(0);

    const m = await createMilestone(seed, 'alpha');
    await s1.post(`/api/milestones/${m.id}/submission`).send(work).expect(201);
    await prisma.milestone.update({ where: { id: m.id }, data: { dueAt: new Date(Date.now() - 1000) } });
    const put = await s1.put(`/api/milestones/${m.id}/submission`).send({ ...work, title: 'Too late' });
    expect(put.status).toBe(422);
    expect((await prisma.submission.findUniqueOrThrow({ where: { milestoneId: m.id } })).title).toBe(work.title);
  });

  it('TEST-17 AC-14 invalid link or title is rejected with field errors', async () => {
    const m = await createMilestone(seed, 'alpha');
    const s1 = await loginAs('s1');
    for (const link of ['ftp://x', 'not a url']) {
      const res = await s1.post(`/api/milestones/${m.id}/submission`).send({ ...work, link });
      expect(res.status, link).toBe(400);
      expect(res.body.error.fields).toHaveProperty('link');
    }
    const t = await s1.post(`/api/milestones/${m.id}/submission`).send({ ...work, title: 'ab' });
    expect(t.status).toBe(400);
    expect(t.body.error.fields).toHaveProperty('title');
    expect(await prisma.submission.count()).toBe(0);
  });

  it('TEST-18 AC-15 a student of another team gets 404 without data', async () => {
    const m = await createMilestone(seed, 'alpha');
    await (await loginAs('s1')).post(`/api/milestones/${m.id}/submission`).send(work).expect(201);
    const s3 = await loginAs('s3');
    const get = await s3.get(`/api/milestones/${m.id}`);
    expect(get.status).toBe(404);
    expect(JSON.stringify(get.body)).not.toContain(work.link);
    expect((await s3.post(`/api/milestones/${m.id}/submission`).send(work)).status).toBe(404);
    expect((await s3.put(`/api/milestones/${m.id}/submission`).send(work)).status).toBe(404);
    expect((await prisma.submission.findUniqueOrThrow({ where: { milestoneId: m.id } })).submittedById).toBe(seed.users.s1.id);
  });

  it('TEST-19 AC-16 a teammate edits the submission before the deadline', async () => {
    const m = await createMilestone(seed, 'alpha');
    const created = await (await loginAs('s1')).post(`/api/milestones/${m.id}/submission`).send(work);
    const s2 = await loginAs('s2');
    const edit = { title: 'Sprint 1 demo v2', description: 'Updated', link: 'https://github.com/team-alpha/app/tree/v2' };
    const res = await s2.put(`/api/milestones/${m.id}/submission`).send(edit);
    expect(res.status).toBe(200);
    expect(res.body.submission).toMatchObject({ ...edit, submittedBy: { id: seed.users.s2.id } });
    const row = await prisma.submission.findUniqueOrThrow({ where: { milestoneId: m.id } });
    expect(row).toMatchObject({ ...edit, submittedById: seed.users.s2.id });
    expect(row.updatedAt.getTime()).toBeGreaterThan(new Date(created.body.submission.updatedAt).getTime());
  });

  it('PUT without an existing submission returns 404', async () => {
    const m = await createMilestone(seed, 'alpha');
    expect((await (await loginAs('s1')).put(`/api/milestones/${m.id}/submission`).send(work)).status).toBe(404);
  });

  it('TEST-20 AC-09 a supervisor cannot submit work', async () => {
    const m = await createMilestone(seed, 'alpha');
    const res = await (await loginAs('sup1')).post(`/api/milestones/${m.id}/submission`).send(work);
    expect(res.status).toBe(403);
    expect(await prisma.submission.count()).toBe(0);
  });
});
