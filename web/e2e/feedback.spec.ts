// F-05 Supervisor feedback and submission lock E2E test: TEST-E2E-01 (AC-21)
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

test('TEST-E2E-01 (AC-21) supervisor leaves feedback, student sees feedback card and locked notice', async ({
  page,
}) => {
  const milestoneTitle = `Feedback Journey ${Date.now()}`;
  const dueDateTime = getFutureDateTimeLocal(7);

  // 1. Sup1 logs in and creates a milestone for Team Alpha
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByLabel('Title').fill(milestoneTitle);
  await page.getByLabel('Due date').fill(dueDateTime);
  await page.getByRole('button', { name: 'Create milestone' }).click();

  // Find and navigate to milestone page
  await page.getByRole('link', { name: milestoneTitle }).first().click();
  await expect(page).toHaveURL(/\/milestones\/.+/);
  const milestoneUrl = page.url();

  // 2. S1 logs in, submits work and sees it saved
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 's1@cpms.test');
  await page.goto(milestoneUrl);

  await expect(page.getByRole('heading', { name: 'Submit work' })).toBeVisible();
  await page.getByLabel('Title').fill('Initial Delivery Report');
  await page.getByLabel('Deliverable link').fill('https://github.com/example/alpha/pull/1');
  await page.getByLabel('Description').fill('Ready for review');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText('Initial Delivery Report')).toBeVisible();
  await expect(page.getByText('SUBMITTED', { exact: true })).toBeVisible();

  // 3. Sup1 logs in, views submission and records feedback
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 'sup1@cpms.test');
  await page.goto(milestoneUrl);

  await expect(page.getByText('Initial Delivery Report')).toBeVisible();
  const feedbackInput = page.getByLabel('Feedback');
  await expect(feedbackInput).toBeVisible();
  await feedbackInput.fill('Well structured deliverable. All core requirements satisfied.');
  await page.getByRole('button', { name: 'Save feedback' }).click();

  // Supervisor sees feedback card and updated status, but no student locked notice
  await expect(page.getByText('FEEDBACK_GIVEN', { exact: true })).toBeVisible();
  await expect(page.getByText('Well structured deliverable. All core requirements satisfied.')).toBeVisible();
  await expect(page.getByText('Locked after feedback')).toHaveCount(0);

  // 4. S1 logs in, reloads and sees feedback card and locked notice
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 's1@cpms.test');
  await page.goto(milestoneUrl);

  await expect(page.getByText('FEEDBACK_GIVEN', { exact: true })).toBeVisible();
  await expect(page.getByText('Locked after feedback')).toBeVisible();
  await expect(page.getByText('Well structured deliverable. All core requirements satisfied.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit submission' })).toHaveCount(0);
});

