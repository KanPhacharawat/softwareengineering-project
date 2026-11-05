import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import { seedCore, DEMO_PASSWORD, USERS, type SeedKey, type Seeded } from '../prisma/seed-data.js';

export const prisma = new PrismaClient();
export const app = createApp({ prisma, sessionSecret: 'test-only-secret' });
export const DAY = 24 * 60 * 60 * 1000;

export async function resetDb(): Promise<Seeded> {
  return seedCore(prisma, 10);
}

/** Logs in a seeded user and returns a supertest agent that keeps the session cookie. */
export async function loginAs(key: SeedKey) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: USERS[key].email, password: DEMO_PASSWORD });
  if (res.status !== 200) throw new Error(`login ${key} failed: ${res.status}`);
  return agent;
}

export async function createMilestone(seed: Seeded, team: keyof Seeded['teams'], dueInMs = 7 * DAY) {
  const supervisor = team === 'gamma' ? seed.users.sup2 : seed.users.sup1;
  return prisma.milestone.create({
    data: {
      teamId: seed.teams[team].id,
      title: `Milestone for ${team}`,
      dueAt: new Date(Date.now() + dueInMs),
      createdById: supervisor.id,
    },
  });
}
