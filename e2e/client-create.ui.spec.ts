import { test, expect, type Page } from '@playwright/test';
import { gotoApp, apiToken, apiGet, apiDelete, doubleTap } from './helpers/session';

/**
 * Journey 1 — Client creation.
 *
 * The front door of the whole product: everything else in the studio hangs off
 * a client row. Real browser, real API, real Postgres; the only interception is
 * where a failure has to be forced that the server will not produce on demand.
 */

type Client = { id: string; name: string; mobile?: string | null; gender?: string | null };
type ClientList = { data?: Client[] } | Client[];

const rows = (b: ClientList): Client[] => (Array.isArray(b) ? b : (b.data ?? []));

/** A name nothing else in the fixture uses, so the read-back cannot match a seed row. */
// A counter as well as the clock: two calls in the same millisecond
// produced the SAME "unique" name, and a test that then counted rows by
// that name found two where it expected one — reported as a duplicate
// submit, which is exactly the defect these journeys exist to catch.
let seq = 0;
function uniqueName(): string {
  seq += 1;
  return `E2E-CREATED-${Date.now().toString(36).toUpperCase()}-${seq}`;
}

/** A mobile number in the seeded studio's range that no fixture row holds. */
function uniqueMobile(): string {
  // 9-digit suffix from the clock keeps runs from colliding with each other.
  return `9${String(Date.now()).slice(-9)}`;
}

async function clientsNamed(token: string, name: string): Promise<Client[]> {
  const body = await apiGet<ClientList>(`/api/pt-os/clients?search=${encodeURIComponent(name)}`, token);
  return rows(body).filter((c) => c.name === name);
}

async function fillRequired(page: Page, name: string, mobile: string) {
  await page.getByLabel(/^Full Name/).fill(name);
  await page.getByRole('button', { name: 'Male', exact: true }).click();
  await page.getByLabel(/^Contact Number/).fill(mobile);
}

test.describe('Client creation', () => {
  let token: string;
  const created: string[] = [];

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    await gotoApp(page, '/pt-os/new-client');
    await expect(page.getByRole('button', { name: 'Create Client' })).toBeVisible();
  });

  test.afterAll(async () => {
    // Journeys that write must not leave the fixture growing run after run.
    const t = await apiToken();
    for (const id of created) await apiDelete(`/api/pt-os/clients/${id}`, t);
  });

  test('a filled form creates a client that is readable from the database', async ({ page }) => {
    const name = uniqueName();
    const mobile = uniqueMobile();

    await fillRequired(page, name, mobile);
    await page.getByRole('button', { name: 'Create Client' }).click();

    // The UI's own success state.
    await expect(page.getByRole('heading', { name: /Client Onboarded/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(name)).toBeVisible();

    // The assertion with teeth.
    await expect.poll(async () => (await clientsNamed(token, name)).length, { timeout: 15_000 }).toBe(1);
    const [row] = await clientsNamed(token, name);
    created.push(row.id);
    expect(row.mobile?.replace(/\D/g, ''), 'the typed number, digits preserved').toBe(mobile);
  });

  test('an invalid submission never reaches the server', async ({ page }) => {
    // §6 invalid submission. The point is not only that it is refused — it is
    // that no request is made at all, so a half-formed row cannot be created by
    // a server that is more forgiving than the form.
    let posted = 0;
    await page.route('**/api/pt-os/clients', (route) => {
      if (route.request().method() === 'POST') posted += 1;
      return route.continue();
    });

    // Name only: gender and mobile are both required.
    await page.getByLabel(/^Full Name/).fill(uniqueName());
    await page.getByRole('button', { name: 'Create Client' }).click();

    await expect(page.getByText(/select a gender/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Client Onboarded/i })).toHaveCount(0);
    await page.waitForTimeout(1000);
    expect(posted, 'nothing was sent').toBe(0);
  });

  test('a malformed mobile is refused rather than truncated', async ({ page }) => {
    // 'parseInt-style' tolerance is how a studio ends up with a 7-digit number
    // it can never call back.
    await page.getByLabel(/^Full Name/).fill(uniqueName());
    await page.getByRole('button', { name: 'Male', exact: true }).click();
    await page.getByLabel(/^Contact Number/).fill('12345');
    await page.getByRole('button', { name: 'Create Client' }).click();

    await expect(page.getByRole('heading', { name: /Client Onboarded/i })).toHaveCount(0);
  });

  test('a double-tap creates one client, not two', async ({ page }) => {
    const name = uniqueName();
    await fillRequired(page, name, uniqueMobile());

    await doubleTap(page.getByRole('button', { name: 'Create Client' }));

    await expect(page.getByRole('heading', { name: /Client Onboarded/i })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2000);

    const found = await clientsNamed(token, name);
    for (const c of found) created.push(c.id);
    expect(found.length, 'exactly one client row').toBe(1);
  });

  test('a server failure is reported, leaks nothing, and persists nothing', async ({ page }) => {
    const name = uniqueName();
    await page.route('**/api/pt-os/clients', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"error":"ERROR: duplicate key value violates unique constraint at /srv/api/src/modules/pt-os/pt-os.routes.js:512"}',
          })
        : route.continue());

    await fillRequired(page, name, uniqueMobile());
    await page.getByRole('button', { name: 'Create Client' }).click();

    // Not the success screen, and the form is still there to try again with.
    await expect(page.getByRole('heading', { name: /Client Onboarded/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Create Client' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('unique constraint');
    await expect(page.locator('body')).not.toContainText('/srv/api/src');

    await page.unroute('**/api/pt-os/clients');
    expect((await clientsNamed(token, name)).length).toBe(0);
  });

  test('onboarding another starts from an empty form', async ({ page }) => {
    // §7 Success → New entity. The second client of the morning must not
    // inherit the first one's name, number or gender.
    const name = uniqueName();
    await fillRequired(page, name, uniqueMobile());
    await page.getByRole('button', { name: 'Create Client' }).click();
    await expect(page.getByRole('heading', { name: /Client Onboarded/i })).toBeVisible({ timeout: 20_000 });

    const found = await clientsNamed(token, name);
    for (const c of found) created.push(c.id);

    await page.getByRole('button', { name: 'Onboard Another' }).click();

    await expect(page.getByLabel(/^Full Name/)).toHaveValue('');
    await expect(page.getByLabel(/^Contact Number/)).toHaveValue('');
    await expect(page.getByText(name)).toHaveCount(0);
  });

  test('the required single-choice control announces itself to a screen reader', async ({ page }) => {
    // §11. Gender is required and single-select. Three bare <button>s look
    // right and say nothing: no group, no name for the set, and no way for a
    // screen reader to report which one is chosen.
    const group = page.getByRole('group', { name: /gender/i });
    await expect(group).toBeVisible();

    const male = group.getByRole('button', { name: 'Male', exact: true });
    await expect(male).toHaveAttribute('aria-pressed', 'false');
    await male.click();
    await expect(male).toHaveAttribute('aria-pressed', 'true');

    const female = group.getByRole('button', { name: 'Female', exact: true });
    await expect(female, 'single-select: choosing one clears the other').toHaveAttribute('aria-pressed', 'false');
  });
});
