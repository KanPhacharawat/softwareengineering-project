// Lab 7 CR-01 (BR-06 v2) late submission grace window: TEST-E2E-08 (AC-50, AC-51)
import { expect, test, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const ALPHA_ID = '00000000-0000-4000-8000-0000000000a1';
const SUP1_ID = '00000000-0000-4000-8000-000000000001';
// Same database as the dev API server started by playwright.config.ts (server/.env).
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL ?? 'postgresql://app:app@localhost:5433/cpms_dev' });

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.afterAll(() => prisma.$disconnect());

test('TEST-E2E-08 (AC-50, AC-51) student submits inside the grace window; student and supervisor see Late', async ({ page }) => {
  const title = `Grace ${Date.now()}`;
  // The milestone was due 1 hour ago: inside the 24 h grace window
  const milestone = await prisma.milestone.create({
    data: { teamId: ALPHA_ID, title, dueAt: new Date(Date.now() - 3_600_000), createdById: SUP1_ID },
  });

  await login(page, 's1@cpms.test');
  await page.goto(`/milestones/${milestone.id}`);
  await expect(page.getByText(/Due date passed\. Late submissions accepted until .+ \(Bangkok time\)\./)).toBeVisible();
  await page.getByLabel('Title').fill('Late report');
  await page.getByLabel('Deliverable link').fill('https://github.com/example/alpha/pull/84');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText(/Submitted late at .+ \(Bangkok time\)/)).toBeVisible();
  await expect(page.getByText('Late', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  const row = page.getByRole('row').filter({ hasText: title });
  await expect(row.getByText('Late', { exact: true })).toBeVisible();
  await page.goto(`/milestones/${milestone.id}`);
  await expect(page.getByText(/Submitted late at .+ \(Bangkok time\)/)).toBeVisible();
});
