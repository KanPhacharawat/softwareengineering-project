import { afterAll } from 'vitest';
import { useTestDatabase } from './test-env.js';

useTestDatabase();

// Close DB connections after each test file. Imported lazily: db.ts reads env at import time.
afterAll(async () => {
  const { prisma, pgPool } = await import('../src/db.js');
  await prisma.$disconnect();
  await pgPool.end();
});
