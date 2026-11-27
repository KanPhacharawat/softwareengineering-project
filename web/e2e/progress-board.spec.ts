// F-09 Team progress board E2E test: TEST-E2E-09 (AC-57)
import { expect, test, type Page } from '@playwright/test';

const ALPHA_ID = '00000000-0000-4000-8000-0000000000a1';
const GAMMA_ID = '00000000-0000-4000-8000-0000000000c1';

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

async function switchUser(page: Page, email: string) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, email);
}

test('TEST-E2E-09 (AC-57) student and supervisor use the progress board; empty and error states', async ({ page }) => {
  const title = `Board ${Date.now()}`;

  // Sup1 creates an Alpha milestone; S1 submits it.
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Due date').fill(getFutureDateTimeLocal(7));
  await page.getByRole('button', { name: 'Create milestone' }).click();
  await page.getByRole('link', { name: title }).first().click();
  await expect(page).toHaveURL(/\/milestones\/.+/);
  const milestoneUrl = page.url();

  await switchUser(page, 's1@cpms.test');
  await page.goto(milestoneUrl);
  await page.getByLabel('Title').fill('Board deliverable');
  await page.getByLabel('Deliverable link').fill('https://github.com/example/alpha/pull/106');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Not graded yet')).toBeVisible();

  // S1: team page -> Progress board -> card under Submitted -> milestone page.
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByRole('link', { name: 'Progress board' }).click();
  await expect(page).toHaveURL(new RegExp(`/teams/${ALPHA_ID}/board$`));
  await expect(page.getByRole('heading', { name: 'Progress board' })).toBeVisible();
  await expect(page.getByText('Average score')).toBeVisible();
  const submitted = page.getByRole('region', { name: /^Submitted/ });
  await expect(submitted.getByRole('link', { name: title })).toBeVisible();
  await submitted.getByRole('link', { name: title }).click();
  await expect(page).toHaveURL(milestoneUrl);

  // Sup1 sees the same card on the same board.
  await switchUser(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}/board`);
  await expect(page.getByRole('region', { name: /^Submitted/ }).getByRole('link', { name: title })).toBeVisible();

  // Sup2: Gamma has no milestones -> empty state.
  await switchUser(page, 'sup2@cpms.test');
  await page.goto(`/teams/${GAMMA_ID}/board`);
  await expect(page.getByText('No milestones yet.')).toBeVisible();

  // API error -> error state.
  await page.route('**/api/teams/*/board', (route) =>
    route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } } }),
  );
  await page.reload();
  await expect(page.getByText('Something went wrong')).toBeVisible();
});
