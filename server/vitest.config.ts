import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup-env.ts'],
    // Integration tests share one database, so run test files one at a time.
    fileParallelism: false,
    // Allow up to 15s because bcrypt cost 12 hashing for all seed users takes ~4-8s on Windows environments.
    testTimeout: 15000,
  },
});
