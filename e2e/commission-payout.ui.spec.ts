import { test, expect, type Page } from '@playwright/test';
import { ALPHA, gotoApp, apiToken, apiGet } from './helpers/session';

/**
 * Journey 8 — Commission and payout.
 *
 * The screen that decides what each trainer is paid. Two inline row editors,
 * both writing money, both with the failure mode that matters most here: an
 * empty box must not become ₹0, because ₹0 is a legitimate figure and a
 * trainer paid it has no way to tell it was a blank field rather than a
 * decision.
 */

type TrainerPerf = {
  id?: string; name?: string;
  // A FRACTION, 0..1 — the units the column keeps. The screen shows percent.
  incentive_rate?: number | string | null;
  monthly_commission?: number | string | null;
  total_incentives?: number | string | null;
};
type Payout = {
  trainer_id?: string; trainer_name?: string;
  payout_status?: string | null;
  paid_amount?: number | string | null;
  total_commission?: number | string | null;
};

const rowsOf = <T,>(b: { data?: T[] } | T[]): T[] => (Array.isArray(b) ? b : (b.data ?? []));

/** The percentage the row shows, from the fraction the column stores. */
const shownPct = (r: TrainerPerf | undefined) =>
  r == null || r.incentive_rate == null ? null : Number(r.incentive_rate) * 100;

/** This month, as the page's month picker formats it. */
function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const perfFor = (token: string) =>
  apiGet<{ data?: TrainerPerf[] }>('/api/pt-os/trainer-performance', token).then(rowsOf);

const payoutsFor = (token: string) =>
  apiGet<{ data?: Payout[] }>(`/api/pt-os/payouts?month=${thisMonth()}`, token).then(rowsOf);

const minePerf = (rows: TrainerPerf[]) => rows.find((r) => r.id === ALPHA.trainerId);
const minePayout = (rows: Payout[]) => rows.find((r) => r.trainer_id === ALPHA.trainerId);

/** The row's own inputs, addressed by the ids the page gives them. */
const pctBox = (page: Page) => page.locator(`#comm-pct-${ALPHA.trainerId}`);
const amountBox = (page: Page) => page.locator(`#comm-amt-${ALPHA.trainerId}`);
const incentiveBox = (page: Page) => page.locator(`#comm-inc-${ALPHA.trainerId}`);

const editCommission = (page: Page) =>
  page.getByRole('button', { name: `Edit ${ALPHA.trainerName}'s commission` });
const saveCommission = (page: Page) =>
  page.getByRole('button', { name: `Save ${ALPHA.trainerName}'s commission` });

test.describe('Commission and payout', () => {
  let token: string;

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    await gotoApp(page, '/pt-os/commissions');
    await expect(page.getByRole('button', { name: 'Calculate Commissions' }))
      .toBeVisible({ timeout: 20_000 });
  });

  test('an edited commission percentage reaches the database', async ({ page }) => {
    await editCommission(page).click();

    await pctBox(page).fill('12.5');
    // The other two are required by the schema, and the row seeds them from
    // the record; fill them explicitly so this test is about the percentage.
    await amountBox(page).fill('7000');
    await incentiveBox(page).fill('0');
    await saveCommission(page).click();

    // The number the person typed, in the units the column keeps. Sending the
    // percent raw put 12.5 into a NUMERIC(5,4) CHECK (0..1) column — a 500 —
    // and anything under 1 stored a rate a hundred times what was meant.
    await expect.poll(async () => shownPct(minePerf(await perfFor(token))),
      { timeout: 15_000 }).toBe(12.5);
  });

  test('a blank commission box is refused rather than saved as zero', async ({ page }) => {
    // 0% is a real answer — a salaried trainer on no commission — which is
    // exactly why a blank box must not silently become it. The draft holds
    // strings; the schema is the one place they become numbers.
    const before = minePerf(await perfFor(token));

    let patched = 0;
    await page.route('**/api/pt-os/commissions/**', (route) => {
      if (route.request().method() === 'PUT') patched += 1;
      return route.continue();
    });

    await editCommission(page).click();
    await amountBox(page).fill('7000');
    await incentiveBox(page).fill('0');
    await pctBox(page).fill('');
    await saveCommission(page).click();

    await page.waitForTimeout(1200);
    expect(patched, 'nothing was sent').toBe(0);

    expect(shownPct(minePerf(await perfFor(token))), 'unchanged').toBe(shownPct(before));
  });

  test('a percentage above 100 is refused', async ({ page }) => {
    let patched = 0;
    await page.route('**/api/pt-os/commissions/**', (route) => {
      if (route.request().method() === 'PUT') patched += 1;
      return route.continue();
    });

    await editCommission(page).click();
    await amountBox(page).fill('7000');
    await incentiveBox(page).fill('0');
    await pctBox(page).fill('150');
    await saveCommission(page).click();

    await page.waitForTimeout(1200);
    expect(patched).toBe(0);
  });

  test('a server failure is reported without leaking the server', async ({ page }) => {
    await page.route('**/api/pt-os/commissions/**', (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"error":"ERROR: numeric field overflow at /srv/api/src/modules/pt-os/pt-os.routes.js:1285"}',
          })
        : route.continue());

    await editCommission(page).click();
    await amountBox(page).fill('7000');
    await incentiveBox(page).fill('0');
    await pctBox(page).fill('9');
    await saveCommission(page).click();

    await expect(page.getByRole('status').or(page.getByRole('alert')).first())
      .toBeVisible({ timeout: 10_000 });
    await expect(page.locator('body')).not.toContainText('numeric field overflow');
    await expect(page.locator('body')).not.toContainText('/srv/api/src');
  });

  test('cancelling an edit leaves the stored figure alone', async ({ page }) => {
    // §7 Edit → Cancel. The draft lives in a per-row map; abandoning it must
    // not write, and must not leave the typed value on screen either.
    const before = minePerf(await perfFor(token));

    await editCommission(page).click();
    await pctBox(page).fill('77');
    await page.getByRole('button', { name: 'Cancel' }).first().click();

    expect(shownPct(minePerf(await perfFor(token)))).toBe(shownPct(before));
    await expect(page.getByText('77', { exact: true })).toHaveCount(0);
  });

  test('the payout status the screen shows is the status the server holds', async ({ page }) => {
    // A payout marked paid in the UI and pending in the database is a trainer
    // who is told they have been paid and has not been.
    const payout = minePayout(await payoutsFor(token));
    if (!payout) test.skip(true, 'no payout row for the seeded trainer this month');

    const status = String(payout!.payout_status ?? 'pending');
    await expect(page.getByText(status, { exact: false }).first()).toBeVisible();
  });
});
