import { defineConfig, devices } from '@playwright/test';

const E2E_DB = process.env.E2E_DATABASE_URL ?? 'postgresql://app:app@localhost:5432/cpms_e2e';
const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Build the SPA, migrate + seed a dedicated E2E database, then serve API + SPA from one process.
    command: 'npm run build && cd ../server && npx prisma migrate deploy && npx tsx prisma/seed.ts && npx tsx src/index.ts',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: E2E_DB, SESSION_SECRET: 'e2e-only-secret', PORT: String(PORT), NODE_ENV: 'test' },
  },
});
