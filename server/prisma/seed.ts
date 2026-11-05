// Reproducible synthetic seed data (SDS section 2, STS fixtures). Fixed IDs and emails so tests can rely on them.
// All demo accounts share one demo password; it is synthetic data, not a secret.
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const SEED_PASSWORD = 'password123';
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

export async function seed(prisma: PrismaClient): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST);

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.deleteMany();
    await tx.team.deleteMany();
    await tx.user.deleteMany();

    await tx.user.createMany({ data: seedUsers.map((u) => ({ ...u, passwordHash })) });
    for (const { memberIds, ...team } of seedTeams) {
      await tx.team.create({ data: team });
      await tx.teamMember.createMany({ data: memberIds.map((userId) => ({ teamId: team.id, userId })) });
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
