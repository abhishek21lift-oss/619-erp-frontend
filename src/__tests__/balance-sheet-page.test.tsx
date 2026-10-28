// The Balance Sheet reports client receivables. Its old header divided
// current-term fees by lifetime payments and called the result a collection
// rate, which exceeds 100% for any client who has renewed.
//
// This pins what the page may claim: the stored balances, the labelled period
// totals, and an error state that does not read as "all clear".
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const balanceSheet = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { pt: { balanceSheet: (...args: unknown[]) => balanceSheet(...args) } },
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: (_t, tag: string) => ({ children, ...rest }: Record<string, unknown>) =>
      React.createElement(tag, rest, children as React.ReactNode),
  }),
}));
vi.mock('@/components/ui', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHero: ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  KpiCard: ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) => (
    <div data-testid={`kpi-${label}`}>
      <span>{value}</span>
      {hint && <span>{hint}</span>}
    </div>
  ),
}));

import BalanceSheetPage from '@/app/(chrome)/pt-os/balance-sheet/page';

const rows = [
  {
    id: 'c1', name: 'Ana Silva', mobile: '9990001111', trainer_name: 'Ravi',
    package_type: '12 sessions', final_amount: 30000, paid_amount: 10000,
    balance_amount: 20000, due_status: 'OVERDUE', days_left: -10, status: 'active',
  },
  {
    id: 'c2', name: 'Ben Okafor', mobile: '9990002222', trainer_name: 'Ravi',
    package_type: '8 sessions', final_amount: 20000, paid_amount: 20000,
    balance_amount: 0, due_status: 'CLEAR', days_left: 20, status: 'active',
  },
  {
    id: 'c3', name: 'Cara Diaz', mobile: '9990003333', trainer_name: 'Meera',
    package_type: '6 sessions', final_amount: 15000, paid_amount: 5000,
    balance_amount: 10000, due_status: 'DUE', days_left: 15, status: 'inactive',
  },
];

beforeEach(() => {
  balanceSheet.mockReset();
  balanceSheet.mockResolvedValue({ data: rows, total: 3, total_outstanding: 30000 });
});

describe('<BalanceSheetPage />', () => {
  it('reports receivables from the stored client balances', async () => {
    render(<BalanceSheetPage />);
    await screen.findAllByText('Ana Silva');

    expect(screen.getByTestId('kpi-Outstanding').textContent).toContain('₹30,000');
    expect(screen.getByTestId('kpi-Clients with dues').textContent).toContain('2');
    expect(screen.getByTestId('kpi-Overdue').textContent).toContain('1');
    expect(screen.getByTestId('kpi-Average balance').textContent).toContain('₹15,000');
  });

  it('labels current-term billed and lifetime payments without deriving a rate', async () => {
    render(<BalanceSheetPage />);
    await screen.findAllByText('Ana Silva');

    expect(screen.getByText('Billed · current PT terms')).toBeTruthy();
    expect(screen.getByText('₹65,000')).toBeTruthy();
    expect(screen.getByText('Payments recorded · lifetime')).toBeTruthy();
    expect(screen.getByText('₹35,000')).toBeTruthy();

    // The old 54% was lifetime paid over current-term fees; it is not a rate.
    expect(screen.queryByText('Collection Rate')).toBeNull();
  });

  it('filters to overdue clients and preserves the filtered total', async () => {
    render(<BalanceSheetPage />);
    await screen.findAllByText('Ana Silva');

    fireEvent.click(screen.getByRole('button', { name: 'Overdue' }));

    expect(screen.getAllByText('Ana Silva').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cara Diaz')).toBeNull();
    expect(screen.getAllByText(/Filtered outstanding:/).length).toBeGreaterThan(0);
  });

  it('shows a load failure as an error with retry, not as an empty all-clear', async () => {
    balanceSheet.mockRejectedValueOnce(new Error('Network down'));
    render(<BalanceSheetPage />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Network down');
    expect(screen.queryByText(/all clear/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    await screen.findAllByText('Ana Silva');
  });
});
