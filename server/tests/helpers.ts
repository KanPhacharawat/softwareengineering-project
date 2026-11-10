import request from 'supertest';
import type { Express } from 'express';
import { SEED_PASSWORD } from '../prisma/seed.js';

// Logs in a seeded user and returns the `cpms.sid=...` cookie to send with later requests.
export async function loginCookie(app: Express, email: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password: SEED_PASSWORD });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status}`);
  const raw = res.headers['set-cookie'] as unknown as string[];
  return raw.find((c) => c.startsWith('cpms.sid='))!.split(';')[0];
}
