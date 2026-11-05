import { beforeEach, describe, expect, it } from 'vitest';
import { prisma, resetDb, loginAs, createMilestone, DAY } from '../helpers.js';
import type { Seeded } from '../../prisma/seed-data.js';

let seed: Seeded;
beforeEach(async () => {
  seed = await resetDb();
});

const future = () => new Date(Date.now() + 7 * DAY).toISOString();

describe('F-03 milestone creation', () => {
  it('TEST-07 AC-06 assigned supervisor creates a milestone that team members see as OPEN', async () => {
    const sup1 = await loginAs('sup1');
    const res = await sup1
      .post(`/api/teams/${seed.teams.alpha.id}/milestones`)
      .send({ title: 'Requirements draft', description: 'SRS link', dueAt: future() });
    expect(res.status).toBe(201);
    expect(res.body.milestone).toMatchObject({ title: 'Requirements draft', description: 'SRS link', status: 'OPEN' });
    expect(await prisma.milestone.count({ where: { teamId: seed.teams.alpha.id } })).toBe(1);

    const s1 = await loginAs('s1');
    const list = await s1.get(`/api/teams/${seed.teams.alpha.id}/milestones`);
    expect(list.status).toBe(200);
    expect(list.body.milestones).toHaveLength(1);
    expect(list.body.milestones[0]).toMatchObject({ id: res.body.milestone.id, status: 'OPEN' });
  });

  it('TEST-08 AC-07 invalid title or past due date is rejected with field errors and nothing stored', async () => {
    const sup1 = await loginAs('sup1');
    const url = `/api/teams/${seed.teams.alpha.id}/milestones`;
    const past = await sup1.post(url).send({ title: 'Valid title', dueAt: new Date(Date.now() - 60_000).toISOString() });
    expect(past.status).toBe(400);
    expect(past.body.error.code).toBe('VALIDATION_ERROR');
    expect(past.body.error.fields).toHaveProperty('dueAt');
    const short = await sup1.post(url).send({ title: 'ab', dueAt: future() });
    expect(short.status).toBe(400);
    expect(short.body.error.fields).toHaveProperty('title');
    const long = await sup1.post(url).send({ title: 'x'.repeat(121), dueAt: future() });
    expect(long.status).toBe(400);
    const missing = await sup1.post(url).send({});
    expect(missing.status).toBe(400);
    expect(await prisma.milestone.count()).toBe(0);
  });

  it('TEST-09 AC-08 supervisor cannot create a milestone for an unassigned team', async () => {
    const sup1 = await loginAs('sup1');
    const res = await sup1.post(`/api/teams/${seed.teams.gamma.id}/milestones`).send({ title: 'Sneaky', dueAt: future() });
    expect(res.status).toBe(404);
    expect(await prisma.milestone.count()).toBe(0);
  });

  it('TEST-10 AC-09 student cannot create a milestone', async () => {
    const s1 = await loginAs('s1');
    const res = await s1.post(`/api/teams/${seed.teams.alpha.id}/milestones`).send({ title: 'My own deadline', dueAt: future() });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(await prisma.milestone.count()).toBe(0);
  });

  it('TEST-12 AC-10 a student cannot list another team\'s milestones', async () => {
    await createMilestone(seed, 'beta');
    const s1 = await loginAs('s1');
    const res = await s1.get(`/api/teams/${seed.teams.beta.id}/milestones`);
    expect(res.status).toBe(404);
    expect(res.body.milestones).toBeUndefined();
  });

  it('milestone status reflects submission, feedback and missed deadlines', async () => {
    const open = await createMilestone(seed, 'alpha', 3 * DAY);
    const missed = await createMilestone(seed, 'alpha', -DAY);
    const s1 = await loginAs('s1');
    await s1.post(`/api/milestones/${open.id}/submission`).send({ title: 'Work', link: 'https://e.com' });
    const list = await s1.get(`/api/teams/${seed.teams.alpha.id}/milestones`);
    const status = Object.fromEntries(list.body.milestones.map((m: { id: string; status: string }) => [m.id, m.status]));
    expect(status).toEqual({ [open.id]: 'SUBMITTED', [missed.id]: 'MISSED' });
    // sorted by due date ascending
    expect(list.body.milestones[0].id).toBe(missed.id);
  });
});
