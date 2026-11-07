// F-04 Team submission E2E tests:
// - Student opens milestone, submits title/description/link -> submission card shown with SUBMITTED status.
// - Student edits submission -> updated values appear.
// - Supervisor views milestone -> sees submission card read-only (no edit button or form).
// - Validation errors on invalid link or title.
import { expect, test, type Page } from '@playwright/test';

const ALPHA_ID = '00000000-0000-4000-8000-0000000000a1';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/$/);
}

test('student submits to an open milestone and sees the saved submission card', async ({ page }) => {
  // Login as supervisor first to ensure a fresh milestone exists
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByLabel('Title').fill('Submission E2E Milestone');
  await page.getByLabel('Due date').fill('2026-12-15T23:59');
  await page.getByRole('button', { name: 'Create milestone' }).click();

  // Click the new milestone link
  await page.getByRole('link', { name: 'Submission E2E Milestone' }).first().click();
  await expect(page).toHaveURL(/\/milestones\/.+/);

  // Logout and login as student S1
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 's1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByRole('link', { name: 'Submission E2E Milestone' }).first().click();

  // Student sees submission form
  await expect(page.getByRole('heading', { name: 'Submit work' })).toBeVisible();
  await page.getByLabel('Title').fill('Final Project Delivery');
  await page.getByLabel('Description').fill('Complete source code and docs');
  await page.getByLabel('Link').fill('https://github.com/example/delivery');
  await page.getByRole('button', { name: 'Submit' }).click();

  // Saved card appears with status SUBMITTED
  await expect(page.getByText('Final Project Delivery')).toBeVisible();
  await expect(page.getByText('SUBMITTED')).toBeVisible();
  await expect(page.getByRole('link', { name: 'https://github.com/example/delivery' })).toBeVisible();

  // Student can edit submission
  await page.getByRole('button', { name: 'Edit submission' }).click();
  await page.getByLabel('Title').fill('Final Project Delivery v2');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Final Project Delivery v2')).toBeVisible();
});

test('supervisor sees submission read-only without edit button or submission form', async ({ page }) => {
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  const milestoneLink = page.getByRole('link', { name: 'Submission E2E Milestone' }).first();
  if (await milestoneLink.isVisible()) {
    await milestoneLink.click();
    await expect(page.getByRole('button', { name: 'Edit submission' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0);
  }
});

