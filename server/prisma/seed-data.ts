import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';

/** Synthetic demo password for every seeded account (local/demo use only). */
export const DEMO_PASSWORD = 'Passw0rd!';

export const USERS = {
  sup1: { email: 'sup1@cpms.test', name: 'Dr. Anan Supervisor', role: 'SUPERVISOR' },
  sup2: { email: 'sup2@cpms.test', name: 'Dr. Busaba Supervisor', role: 'SUPERVISOR' },
  s1: { email: 's1@cpms.test', name: 'Chai Student', role: 'STUDENT' },
  s2: { email: 's2@cpms.test', name: 'Dao Student', role: 'STUDENT' },
  s3: { email: 's3@cpms.test', name: 'Ek Student', role: 'STUDENT' },
  s4: { email: 's4@cpms.test', name: 'Fah Student', role: 'STUDENT' },
  s5: { email: 's5@cpms.test', name: 'Gun Student', role: 'STUDENT' },
  s6: { email: 's6@cpms.test', name: 'Hom Student', role: 'STUDENT' },
} as const;

export type SeedKey = keyof typeof USERS;

export const TEAMS = {
  alpha: { name: 'Team Alpha', supervisor: 'sup1', members: ['s1', 's2'] },
  beta: { name: 'Team Beta', supervisor: 'sup1', members: ['s3', 's4'] },
  gamma: { name: 'Team Gamma', supervisor: 'sup2', members: ['s5', 's6'] },
} as const;

export type Seeded = {
  users: Record<SeedKey, { id: string }>;
  teams: Record<keyof typeof TEAMS, { id: string }>;
};

/** Deletes all domain data and sessions, then inserts users, teams and memberships. */
export async function seedCore(prisma: PrismaClient, bcryptCost = 12): Promise<Seeded> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Feedback", "Submission", "Milestone", "TeamMember", "Team", "User", "session" CASCADE',
  );
  const hash = await bcrypt.hash(DEMO_PASSWORD, bcryptCost);
  const users = {} as Seeded['users'];
  for (const [key, u] of Object.entries(USERS) as [SeedKey, (typeof USERS)[SeedKey]][]) {
    users[key] = await prisma.user.create({
      data: { email: u.email, name: u.name, role: u.role, passwordHash: hash },
      select: { id: true },
    });
  }
  const teams = {} as Seeded['teams'];
  for (const [key, t] of Object.entries(TEAMS) as [keyof typeof TEAMS, (typeof TEAMS)[keyof typeof TEAMS]][]) {
    teams[key] = await prisma.team.create({
      data: {
        name: t.name,
        supervisorId: users[t.supervisor].id,
        members: { create: t.members.map((m) => ({ userId: users[m].id })) },
      },
      select: { id: true },
    });
  }
  return { users, teams };
}
