// The forecast page used to label `forecastRemaining / realisedYTD` a growth
// rate — with half the year on each side it reads near 100% although the model
// adds only 5% — and painted the still-incomplete current month as "Actual".
//
// This pins the labels, the unchanged 3-month +5% forecast, and the error
// state that used to look like a forecast of zero.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const monthly = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/lib/api', () => ({
  api: { insights: { monthly: (...args: unknown[]) => monthly(...args) } },
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
  PageHero: ({ title }: { title: string }) => <h1>{title}</h1>,
  KpiCard: ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) => (
    <div data-testid={`kpi-${label}`}>
      <span>{label}</span>
      <span>{value}</span>
      {hint && <span>{hint}</span>}
    </div>
  ),
}));

import RevenueForecastPage from '@/app/(chrome)/finance/forecast/page';

const rows = [
  { month_num: 1, revenue: 100000 },
  { month_num: 2, revenue: 200000 },
  { month_num: 3, revenue: 300000 },
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-03-15T10:00:00Z'));
  monthly.mockReset();
  monthly.mockResolvedValue(rows);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('<RevenueForecastPage />', () => {
  it('shows actual, month-to-date and forecast periods with the same 3-month +5% model', async () => {
    render(<RevenueForecastPage />);
    await screen.findByText('Realised YTD');

    // Last three actual months: Jan 1L, Feb 2L, Mar 3L → avg 2L, +5% = 2.1L
    // for each of Apr–Dec (9 months = 18.9L).
    expect(screen.getByTestId('kpi-Realised YTD').textContent).toContain('₹6,00,000');
    expect(screen.getByTestId('kpi-Forecast remaining').textContent).toContain('₹18,90,000');
    expect(screen.getByTestId('kpi-Projected full year').textContent).toContain('₹24,90,000');
    expect(screen.getByTestId('kpi-Forecast months').textContent).toContain('9');
  });

  it('labels the current month month-to-date and states the forecast basis', async () => {
    render(<RevenueForecastPage />);
    await screen.findByText('Realised YTD');

    expect(screen.getAllByText('Month to date').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Actual').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Forecast').length).toBeGreaterThan(0);
    expect(screen.getByText('Basis: 3-month average +5%')).toBeTruthy();

    // The old ratio was not a growth rate.
    expect(screen.queryByText(/Growth rate/i)).toBeNull();
  });

  it('explains what the figures count and excludes', async () => {
    render(<RevenueForecastPage />);
    await screen.findByText('Realised YTD');

    expect(screen.getByText(/Only completed payments are counted/)).toBeTruthy();
    expect(screen.getByText(/current month is month to date/i)).toBeTruthy();
  });

  it('shows a failed load as an error with retry, not as twelve zero rows', async () => {
    monthly.mockRejectedValueOnce(new Error('Network down'));
    render(<RevenueForecastPage />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Network down');
    expect(screen.queryByText('Jan 2026')).toBeNull();
    expect(screen.queryByText('Projected Full Year')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    await waitFor(() => expect(screen.getAllByText('Jan 2026').length).toBeGreaterThan(0));
    expect(screen.getAllByText('₹3,00,000').length).toBeGreaterThan(0);
  });
});
