// F-00 smoke test: the web app loads and the API answers through the dev proxy.
import { expect, test } from '@playwright/test';

test('login page loads and the API health check answers through the proxy', async ({ page, request }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log in to CPMS' })).toBeVisible();

  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);
  expect(await health.json()).toEqual({ ok: true });
});
