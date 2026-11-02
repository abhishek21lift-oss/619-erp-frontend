import { test, expect } from '@playwright/test';
import {
  ALPHA, API_URL, PLATFORM, PLATFORM_STORAGE_STATE,
  apiGet, apiPost, apiToken,
} from './helpers/session';

/**
 * Subscription self-checkout — the operator's payee, the studio's UTR, the
 * operator's approval.
 *
 * This is the one money flow where BOTH ends are forms the audit cares about:
 * `platform/subscription-requests.tsx` is where the operator switches
 * self-checkout on and later approves the claim, and the bare checkout page is
 * where the studio enters the bank reference. The journey drives all three
 * through the UI and reads the activation back through the API, so a toast
 * alone cannot pass.
 *
 * The studio is frozen first through the platform API. That is a precondition,
 * not the act under test: it makes the "Choose a plan to reactivate" path
 * deterministic on a database that has already been through this journey, and
 * it keeps a leftover AWAITING_VERIFICATION request from a previous failed run
 * from preventing a fresh checkout. The act under test is still typing into the
 * two forms.
 */

const APP_URL = process.env.E2E_APP_URL ?? 'http://127.0.0.1:3101';

type Plan = { code: string; effective_price_inr: number };
type Plans = { data: { plans: Plan[] } };
type CheckoutList = { data: Array<{ id: string; plan_code: string; status: string }> };
type CheckoutDetail = {
  data: {
    request: {
      id: string; status: string; utr: string | null;
      plan_code: string; amount_inr: number; request_no: string;
    };
    payment: unknown;
  };
};
type Status = {
  data: { subscription_status: string; plan: { code: string } | null; allowed: boolean };
};

/** A platform token for the freeze precondition and the read-back. */
async function platformToken(): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...PLATFORM, portal: 'platform' }),
  });
  const body = await res.json() as { token?: string };
  if (!body.token) throw new Error(`platform login failed: ${JSON.stringify(body).slice(0, 200)}`);
  return body.token;
}

