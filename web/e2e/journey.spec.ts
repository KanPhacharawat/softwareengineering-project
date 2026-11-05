import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'Passw0rd!';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByTestId('current-user')).toBeVisible();
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

function localDateTime(daysAhead: number) {
  const d = new Date(Date.now() + daysAhead * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

test('TEST-E2E-01 AC-21 supervisor creates milestone, student submits, supervisor gives feedback', async ({ page }) => {
  const title = `Sprint 1 demo ${Date.now()}`;

  // Supervisor creates a milestone for Team Alpha.
  await login(page, 'sup1@cpms.test');
  await page.getByRole('link', { name: /Team Alpha/ }).click();
  const form = page.getByRole('form', { name: 'New milestone' });
  await form.getByLabel('Title').fill(title);
  await form.getByLabel('Description').fill('Submit the repository link of your Sprint 1 release.');
  await form.getByLabel('Due date and time').fill(localDateTime(3));
  await form.getByRole('button', { name: 'Create milestone' }).click();
  const row = page.getByRole('row', { name: new RegExp(title) });
  await expect(row).toBeVisible();
  await expect(row.getByTestId('status')).toHaveText('Open');
  await logout(page);

  // Student submits work and sees it persisted.
  await login(page, 's1@cpms.test');
  await page.getByRole('link', { name: /Team Alpha/ }).click();
  await page.getByRole('link', { name: title }).click();
  const sub = page.getByRole('form', { name: 'Submission' });
  await sub.getByLabel('Title').fill('Alpha Sprint 1 release');
  await sub.getByLabel('Description').fill('Tag v0.1.0 with README setup.');
  await sub.getByLabel('Link').fill('https://github.com/team-alpha/app/releases/tag/v0.1.0');
  await sub.getByRole('button', { name: 'Submit work' }).click();
  await expect(page.getByTestId('submission')).toContainText('Alpha Sprint 1 release');
  await page.reload();
  await expect(page.getByTestId('submission')).toContainText('Last updated by Chai Student');
  await expect(page.getByTestId('status')).toHaveText('Submitted');
  await logout(page);

  // Supervisor records feedback.
  await login(page, 'sup1@cpms.test');
  await page.getByRole('link', { name: /Team Alpha/ }).click();
  await page.getByRole('link', { name: title }).click();
  await expect(page.getByTestId('submission')).toContainText('Alpha Sprint 1 release');
  await page.getByRole('form', { name: 'Feedback' }).getByLabel('Feedback').fill('Clear release notes. Add a test for the deadline rule.');
  await page.getByRole('button', { name: 'Save feedback' }).click();
  await expect(page.getByTestId('feedback')).toContainText('Add a test for the deadline rule.');
  await logout(page);

  // Student sees the feedback and the lock.
  await login(page, 's1@cpms.test');
  await page.getByRole('link', { name: /Team Alpha/ }).click();
  await page.getByRole('link', { name: title }).click();
  await expect(page.getByTestId('feedback')).toContainText('Dr. Anan Supervisor');
  await expect(page.getByText('Locked after feedback.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit submission' })).toHaveCount(0);
});

test('TEST-E2E-02 AC-22 unauthenticated users are sent to login, also after logout', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await login(page, 's1@cpms.test');
  await expect(page.getByRole('heading', { name: 'My team' })).toBeVisible();
  await logout(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  const me = await page.request.get('/api/auth/me');
  expect(me.status()).toBe(401);
});

test('invalid login shows an error and stays on the login page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('s1@cpms.test');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
  await expect(page).toHaveURL(/\/login$/);
});

test('validation errors appear next to the field (past due date)', async ({ page }) => {
  await login(page, 'sup1@cpms.test');
  await page.getByRole('link', { name: /Team Alpha/ }).click();
  const form = page.getByRole('form', { name: 'New milestone' });
  await form.getByLabel('Title').fill('Too late');
  await form.getByLabel('Due date and time').fill(localDateTime(-1));
  await form.getByRole('button', { name: 'Create milestone' }).click();
  await expect(form.getByText('Due date must be in the future')).toBeVisible();
});
