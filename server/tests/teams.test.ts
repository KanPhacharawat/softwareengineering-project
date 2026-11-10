// F-02 Role and team authorization: TEST-11, TEST-12 (AC-10, FR-04, BR-01, BR-02, NFR-03)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { seedTeams, seedUsers } from '../prisma/seed.js';
import { loginCookie } from './helpers.js';

const app = createApp();
const [SUP1, SUP2, S1, S2, S3] = seedUsers;
const [ALPHA, BETA, GAMMA] = seedTeams;

let s1: string;
let s3: string;
let sup1: string;
let sup2: string;

beforeAll(async () => {
  [s1, s3, sup1, sup2] = await Promise.all([S1, S3, SUP1, SUP2].map((u) => loginCookie(app, u.email)));
});

const get = (path: string, cookie: string) => request(app).get(path).set('Cookie', cookie);

describe('TEST-11 (AC-10, FR-04) GET /api/teams lists only visible teams', () => {
  it('a student gets only their own team, with supervisor and members', async () => {
    const res = await get('/api/teams', s1);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      teams: [
        {
          id: ALPHA.id,
          name: 'Alpha',
          supervisor: { id: SUP1.id, name: SUP1.name },
          members: [
            { id: S1.id, name: S1.name, email: S1.email },
            { id: S2.id, name: S2.name, email: S2.email },
          ],
        },
      ],
    });
  });

  it('another student gets only their own team (Beta)', async () => {
    const res = await get('/api/teams', s3);
    expect(res.body.teams.map((t: { name: string }) => t.name)).toEqual(['Beta']);
  });

  it('Sup2 gets only Gamma', async () => {
    const res = await get('/api/teams', sup2);
    expect(res.status).toBe(200);
    expect(res.body.teams.map((t: { id: string }) => t.id)).toEqual([GAMMA.id]);
  });

  it('Sup1 gets Alpha and Beta, ordered by name', async () => {
    const res = await get('/api/teams', sup1);
    expect(res.body.teams.map((t: { name: string }) => t.name)).toEqual(['Alpha', 'Beta']);
  });

  it('never returns password hashes', async () => {
    const res = await get('/api/teams', sup1);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe('TEST-12 (AC-10, BR-01, BR-02) GET /api/teams/:teamId is scoped', () => {
  it('a student gets their own team', async () => {
    const res = await get(`/api/teams/${ALPHA.id}`, s1);
    expect(res.status).toBe(200);
    expect(res.body.team.id).toBe(ALPHA.id);
    expect(res.body.team.members).toHaveLength(2);
  });

  it('a supervisor gets an assigned team', async () => {
    const res = await get(`/api/teams/${BETA.id}`, sup1);
    expect(res.status).toBe(200);
    expect(res.body.team.name).toBe('Beta');
  });

  it.each([
    ['student S1 -> Beta', () => s1, BETA],
    ['student S1 -> Gamma', () => s1, GAMMA],
    ['supervisor Sup2 -> Alpha', () => sup2, ALPHA],
    ['supervisor Sup1 -> Gamma', () => sup1, GAMMA],
  ])('%s returns 404 NOT_FOUND without the team data', async (_label, cookie, team) => {
    const res = await get(`/api/teams/${team.id}`, cookie());
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
    expect(JSON.stringify(res.body)).not.toContain(team.name);
  });

  it('a student asking for another team milestones gets 404 without data (scope checked for every /teams/:teamId/* path)', async () => {
    // STS precondition: Beta has a milestone, so a leak would be visible in the body.
    const betaMilestone = await prisma.milestone.create({
      data: { teamId: BETA.id, title: 'Beta private milestone', dueAt: new Date(Date.now() + 7 * 864e5), createdById: SUP1.id },
    });
    try {
      for (const path of [`/api/teams/${BETA.id}`, `/api/teams/${BETA.id}/milestones`]) {
        const res = await get(path, s1);
        expect(res.status).toBe(404);
        expect(Object.keys(res.body)).toEqual(['error']);
        expect(JSON.stringify(res.body)).not.toContain('Beta');
      }
    } finally {
      await prisma.milestone.delete({ where: { id: betaMilestone.id } });
    }
  });

  it('an unknown or malformed team id gives the same 404 as another team', async () => {
    const unknown = await get('/api/teams/00000000-0000-4000-8000-0000000000ff', s1);
    const malformed = await get('/api/teams/not-a-uuid', s1);
    const other = await get(`/api/teams/${BETA.id}`, s1);
    expect(unknown.status).toBe(404);
    expect(malformed.status).toBe(404);
    expect(unknown.body).toEqual(other.body);
    expect(malformed.body).toEqual(other.body);
  });
});
