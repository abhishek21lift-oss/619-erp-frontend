import { test, expect, type Page } from '@playwright/test';
import { ALPHA, apiGet, apiPost, apiToken, gotoApp } from './helpers/session';

/**
 * Journey — the trainer sends a client a renewal offer.
 *
 * The offer's months and price are what the member is asked to pay by UPI and
 * what approval turns into their next term, so a value that arrives wrong here
 * is charged wrong. Read back from the API, not from the screen.
 */

type Offer = { id: string; kind: string; status: string; duration_months: number; base_amount: string; total_amount: string; plan_name: string; notes: string | null };

async function liveOffer(token: string): Promise<Offer | null> {
  const body = await apiGet<{ data: { order: Offer | null } }>(
    `/api/payments/upi/renewal-offers?client_id=${encodeURIComponent(ALPHA.clientId)}`, token);
  return body.data.order;
}

const sheet = (page: Page) => page.getByRole('dialog', { name: 'Send renewal offer' });

test.describe('Renewal offer — trainer to member', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);
  let token: string;

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    await gotoApp(page, `/pt-os/clients/${ALPHA.clientId}`);
    await page.getByRole('button', { name: 'Renewal offer' }).click();
    await expect(sheet(page)).toBeVisible();
  });

  test.afterAll(async () => {
    const t = await apiToken();
    const open = await liveOffer(t);
    if (open && open.status !== 'VERIFICATION_PENDING') await apiPost(`/api/payments/upi/${open.id}/cancel`, t, {});
  });

  test('an offer reaches the database with its months, price and note', async ({ page }) => {
    const s = sheet(page);
    await s.getByRole('radio', { name: '3 months' }).click();
    await s.getByLabel(/^Price/).fill('24000');
    await s.getByLabel(/^Package name/).fill('PT — 3 months');
    await s.getByLabel(/^Note to the client/).fill('Same price as last time');
    await s.getByRole('button', { name: /^Send (new )?offer$/ }).click();

    await expect(s.getByText(/Offer sent — ₹24,000/)).toBeVisible({ timeout: 15_000 });
    const offer = await liveOffer(token);
    expect(offer).toMatchObject({
      kind: 'renewal', status: 'CREATED', duration_months: 3, plan_name: 'PT — 3 months', notes: 'Same price as last time',
    });
    expect(Number(offer!.base_amount)).toBe(24000);
  });

  test('the sheet shows the live offer, and a new one replaces it', async ({ page }) => {
    const s = sheet(page);
    await expect(s.getByText('Offer sent, not paid yet')).toBeVisible({ timeout: 15_000 });
    const before = await liveOffer(token);

    await s.getByRole('radio', { name: '1 month' }).click();
    await s.getByLabel(/^Price/).fill('9000');
    await s.getByRole('button', { name: 'Send new offer' }).click();
    await expect(s.getByText(/Offer sent — ₹9,000/)).toBeVisible({ timeout: 15_000 });

    const after = await liveOffer(token);
    expect(after!.id).not.toBe(before!.id);
    expect(after).toMatchObject({ duration_months: 1 });
    expect(Number(after!.base_amount)).toBe(9000);
  });

  test('a missing price is refused next to the field, and nothing is sent', async ({ page }) => {
    const s = sheet(page);
    const before = await liveOffer(token);
    await s.getByLabel(/^Price/).fill('');
    await s.getByRole('button', { name: /^Send (new )?offer$/ }).click();
    await expect(s.getByText('Enter the price.')).toBeVisible();
    expect((await liveOffer(token))?.id).toBe(before?.id);
  });
});
