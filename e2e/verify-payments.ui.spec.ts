import { test, expect } from '@playwright/test';
import { ALPHA, gotoApp, apiToken, apiGet, apiPost } from './helpers/session';

/**
 * Verify UPI payments — the queue where a claimed transfer becomes money.
 *
 * The pending row is arranged through the API because the form under test is
 * the trainer's approval, not the member's UTR submission. Approval is the
 * irreversible half: it activates a membership, writes the finance ledger row
 * and issues a receipt. The assertions read the order, submission and
 * activation back through the API after the dialog says it succeeded, so a
 * toast alone cannot pass.
 *
 * The plan name and UTR are unique per run. `createOrder` deliberately reuses
 * an open order for the same client and plan, and a reused pending order would
 * already carry a submission — the next run would then fail on a duplicate
 * reference rather than on the screen.
 */

type Created = { data: { order: { id: string; total_amount: string } } };
type Detail = {
  data: {
    order: { status: string; total_amount: string };
    submissions: Array<{ utr: string; status: string }>;
    activation: { receipt_no: string; activated_to: string | null } | null;
  };
};

const AMOUNT = 4321;
const inr = (value: string | number) =>
  Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

test.describe('Verify UPI payments', () => {
  test.setTimeout(90_000);

  let token: string;
  let orderId: string;
  let utr: string;
  let total: string;

  test.beforeEach(async ({ page }) => {
    token = await apiToken();

    // The server accepts 12–16 digits. Timestamp plus two random digits keeps
    // it unique across runs without depending on a fixture row.
    utr = `${String(Date.now()).slice(-12)}${String(Math.floor(Math.random() * 90) + 10)}`;
    const stamp = Date.now();
    const planName = `E2E verify ${stamp}-${Math.floor(Math.random() * 1000)}`;

    const created = await apiPost<Created>('/api/payments/upi/create', token, {
      client_id: ALPHA.secondClientId,
      plan_name: planName,
      duration_months: 1,
      base_amount: AMOUNT,
      notes: 'Arranged by e2e/verify-payments.ui.spec.ts',
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    orderId = created.body.data.order.id;
    // GST is applied server-side from the studio's settings, so the queue's
    // amount is the stored total, not the base figure this test posted.
    total = created.body.data.order.total_amount;

    const submitted = await apiPost(`/api/payments/upi/${orderId}/submit-utr`, token, {
      utr,
      notes: 'E2E verification fixture',
    });
    expect(submitted.status, JSON.stringify(submitted.body)).toBe(201);

    await gotoApp(page, '/finance/verify-payments');
  });

  test('approving a pending UTR activates the membership and is readable through the API', async ({ page }) => {
    // Search for the reference so the row is found even when other pending
    // payments share the first page.
    await page.getByLabel('Search payments').fill(utr);
    const row = page.getByRole('article').filter({ hasText: utr });
    await expect(row).toBeVisible({ timeout: 25_000 });
    await expect(row).toContainText('ALPHA-ONLY-CLIENT-TWO');
    await expect(row).toContainText(inr(total));

    await row.getByRole('button', { name: 'Approve', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Approve this payment?' });
    await expect(dialog).toBeVisible();
    // The confirmation restates what is being approved, not just "are you sure".
    await expect(dialog).toContainText(utr);
    await expect(dialog).toContainText(inr(total));

    await dialog.getByRole('button', { name: 'Approve & activate' }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    const detail = await readDetail();
    expect(detail.order.status, 'the order is approved').toBe('APPROVED');
    expect(detail.submissions.find((s) => s.utr === utr)?.status, 'the UTR is approved').toBe('APPROVED');
    expect(detail.activation?.receipt_no, 'a receipt was issued').toBeTruthy();
    expect(detail.activation?.activated_to, 'the membership window was extended').toBeTruthy();
    expect(detail.order.total_amount, 'the approved amount is the stored amount').toBe(total);

    // The pending queue no longer offers it.
    await expect(page.getByRole('article').filter({ hasText: utr })).toBeHidden();
  });

  async function readDetail(): Promise<Detail['data']> {
    return (await apiGet<Detail>(`/api/payments/upi/${orderId}/status`, token)).data;
  }
});
