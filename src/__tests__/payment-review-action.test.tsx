/**
 * The payment-review ActionDialog against a mocked API.
 *
 * The schema tests pin the rules; this file pins the call sites: approve sends
 * nothing, reject/correction send the parsed reason and trimmed note, two taps
 * in one frame still issue one mutation, and 409s keep their "refresh" wording.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { UpiQueueRow } from '@/lib/api';
import { ApiError } from '@/lib/http';

const mocks = vi.hoisted(() => ({
  pending: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  requestCorrection: vi.fn(),
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock('@/lib/api', () => ({
  api: {
    upiPayments: {
      pending: mocks.pending,
      approve: mocks.approve,
      reject: mocks.reject,
      requestCorrection: mocks.requestCorrection,
    },
  },
  PLAN_DURATION_MONTHS: {},
}));

import VerifyPaymentsPage from '@/app/(chrome)/finance/verify-payments/page';

const ROW: UpiQueueRow = {
  id: 'order-1',
  kind: 'membership',
  organization_id: 'org-1',
  order_no: 'UPI-1001',
  client_id: 'client-1',
  client_name: 'Asha Rao',
  plan_id: null,
  plan_name: 'Monthly',
  duration_months: 1,
  base_amount: '9000.00',
  gst_percent: '0',
  gst_amount: '0',
  total_amount: '9000.00',
  upi_id: 'studio@bank',
  merchant_name: 'Studio',
  status: 'VERIFICATION_PENDING',
  expires_at: '2026-10-20T10:00:00.000Z',
  notes: null,
  created_at: '2026-10-20T09:00:00.000Z',
  updated_at: '2026-10-20T09:00:00.000Z',
  client_mobile: null,
  client_email: null,
  client_photo_url: null,
  submission_id: 'sub-1',
  utr: '123456789012',
  screenshot_url: null,
  submission_notes: null,
  submitted_at: '2026-10-20T09:05:00.000Z',
  submission_status: 'VERIFICATION_PENDING',
  rejected_reason: null,
  rejected_note: null,
};

const STATS = {
  pending_count: 1,
  pending_amount: '9000.00',
  approved_today: 0,
  approved_today_amount: '0',
  total_collected: '0',
  rejected_today: 0,
};

beforeAll(() => {
  // jsdom has no matchMedia; PageHero reads it through framer-motion's
  // useReducedMotion. Report "no preference".
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterAll(() => { vi.unstubAllGlobals(); });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pending.mockResolvedValue({
    data: [ROW], total: 1, stats: STATS, reject_reasons: {},
  });
  mocks.approve.mockResolvedValue({
    data: { order: ROW, activation: { activated_to: null }, overpaid: 0 },
  });
  mocks.reject.mockResolvedValue({ data: { reason: 'PAYMENT_NOT_RECEIVED', note: null } });
  mocks.requestCorrection.mockResolvedValue({ data: { reason: 'PAYMENT_NOT_RECEIVED', note: null } });
});

async function openAction(rowButton: RegExp) {
  render(<VerifyPaymentsPage />);
  await screen.findByText('Asha Rao');
  fireEvent.click(screen.getByRole('button', { name: rowButton }));
  return screen.findByRole('dialog');
}

describe('the review dialog sends the action-specific request', () => {
  it('approves with the order id and no reason or note', async () => {
    const dialog = await openAction(/^approve$/i);
    fireEvent.click(within(dialog).getByRole('button', { name: /approve & activate/i }));

    await waitFor(() => expect(mocks.approve).toHaveBeenCalledWith('order-1'));
    expect(mocks.approve.mock.calls[0]).toHaveLength(1);
    expect(mocks.reject).not.toHaveBeenCalled();
    expect(mocks.requestCorrection).not.toHaveBeenCalled();
  });

  it('rejects with the selected reason and a trimmed note', async () => {
    const dialog = await openAction(/^reject$/i);
    fireEvent.click(within(dialog).getByLabelText('Amount mismatch'));
    fireEvent.change(within(dialog).getByLabelText(/note to the member/i), {
      target: { value: '  We received ₹9,000, not ₹10,620.  ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /^reject$/i }));

    await waitFor(() => expect(mocks.reject).toHaveBeenCalledWith(
      'order-1', 'AMOUNT_MISMATCH', 'We received ₹9,000, not ₹10,620.',
    ));
    expect(mocks.approve).not.toHaveBeenCalled();
    expect(mocks.requestCorrection).not.toHaveBeenCalled();
  });

  it('requests a correction through its own endpoint', async () => {
    const dialog = await openAction(/^ask to correct$/i);
    fireEvent.click(within(dialog).getByLabelText('Wrong UTR'));
    fireEvent.click(within(dialog).getByRole('button', { name: /send request/i }));

    await waitFor(() => expect(mocks.requestCorrection).toHaveBeenCalledWith(
      'order-1', 'WRONG_UTR', undefined,
    ));
    expect(mocks.approve).not.toHaveBeenCalled();
    expect(mocks.reject).not.toHaveBeenCalled();
  });

  it('blocks a note over 500 characters and shows the field error', async () => {
    const dialog = await openAction(/^reject$/i);
    fireEvent.change(within(dialog).getByLabelText(/note to the member/i), {
      target: { value: 'x'.repeat(501) },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /^reject$/i }));

    expect(await within(dialog).findByText(
      'Note to the member cannot be more than 500 characters (currently 501).',
    )).toBeTruthy();
    expect(mocks.reject).not.toHaveBeenCalled();
  });

  it('issues one request when the button is clicked twice in one frame', async () => {
    let settle!: (value: unknown) => void;
    mocks.reject.mockImplementationOnce(() => new Promise((resolve) => { settle = resolve; }));

    const dialog = await openAction(/^reject$/i);
    const confirm = within(dialog).getByRole('button', { name: /^reject$/i });
    act(() => { confirm.click(); confirm.click(); });

    expect(mocks.reject).toHaveBeenCalledTimes(1);
    settle({ data: { reason: 'PAYMENT_NOT_RECEIVED', note: null } });
    await waitFor(() => expect(mocks.reject).toHaveBeenCalledTimes(1));
  });
});

describe('the existing failure paths are unchanged', () => {
  it('adds the refresh hint to a 409', async () => {
    mocks.reject.mockRejectedValueOnce(
      new ApiError('This payment is already approved.', 409),
    );
    const dialog = await openAction(/^reject$/i);
    fireEvent.click(within(dialog).getByRole('button', { name: /^reject$/i }));

    expect(await within(dialog).findByText(
      'This payment is already approved. Refresh to see the current state.',
    )).toBeTruthy();
  });

  it('shows a server error without the 409 refresh hint', async () => {
    mocks.reject.mockRejectedValueOnce(new ApiError('Payment service unavailable.', 500));
    const dialog = await openAction(/^reject$/i);
    fireEvent.click(within(dialog).getByRole('button', { name: /^reject$/i }));

    expect(await within(dialog).findByText('Payment service unavailable.')).toBeTruthy();
    expect(within(dialog).queryByText(/Refresh to see the current state/)).toBeNull();
  });
});
