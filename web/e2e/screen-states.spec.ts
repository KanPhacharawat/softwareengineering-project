// F-11 screen states and failure handling E2E: TEST-67, TEST-68 (AC-64), TEST-70 (AC-65)
import { expect, test, type Page } from '@playwright/test';

const ALPHA_ID = '00000000-0000-4000-8000-0000000000a1';
const GAMMA_ID = '00000000-0000-4000-8000-0000000000c1';
const FAIL_500 = { status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } } };

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

function futureLocal(days = 7) {
  const d = new Date(Date.now() + days * 864e5);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T23:59`;
}

// The input is marked invalid and its aria-describedby points at a visible error message.
async function expectLinkedError(page: Page, label: string, message: string) {
  const input = page.getByLabel(label, { exact: true });
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  const id = await input.getAttribute('aria-describedby');
  expect(id, `${label} has aria-describedby`).toBeTruthy();
  await expect(page.locator(`[id="${id}"]`)).toHaveText(message);
}

// Answers every write with a server 400 carrying the given field errors (reads pass through).
async function failWrites(page: Page, fields: Record<string, string>) {
  await page.route('**/api/**', (route) =>
    route.request().method() === 'GET'
      ? route.fallback()
      : route.fulfill({ status: 400, json: { error: { code: 'VALIDATION_ERROR', message: 'Some fields are invalid', fields } } }),
  );
}

test('TEST-67 (AC-64) every data screen shows loading, empty and error states', async ({ page }) => {
  // A real milestone for the milestone screen (the seed has none).
  await login(page, 'sup1@cpms.test');
  const res = await page.request.post(`/api/teams/${ALPHA_ID}/milestones`, {
    data: { title: `States ${Date.now()}`, dueAt: new Date(Date.now() + 7 * 864e5).toISOString() },
  });
  expect(res.status()).toBe(201);
  const milestoneId = (await res.json()).milestone.id;

  const screens: { name: string; url: string; api: string; busy: string; empty: (body: any) => any; emptyText: string }[] = [
    { name: 'home', url: '/', api: '**/api/teams', busy: 'Loading teams', empty: () => ({ teams: [] }), emptyText: 'No teams assigned to you yet' },
    {
      name: 'team milestones',
      url: `/teams/${ALPHA_ID}`,
      api: `**/api/teams/${ALPHA_ID}/milestones`,
      busy: 'Loading milestones',
      empty: () => ({ milestones: [] }),
      emptyText: 'No milestones yet',
    },
    {
      name: 'milestone',
      url: `/milestones/${milestoneId}`,
      api: `**/api/milestones/${milestoneId}`,
      busy: 'Loading milestone',
      empty: (b) => ({ ...b, submission: null }),
      emptyText: 'No submission yet',
    },
    {
      name: 'board',
      url: `/teams/${ALPHA_ID}/board`,
      api: `**/api/teams/${ALPHA_ID}/board`,
      busy: 'Loading board',
      empty: (b) => ({ ...b, summary: { ...b.summary, total: 0 } }),
      emptyText: 'No milestones yet.',
    },
    {
      name: 'report',
      url: '/reports',
      api: '**/api/reports/supervisor-summary',
      busy: 'Loading report',
      empty: (b) => ({ ...b, teams: [] }),
      emptyText: 'No assigned teams yet.',
    },
  ];
  // Team header GET has its own skeleton.
  screens.push({ ...screens[1], name: 'team', api: `**/api/teams/${ALPHA_ID}`, busy: 'Loading team' });

  for (const s of screens) {
    await test.step(`${s.name}: loading`, async () => {
      await page.route(s.api, async (route) => {
        await new Promise((r) => setTimeout(r, 1000));
        await route.fallback();
      });
      await page.goto(s.url);
      await expect(page.locator(`[aria-busy="true"][aria-label="${s.busy}"]`)).toBeVisible();
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    });
    if (s.name !== 'team') {
      await test.step(`${s.name}: empty`, async () => {
        await page.route(s.api, async (route) => {
          await route.fulfill({ json: s.empty(await (await route.fetch()).json()) });
        });
        await page.goto(s.url);
        await expect(page.getByText(s.emptyText, { exact: true })).toBeVisible();
        await page.unrouteAll({ behavior: 'ignoreErrors' });
      });
    }
    await test.step(`${s.name}: error`, async () => {
      await page.route(s.api, (route) => route.fulfill(FAIL_500));
      await page.goto(s.url);
      await expect(page.getByRole('alert').filter({ hasText: 'Something went wrong' })).toBeVisible();
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    });
  }
});

test('TEST-68 (AC-64) server field errors show under each input and are linked with aria-describedby', async ({ page }) => {
  const title = `States ${Date.now()}`;

  // Login form
  await failWrites(page, { email: 'Server says email', password: 'Server says password' });
  await page.goto('/login');
  await page.getByLabel('Email').fill('sup1@cpms.test');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expectLinkedError(page, 'Email', 'Server says email');
  await expectLinkedError(page, 'Password', 'Server says password');
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  // Milestone create form (team page)
  await login(page, 'sup1@cpms.test');
  await page.goto(`/teams/${ALPHA_ID}`);
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Due date').fill(futureLocal());
  await failWrites(page, { title: 'Bad title', description: 'Bad description', dueAt: 'Bad due date' });
  await page.getByRole('button', { name: 'Create milestone' }).click();
  await expectLinkedError(page, 'Title', 'Bad title');
  await expectLinkedError(page, 'Description', 'Bad description');
  await expectLinkedError(page, 'Due date', 'Bad due date');
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.getByRole('button', { name: 'Create milestone' }).click();
  await page.getByRole('link', { name: title }).first().click();
  await expect(page).toHaveURL(/\/milestones\/.+/);
  const milestoneUrl = page.url();

  // Milestone edit form
  await page.getByRole('button', { name: 'Edit milestone' }).click();
  await page.getByLabel('Title').fill(`${title} edited`);
  await failWrites(page, { title: 'Bad title', description: 'Bad description', dueAt: 'Bad due date' });
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expectLinkedError(page, 'Title', 'Bad title');
  await expectLinkedError(page, 'Description', 'Bad description');
  await expectLinkedError(page, 'Due date', 'Bad due date');
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  // Submission form (student)
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 's1@cpms.test');
  await page.goto(milestoneUrl);
  await page.getByLabel('Title').fill('States deliverable');
  await page.getByLabel('Deliverable link').fill('https://github.com/example/alpha/pull/108');
  await failWrites(page, { title: 'Bad title', link: 'Bad link', description: 'Bad description' });
  await page.getByRole('button', { name: 'Submit' }).click();
  await expectLinkedError(page, 'Title', 'Bad title');
  await expectLinkedError(page, 'Deliverable link', 'Bad link');
  await expectLinkedError(page, 'Description', 'Bad description');
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Not graded yet')).toBeVisible();

  // Feedback and grade forms (supervisor)
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 'sup1@cpms.test');
  await page.goto(milestoneUrl);
  await page.getByLabel('Feedback').fill('Looks good');
  await page.getByLabel('Score (0–100)').fill('80');
  await failWrites(page, { comment: 'Bad comment', score: 'Bad score' });
  await page.getByRole('button', { name: 'Save feedback' }).click();
  await expectLinkedError(page, 'Feedback', 'Bad comment');
  await page.getByRole('button', { name: 'Save grade' }).click();
  await expectLinkedError(page, 'Score (0–100)', 'Bad score');
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.getByRole('button', { name: 'Save feedback' }).click();

  // Revision request form (shown after feedback)
  await page.getByLabel('Reason').fill('Add tests');
  await failWrites(page, { reason: 'Bad reason', dueAt: 'Bad revision due' });
  await page.getByRole('button', { name: 'Request revision' }).click();
  await expectLinkedError(page, 'Reason', 'Bad reason');
  await expectLinkedError(page, 'Revision due', 'Bad revision due');
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('TEST-70 (AC-65) Try again reloads after a 500; a 404 shows no Try again', async ({ page }) => {
  await login(page, 'sup2@cpms.test');
  // Fails until Try again is clicked (StrictMode in dev fires the first GET twice).
  let fail = true;
  await page.route('**/api/teams/*/board', (route) => (fail ? route.fulfill(FAIL_500) : route.fallback()));
  await page.goto(`/teams/${GAMMA_ID}/board`);
  await expect(page.getByText('Something went wrong')).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('No milestones yet.')).toBeVisible();
  await expect(page.getByText('Something went wrong')).toHaveCount(0);

  await page.goto('/milestones/00000000-0000-4000-8000-00000000ffff');
  await expect(page.getByText('Not found or you do not have access')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
});
