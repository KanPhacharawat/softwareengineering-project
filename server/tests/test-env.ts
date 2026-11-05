import { config as loadEnv } from 'dotenv';

// Tests always use the separate test database (cpms_test), never the dev database.
export function useTestDatabase(): string {
  loadEnv({ path: '.env', quiet: true });
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@localhost:5432/cpms_test';
  if (!/cpms_test|_test\b/.test(url)) {
    throw new Error(`TEST_DATABASE_URL must point to a test database, got ${url}`);
  }
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = 'test';
  return url;
}
