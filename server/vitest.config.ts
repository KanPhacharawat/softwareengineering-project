import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@localhost:5432/cpms_test',
      SESSION_SECRET: 'test-only-secret',
      NODE_ENV: 'test',
    },
    globalSetup: ['tests/global-setup.ts'],
    // API tests share one database, so test files run one at a time.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
