import { test, expect } from '@playwright/test';
import { ALPHA, gotoApp, apiToken, apiGet } from './helpers/session';

/**
 * Record Payment — the fastest-moving money form in the product.
 *
 * ── What "end to end" means here ────────────────────────────────────────────
 *
 * Every step is real: a real browser filling the real form, against the real
 * API, against a real Postgres with the real migrations applied. Nothing is
 * mocked or intercepted.
 *
 * The assertion that matters is the last one. After the form says it
 * succeeded, the payment is read back THROUGH THE API — so the test proves the
 * amount reached the database, not merely that a toast appeared. A journey
 * that asserted only on the UI would pass for a form that showed "Recorded"
 * and posted nothing.
 *
 * The API token is used ONLY to read. The write under test always goes through
 * the form; writing through the API and reading back through the API would
 * prove the server works and say nothing about the screen.
 */

type Payment = { id: string; amount: number | string; method?: string; notes?: string };
type PaymentList = { data?: Payment[] } | Payment[];

const rows = (body: PaymentList): Payment[] =>
  Array.isArray(body) ? body : (body.data ?? []);

/** The payments the API holds for the seeded client, newest first. */
async function paymentsFor(token: string): Promise<Payment[]> {
  const body = await apiGet<PaymentList>(`/api/pt-os/clients/${ALPHA.clientId}/payments`, token);
  return rows(body);
}

const amount = (p: Payment) => Number(p.amount);

