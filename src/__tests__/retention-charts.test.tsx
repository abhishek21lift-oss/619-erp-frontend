// Week 2 retention charts: renewal donut + expiry bars, risk-band bars and
// the lead funnel.
//
// These assert the DATA each chart is handed, not the geometry — the chart
// components have their own tests. The point here is that the page passes the
// server's cohort/snapshot counts and does not re-derive them from the capped
// pipeline table or the visible rows.

import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const spies = vi.hoisted(() => ({ bar: vi.fn(), donut: vi.fn() }));

vi.mock('@/components/visualizations', () => ({
  PremiumBarChart: (props: Record<string, unknown>) => {
    spies.bar(props);
    return <div data-testid="bar-chart" />;
  },
  PremiumDonutChart: (props: Record<string, unknown>) => {
    spies.donut(props);
    return <div data-testid="donut-chart" />;
  },
  ChartDataTable: () => null,
  // Token names, not hexes: the palette guard scans tests too, and this test
  // cares which token was chosen, not what the token resolves to.
  semantic: { success: 'success', warning: 'warning', danger: 'danger', info: 'info' },
  series: ['series-0', 'series-1', 'series-2', 'series-3', 'series-4', 'series-5', 'series-6'],
  band: { best: 'band-best', good: 'band-good', mid: 'band-mid', poor: 'band-poor', worst: 'band-worst' },
}));

const apiMock = vi.hoisted(() => ({
  insights: { renewals: vi.fn(), renewalRows: vi.fn() },
  pt: {
    churnRisk: vi.fn(),
    markChurnFollowup: vi.fn(),
    churnInsight: vi.fn(),
    trainers: vi.fn(),
    leads: {
      list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), convert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api', () => ({ api: apiMock }));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui/PullToRefresh', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

import RenewalAnalysisPage from '@/app/(chrome)/insights/renewal/page';
import AtRiskClientsPage from '@/app/(chrome)/pt-os/clients/at-risk/page';
import LeadsPage from '@/app/(chrome)/pt-os/leads/page';

// framer-motion's reduced-motion hook reads this during render.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const lastProps = (spy: typeof spies.bar | typeof spies.donut) =>
  spy.mock.calls.at(-1)?.[0] as Record<string, unknown>;

const lead = (id: string, status: string) => ({
  id, name: `Lead ${id}`, status, source: 'other',
  mobile: null, email: null, interested_package: null,
  trainer_name: null, follow_up_date: null, notes: null, converted_at: null,
});

beforeEach(() => {
  spies.bar.mockClear();
  spies.donut.mockClear();
  for (const fn of [
    apiMock.insights.renewals, apiMock.insights.renewalRows,
    apiMock.pt.churnRisk, apiMock.pt.trainers, apiMock.pt.leads.list,
  ]) fn.mockReset();
});

describe('renewal page charts', () => {
  it('splits the server cohort, not the capped pipeline rows', async () => {
    apiMock.insights.renewals.mockResolvedValue({
      from: '2026-08-06', to: '2026-11-04',
      expired_cohort: 10, renewed_of_cohort: 4, renewed_in_period: 4,
      renewal_rate: 40, renewal_revenue: 0, renewal_transactions: 2,
      active: 50, expired: 3, expiring_7d: 2, expiring_30d: 7,
      active_share_pct: 94.3,
    });
    // The pipeline is deliberately empty: the charts must not read it.
    apiMock.insights.renewalRows.mockResolvedValue([]);

    render(<RenewalAnalysisPage />);

    await waitFor(() => expect(spies.donut).toHaveBeenCalled());
    const donut = lastProps(spies.donut);
    expect(donut.data).toEqual([
      { name: 'Renewed', value: 4, color: 'success' },
      { name: 'Lapsed', value: 6, color: 'danger' },
    ]);
    expect(donut.centerValue).toBe('40%');

    const bar = lastProps(spies.bar);
    expect(bar.data).toEqual([
      { bucket: 'Next 7 days', members: 2, color: 'danger' },
      { bucket: 'Days 8–30', members: 5, color: 'warning' },
    ]);
  });

  it('shows an empty state instead of a 0% ring when nothing expired', async () => {
    apiMock.insights.renewals.mockResolvedValue({
      from: '2026-08-06', to: '2026-11-04',
      expired_cohort: 0, renewed_of_cohort: 0, renewed_in_period: 0,
      renewal_rate: null, renewal_revenue: 0, renewal_transactions: 0,
      active: 10, expired: 0, expiring_7d: 0, expiring_30d: 0,
      active_share_pct: 100,
    });
    apiMock.insights.renewalRows.mockResolvedValue([]);

    render(<RenewalAnalysisPage />);

    await waitFor(() => expect(spies.donut).toHaveBeenCalled());
    expect(lastProps(spies.donut).emptyTitle).toBe('No expiries in this window');
    expect(lastProps(spies.bar).data).toEqual([]);
  });
});

describe('at-risk page chart', () => {
  it('draws the server bands, not a re-score of the visible rows', async () => {
    apiMock.pt.churnRisk.mockResolvedValue({
      data: {
        as_of: '2026-11-04', assessed: 20, flagged: 7,
        bands: { critical: 2, high: 3, medium: 1, low: 1 },
        rows: [], handled: [],
      },
    });

    render(<AtRiskClientsPage />);

    await waitFor(() => expect(spies.bar).toHaveBeenCalled());
    expect(lastProps(spies.bar).data).toEqual([
      { band: 'Critical', clients: 2, color: 'band-worst' },
      { band: 'High', clients: 3, color: 'band-poor' },
      { band: 'Medium', clients: 1, color: 'band-mid' },
      { band: 'Low', clients: 1, color: 'band-good' },
    ]);
  });
});

describe('leads page chart', () => {
  it('counts every lead by current stage', async () => {
    apiMock.pt.leads.list.mockResolvedValue({
      data: [
        lead('1', 'new'), lead('2', 'new'),
        lead('3', 'contacted'),
        lead('4', 'trial_scheduled'),
        lead('5', 'converted'), lead('6', 'converted'),
        lead('7', 'lost'),
      ],
      total: 7,
    });
    apiMock.pt.trainers.mockResolvedValue({ data: [] });

    render(<LeadsPage />);

    await waitFor(() => expect(spies.bar).toHaveBeenCalled());
    expect(lastProps(spies.bar).data).toEqual([
      { stage: 'New', leads: 2, color: 'info' },
      { stage: 'Contacted', leads: 1, color: 'series-0' },
      { stage: 'Trial', leads: 1, color: 'series-3' },
      { stage: 'Converted', leads: 2, color: 'success' },
      { stage: 'Lost', leads: 1, color: 'series-6' },
    ]);
  });
});
