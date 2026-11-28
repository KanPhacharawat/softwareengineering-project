// F-10 Supervisor summary report E2E test: TEST-E2E-10 (AC-62)
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

async function switchUser(page: Page, email: string) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, email);
}

test('TEST-E2E-10 (AC-62) supervisor views summary report; student gets 403; empty and error states', async ({ page }) => {
  const title = `Report ${Date.now()}`;

  // Setup: Sup1 creates an Alpha milestone and S1 submits it.
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
  await page.getByLabel('Title').fill('Report deliverable');
  await page.getByLabel('Deliverable link').fill('https://github.com/example/alpha/pull/107');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Not graded yet')).toBeVisible();

  // S1 does NOT see Reports link in header and visiting /reports directly shows 403 error state.
  await expect(page.getByRole('link', { name: 'Reports' })).toHaveCount(0);
  await page.goto('/reports');
  await expect(page.getByText('You do not have permission to do this')).toBeVisible();

  // Sup1 sees Reports in header -> opens /reports -> verifies overall tiles, Alpha count, Board & Team links, and mobile width.
  await switchUser(page, 'sup1@cpms.test');
  await expect(page.getByRole('link', { name: 'Reports' })).toBeVisible();
  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByRole('heading', { name: 'Supervisor summary report' })).toBeVisible();
  await expect(page.getByText('2 assigned teams')).toBeVisible();

  const summary = page.getByTestId('overall-summary');
  for (const label of ['Teams', 'Milestones', 'Submitted', 'Feedback pending', 'Late', 'Missing', 'Graded', 'Average score']) {
    await expect(summary.getByText(label, { exact: true })).toBeVisible();
  }

  await expect(page.getByRole('link', { name: 'Alpha' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Beta' }).first()).toBeVisible();

  // Alpha row shows Feedback pending >= 1 after S1's submission.
  const alphaRow = page.locator('tbody tr', { hasText: 'Alpha' });
  const feedbackPendingText = await alphaRow.locator('td').nth(3).textContent();
  expect(Number(feedbackPendingText)).toBeGreaterThanOrEqual(1);

  // Mobile 375px header has no horizontal overflow and Log out remains visible.
  await page.setViewportSize({ width: 375, height: 812 });
  const overflow = await page.evaluate<number>('document.documentElement.scrollWidth - document.documentElement.clientWidth');
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 720 });

  // Alpha's Board link opens /teams/:alphaId/board.
  await alphaRow.getByRole('link', { name: 'Board' }).click();
  await expect(page).toHaveURL(new RegExp(`/teams/${ALPHA_ID}/board$`));

  // Back to /reports -> Alpha's team link opens /teams/:alphaId.
  await page.goto('/reports');
  await page.getByRole('link', { name: 'Alpha' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/teams/${ALPHA_ID}$`));

  // Empty state (supervisor with 0 assigned teams) via route interception.
  await page.route('**/api/reports/supervisor-summary', (route) =>
    route.fulfill({
      status: 200,
      json: {
        overall: {
          teamCount: 0,
          milestonesTotal: 0,
          submitted: 0,
          late: 0,
          missing: 0,
          feedbackPending: 0,
          revisionRequested: 0,
          closed: 0,
          graded: 0,
          averageScore: null,
        },
        teams: [],
      },
    }),
  );
  await page.goto('/reports');
  await expect(page.getByText('No assigned teams yet.')).toBeVisible();

  // 500 API error -> error state.
  await page.unroute('**/api/reports/supervisor-summary');
  await page.route('**/api/reports/supervisor-summary', (route) =>
    route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } } }),
  );
  await page.reload();
  await expect(page.getByText('Something went wrong')).toBeVisible();
});
