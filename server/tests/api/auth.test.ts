import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app, prisma, resetDb, loginAs, createMilestone } from '../helpers.js';
import { DEMO_PASSWORD, USERS, type Seeded } from '../../prisma/seed-data.js';

let seed: Seeded;
beforeAll(async () => {
  seed = await resetDb();
});

describe('F-01 authentication', () => {
  it('TEST-01 AC-01 valid login returns the user without hash and /me returns the same user', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ email: 'S1@cpms.test', password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toMatch(/^cpms\.sid=.*HttpOnly/i);
    expect(res.body.user).toEqual({ id: seed.users.s1.id, email: USERS.s1.email, name: USERS.s1.name, role: 'STUDENT' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(seed.users.s1.id);
  });

  it('TEST-02 AC-02 wrong password returns 401 INVALID_CREDENTIALS without a cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: USERS.s1.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('TEST-03 AC-02 unknown email gives the same response as a wrong password', async () => {
    const wrongPw = await request(app).post('/api/auth/login').send({ email: USERS.s1.email, password: 'nope' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@cpms.test', password: 'nope' });
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrongPw.body);
    expect(unknown.headers['set-cookie']).toBeUndefined();
  });

  it('login with an empty body is rejected with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('TEST-04 AC-03 protected endpoints reject unauthenticated requests without data', async () => {
    const m = await createMilestone(seed, 'alpha');
    const paths = ['/api/auth/me', '/api/teams', `/api/teams/${seed.teams.alpha.id}`,
      `/api/teams/${seed.teams.alpha.id}/milestones`, `/api/milestones/${m.id}`];
    for (const p of paths) {
      const res = await request(app).get(p);
      expect(res.status, p).toBe(401);
      expect(Object.keys(res.body), p).toEqual(['error']);
      expect(res.body.error.code, p).toBe('UNAUTHENTICATED');
    }
  });

  it('TEST-05 AC-04 after logout the old session cookie is rejected', async () => {
    const agent = await loginAs('s1');
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(204);
    // Replay the cookie captured before logout to prove the server-side session is gone.
    const login = await request(app).post('/api/auth/login').send({ email: USERS.s2.email, password: DEMO_PASSWORD });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204);
    const replay = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(replay.status).toBe(401);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('TEST-06 AC-05 passwords are stored only as bcrypt hashes with cost >= 10', async () => {
    const users = await prisma.user.findMany({ select: { passwordHash: true } });
    expect(users.length).toBe(8);
    for (const u of users) {
      expect(u.passwordHash).toMatch(/^\$2[aby]\$\d\d\$/);
      expect(bcrypt.getRounds(u.passwordHash)).toBeGreaterThanOrEqual(10);
      expect(u.passwordHash).not.toBe(DEMO_PASSWORD);
    }
  });
});

describe('F-02 team scope', () => {
  it('TEST-11 AC-10 students see only their team and supervisors only assigned teams', async () => {
    const s1 = await loginAs('s1');
    const res = await s1.get('/api/teams');
    expect(res.status).toBe(200);
    expect(res.body.teams.map((t: { name: string }) => t.name)).toEqual(['Team Alpha']);
    expect(res.body.teams[0].members.map((m: { email: string }) => m.email).sort()).toEqual(['s1@cpms.test', 's2@cpms.test']);

    const sup2 = await loginAs('sup2');
    const res2 = await sup2.get('/api/teams');
    expect(res2.body.teams.map((t: { name: string }) => t.name)).toEqual(['Team Gamma']);

    const sup1 = await loginAs('sup1');
    const res3 = await sup1.get('/api/teams');
    expect(res3.body.teams.map((t: { name: string }) => t.name)).toEqual(['Team Alpha', 'Team Beta']);
  });

  it('TEST-12 AC-10 a student gets 404 without data for another team', async () => {
    const s1 = await loginAs('s1');
    const res = await s1.get(`/api/teams/${seed.teams.beta.id}`);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('Team Beta');
    const own = await s1.get(`/api/teams/${seed.teams.alpha.id}`);
    expect(own.status).toBe(200);
    expect(own.body.team.name).toBe('Team Alpha');
  });

  it('a malformed team id returns 404, not 500', async () => {
    const s1 = await loginAs('s1');
    expect((await s1.get('/api/teams/not-a-uuid')).status).toBe(404);
  });
});
