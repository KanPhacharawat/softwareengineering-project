// F-07 Milestone edit and close E2E test: TEST-E2E-04 (AC-41)
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

test('TEST-E2E-04 (AC-41) supervisor edits and closes milestone; team page and student view show Closed and no form', async ({
  page,
}) => {
  const initialTitle = `Manage ${Date.now()}`;
  const updatedTitle = `${initialTitle} Edited`;

  // 1. Sup1 creates a milestone on Team Alpha and opens it
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByLabel('Title').fill(initialTitle);
  await page.getByLabel('Due date').fill(getFutureDateTimeLocal(7));
  await page.getByRole('button', { name: 'Create milestone' }).click();
  await page.getByRole('link', { name: initialTitle }).first().click();
  await expect(page).toHaveURL(/\/milestones\/.+/);
  const milestoneUrl = page.url();

  // 2. Sup1 edits title and due date
  const updatedDue = getFutureDateTimeLocal(10);
  await page.getByRole('button', { name: 'Edit milestone' }).click();
  await page.getByLabel('Title').fill(updatedTitle);
  await page.getByLabel('Due date').fill(updatedDue);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText(updatedTitle).first()).toBeVisible();

  // Verify toBangkokDateTimeLocal round-trip: re-opening Edit prefills the exact Bangkok YYYY-MM-DDTHH:mm
  await page.getByRole('button', { name: 'Edit milestone' }).click();
  await expect(page.getByLabel('Due date')).toHaveValue(updatedDue);
  await page.getByRole('button', { name: 'Cancel' }).click();

  // 3. Sup1 closes the milestone via inline confirmation
  await page.getByRole('button', { name: 'Close milestone' }).click();
  await expect(
    page.getByText('Close this milestone? Students will no longer be able to submit or edit.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close milestone' }).last().click();
  await expect(page.getByText('Closed', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit milestone' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Close milestone' })).toHaveCount(0);

  // 4. S1 sees the Closed badge on the team page row and no submission form on the milestone page
  await switchUser(page, 's1@cpms.test', `/teams/${ALPHA_ID}`);
  const row = page.locator('tr', { hasText: updatedTitle });
  await expect(row.getByText('Closed', { exact: true })).toBeVisible();

  await page.goto(milestoneUrl);
  await expect(page.getByText(updatedTitle).first()).toBeVisible();
  await expect(page.getByText('Closed', { exact: true })).toBeVisible();
  await expect(page.getByText('This milestone is closed.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0);
});
