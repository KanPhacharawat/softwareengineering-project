import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedCore, DEMO_PASSWORD, USERS } from './seed-data.js';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const { users, teams } = await seedCore(prisma);
  // Demo milestones so every screen has data.
  await prisma.milestone.create({
    data: {
      teamId: teams.alpha.id,
      title: 'Requirements draft',
      description: 'Submit a link to your SRS draft.',
      dueAt: new Date(Date.now() + 7 * DAY),
      createdById: users.sup1.id,
    },
  });
  await prisma.milestone.create({
    data: {
      teamId: teams.gamma.id,
      title: 'Project proposal',
      description: 'One-page proposal document link.',
      dueAt: new Date(Date.now() + 5 * DAY),
      createdById: users.sup2.id,
    },
  });
  console.log('Seeded accounts (password for all: %s):', DEMO_PASSWORD);
  for (const u of Object.values(USERS)) console.log(`  ${u.role.padEnd(10)} ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
