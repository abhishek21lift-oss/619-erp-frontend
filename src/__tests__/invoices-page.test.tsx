// The invoice list used to be typed against five statuses, one of which
// (`pending`) is not stored by the API, while two that are stored (`sent`,
// `partial`) crashed the card because they had no colour config. The KPI
// labelled "Total Invoiced" also formatted a COUNT as money.
//
// This pins the screen to the six real statuses and to the actions that have
// a handler behind them.
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const list = vi.fn();
const markPaid = vi.fn();
const toast = vi.hoisted(() => ({
  success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    invoices: {
      list: (...args: unknown[]) => list(...args),
      markPaid: (...args: unknown[]) => markPaid(...args),
    },
  },
}));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: new Proxy({}, {
    get: (_t, tag: string) => ({ children, ...rest }: Record<string, unknown>) =>
      React.createElement(tag, rest, children as React.ReactNode),
  }),
}));
vi.mock('@/components/premium/PremiumModal', () => ({ PremiumModal: () => null }));
vi.mock('@/components/ui', () => {
  const strip = ({ variant, size, accent, icon, ...rest }: Record<string, unknown>) => {
    // Keep the mock's DOM clean: these are presentation props, not attributes.
    void variant; void size; void accent; void icon;
    return rest;
  };
  return {
    KpiCard: ({ label, value }: { label: string; value: React.ReactNode }) => (
      <div data-testid={`kpi-${label}`}>{value}</div>
    ),
    PageContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PageHero: ({ title, children }: { title: string; children?: React.ReactNode }) => (
      <div>
        <h1>{title}</h1>
        {children}
      </div>
    ),
    Button: ({ children, iconLeft, ...rest }: Record<string, unknown>) => (
      <button {...(strip(rest) as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
        {iconLeft as React.ReactNode}
        {children as React.ReactNode}
      </button>
    ),
  };
});

import InvoicesPage from '@/app/(chrome)/finance/invoices/page';

beforeAll(() => {
  // jsdom ships no matchMedia; the page and its cards read a breakpoint.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

const rows = [
  {
    id: 'INV-1', client_name: 'Ana Silva', amount: 1200,
    issue_date: '2026-10-01', due_date: '2026-10-08',
    status: 'sent', notes: 'October block',
  },
  {
    id: 'INV-2', client_name: 'Ben Okafor', amount: 800,
    issue_date: '2026-10-02', due_date: '2026-10-09',
    status: 'partial', notes: 'Deposit paid',
  },
  {
    id: 'INV-3', client_name: 'Cara Diaz', amount: 500,
    issue_date: '2026-10-03', due_date: '2026-10-10',
    status: 'paid', notes: '',
  },
  {
    id: 'INV-4', client_name: 'Dev Patel', amount: 4321,
    issue_date: '2026-10-04', due_date: '2026-10-11',
    status: 'paid', notes: 'UPI approval', payment_method: 'UPI',
  },
];

beforeEach(() => {
  list.mockReset();
  markPaid.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  list.mockResolvedValue({
    invoices: rows,
    stats: { total: 3, paid: 500, pending: 2000, overdue: 0 },
  });
  markPaid.mockResolvedValue({ message: 'ok', invoice: {} });
});

async function renderPage() {
  render(<InvoicesPage />);
  await screen.findByText('Ana Silva');
}

describe('<InvoicesPage />', () => {
  it('shows the invoice count as a number, not as money', async () => {
    await renderPage();

    expect(screen.getByTestId('kpi-Invoices').textContent).toBe('3');
    expect(screen.queryByText('₹3')).toBeNull();
  });

  it('renders the stored sent and partial statuses instead of crashing', async () => {
    await renderPage();

    // Both cards used to read a colour config that had no entry for these
    // statuses, which threw before the row could paint.
    expect(screen.getByText('Ana Silva')).toBeTruthy();
    expect(screen.getByText('Ben Okafor')).toBeTruthy();
    expect(screen.getAllByText('Sent').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Partial').length).toBeGreaterThan(0);
  });

  it('renders an uppercase payment method instead of crashing the finance route', async () => {
    // The UPI approval path writes `UPI`, while the invoice form writes `upi`.
    // Looking the raw value up in the lowercase icon map threw
    // `undefined.label`, and the route-level error boundary replaced all of
    // finance with "This part of the app failed to load".
    await renderPage();

    expect(screen.getByText('Dev Patel')).toBeTruthy();
    expect(screen.getByText('UPI')).toBeTruthy();
  });

  it('reads issue_date and the notes fallback so cards are not blank', async () => {
    await renderPage();

    expect(screen.getByText('2026-10-01')).toBeTruthy();
    expect(screen.getByText('October block')).toBeTruthy();
    expect(screen.getByText('Deposit paid')).toBeTruthy();
  });

  it('offers one filter per stored status and no pending filter', async () => {
    await renderPage();

    for (const label of ['Draft', 'Sent', 'Partial', 'Paid', 'Overdue', 'Cancelled']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    // `pending` is a stats bucket (draft+sent+partial), not a value the API
    // accepts as a list filter; sending it matched no rows.
    expect(screen.queryByRole('button', { name: 'Pending' })).toBeNull();
  });

  it('filters by a stored status when a tab is pressed', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Sent' }));

    await waitFor(() => {
      expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'sent' }));
    });
  });

  it('marks an invoice paid from the card menu and refreshes the list', async () => {
    await renderPage();
    const menuButtons = screen.getAllByRole('button', { name: 'More invoice actions' });
    fireEvent.click(menuButtons[0]);

    fireEvent.click(screen.getByText('Mark as Paid'));

    await waitFor(() => expect(markPaid).toHaveBeenCalledWith('INV-1'));
    expect(toast.success).toHaveBeenCalledWith('Invoice marked as paid');
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it('does not offer Mark as Paid on an already-paid invoice', async () => {
    await renderPage();
    const menuButtons = screen.getAllByRole('button', { name: 'More invoice actions' });
    fireEvent.click(menuButtons[2]);

    expect(screen.getByText('View Details')).toBeTruthy();
    expect(screen.queryByText('Mark as Paid')).toBeNull();
  });
});