test.describe('Record Payment', () => {
  let token: string;

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    // No sign-in here: the session comes from auth.setup.ts via storageState.
    // gotoApp re-authenticates only if the access cookie expired mid-run.
    await gotoApp(page, `/pt-os/clients/${ALPHA.clientId}/payments`);
    await expect(page.getByRole('button', { name: 'Record Payment' }).first()).toBeVisible();
  });

  /** Open the sheet and type an amount on the keypad, as a person would. */
  async function openSheetAndType(page: import('@playwright/test').Page, digits: string) {
    await page.getByRole('button', { name: 'Record Payment' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Record payment' })).toBeVisible();
    for (const d of digits) {
      await page.getByRole('button', { name: d === '.' ? 'Decimal point' : d, exact: true }).click();
    }
  }

  test('a typed amount reaches the database and comes back on the page', async ({ page }) => {
    const before = await paymentsFor(token);

    await openSheetAndType(page, '1250');
    await page.getByRole('button', { name: /^Record Payment$/ }).last().click();

    // The UI's own success state.
    await expect(page.getByRole('dialog', { name: 'Record payment' })).toBeHidden({ timeout: 15_000 });

    // The assertion with teeth: the row exists server-side, at the right value.
    await expect.poll(async () => {
      const after = await paymentsFor(token);
      return after.length - before.length;
    }, { timeout: 15_000 }).toBe(1);

    const after = await paymentsFor(token);
    const added = after.find((p) => !before.some((b) => b.id === p.id));
    expect(added, 'the new payment is readable through the API').toBeTruthy();
    expect(amount(added!)).toBe(1250);
  });

  test('refuses a zero amount rather than recording a ₹0 payment', async ({ page }) => {
    // A ₹0 row moves no balance and counts toward every report that counts
    // rows, so it reads as "the member paid" forever.
    const before = await paymentsFor(token);

    await openSheetAndType(page, '0');
    await page.getByRole('button', { name: /^Record Payment$/ }).last().click();

    // The sheet stays open and nothing is written.
    await expect(page.getByRole('dialog', { name: 'Record payment' })).toBeVisible();
    await page.waitForTimeout(1500);
    expect((await paymentsFor(token)).length).toBe(before.length);
  });

  test('a double-tap records one payment, not two', async ({ page }) => {
    // `isSubmitting` is state, so two taps in one frame both read false. The
    // guard is a ref; this is what proves it.
    const before = await paymentsFor(token);

    await openSheetAndType(page, '500');
    const submit = page.getByRole('button', { name: /^Record Payment$/ }).last();
    await Promise.all([submit.click(), submit.click().catch(() => {})]);

    await expect(page.getByRole('dialog', { name: 'Record payment' })).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(2000);

    const after = await paymentsFor(token);
    expect(after.length - before.length, 'exactly one payment row').toBe(1);
  });

  test('a server failure is reported, leaks nothing, and persists nothing', async ({ page }) => {
    const before = await paymentsFor(token);

    // The one place a route is intercepted, and only to force a failure the
    // real server will not produce on demand. Everything else is real. The body
    // deliberately carries text no user should ever see.
    await page.route('**/api/pt-os/**/payments', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"error":"ERROR: null value in column \\"amount\\" violates not-null constraint at /srv/api/src/routes/payments.js:214"}',
          })
        : route.continue());

    await openSheetAndType(page, '750');
    await page.getByRole('button', { name: /^Record Payment$/ }).last().click();

    // The form says so rather than closing as if it worked.
    const sheet = page.getByRole('dialog', { name: 'Record payment' });
    await expect(sheet).toBeVisible();
    const banner = sheet.getByRole('alert');
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText(/server had a problem/i);

    // And the security half: the 5xx body carried a SQL error and an internal
    // file path. Neither reaches the screen — not in the banner, not anywhere
    // else on the page. A form that reports failure honestly can still leak.
    await expect(page.locator('body')).not.toContainText('not-null constraint');
    await expect(page.locator('body')).not.toContainText('/srv/api/src');

    await page.unroute('**/api/pt-os/**/payments');
    expect((await paymentsFor(token)).length).toBe(before.length);
  });

  test('retrying after a failure records exactly one payment', async ({ page }) => {
    // §6 retry. The failure path must leave the form usable and the amount
    // intact — retyping ₹1,100 on a keypad after a 500 is how a studio ends up
    // recording ₹110.
    const before = await paymentsFor(token);

    let failNext = true;
    await page.route('**/api/pt-os/**/payments', (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      if (failNext) {
        failNext = false;
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"transient"}' });
      }
      return route.continue();
    });

    await openSheetAndType(page, '1100');
    const submit = page.getByRole('button', { name: /^Record Payment$/ }).last();
    await submit.click();

    const sheet = page.getByRole('dialog', { name: 'Record payment' });
    await expect(sheet.getByRole('alert')).toBeVisible({ timeout: 10_000 });

    // The typed amount survived the failure — nothing was cleared underneath.
    await expect(sheet).toContainText('1,100');

    await submit.click();
    await expect(sheet).toBeHidden({ timeout: 15_000 });

    await expect.poll(async () => (await paymentsFor(token)).length - before.length,
      { timeout: 15_000 }).toBe(1);
    const added = (await paymentsFor(token)).find((p) => !before.some((b) => b.id === p.id));
    expect(amount(added!), 'the retry recorded the amount once, at full value').toBe(1100);
  });

  test('reopening the sheet after a cancel does not keep the last amount', async ({ page }) => {
    // §7. A leftover amount is how the next member gets charged the previous
    // member's figure.
    const sheet = page.getByRole('dialog', { name: 'Record payment' });

    await openSheetAndType(page, '900');
    // Scoped to the dialog: the app shell has its own "Close sidebar" control,
    // and an unscoped name match finds both.
    await sheet.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(sheet).toBeHidden();

    await page.getByRole('button', { name: 'Record Payment' }).first().click();
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('900')).toHaveCount(0);
    await expect(sheet.getByText('9,00')).toHaveCount(0);
  });

  test('switching to another client does not carry the first one\'s amount', async ({ page }) => {
    // §7 entity A → entity B. The sheet lives in a page component keyed by the
    // client in the URL; if it were hoisted or memoised wrongly, the typed
    // amount would follow the navigation.
    const sheet = page.getByRole('dialog', { name: 'Record payment' });
    await openSheetAndType(page, '4321');
    await sheet.getByRole('button', { name: 'Close', exact: true }).click();

    await page.goto(`/pt-os/clients/${ALPHA.secondClientId}/payments`);
    await page.getByRole('button', { name: 'Record Payment' }).first().click();
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('4,321')).toHaveCount(0);
    await expect(sheet.getByText('4321')).toHaveCount(0);
  });
});
