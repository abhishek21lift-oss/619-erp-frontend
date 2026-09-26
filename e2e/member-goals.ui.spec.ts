import { test, expect, type Page } from '@playwright/test';
import { ALPHA_MEMBER, apiDelete, apiGet, memberApiToken } from './helpers/session';

/**
 * Journey — a member sets a goal in the member app.
 *
 * The goal form is the member's own write path: its target, kind and date are
 * what every progress bar and projected date on the Goals page is computed
 * against, so a value that arrives wrong here is wrong on every read after.
 *
 * Acts as Alpha's CLIENT, not the studio owner: this spec starts signed out
 * (the studio session the other journeys share is not the member's) and signs
 * in through Member Login — once, for the file.
 */

type Goal = { id: string; kind: string; target_value: number; target_date: string | null; current_value: number | null; progress_pct: number | null };

async function goals(token: string): Promise<Goal[]> {
  const body = await apiGet<{ data: { goals: Goal[] } }>('/api/me/goals', token);
  return body.data.goals;
}

/** 'YYYY-MM-DD', `days` from today in local time — what the date input takes. */
function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Member — set a goal', () => {
  test.describe.configure({ mode: 'serial' });
  // The first visit pays for the dev server compiling the member pages.
  test.setTimeout(90_000);
  let page: Page;
  let token: string;
  const created: string[] = [];

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    page = await browser.newPage();
    await page.goto('/member-login');
    await page.getByLabel('Email address').fill(ALPHA_MEMBER.email);
    await page.getByLabel('Password', { exact: true }).fill(ALPHA_MEMBER.password);
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith('/member'), { timeout: 30_000 }),
      page.getByRole('button', { name: /log in|sign in/i }).first().click(),
    ]);
    token = await memberApiToken();
    // Start from a clean list so the counts below mean what they say.
    for (const g of await goals(token)) await apiDelete(`/api/me/goals/${g.id}`, token);
  });

  test.afterAll(async () => {
    for (const id of created) await apiDelete(`/api/me/goals/${id}`, token);
    await page.close();
  });

  test('a sessions goal reaches the database with its target and date', async () => {
    await page.goto('/member/goals');
    await expect(page.getByRole('heading', { name: 'Goals', exact: true })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /Show up/ }).click();
    const sheet = page.getByRole('dialog', { name: 'New goal' });
    await expect(sheet).toBeVisible();

    const date = inDays(45);
    await sheet.getByLabel(/^Target/).first().fill('24');
    await sheet.getByLabel(/^By when/).fill(date);
    await sheet.getByRole('button', { name: 'Set goal' }).click();

    await expect(sheet).toBeHidden({ timeout: 15_000 });
    await expect.poll(async () => (await goals(token)).length, { timeout: 15_000 }).toBe(1);
    const [goal] = await goals(token);
    created.push(goal.id);

    expect(goal.kind).toBe('sessions');
    expect(goal.target_value).toBe(24);
    expect(goal.target_date).toBe(date);

    // The page shows what was saved, from a fresh read.
    await page.reload();
    await expect(page.getByText('24 sessions')).toBeVisible({ timeout: 15_000 });
  });

  test('an invalid target is refused next to the field, and nothing is saved', async () => {
    await page.goto('/member/goals');
    await page.getByRole('button', { name: /New goal/ }).click();
    const sheet = page.getByRole('dialog', { name: 'New goal' });
    await sheet.getByRole('radio', { name: 'Sessions' }).click();
    await sheet.getByLabel(/^Target/).first().fill('2.5');
    await sheet.getByRole('button', { name: 'Set goal' }).click();

    await expect(sheet.getByText(/whole number/i).first()).toBeVisible();
    await expect(sheet).toBeVisible();
    expect(await goals(token)).toHaveLength(1);
  });

  test('removing a goal takes it off the list', async () => {
    await page.goto('/member/goals');
    await page.getByRole('button', { name: /Remove goal: 24 sessions/ }).click();
    await expect.poll(async () => (await goals(token)).length, { timeout: 15_000 }).toBe(0);
    created.length = 0;
  });
});
