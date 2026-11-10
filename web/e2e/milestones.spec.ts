// F-03 (AC-06, AC-07) in the UI:
// - Supervisor creates a milestone; it appears in the table with status OPEN.
// - Student views the team page: sees the milestone table, but not the creation form.
// - Input validation errors appear under form fields.
// - Empty state is displayed when there are no milestones.
import { expect, test, type Page } from '@playwright/test';

const ALPHA_ID = '00000000-0000-4000-8000-0000000000a1';
const BETA_ID = '00000000-0000-4000-8000-0000000000b1';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/$/);
}

test('shows empty state "No milestones yet" when a team has no milestones', async ({ page }) => {
  await login(page, 's3@cpms.test');
  await page.goto(`/teams/${BETA_ID}`);
  await expect(page.getByText('No milestones yet')).toBeVisible();
});

test('a student sees the milestones table but does NOT see the "New milestone" form', async ({ page }) => {
  await login(page, 's1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await expect(page.getByRole('heading', { name: 'Milestones' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New milestone' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create milestone' })).toHaveCount(0);
});

test('a supervisor sees the "New milestone" form and can create a milestone', async ({ page }) => {
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);

  await expect(page.getByRole('heading', { name: 'New milestone' })).toBeVisible();

  // Fill in the form
  await page.getByLabel('Title').fill('E2E Test Milestone');
  await page.getByLabel('Description').fill('Created by Playwright E2E');
  // Due date 30 days from today (datetime-local format), so the test never goes stale.
  const due = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  await page.getByLabel('Due date').fill(`${due}T23:59`);

  await page.getByRole('button', { name: 'Create milestone' }).click();

  // The milestone appears in the table with OPEN status
  const milestoneTable = page.getByTestId('milestones-table');
  await expect(milestoneTable).toBeVisible();
  await expect(milestoneTable).toContainText('E2E Test Milestone');
  await expect(milestoneTable).toContainText('OPEN');
});

test('validation errors appear under form inputs when submitting invalid milestone', async ({ page }) => {
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);

  // Short title (< 3 chars)
  await page.getByLabel('Title').fill('ab');
  // Past due date
  await page.getByLabel('Due date').fill('2020-01-01T00:00');

  await page.getByRole('button', { name: 'Create milestone' }).click();

  await expect(page.getByText('Title must be between 3 and 120 characters')).toBeVisible();
  await expect(page.getByText('Due date must be in the future')).toBeVisible();
});

