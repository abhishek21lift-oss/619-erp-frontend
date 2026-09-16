import { test, expect, type Page } from '@playwright/test';
import { ALPHA, gotoApp, apiToken, apiGet } from './helpers/session';

/**
 * Journey 3 — Enrolment.
 *
 * The longest money form in the product, and the only one that ends in a
 * signature. Three things have to hold together: the price and the amount
 * taken, the agreement gate, and the arithmetic in between.
 *
 * The agreement is not decoration and the journey treats it as a gate: the
 * save happens on the sheet's Done button and nowhere else, so an enrolment
 * saved without a ticked box and a drawn signature would be an agreement
 * nobody made.
 */

type Client = {
  id: string;
  final_amount?: number | string | null;
  paid_amount?: number | string | null;
  balance_amount?: number | string | null;
  pt_start_date?: string | null;
  duration_months?: number | string | null;
};

const clientById = (token: string, id: string) =>
  apiGet<{ data?: Client }>(`/api/pt-os/clients/${id}`, token).then((b) => b.data!);

const num = (v: unknown) => Number(v ?? NaN);

function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Pick an option from the app's searchable select. */
async function choose(page: Page, label: string, option: string) {
  // The trigger is a button named for the field; the options appear under it.
  //
  // The option is matched by a regex rather than exactly: several carry a
  // decorative emoji beside the label, so the accessible name is "🏢 Offline"
  // rather than "Offline". The emoji is aria-hidden now, and the regex keeps
  // this working either way.
  await page.getByRole('button', { name: label, exact: true }).first().click();
  await page.getByRole('button', { name: new RegExp(`\\b${option}\\b`) }).last().click();
}

/** Draw on the signature canvas the way a finger would. */
async function sign(page: Page) {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('signature canvas has no box');
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.7, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.4, { steps: 8 });
  await page.mouse.up();
}

async function fillEnrolment(page: Page, opts: { final: string; paid: string }) {
  await page.getByLabel('PT Start Date').fill(inDays(1));
  await choose(page, 'PT Duration', '3 Months');
  await page.getByLabel('Final / Selling Price').fill(opts.final);
  await page.getByLabel('Amount Paid').fill(opts.paid);
  await choose(page, 'Training Mode', 'Offline');
  await page.getByLabel('Preferred Workout Time').fill('07:00');
  await choose(page, 'Sessions Per Week', '3 Sessions');
}

test.describe('Enrolment', () => {
  let token: string;

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    await gotoApp(page, `/pt-os/clients/${ALPHA.secondClientId}/enroll`);
    await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible({ timeout: 25_000 });
  });

  test('the money fields have names a screen reader can read', async ({ page }) => {
    // §11. These four drew their captions in a sibling element and passed
    // label="" to the input, so the <label> rendered empty: the two controls
    // that decide what a member is charged and what they have paid announced
    // themselves as blank.
    for (const name of ['PT Start Date', 'Final / Selling Price', 'Amount Paid', 'Balance / Due']) {
      await expect(page.getByLabel(name), name).toBeVisible();
    }
  });

  test('the agreement gates the save, and nothing is written before it', async ({ page }) => {
    const before = await clientById(token, ALPHA.secondClientId);

    let posted = 0;
    await page.route(`**/api/pt-os/clients/${ALPHA.secondClientId}`, (route) => {
      if (route.request().method() === 'PATCH') posted += 1;
      return route.continue();
    });

    await fillEnrolment(page, { final: '18,000', paid: '6,000' });
    await page.getByRole('button', { name: 'Finish' }).click();

    // The sheet opens; nothing has been written yet.
    const sheet = page.getByRole('dialog', { name: 'Digital agreement' });
    await expect(sheet).toBeVisible();
    await page.waitForTimeout(800);
    expect(posted, 'Finish opens the agreement, it does not save').toBe(0);

    // Both gates are real, and each alone is not enough.
    const done = sheet.getByRole('button', { name: /Tick the box|Sign to continue|^Done$/ });
    await expect(done).toBeDisabled();

    await sheet.getByRole('checkbox').check();
    await expect(done, 'ticked but unsigned is not an agreement').toBeDisabled();

    await sign(page);
    await expect(done).toBeEnabled();
    await done.click();

    // Now it saves, and the three numbers land as typed.
    await expect.poll(async () => num((await clientById(token, ALPHA.secondClientId)).final_amount),
      { timeout: 20_000 }).toBe(18000);

    const after = await clientById(token, ALPHA.secondClientId);
    expect(num(after.paid_amount), 'paid today').toBe(6000);
    expect(num(after.balance_amount), 'what the screen showed as due').toBe(12000);
    expect(num(after.duration_months)).toBe(3);
    expect(before.id).toBe(after.id);
  });

  test('an incomplete form does not reach the agreement', async ({ page }) => {
    // The agreement is the last gate, not the first: a client should sign the
    // finished terms, never a draft of them.
    await page.getByLabel('PT Start Date').fill(inDays(1));
    await page.getByRole('button', { name: 'Finish' }).click();

    await expect(page.getByRole('dialog', { name: 'Digital agreement' })).toHaveCount(0);
  });

  test('an enrolment for nothing is refused', async ({ page }) => {
    await page.getByLabel('PT Start Date').fill(inDays(1));
    await choose(page, 'PT Duration', '3 Months');
    await page.getByLabel('Final / Selling Price').fill('0');
    await page.getByLabel('Amount Paid').fill('0');
    await page.getByRole('button', { name: 'Finish' }).click();

    await expect(page.getByRole('dialog', { name: 'Digital agreement' })).toHaveCount(0);
  });

  test('taking more than the price is refused before the agreement', async ({ page }) => {
    await page.getByLabel('PT Start Date').fill(inDays(1));
    await choose(page, 'PT Duration', '3 Months');
    await page.getByLabel('Final / Selling Price').fill('5000');
    await page.getByLabel('Amount Paid').fill('9000');
    await page.getByRole('button', { name: 'Finish' }).click();

    await expect(page.getByRole('dialog', { name: 'Digital agreement' })).toHaveCount(0);
  });

  test('a server failure is reported and leaks nothing', async ({ page }) => {
    await page.route(`**/api/pt-os/clients/${ALPHA.secondClientId}`, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"error":"ERROR: deadlock detected on pt_clients at /srv/api/src/modules/pt-os/pt-os.routes.js:800"}',
          })
        : route.continue());

    await fillEnrolment(page, { final: '9000', paid: '1000' });
    await page.getByRole('button', { name: 'Finish' }).click();
    const sheet = page.getByRole('dialog', { name: 'Digital agreement' });
    await sheet.getByRole('checkbox').check();
    await sign(page);
    await sheet.getByRole('button', { name: /^Done$/ }).click();

    // The screen printed `HTTP 500 · undefined — <the body>` before this.
    await expect(page.getByText(/Could not save enrollment/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText('deadlock detected');
    await expect(page.locator('body')).not.toContainText('/srv/api/src');
    await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
  });
});
