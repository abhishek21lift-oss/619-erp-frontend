/**
 * "New payment request" — the dialog that raises a UPI order from the
 * verification queue.
 *
 * The schema tests pin the rules; this file pins the call site: the exact
 * create payload (client, plan or custom package, term, amount), that picking
 * a plan seeds the term and price, that typing a package name drops the plan
 * id, that two taps in one frame create one order, that an invalid form says
 * what is wrong instead of only disabling the button, that a failure keeps the
 * dialog open, and that reopening starts blank.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@/lib/http';

const mocks = vi.hoisted(() => ({
  pending: vi.fn(),
  create: vi.fn(),
  plans: vi.fn(),
  search: vi.fn(),
  push: vi.fn(),
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, back: vi.fn() }),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock('@/lib/api', () => ({
  api: {
    upiPayments: { pending: mocks.pending, create: mocks.create },
    membershipPlans: { list: mocks.plans },
    clients: { search: mocks.search },
  },
  PLAN_DURATION_MONTHS: { Monthly: 1, Quarterly: 3, 'Half Yearly': 6, Yearly: 12 },
}));

import VerifyPaymentsPage from '@/app/(chrome)/finance/verify-payments/page';

const STATS = {
  pending_count: 0,
  pending_amount: '0',
  approved_today: 0,
  approved_today_amount: '0',
  total_collected: '0',
  rejected_today: 0,
};

const CLIENT = { id: 'client-1', name: 'Asha Rao', mobile: '9876543210' };

const PLAN = {
  id: 'plan-1',
  kind: 'membership',
  name: 'Gold Quarterly',
  description: null,
  duration: 'Quarterly',
  final_amount: '9000.00',
  is_active: true,
};

beforeAll(() => {
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
  mocks.pending.mockResolvedValue({ data: [], total: 0, stats: STATS, reject_reasons: {} });
  mocks.plans.mockResolvedValue([PLAN]);
  mocks.search.mockResolvedValue([CLIENT]);
  mocks.create.mockResolvedValue({
    data: { order: { id: 'order-9' }, payment: {}, reused: false },
  });
});

async function openDialog() {
  render(<VerifyPaymentsPage />);
  fireEvent.click(await screen.findByRole('button', { name: /new request/i }));
  return screen.findByRole('dialog', { name: /new payment request/i });
}

async function pickMember(dialog: HTMLElement) {
  fireEvent.change(within(dialog).getByLabelText('Search members'), {
    target: { value: 'Asha' },
  });
  fireEvent.click(await within(dialog).findByRole('button', { name: /Asha Rao/ }));
}

async function fillCustom(dialog: HTMLElement) {
  await pickMember(dialog);
  fireEvent.change(within(dialog).getByLabelText('Package name'), {
    target: { value: 'Gold — 3 months' },
  });
  fireEvent.change(within(dialog).getByLabelText('Months'), { target: { value: '3' } });
  fireEvent.change(within(dialog).getByLabelText('Amount before GST'), {
    target: { value: '9000' },
  });
}

describe('the create-request dialog sends what it says it will', () => {
  it('sends a custom package with parsed numbers and no plan id', async () => {
    const dialog = await openDialog();
    await fillCustom(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: /create & show qr/i }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({
      client_id: 'client-1',
      plan_id: null,
      plan_name: 'Gold — 3 months',
      duration_months: 3,
      base_amount: 9000,
    }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/pay/order-9'));
  });

  it('seeds the term and price from a plan, and typing a name drops the plan id', async () => {
    const dialog = await openDialog();
    await pickMember(dialog);

    fireEvent.change(within(dialog).getByLabelText('Plan'), {
      target: { value: 'plan-1' },
    });
    expect(within(dialog).getByLabelText('Package name')).toHaveValue('Gold Quarterly');
    expect(within(dialog).getByLabelText('Months')).toHaveValue('3');
    expect(within(dialog).getByLabelText('Amount before GST')).toHaveValue('9000');

    fireEvent.change(within(dialog).getByLabelText('Package name'), {
      target: { value: 'Custom — 1 month' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /create & show qr/i }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({
      client_id: 'client-1',
      plan_id: null,
      plan_name: 'Custom — 1 month',
      duration_months: 3,
      base_amount: 9000,
    }));
  });
});

describe('the dialog cannot raise two orders for one tap', () => {
  it('issues one create when the button is clicked twice in one frame', async () => {
    let settle!: (value: unknown) => void;
    mocks.create.mockImplementationOnce(
      () => new Promise((resolve) => { settle = resolve; }),
    );

    const dialog = await openDialog();
    await fillCustom(dialog);
    const confirm = within(dialog).getByRole('button', { name: /create & show qr/i });

    act(() => { confirm.click(); confirm.click(); });

    // The form validates asynchronously before it writes, so wait for the
    // first write rather than asserting in the same tick as the clicks.
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    settle({ data: { order: { id: 'order-9' }, payment: {}, reused: false } });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/pay/order-9'));
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});

describe('failure is visible, not silent', () => {
  it('reports the fields the schema rejected instead of only disabling the button', async () => {
    const dialog = await openDialog();
    await pickMember(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: /create & show qr/i }));

    expect(await within(dialog).findByText('Package name is required.')).toBeTruthy();
    expect(within(dialog).getByText('Amount before GST is required.')).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and shows the server error', async () => {
    mocks.create.mockRejectedValueOnce(new ApiError('Payment service unavailable.', 500));

    const dialog = await openDialog();
    await fillCustom(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: /create & show qr/i }));

    expect(await within(dialog).findByText(/server had a problem saving this/i)).toBeTruthy();
    expect(screen.getByRole('dialog', { name: /new payment request/i })).toBeTruthy();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});

describe('reopening starts from a blank request', () => {
  it('does not carry the previous member, package or amount over', async () => {
    const first = await openDialog();
    await fillCustom(first);
    fireEvent.click(within(first).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /new request/i }));
    const second = await screen.findByRole('dialog', { name: /new payment request/i });

    expect(within(second).getByLabelText('Package name')).toHaveValue('');
    expect(within(second).getByLabelText('Amount before GST')).toHaveValue('');
    expect(within(second).getByLabelText('Months')).toHaveValue('1');
    expect(within(second).getByLabelText('Search members')).toHaveValue('');
  });
});
