import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { seed } from '../prisma/seed.js';
import { useTestDatabase } from './test-env.js';

// Once per `npm test`: apply pending migrations to cpms_test (non-destructive), then
// replace its data with the seed fixtures. Test files that change data reset it again.
export default async function setup() {
  useTestDatabase();
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
  const prisma = new PrismaClient();
  try {
    await seed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
