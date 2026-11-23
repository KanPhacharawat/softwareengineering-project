// F-06c Revision request -> resubmit -> History E2E test: TEST-E2E-03 (AC-34)
import { expect, test, type Page } from '@playwright/test';

const ALPHA_ID = '00000000-0000-4000-8000-0000000000a1';
const SHOTS = '../docs/evidence/F-06/screenshots';

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

const history = (page: Page) => page.getByRole('region', { name: 'History' });

test('TEST-E2E-03 (AC-34) supervisor requests a revision, student resubmits, both see History', async ({ page }) => {
  const milestoneTitle = `History ${Date.now()}`;

  // 1. Sup1 creates a milestone on Alpha
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByLabel('Title').fill(milestoneTitle);
  await page.getByLabel('Due date').fill(getFutureDateTimeLocal(7));
  await page.getByRole('button', { name: 'Create milestone' }).click();
  await page.getByRole('link', { name: milestoneTitle }).first().click();
  await expect(page).toHaveURL(/\/milestones\/.+/);
  const milestoneUrl = page.url();

  // 2. S1 submits v1; History shows only Version 1
  await switchUser(page, 's1@cpms.test', milestoneUrl);
  await page.getByLabel('Title').fill('History report v1');
  await page.getByLabel('Deliverable link').fill('https://github.com/example/alpha/pull/31');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(history(page).getByText('Version 1')).toBeVisible();
  await expect(history(page).getByText('No earlier versions')).toBeVisible();

  // 3. Sup1 records feedback, then requests a revision
  await switchUser(page, 'sup1@cpms.test', milestoneUrl);
  await page.getByLabel('Feedback').fill('Tests are missing');
  await page.getByRole('button', { name: 'Save feedback' }).click();
  await page.getByLabel('Reason').fill('Add test evidence');
  await page.getByLabel('Revision due').fill(getFutureDateTimeLocal(3));
  await page.getByRole('button', { name: 'Request revision' }).click();
  await expect(history(page).getByText(/Revision requested by Supervisor One: Add test evidence/)).toBeVisible();

  // 4. S2 sees the request and resubmits
  await switchUser(page, 's2@cpms.test', milestoneUrl);
  await expect(page.getByText(/Revision requested: Add test evidence/)).toBeVisible();
  await page.getByLabel('Title').fill('History report v2');
  await page.getByRole('button', { name: 'Resubmit' }).click();
  await expect(history(page).getByText('Version 2')).toBeVisible();

  // 5. Sup1 and S1 both see Version 1 and Version 2 in History
  for (const email of ['sup1@cpms.test', 's1@cpms.test']) {
    await switchUser(page, email, milestoneUrl);
    await expect(history(page).getByText('Version 1')).toBeVisible();
    await expect(history(page).getByText('Version 2')).toBeVisible();
    await expect(history(page).getByText('Submitted by Student Two', { exact: false })).toBeVisible();
    await expect(history(page).getByText('Tests are missing')).toBeVisible();
    await expect(history(page).getByText('No earlier versions')).toHaveCount(0);
    await history(page).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/h${email.startsWith('sup') ? 1 : 2}-${email.split('@')[0]}-history.png`, fullPage: true });
  }
});
