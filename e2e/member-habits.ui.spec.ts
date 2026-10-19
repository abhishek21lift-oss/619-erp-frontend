import { test, expect, type Page } from '@playwright/test';
import { ALPHA_MEMBER, apiGet, memberApiToken } from './helpers/session';

/**
 * Journey — a member writes and edits one day of the daily journal.
 *
 * The source-level audit can prove the form binds the canonical schema; only a
 * real submit proves the backend stored the numbers instead of silently
 * dropping them. The value with teeth is the second save: the same date must
 * stay one row, not become a second entry that doubles the averages.
 */

type HabitLog = {
  id: string;
  log_date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  steps: number | null;
  recovery_level: number | null;
  notes: string | null;
  source: string;
  steps_source: string | null;
};

type HabitResponse = { data: HabitLog[] };

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function readDay(token: string, date: string): Promise<HabitLog[]> {
  const body = await apiGet<HabitResponse>(`/api/me/habits?from=${date}&to=${date}`, token);
  return body.data;
}

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Member — daily journal', () => {
  test.describe.configure({ mode: 'serial' });
  // First visit pays for the dev server compiling the member pages.
  test.setTimeout(90_000);
  let page: Page;
  let token: string;

  // Outside the 30-day dashboard window, so this seeded account's trends are
  // not changed by the journey, but still inside the one-year edit limit.
  const date = daysAgo(200);
  const note = `E2E journal ${Date.now()}`;

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
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('the saved and edited readings are the ones in the database', async () => {
    await page.goto('/member/habits');
    await expect(page.getByRole('heading', { name: 'Daily journal' })).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('Journal date').fill(date);
    const save = page.getByRole('button', { name: /^(Save|Update) this day$/ });
    await expect(save).toBeVisible({ timeout: 20_000 });

    await page.getByLabel(/^Duration/).fill('7.5');
    await page.getByRole('radiogroup', { name: 'Quality' }).getByRole('radio', { name: '4' }).click();
    await page.getByLabel('Steps').fill('8123');
    await page.getByRole('radiogroup', { name: 'Recovery' }).getByRole('radio', { name: '4' }).click();
    await page.getByLabel('Notes (optional)').fill(note);
    await save.click();

    await expect(page.getByText('Journal saved')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Update this day' })).toBeVisible({ timeout: 20_000 });

    const [created] = await readDay(token, date);
    expect(created, 'one row for the date').toBeTruthy();
    expect(Number(created.sleep_hours)).toBe(7.5);
    expect(created.sleep_quality).toBe(4);
    expect(created.steps).toBe(8123);
    expect(created.recovery_level).toBe(4);
    expect(created.notes).toBe(note);
    expect(created.source).toBe('manual');
    expect(created.steps_source).toBe('manual');

    await page.getByLabel('Notes (optional)').fill(`${note} edited`);
    await page.getByRole('button', { name: 'Update this day' }).click();
    await expect(page.getByText('Journal saved')).toBeVisible({ timeout: 15_000 });

    const rows = await readDay(token, date);
    expect(rows, 'editing updates the same day rather than inserting another').toHaveLength(1);
    expect(rows[0].id).toBe(created.id);
    expect(rows[0].notes).toBe(`${note} edited`);
    expect(rows[0].steps).toBe(8123);
  });
});
