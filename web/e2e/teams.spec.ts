// F-02 (AC-10) in the UI: "My teams" shows only visible teams; another team's page shows the not-found state.
import { expect, test, type Page } from '@playwright/test';

const BETA_ID = '00000000-0000-4000-8000-0000000000b1';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/$/);
}

test('a student sees only their own team with supervisor and members', async ({ page }) => {
  await login(page, 's1@cpms.test');
  await expect(page.getByRole('heading', { name: 'My team' })).toBeVisible();

  const cards = page.getByTestId('team-card');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Alpha');
  await expect(cards.first()).toContainText('Supervisor One');
  await expect(cards.first()).toContainText('Student One');
  await expect(cards.first()).toContainText('Student Two');
  await expect(page.getByText('Beta')).toHaveCount(0);
});

test('a supervisor sees every assigned team and nothing else', async ({ page }) => {
  await login(page, 'sup1@cpms.test');
  await expect(page.getByRole('heading', { name: 'My teams' })).toBeVisible();
  const cards = page.getByTestId('team-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('Alpha');
  await expect(cards.nth(1)).toContainText('Beta');
  await expect(page.getByText('Gamma')).toHaveCount(0);
});

test('opening a team card shows the team page with its members', async ({ page }) => {
  await login(page, 's1@cpms.test');
  await page.getByTestId('team-card').first().click();
  await expect(page).toHaveURL(/\/teams\/00000000-0000-4000-8000-0000000000a1$/);
  await expect(page.getByRole('heading', { name: 'Alpha', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'My team' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('s2@cpms.test');
});

test("a student opening another team's page sees the not-found state", async ({ page }) => {
  await login(page, 's1@cpms.test');
  await page.goto(`/teams/${BETA_ID}`);
  await expect(page.getByText('Not found or you do not have access')).toBeVisible();
  await expect(page.getByText('Student Three')).toHaveCount(0);
});

test('a user with no teams sees the empty state', async ({ page }) => {
  await page.route('**/api/teams', (route) => route.fulfill({ json: { teams: [] } }));
  await login(page, 'sup2@cpms.test');
  await expect(page.getByText('No teams assigned to you yet')).toBeVisible();
});
