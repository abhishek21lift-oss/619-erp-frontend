import { test, expect, type Page } from '@playwright/test';
import { gotoApp, apiToken, apiGet, doubleTap } from './helpers/session';

/**
 * Journey 5 — Invoice creation.
 *
 * The form that decides what a member is asked to pay. Its amount field is the
 * one the money schema was written for: `parseFloat('1,500')` is 1, and
 * `parseFloat('abc')` is NaN which JSON turns into null, which the old backend
 * stored as ₹0 — a successfully created invoice for nothing.
 *
 * These journeys type the separator a studio owner actually types.
 */

type Invoice = {
  id: string;
  client_name?: string;
  amount?: number | string;
  total_amount?: number | string;
};

const amountOf = (i: Invoice) => Number(i.total_amount ?? i.amount ?? NaN);

async function invoicesFor(token: string, member: string): Promise<Invoice[]> {
  // `invoices`, not `data` — the shape this endpoint actually returns.
  const body = await apiGet<{ invoices?: Invoice[] }>('/api/invoices', token);
  return (body.invoices ?? []).filter((i) => i.client_name === member);
}

// A counter as well as the clock: two calls in the same millisecond
// produced the SAME "unique" name, and a test that then counted rows by
// that name found two where it expected one — reported as a duplicate
// submit, which is exactly the defect these journeys exist to catch.
let seq = 0;
function uniqueMember(): string {
  seq += 1;
  return `E2E-INV-${Date.now().toString(36).toUpperCase()}-${seq}`;
}

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Create Invoice' });

async function openCreate(page: Page) {
  await page.getByRole('button', { name: /^(Create Invoice|New Invoice)$/ }).first().click();
  await expect(dialog(page)).toBeVisible();
}

/** Fill the four fields the schema requires. */
async function fillInvoice(page: Page, member: string, amount: string) {
  await page.getByLabel(/^Member Name/).fill(member);
  await page.getByLabel(/^Amount/).fill(amount);
  const due = new Date();
  due.setDate(due.getDate() + 14);
  await page.getByLabel(/^Due Date/).fill(due.toISOString().slice(0, 10));
}

const submit = (page: Page) =>
  page.getByRole('button', { name: /^Create Invoice/ }).last();

