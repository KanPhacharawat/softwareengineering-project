// Reproducible synthetic seed data (SDS section 2, STS fixtures). Fixed IDs and emails so tests can rely on them.
// All demo accounts share one password, read from SEED_PASSWORD. Outside production it falls back to a
// well-known local default so `npm test` and e2e work without setup; in production it must be set (Secret Manager).
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const LOCAL_DEFAULT_PASSWORD = 'password123';

function seedPassword(): string {
  const fromEnv = process.env.SEED_PASSWORD;
  if (process.env.NODE_ENV === 'production') {
    if (!fromEnv || fromEnv === LOCAL_DEFAULT_PASSWORD) {
      throw new Error('SEED_PASSWORD must be set to a non-default value in production');
    }
    return fromEnv;
  }
  return fromEnv || LOCAL_DEFAULT_PASSWORD;
}

export const SEED_PASSWORD = seedPassword();
const BCRYPT_COST = 12;

export const seedUsers = [
  { id: '00000000-0000-4000-8000-000000000001', email: 'sup1@cpms.test', name: 'Supervisor One', role: Role.SUPERVISOR },
  { id: '00000000-0000-4000-8000-000000000002', email: 'sup2@cpms.test', name: 'Supervisor Two', role: Role.SUPERVISOR },
  { id: '00000000-0000-4000-8000-000000000011', email: 's1@cpms.test', name: 'Student One', role: Role.STUDENT },
  { id: '00000000-0000-4000-8000-000000000012', email: 's2@cpms.test', name: 'Student Two', role: Role.STUDENT },
  { id: '00000000-0000-4000-8000-000000000013', email: 's3@cpms.test', name: 'Student Three', role: Role.STUDENT },
  { id: '00000000-0000-4000-8000-000000000014', email: 's4@cpms.test', name: 'Student Four', role: Role.STUDENT },
  { id: '00000000-0000-4000-8000-000000000015', email: 's5@cpms.test', name: 'Student Five', role: Role.STUDENT },
  { id: '00000000-0000-4000-8000-000000000016', email: 's6@cpms.test', name: 'Student Six', role: Role.STUDENT },
] as const;

export const seedTeams = [
  { id: '00000000-0000-4000-8000-0000000000a1', name: 'Alpha', supervisorId: seedUsers[0].id, memberIds: [seedUsers[2].id, seedUsers[3].id] },
  { id: '00000000-0000-4000-8000-0000000000b1', name: 'Beta', supervisorId: seedUsers[0].id, memberIds: [seedUsers[4].id, seedUsers[5].id] },
  { id: '00000000-0000-4000-8000-0000000000c1', name: 'Gamma', supervisorId: seedUsers[1].id, memberIds: [seedUsers[6].id, seedUsers[7].id] },
] as const;

// Safe to run again. By default it only upserts the demo users, teams and memberships, so data created
// in the app (milestones, submissions, feedback) is kept. `reset: true` first deletes all teams (cascading to
// their milestones, submissions and feedback) and users; only the test setup uses it.
export async function seed(prisma: PrismaClient, { reset = false }: { reset?: boolean } = {}): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST);

  await prisma.$transaction(async (tx) => {
    if (reset) {
      await tx.teamMember.deleteMany();
      await tx.team.deleteMany();
      await tx.user.deleteMany();
    }

    for (const u of seedUsers) {
      await tx.user.upsert({ where: { id: u.id }, create: { ...u, passwordHash }, update: { ...u, passwordHash } });
    }
    for (const { memberIds, ...team } of seedTeams) {
      await tx.team.upsert({ where: { id: team.id }, create: team, update: team });
      await tx.teamMember.createMany({
        data: memberIds.map((userId) => ({ teamId: team.id, userId })),
        skipDuplicates: true,
      });
    }
  });
}

// Run directly via `prisma db seed`.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const prisma = new PrismaClient();
  seed(prisma)
    .then(() => console.log(`Seeded ${seedUsers.length} users and ${seedTeams.length} teams.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