test.describe('Subscription self-checkout', () => {
  test.setTimeout(180_000);

  test('operator enables UPI, studio submits a UTR, operator approves, plan activates', async ({ page, browser }) => {
    page.setDefaultNavigationTimeout(90_000);
    const token = await apiToken();
    const platform = await platformToken();

    // Freeze Alpha so the billing page always offers a plan to pay for. This
    // also retires any open request left by an interrupted run.
    const frozen = await apiPost(
      `/api/platform/organizations/${ALPHA.orgId}/subscription/freeze`,
      platform,
      { reason: 'E2E subscription checkout precondition' },
    );
    expect(frozen.status, JSON.stringify(frozen.body)).toBe(200);

    // The plan to buy: Starter unless an open request already owns it, in
    // which case Growth retires that request and opens a new one.
    const plans = (await apiGet<Plans>('/api/subscription/plans', token)).data.plans;
    const open = (await apiGet<CheckoutList>('/api/subscription/checkout', token)).data
      .find((r) => r.status === 'AWAITING_PAYMENT' || r.status === 'AWAITING_VERIFICATION');
    const planIndex = open?.plan_code === plans[0].code ? 1 : 0;
    const plan = plans[planIndex];

    const platformContext = await browser.newContext({
      baseURL: APP_URL,
      storageState: PLATFORM_STORAGE_STATE,
    });

    try {
      const operator = await platformContext.newPage();
      operator.setDefaultNavigationTimeout(90_000);

      // ── 1. The operator turns self-checkout on through the real dialog ──
      await operator.goto('/platform?tab=payments');
      await operator.getByRole('button', { name: 'My UPI' }).click();

      const settings = operator.getByRole('dialog', { name: 'Your UPI details' });
      await expect(settings).toBeVisible({ timeout: 20_000 });
      await settings.getByLabel('Your UPI ID').fill('myptstudio@okhdfcbank');
      await settings.getByLabel('Name studios will see').fill('MY PT STUDIO E2E');

      const toggle = settings.getByRole('switch', { name: 'Enable self-checkout' });
      if ((await toggle.getAttribute('aria-checked')) !== 'true') {
        await toggle.click();
      }
      await expect(toggle).toHaveAttribute('aria-checked', 'true');

      await settings.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(settings).toBeHidden({ timeout: 20_000 });

      // ── 2. The studio pays from its billing page ────────────────────────
      await page.goto('/subscription');
      await expect(page.getByRole('heading', { name: 'Choose a plan to reactivate' })).toBeVisible({ timeout: 30_000 });

      const payButtons = page.getByRole('button', { name: /^Pay ₹/ });
      await expect(payButtons.nth(planIndex)).toBeVisible({ timeout: 20_000 });

      // startCheckout opens a popup synchronously, then points it at the
      // request URL. Fall back to the same tab when the popup is blocked.
      const popupPromise = page.waitForEvent('popup', { timeout: 20_000 }).catch(() => null);
      await payButtons.nth(planIndex).click();
      const checkout = (await popupPromise) ?? page;
      checkout.setDefaultNavigationTimeout(90_000);
      await checkout.waitForURL(/\/subscription\/checkout\/[^/?#]+/, { timeout: 30_000 });

      const requestId = new URL(checkout.url()).pathname.split('/').filter(Boolean).pop()!;
      expect(requestId).toBeTruthy();

      const utr = `${String(Date.now()).slice(-12)}${String(Math.floor(Math.random() * 90) + 10)}`;
      await expect(checkout.getByRole('heading', { name: /Scan & pay with any UPI app/ })).toBeVisible({ timeout: 20_000 });
      await checkout.getByLabel(/UPI reference number \(UTR\)/).fill(utr);
      await checkout.getByLabel(/Note \(optional\)/).fill('E2E subscription checkout');

      await checkout.getByRole('button', { name: /Submit for verification/ }).click();
      await expect(checkout.getByText(/We’re verifying your payment|We're verifying your payment/)).toBeVisible({ timeout: 20_000 });
      await expect(checkout.getByText(utr)).toBeVisible();

      // ── 3. The operator approves it from the queue ──────────────────────
      await operator.reload();
      const search = operator.getByLabel('Search payment requests');
      await search.fill(utr);

      const row = operator.getByRole('article').filter({ hasText: utr });
      await expect(row).toBeVisible({ timeout: 25_000 });
      await expect(row).toContainText('Alpha Studio');
      await expect(row).toContainText(plan.code, { ignoreCase: true });

      await row.getByRole('button', { name: 'Approve & activate' }).click();
      const confirm = operator.getByRole('dialog', { name: 'Approve and activate?' });
      await expect(confirm).toBeVisible();
      await expect(confirm).toContainText(utr);
      await confirm.getByRole('button', { name: 'Approve & activate' }).click();
      await expect(confirm).toBeHidden({ timeout: 20_000 });
      await expect(operator.getByRole('article').filter({ hasText: utr })).toBeHidden({ timeout: 20_000 });

      // ── 4. The studio's page settles, and the API proves what happened ──
      await checkout.reload();
      await expect(checkout.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible({ timeout: 20_000 });

      const detail = (await apiGet<CheckoutDetail>(`/api/subscription/checkout/${requestId}`, token)).data;
      expect(detail.request.status, 'the request is approved').toBe('APPROVED');
      expect(detail.request.utr, 'the UTR typed into the form is what was stored').toBe(utr);
      expect(detail.request.plan_code, 'the paid plan is the chosen plan').toBe(plan.code);

      const status = (await apiGet<Status>('/api/subscription/status', token)).data;
      expect(status.subscription_status, 'the studio is active').toBe('active');
      expect(status.allowed, 'the studio is no longer blocked').toBe(true);
      expect(status.plan?.code, 'the active plan is the paid plan').toBe(plan.code);
    } finally {
      await platformContext.close();
    }
  });
});
