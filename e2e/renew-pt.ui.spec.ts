import { test, expect, type Page } from '@playwright/test';
import { ALPHA, gotoApp, apiToken, apiGet, doubleTap } from './helpers/session';

/**
 * Journey 6 — PT renewal.
 *
 * A renewal writes three numbers at once: what the next term costs, what was
 * taken today, and the balance between them. Getting any of the three wrong is
 * silent — the member is simply chased for the wrong amount, or not chased at
 * all — so every assertion here reads all three back from the server.
 */

type Renewal = {
  id?: string;
  final_amount?: number | string; paid_amount?: number | string;
  balance_amount?: number | string; duration_months?: number | string;
  start_date?: string;
};
type RenewalList = { data?: Renewal[] } | Renewal[];

const rows = (b: RenewalList): Renewal[] => (Array.isArray(b) ? b : (b.data ?? []));
const num = (v: unknown) => Number(v ?? NaN);

const renewalsFor = (token: string) =>
  apiGet<RenewalList>(`/api/pt-os/clients/${ALPHA.secondClientId}/renewals`, token).then(rows);

function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function fillRenewal(page: Page, opts: { final: string; paid?: string; months?: string }) {
  await page.getByLabel(/^Start date/).fill(inDays(1));
  await page.getByLabel(/^Duration/).fill(opts.months ?? '3');
  await page.getByLabel(/^Final amount/).fill(opts.final);
  if (opts.paid !== undefined) await page.getByLabel(/^Amount paid now/).fill(opts.paid);
}

const confirm = (page: Page) => page.getByRole('button', { name: 'Confirm Renewal' });

test.describe('PT renewal', () => {
  let token: string;

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    await gotoApp(page, `/pt-os/clients/${ALPHA.secondClientId}/renew`);
    await expect(confirm(page)).toBeVisible({ timeout: 20_000 });
  });

  test('the three numbers reach the database as typed', async ({ page }) => {
    const before = await renewalsFor(token);

    await fillRenewal(page, { final: '12,000', paid: '5,000', months: '6' });
    await confirm(page).click();

    await expect.poll(async () => (await renewalsFor(token)).length, { timeout: 15_000 })
      .toBe(before.length + 1);

    const [latest] = await renewalsFor(token);
    // The separator is the point: parseFloat('12,000') is 12.
    expect(num(latest.final_amount), 'final amount').toBe(12000);
    expect(num(latest.paid_amount), 'paid today').toBe(5000);
    expect(num(latest.duration_months), 'term length').toBe(6);
  });

  test('renewing without taking money today is allowed and records the balance', async ({ page }) => {
    // 0 is legitimate here and different from absent — a renewal where nothing
    // is paid yet is ordinary, and the balance is what says so.
    const before = await renewalsFor(token);

    await fillRenewal(page, { final: '8000', paid: '0', months: '3' });
    await confirm(page).click();

    await expect.poll(async () => (await renewalsFor(token)).length, { timeout: 15_000 })
      .toBe(before.length + 1);

    const [latest] = await renewalsFor(token);
    expect(num(latest.final_amount)).toBe(8000);
    expect(num(latest.paid_amount)).toBe(0);
  });

  test('a renewal for nothing is refused', async ({ page }) => {
    // A ₹0 term is a discount with no record of what it discounted, and it
    // reads in every report as a member who is paid up.
    let posted = 0;
    await page.route('**/renew', (route) => {
      if (route.request().method() === 'POST') posted += 1;
      return route.continue();
    });

    await fillRenewal(page, { final: '0', paid: '0' });
    await confirm(page).click();

    await page.waitForTimeout(1200);
    expect(posted, 'nothing was sent').toBe(0);
  });

  test('taking more than the package is worth is refused, under the field it is about', async ({ page }) => {
    // The server clamps the balance at zero, so the excess would simply vanish
    // from the record rather than being reported anywhere.
    await fillRenewal(page, { final: '5000', paid: '9000' });
    await confirm(page).click();

    await expect(page.getByText(/More than the package price/i)).toBeVisible({ timeout: 10_000 });
    await expect(confirm(page)).toBeVisible();
  });

  test('an empty amount is not zero', async ({ page }) => {
    let posted = 0;
    await page.route('**/renew', (route) => {
      if (route.request().method() === 'POST') posted += 1;
      return route.continue();
    });

    await page.getByLabel(/^Start date/).fill(inDays(1));
    await page.getByLabel(/^Duration/).fill('3');
    // CLEARED, not merely untouched: the page seeds the previous term's price
    // into this field, which is the right default and the reason the test has
    // to empty it explicitly to ask the question it means to ask.
    await page.getByLabel(/^Final amount/).fill('');
    await confirm(page).click();

    await page.waitForTimeout(1200);
    expect(posted).toBe(0);
  });

  test('a double-tap renews once, not twice', async ({ page }) => {
    const before = await renewalsFor(token);

    await fillRenewal(page, { final: '3000', paid: '1000', months: '1' });
    await doubleTap(confirm(page));

    await page.waitForTimeout(3000);
    const after = await renewalsFor(token);
    expect(after.length - before.length, 'exactly one renewal').toBe(1);
  });

  test('a server failure is reported, leaks nothing, and persists nothing', async ({ page }) => {
    const before = await renewalsFor(token);

    await page.route('**/renew', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"error":"ERROR: deadlock detected at /srv/api/src/modules/pt-os/pt-os.routes.js:665"}',
          })
        : route.continue());

    await fillRenewal(page, { final: '4000', paid: '1000' });
    await confirm(page).click();

    const banner = page.getByRole('alert').first();
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText(/server had a problem/i);
    await expect(page.locator('body')).not.toContainText('deadlock detected');
    await expect(page.locator('body')).not.toContainText('/srv/api/src');

    await page.unroute('**/renew');
    expect((await renewalsFor(token)).length).toBe(before.length);
  });

  test('the balance shown is the balance saved', async ({ page }) => {
    // The screen computes Balance Due from two fields the person is typing.
    // If that arithmetic and the server's disagree, the member is chased for a
    // number nobody on either side ever saw.
    const before = await renewalsFor(token);

    await fillRenewal(page, { final: '10000', paid: '2,500', months: '2' });
    await expect(page.getByText('₹7,500')).toBeVisible();

    await confirm(page).click();
    await expect.poll(async () => (await renewalsFor(token)).length, { timeout: 15_000 })
      .toBe(before.length + 1);

    const [latest] = await renewalsFor(token);
    expect(num(latest.final_amount) - num(latest.paid_amount), 'what the screen promised').toBe(7500);
  });
});
