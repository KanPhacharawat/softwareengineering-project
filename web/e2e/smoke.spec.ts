// F-00 smoke test: the web app loads and reaches the API through the dev proxy.
import { expect, test } from '@playwright/test';

test('home page loads and shows the API is connected', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Course Project Management System' })).toBeVisible();
  await expect(page.getByTestId('api-status')).toHaveText('API connected');
});
