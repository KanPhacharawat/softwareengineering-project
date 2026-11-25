// F-08 Grading E2E test: TEST-E2E-05 (AC-48)
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

async function switchUser(page: Page, email: string, url: string) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, email);
  await page.goto(url);
}

test('TEST-E2E-05 (AC-48) supervisor records and edits grade; student sees grade and Not graded yet on ungraded work', async ({
  page,
}) => {
  const milestoneTitle = `Grade ${Date.now()}`;

  // 1. Sup1 creates a milestone on Team Alpha
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByLabel('Title').fill(milestoneTitle);
  await page.getByLabel('Due date').fill(getFutureDateTimeLocal(7));
  await page.getByRole('button', { name: 'Create milestone' }).click();
  await page.getByRole('link', { name: milestoneTitle }).first().click();
  await expect(page).toHaveURL(/\/milestones\/.+/);
  const milestoneUrl = page.url();

  // 2. S1 submits work and sees "Not graded yet"
  await switchUser(page, 's1@cpms.test', milestoneUrl);
  await page.getByLabel('Title').fill('Grading deliverable');
  await page.getByLabel('Deliverable link').fill('https://github.com/example/alpha/pull/95');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Not graded yet')).toBeVisible();

  // 3. Sup1 records feedback, checks empty score is rejected (not saved as 0), saves 85, then edits to 90
  await switchUser(page, 'sup1@cpms.test', milestoneUrl);
  await page.getByLabel('Feedback').fill('Well done.');
  await page.getByRole('button', { name: 'Save feedback' }).click();
  await expect(page.getByLabel('Score (0–100)')).toBeVisible();

  await page.getByRole('button', { name: 'Save grade' }).click();
  await expect(page.getByText('Score must be a whole number from 0 to 100')).toBeVisible();

  await page.getByLabel('Score (0–100)').fill('85');
  await page.getByRole('button', { name: 'Save grade' }).click();
  await expect(page.getByText(/Grade: 85 \/ 100 · Graded by Supervisor One at /)).toBeVisible();

  await page.getByRole('button', { name: 'Edit grade' }).click();
  await page.getByLabel('Score (0–100)').fill('90');
  await page.getByRole('button', { name: 'Save grade' }).click();
  await expect(page.getByText(/Grade: 90 \/ 100 · Graded by Supervisor One at /)).toBeVisible();

  // 4. S1 sees "Grade: 90 / 100"
  await switchUser(page, 's1@cpms.test', milestoneUrl);
  await expect(page.getByText('Grade: 90 / 100')).toBeVisible();
  await expect(page.getByText('Not graded yet')).toHaveCount(0);
});
