import { defineConfig, devices } from '@playwright/test';

// E2E tests run against the dev servers (API on :3000 using server/.env, web on :5173).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev -w server',
      cwd: '..',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev -w web',
      cwd: '..',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
  ],
});
