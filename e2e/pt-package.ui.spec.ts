import { test, expect, type Page } from '@playwright/test';
import { gotoApp, apiToken, apiGet, apiDelete, doubleTap } from './helpers/session';

/**
 * Journey 7 — PT package creation.
 *
 * A package's price is what every enrolment against it charges and its session
 * count is what the client is entitled to, so a wrong figure here is not one
 * wrong row — it is every client sold that package afterwards.
 *
 * `parseFloat('8,000')` is 8, and 8,000 with the separator is exactly how a
 * studio owner writes a price.
 */

type Pkg = {
  id: string; name?: string; price?: number | string;
  session_count?: number | string; duration_days?: number | string;
};

async function packages(token: string): Promise<Pkg[]> {
  const body = await apiGet<{ data?: Pkg[] }>('/api/automation/pt-packages', token);
  return body.data ?? [];
}

const byName = async (token: string, name: string) =>
  (await packages(token)).filter((p) => p.name === name);

// A counter as well as the clock: two calls in the same millisecond
// produced the SAME "unique" name, and a test that then counted rows by
// that name found two where it expected one — reported as a duplicate
// submit, which is exactly the defect these journeys exist to catch.
let seq = 0;
function uniqueName(): string {
  seq += 1;
  return `E2E-PKG-${Date.now().toString(36).toUpperCase()}-${seq}`;
}

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Create Package' });

async function openCreate(page: Page) {
  await page.getByRole('button', { name: 'Create Package' }).first().click();
  await expect(dialog(page)).toBeVisible();
}

/** Scoped to the dialog: the page behind it has KPI cards named "Sessions" too. */
async function fillPackage(page: Page, name: string, price: string, sessions = '12', days = '90') {
  const d = dialog(page);
  await d.getByLabel(/^Package name/).fill(name);
  await d.getByLabel(/^Sessions/).fill(sessions);
  await d.getByLabel(/^Duration/).fill(days);
  await d.getByLabel(/^Price/).fill(price);
}

const submit = (page: Page) => dialog(page).getByRole('button', { name: /^Create$/ });

test.describe('PT package creation', () => {
  let token: string;
  const created: string[] = [];

  test.afterAll(async () => {
    const t = await apiToken();
    for (const id of created) await apiDelete(`/api/automation/pt-packages/${id}`, t);
  });

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    await gotoApp(page, '/subscription/packages');
    await expect(page.getByRole('button', { name: 'Create Package' }).first())
      .toBeVisible({ timeout: 20_000 });
  });

  test('a price with a separator is stored as the price typed', async ({ page }) => {
    const name = uniqueName();
    await openCreate(page);
    await fillPackage(page, name, '8,000', '24', '180');
    await submit(page).click();

    await expect.poll(async () => (await byName(token, name)).length, { timeout: 15_000 }).toBe(1);
    const [pkg] = await byName(token, name);
    created.push(pkg.id);

    expect(Number(pkg.price), 'eight thousand, not eight').toBe(8000);
    expect(Number(pkg.session_count)).toBe(24);
    expect(Number(pkg.duration_days)).toBe(180);
  });

  test('a whitespace-only price is refused rather than banked as zero', async ({ page }) => {
    // `parseFloat('  ')` is NaN, which JSON turns into null, which the old
    // backend stored as 0 — a free package in the catalogue.
    const name = uniqueName();
    let posted = 0;
    await page.route('**/api/automation/pt-packages', (route) => {
      if (route.request().method() === 'POST') posted += 1;
      return route.continue();
    });

    await openCreate(page);
    const d = dialog(page);
    await d.getByLabel(/^Package name/).fill(name);
    await d.getByLabel(/^Sessions/).fill('10');
    await d.getByLabel(/^Duration/).fill('30');
    await d.getByLabel(/^Price/).fill('   ');
    await submit(page).click();

    await page.waitForTimeout(1200);
    expect(posted, 'nothing was sent').toBe(0);
    expect((await byName(token, name)).length).toBe(0);
  });

  test('a fractional session count is refused', async ({ page }) => {
    // Half a session is not a thing a studio can sell or deliver, and
    // `parseInt('12.5')` silently made it 12.
    await openCreate(page);
    await fillPackage(page, uniqueName(), '5000', '12.5');
    await submit(page).click();
    await expect(dialog(page)).toBeVisible();
  });

  test('a double-tap creates one package, not two', async ({ page }) => {
    const name = uniqueName();
    await openCreate(page);
    await fillPackage(page, name, '3,500');
    await doubleTap(submit(page));

    await page.waitForTimeout(3000);
    const found = await byName(token, name);
    for (const p of found) created.push(p.id);
    expect(found.length, 'exactly one package').toBe(1);
  });

  test('a server failure is reported, leaks nothing, and persists nothing', async ({ page }) => {
    const name = uniqueName();
    await page.route('**/api/automation/pt-packages', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"error":"ERROR: null value in column \\"price\\" at /srv/api/src/routes/plans.js:88"}',
          })
        : route.continue());

    await openCreate(page);
    await fillPackage(page, name, '2000');
    await submit(page).click();

    const banner = dialog(page).getByRole('alert').first();
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('body')).not.toContainText('null value in column');
    await expect(page.locator('body')).not.toContainText('/srv/api/src');

    await page.unroute('**/api/automation/pt-packages');
    expect((await byName(token, name)).length).toBe(0);
  });

  test('cancelling and reopening shows an empty form', async ({ page }) => {
    // §7 Create → Cancel → Reopen.
    await openCreate(page);
    await fillPackage(page, uniqueName(), '9,999');
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog(page)).toBeHidden();

    await openCreate(page);
    await expect(dialog(page).getByLabel(/^Package name/)).toHaveValue('');
    await expect(dialog(page).getByLabel(/^Price/)).toHaveValue('');
  });
});