test.describe('Invoice creation', () => {
  let token: string;

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    await gotoApp(page, '/finance/invoices');
    await expect(page.getByRole('button', { name: /^(Create Invoice|New Invoice)$/ }).first())
      .toBeVisible({ timeout: 20_000 });
  });

  test('a thousands separator is read as the amount typed, not its first digit', async ({ page }) => {
    // ₹1,500 — the way it is written on every receipt in the country.
    const member = uniqueMember();
    await openCreate(page);
    await fillInvoice(page, member, '1,500');
    await submit(page).click();

    await expect(page.getByRole('heading', { name: 'Create Invoice' })).toBeHidden({ timeout: 15_000 });

    await expect.poll(async () => (await invoicesFor(token, member)).length, { timeout: 15_000 }).toBe(1);
    const [inv] = await invoicesFor(token, member);
    expect(amountOf(inv), 'one thousand five hundred rupees').toBe(1500);
  });

  test('a non-numeric amount is refused rather than banked as zero', async ({ page }) => {
    // The old path: parseFloat('abc') → NaN → JSON null → backend `|| 0` → a
    // ₹0 invoice, created successfully, that no report will ever flag.
    const member = uniqueMember();
    let posted = 0;
    await page.route('**/api/invoices', (route) => {
      if (route.request().method() === 'POST') posted += 1;
      return route.continue();
    });

    await openCreate(page);
    await fillInvoice(page, member, 'abc');
    await submit(page).click();

    await expect(page.getByRole('heading', { name: 'Create Invoice' })).toBeVisible();
    await page.waitForTimeout(1200);
    expect(posted, 'nothing was sent').toBe(0);
    expect((await invoicesFor(token, member)).length).toBe(0);
  });

  test('an empty amount is not zero', async ({ page }) => {
    // `Number('')` is 0. An invoice for ₹0 is indistinguishable from a paid one
    // in every total the studio looks at.
    const member = uniqueMember();
    await openCreate(page);
    await page.getByLabel(/^Member Name/).fill(member);
    const due = new Date();
    due.setDate(due.getDate() + 7);
    await page.getByLabel(/^Due Date/).fill(due.toISOString().slice(0, 10));
    await submit(page).click();

    await expect(page.getByRole('heading', { name: 'Create Invoice' })).toBeVisible();
    expect((await invoicesFor(token, member)).length).toBe(0);
  });

  test('whitespace is not a member name', async ({ page }) => {
    await openCreate(page);
    await page.getByLabel(/^Member Name/).fill('   ');
    await page.getByLabel(/^Amount/).fill('500');
    await submit(page).click();
    await expect(page.getByRole('heading', { name: 'Create Invoice' })).toBeVisible();
  });

  test('a double-tap creates one invoice, not two', async ({ page }) => {
    // `isSubmitting` is state: two clicks in one frame both read false. The
    // guard that actually holds is the in-flight ref inside useAppForm.
    const member = uniqueMember();
    await openCreate(page);
    await fillInvoice(page, member, '2,250');

    await doubleTap(submit(page));

    await expect(page.getByRole('heading', { name: 'Create Invoice' })).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(2000);
    expect((await invoicesFor(token, member)).length, 'exactly one invoice').toBe(1);
  });

  test('a server failure is reported, leaks nothing, and persists nothing', async ({ page }) => {
    const member = uniqueMember();
    await page.route('**/api/invoices', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"error":"ERROR: relation \\"invoces\\" does not exist at /srv/api/src/routes/invoices.js:109"}',
          })
        : route.continue());

    await openCreate(page);
    await fillInvoice(page, member, '900');
    await submit(page).click();

    const banner = dialog(page).getByRole('alert').first();
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText(/server had a problem/i);
    await expect(page.locator('body')).not.toContainText('does not exist');
    await expect(page.locator('body')).not.toContainText('/srv/api/src');

    await page.unroute('**/api/invoices');
    expect((await invoicesFor(token, member)).length).toBe(0);
  });

  test('a rejected amount is reported against the amount field', async ({ page }) => {
    // §6 server 4xx. A form-level "something is wrong" makes the person hunt;
    // the message belongs under the control it is about.
    await page.route('**/api/invoices', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: '{"error":{"code":"VALIDATION","field":"amount","message":"Amount exceeds the per-invoice limit."}}',
          })
        : route.continue());

    await openCreate(page);
    await fillInvoice(page, uniqueMember(), '990000');
    await submit(page).click();

    await expect(page.getByText('Amount exceeds the per-invoice limit.')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Create Invoice' })).toBeVisible();
  });

  test('cancelling and reopening shows an empty form', async ({ page }) => {
    // §7 Create → Cancel → Reopen. This modal used to reset only on SUCCESS,
    // so an abandoned attempt greeted the next member with the last one's
    // amount already filled in.
    const ghost = uniqueMember();
    await openCreate(page);
    await fillInvoice(page, ghost, '7,777');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Create Invoice' })).toBeHidden();

    await openCreate(page);
    await expect(page.getByLabel(/^Member Name/)).toHaveValue('');
    await expect(page.getByLabel(/^Amount/)).toHaveValue('');
  });

  test('a failure then a cancel does not leave the error waiting for the next invoice', async ({ page }) => {
    // §7 Failure → Cancel. An error banner that survives the close is an
    // accusation against a form the person has not filled in yet.
    await page.route('**/api/invoices', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' })
        : route.continue());

    await openCreate(page);
    await fillInvoice(page, uniqueMember(), '100');
    await submit(page).click();
    await expect(dialog(page).getByRole('alert').first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.unroute('**/api/invoices');

    await openCreate(page);
    await expect(dialog(page).getByRole('alert')).toHaveCount(0);
    await expect(page.getByLabel(/^Amount/)).toHaveValue('');
  });
  test('the modal is a dialog a keyboard can use @mobile', async ({ page }) => {
    // §11. It looked like a dialog and, to anything that is not a mouse, was a
    // <div> on top of the page: no role, no name, no focus management.
    await openCreate(page);
    const modal = dialog(page);

    // Named by its own heading, and announced as modal so a screen reader
    // stops reading the invoice list underneath.
    await expect(modal).toHaveAttribute('aria-modal', 'true');

    // Focus went IN — the first field, not the toolbar button that opened it.
    await expect(page.getByLabel(/^Member Name/)).toBeFocused();

    // And it stays in: tabbing off the last control wraps to the first rather
    // than walking into the list behind the overlay.
    const focusIsInside = async () =>
      modal.evaluate((el) => el.contains(document.activeElement));
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Tab');
      expect(await focusIsInside(), `Tab ${i + 1} left the dialog`).toBe(true);
    }
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await focusIsInside(), `Shift+Tab ${i + 1} left the dialog`).toBe(true);
    }

    // The close button says what it closes.
    await expect(modal.getByRole('button', { name: /^Close/ })).toBeVisible();

    // Escape closes, and focus comes back to what opened it.
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page.getByRole('button', { name: /^(Create Invoice|New Invoice)$/ }).first()).toBeFocused();
  });
});
