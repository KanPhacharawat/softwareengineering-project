// F-04 Team submission E2E tests:
// - Student opens milestone, submits title/description/link -> submission card shown with SUBMITTED status.
// - Student edits submission -> updated values appear.
// - Supervisor views milestone -> sees submission card read-only (no edit button or form).
// - Validation errors on invalid link or title -> inline error messages appear and no submission is saved.
import { expect, test, type Page } from '@playwright/test';

const ALPHA_ID = '00000000-0000-4000-8000-0000000000a1';

function getFutureDateTimeLocal(daysAhead = 7): string {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('student submits to an open milestone, sees the saved submission card, and can edit it', async ({ page }) => {
  const milestoneTitle = `Submission Test ${Date.now()}`;
  const dueDateTime = getFutureDateTimeLocal(7);

  // Login as supervisor first to ensure a fresh milestone exists
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByLabel('Title').fill(milestoneTitle);
  await page.getByLabel('Due date').fill(dueDateTime);
  await page.getByRole('button', { name: 'Create milestone' }).click();

  // Click the new milestone link
  await page.getByRole('link', { name: milestoneTitle }).first().click();
  await expect(page).toHaveURL(/\/milestones\/.+/);

  // Logout and login as student S1
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 's1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByRole('link', { name: milestoneTitle }).first().click();

  // Student sees submission form
  await expect(page.getByRole('heading', { name: 'Submit work' })).toBeVisible();
  await page.getByLabel('Title').fill('Final Project Delivery');
  await page.getByLabel('Description').fill('Complete source code and docs');
  await page.getByLabel('Deliverable link').fill('https://github.com/example/delivery');
  await page.getByRole('button', { name: 'Submit' }).click();

  // Saved card appears with status SUBMITTED
  await expect(page.getByText('Final Project Delivery')).toBeVisible();
  await expect(page.getByText('SUBMITTED', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'https://github.com/example/delivery' })).toBeVisible();
  await expect(page.getByText('Last updated by Student One')).toBeVisible();

  // Student can edit submission
  await page.getByRole('button', { name: 'Edit submission' }).click();
  await page.getByLabel('Title').fill('Final Project Delivery v2');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Final Project Delivery v2')).toBeVisible();
});

test('supervisor sees submission read-only without edit button or submission form', async ({ page }) => {
  const milestoneTitle = `Supervisor View Test ${Date.now()}`;
  const dueDateTime = getFutureDateTimeLocal(7);

  // 1. Supervisor creates milestone
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByLabel('Title').fill(milestoneTitle);
  await page.getByLabel('Due date').fill(dueDateTime);
  await page.getByRole('button', { name: 'Create milestone' }).click();

  await page.getByRole('link', { name: milestoneTitle }).first().click();
  await expect(page).toHaveURL(/\/milestones\/.+/);
  const milestoneUrl = page.url();

  // 2. Student logs in and creates submission
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 's1@cpms.test');
  await page.goto(milestoneUrl);
  await expect(page.getByRole('heading', { name: 'Submit work' })).toBeVisible();
  await page.getByLabel('Title').fill('Supervisor Check Submission');
  await page.getByLabel('Deliverable link').fill('https://github.com/example/sup-check');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Supervisor Check Submission')).toBeVisible();

  // 3. Supervisor re-logs in and views milestone
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 'sup1@cpms.test');
  await page.goto(milestoneUrl);

  // Assert submission card and deliverable link are visible
  await expect(page.getByText('Supervisor Check Submission')).toBeVisible();
  await expect(page.getByRole('link', { name: 'https://github.com/example/sup-check' })).toBeVisible();
  await expect(page.getByText('Last updated by Student One')).toBeVisible();

  // Assert neither Edit button nor Submit button are visible to supervisor
  await expect(page.getByRole('button', { name: 'Edit submission' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0);
});

test('validation errors appear under form inputs and prevent submission on invalid data', async ({ page }) => {
  const milestoneTitle = `Validation Test ${Date.now()}`;
  const dueDateTime = getFutureDateTimeLocal(7);

  // Supervisor creates milestone
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByLabel('Title').fill(milestoneTitle);
  await page.getByLabel('Due date').fill(dueDateTime);
  await page.getByRole('button', { name: 'Create milestone' }).click();
  await page.getByRole('link', { name: milestoneTitle }).first().click();
  const milestoneUrl = page.url();

  // Student opens milestone
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 's1@cpms.test');
  await page.goto(milestoneUrl);

  // Fill invalid values
  await page.getByLabel('Title').fill('ab');
  await page.getByLabel('Deliverable link').fill('not a url');
  await page.getByRole('button', { name: 'Submit' }).click();

  // Check validation error messages
  await expect(page.getByText('Title must be between 3 and 120 characters')).toBeVisible();
  await expect(page.getByText('Link must be a valid URL')).toBeVisible();

  // Confirm no submission card was rendered
  await expect(page.getByRole('button', { name: 'Edit submission' })).toHaveCount(0);
});
