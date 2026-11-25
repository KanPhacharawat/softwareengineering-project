// Closed milestone blocks students in UI and API: TEST-E2E-07 (F-07, BR-13)
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

test('TEST-E2E-07 closed milestone: student sees Closed and no form; direct API submit -> 409 MILESTONE_CLOSED', async ({
  page,
}) => {
  const milestoneTitle = `Closed ${Date.now()}`;

  // 1. Sup1 creates a milestone and closes it before any submission
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByLabel('Title').fill(milestoneTitle);
  await page.getByLabel('Due date').fill(getFutureDateTimeLocal(7));
  await page.getByRole('button', { name: 'Create milestone' }).click();
  await page.getByRole('link', { name: milestoneTitle }).first().click();
  await expect(page).toHaveURL(/\/milestones\/.+/);
  const milestoneUrl = page.url();
  const milestoneId = milestoneUrl.split('/milestones/')[1];

  await page.getByRole('button', { name: 'Close milestone' }).click();
  await page.getByRole('button', { name: 'Close milestone' }).last().click();
  await expect(page.getByText('Closed', { exact: true })).toBeVisible();

  // 2. S1 sees Closed and no submission form
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 's1@cpms.test');
  await page.goto(milestoneUrl);
  await expect(page.getByText('Closed', { exact: true })).toBeVisible();
  await expect(page.getByText('This milestone is closed.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0);

  // 3. Backend protection: S1's own session posts directly to the API -> 409 MILESTONE_CLOSED
  const res = await page.request.post(`/api/milestones/${milestoneId}/submission`, {
    data: { title: 'Bypass the UI', link: 'https://github.com/example/alpha/pull/74' },
  });
  expect(res.status()).toBe(409);
  expect((await res.json()).error.code).toBe('MILESTONE_CLOSED');
});
