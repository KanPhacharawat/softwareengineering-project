// F-01 Authentication and session: TEST-01..TEST-06 (AC-01..AC-05, NFR-01, NFR-02, NFR-04)
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma, pgPool } from '../src/db.js';
import { SEED_PASSWORD, seedTeams, seedUsers } from '../prisma/seed.js';

const app = createApp();
const S1 = seedUsers[2];
const ALPHA = seedTeams[0];

afterAll(async () => {
  await prisma.$disconnect();
  await pgPool.end();
});

function sessionCookie(res: request.Response): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith('cpms.sid='))?.split(';')[0];
}

async function loginAs(email: string, password = SEED_PASSWORD) {
  return request(app).post('/api/auth/login').send({ email, password });
}

describe('TEST-01 (AC-01) login with correct credentials', () => {
  it('returns the user without passwordHash, sets an httpOnly session cookie, and /me returns the same user', async () => {
    const res = await loginAs(S1.email);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: { id: S1.id, email: S1.email, name: S1.name, role: 'STUDENT' } });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const setCookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('cpms.sid='));
    expect(setCookie).toBeDefined();
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Max-Age=28800|Expires=/i);

    const me = await request(app).get('/api/auth/me').set('Cookie', sessionCookie(res)!);
    expect(me.status).toBe(200);
    expect(me.body).toEqual(res.body);
  });

  it('accepts the email in any letter case', async () => {
    const res = await loginAs('S1@CPMS.TEST');
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(S1.id);
  });

  it('rejects an empty body with 400 VALIDATION_ERROR and field messages', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['email', 'password']);
    expect(sessionCookie(res)).toBeUndefined();
  });
});

describe('TEST-02 / TEST-03 (AC-02) wrong password and unknown email', () => {
  it('wrong password gives 401 INVALID_CREDENTIALS and no session cookie', async () => {
    const res = await loginAs(S1.email, 'wrong-password');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(sessionCookie(res)).toBeUndefined();
  });

  it('unknown email gives the same 401 response as a wrong password', async () => {
    const wrongPassword = await loginAs(S1.email, 'wrong-password');
    const unknown = await loginAs('nobody@cpms.test');
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrongPassword.body);
    expect(sessionCookie(unknown)).toBeUndefined();
  });
});

describe('TEST-04 (AC-03, NFR-02) protected endpoints without a session', () => {
  const paths = [
    '/api/auth/me',
    '/api/teams',
    `/api/teams/${ALPHA.id}/milestones`,
    '/api/milestones/00000000-0000-4000-8000-00000000f001',
  ];

  it.each(paths)('GET %s returns 401 UNAUTHENTICATED with only an error body', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a forged session cookie', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'cpms.sid=s%3Aforged.signature');
    expect(res.status).toBe(401);
  });
});

describe('TEST-05 (AC-04, NFR-04) logout', () => {
  it('returns 204, clears the cookie, and the old cookie is rejected afterwards', async () => {
    const cookie = sessionCookie(await loginAs(S1.email))!;
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(200);

    const out = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(204);
    const cleared = (out.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('cpms.sid='));
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('deletes the session row from the database', async () => {
    const before = await prisma.session.count();
    const cookie = sessionCookie(await loginAs(S1.email))!;
    expect(await prisma.session.count()).toBe(before + 1);
    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(await prisma.session.count()).toBe(before);
  });

  it('is idempotent: logout without a session returns 204', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(204);
  });
});

describe('TEST-06 (AC-05, NFR-01) stored password hashes', () => {
  it('every passwordHash is bcrypt with cost >= 10 and is not the plain password', async () => {
    const users = await prisma.user.findMany({ select: { passwordHash: true } });
    expect(users).toHaveLength(seedUsers.length);
    for (const { passwordHash } of users) {
      expect(passwordHash.startsWith('$2')).toBe(true);
      expect(bcrypt.getRounds(passwordHash)).toBeGreaterThanOrEqual(10);
      expect(passwordHash).not.toBe(SEED_PASSWORD);
      expect(await bcrypt.compare(SEED_PASSWORD, passwordHash)).toBe(true);
    }
  });
});
