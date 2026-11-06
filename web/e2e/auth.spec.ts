// F-01 TEST-E2E-02 (AC-22): login, logout and redirect to /login without a session.
import { expect, test } from '@playwright/test';

test('TEST-E2E-02 unauthenticated visit redirects to /login; after logout / redirects to /login again', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Log in to CPMS' })).toBeVisible();

  await page.getByLabel('Email').fill('s1@cpms.test');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL(/\/$/);
  const banner = page.getByRole('banner');
  await expect(banner.getByText('Student One')).toBeVisible();
  await expect(banner.getByText('Student', { exact: true })).toBeVisible();

  await banner.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

test('wrong password shows the error banner and stays on /login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('s1@cpms.test');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('alert')).toContainText('Invalid email or password');
  await expect(page).toHaveURL(/\/login$/);
});

test('empty fields show field errors under each input', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Enter your email')).toBeVisible();
  await expect(page.getByText('Enter your password')).toBeVisible();
});

test('a logged-in user who opens /login is sent to /', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('sup1@cpms.test');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('banner').getByText('Supervisor', { exact: true })).toBeVisible();

  await page.goto('/login');
  await expect(page).toHaveURL(/\/$/);
});
