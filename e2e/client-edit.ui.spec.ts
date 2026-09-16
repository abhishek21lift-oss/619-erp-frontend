import { test, expect } from '@playwright/test';
import { ALPHA, gotoApp, apiToken, apiGet } from './helpers/session';

/**
 * Journey 2 — Client edit.
 *
 * Editing carries a risk creation does not: the form is pre-filled from a
 * record, so everything it sends that it did not mean to send OVERWRITES
 * something. The assertions below therefore check two things on every save —
 * that the field edited changed, and that the fields beside it did not.
 */

type Client = {
  id: string; name: string; mobile?: string | null; email?: string | null;
  final_amount?: number | string | null; paid_amount?: number | string | null;
  balance_amount?: number | string | null; trainer_id?: string | null;
};

const clientById = (token: string, id: string) =>
  apiGet<{ data?: Client } | Client>(`/api/pt-os/clients/${id}`, token)
    .then((b) => ('data' in (b as object) ? (b as { data?: Client }).data! : (b as Client)));

test.describe('Client edit', () => {
  let token: string;
  let original: Client;

  test.beforeAll(async () => {
    token = await apiToken();
    original = await clientById(token, ALPHA.secondClientId);
  });

  /** Put the fixture back, so the suite is re-runnable and the next journey
   *  finds the client it expects. Unconditional: a test that fails half way
   *  through a rename must not leave the row renamed for everything after it. */
  async function restoreFixture() {
    const t = await apiToken();
    await fetch(`${process.env.E2E_API_URL ?? 'http://127.0.0.1:5100'}/api/pt-os/clients/${ALPHA.secondClientId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: ALPHA.secondClientName, email: original?.email ?? null }),
    });
  }

  test.afterEach(restoreFixture);
  test.afterAll(restoreFixture);

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    await gotoApp(page, `/pt-os/clients/${ALPHA.secondClientId}/edit`);
    await expect(page.getByLabel(/^Full Name/)).toHaveValue(/.+/, { timeout: 20_000 });
  });

  test('an edited field is persisted and the money beside it is not touched', async ({ page }) => {
    // The money columns are the point. This form used to post the whole client,
    // so correcting a phone number re-sent final_amount — and a form that
    // rounds or blanks a number it never showed is how a balance quietly moves.
    const before = await clientById(token, ALPHA.secondClientId);
    const newEmail = `edited-${Date.now().toString(36)}@e2e.test`;

    await page.getByLabel(/^Email Address/).fill(newEmail);
    await page.getByRole('button', { name: /^Save/ }).first().click();

    await expect.poll(async () => (await clientById(token, ALPHA.secondClientId)).email, { timeout: 15_000 })
      .toBe(newEmail);

    const after = await clientById(token, ALPHA.secondClientId);
    expect(String(after.final_amount ?? ''), 'final_amount untouched').toBe(String(before.final_amount ?? ''));
    expect(String(after.paid_amount ?? ''), 'paid_amount untouched').toBe(String(before.paid_amount ?? ''));
    expect(String(after.balance_amount ?? ''), 'balance_amount untouched').toBe(String(before.balance_amount ?? ''));
    expect(after.trainer_id ?? null, 'trainer untouched').toBe(before.trainer_id ?? null);
  });

  test('an empty required name is refused and nothing is sent', async ({ page }) => {
    let patched = 0;
    await page.route(`**/api/pt-os/clients/${ALPHA.secondClientId}`, (route) => {
      if (route.request().method() === 'PATCH') patched += 1;
      return route.continue();
    });

    await page.getByLabel(/^Full Name/).fill('   ');
    await page.getByRole('button', { name: /^Save/ }).first().click();

    await page.waitForTimeout(1200);
    expect(patched, 'whitespace is not a name').toBe(0);
    expect((await clientById(token, ALPHA.secondClientId)).name).toBe(ALPHA.secondClientName);
  });

  test('a server failure is reported without leaking the server', async ({ page }) => {
    await page.route(`**/api/pt-os/clients/${ALPHA.secondClientId}`, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"error":"ERROR: column \\"emial\\" does not exist at /srv/api/src/modules/pt-os/pt-os.routes.js:800"}',
          })
        : route.continue());

    await page.getByLabel(/^Email Address/).fill(`leak-${Date.now()}@e2e.test`);
    await page.getByRole('button', { name: /^Save/ }).first().click();

    // Reported, and still on the form rather than navigated away as if saved.
    await expect(page.getByRole('status').or(page.getByRole('alert')).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('body')).not.toContainText('does not exist');
    await expect(page.locator('body')).not.toContainText('/srv/api/src');
    await expect(page.getByLabel(/^Full Name/)).toBeVisible();
  });

  test('editing a second client does not show the first one\'s values', async ({ page }) => {
    // §7 Edit A → Cancel → Edit B. The form is keyed by the client in the URL;
    // if its state outlived the navigation, the studio would be editing A's
    // details on B's record.
    const sentinel = `SENTINEL-${Date.now().toString(36)}`;
    await page.getByLabel(/^Full Name/).fill(sentinel);

    await gotoApp(page, `/pt-os/clients/${ALPHA.clientId}/edit`);
    await expect(page.getByLabel(/^Full Name/)).toHaveValue(ALPHA.clientName, { timeout: 20_000 });
    await expect(page.getByLabel(/^Full Name/)).not.toHaveValue(sentinel);

    // And the abandoned edit was never written.
    expect((await clientById(token, ALPHA.secondClientId)).name).toBe(ALPHA.secondClientName);
  });

  test('reopening after a save shows the saved value, not the old one', async ({ page }) => {
    // §7 Save → Reopen. A cached GET that outlives its own write is how a
    // studio sees the change vanish and types it a second time.
    const newName = `RENAMED-${Date.now().toString(36).toUpperCase()}`;
    await page.getByLabel(/^Full Name/).fill(newName);
    await page.getByRole('button', { name: /^Save/ }).first().click();

    await expect.poll(async () => (await clientById(token, ALPHA.secondClientId)).name, { timeout: 15_000 })
      .toBe(newName);

    await gotoApp(page, `/pt-os/clients/${ALPHA.secondClientId}/edit`);
    await expect(page.getByLabel(/^Full Name/)).toHaveValue(newName, { timeout: 20_000 });
  });
});
