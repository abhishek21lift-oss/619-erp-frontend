// Which KPIs the PT-OS dashboard shows, and which series each one carries.
//
// ── What has been removed, and why it stays removed ───────────────────────
//
// Net Revenue was PT Revenue minus Commission — two cards already sitting
// either side of it. Consent Signed was the only thing on the dashboard
// reading /api/pt-os/informed-consent, so that request went with it.
// Outstanding was the same figure Today's Revenue shows as Pending one
// section below, with the people it is owed by and a link into the dues list
// attached; a tile that repeats a number answered better further down the
// page is a tile spent saying something twice.
//
// ── The assertion that matters most ───────────────────────────────────────
//
// A tile's sparkline and its percentage badge must belong to that tile's
// metric. Active Clients used to render the REVENUE series and revenue's
// month-on-month percentage: "Active Clients 42 ↑12%" was reporting revenue
// growth under a client count. Both numbers were true, neither was about
// clients, and nothing in the rendering could give it away.
//
// There is no client series on this endpoint, so the honest render is a bare
// number — which is exactly the state a well-meaning later change would
// "fix" by handing it the only series available. Hence the test below.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const requested: string[] = [];

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { name: 'Abhishek Katiyar', organization_name: 'MY PT STUDIO' } }),
}));
vi.mock('@/components/ui', () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const dashData = {
  active_pt_clients: 12,
  expired_clients: 3,
  clients_with_balance: 2,
  total_monthly_pt_revenue: 90000,
  total_monthly_commission: 20000,
  total_outstanding: 15000,
  trainers: [],
  // Three months, which is the floor for drawing a sparkline at all — see
  // "too few months to be a shape" below.
  revenueTrend: [
    { label: 'May', month: '2026-05', revenue: 70000, incentives: 16000 },
    { label: 'Jun', month: '2026-06', revenue: 80000, incentives: 18000 },
    { label: 'Jul', month: '2026-07', revenue: 90000, incentives: 20000 },
  ],
};

const opsData = { today_sessions: [], today_unscheduled: [], renewals_due: [], overdue_payments: [] };

vi.mock('@/lib/http', () => ({
  default: (url: string) => {
    requested.push(url);
    if (url.startsWith('/api/pt-os/dashboard/ops')) return Promise.resolve({ data: opsData });
    if (url.startsWith('/api/pt-os/dashboard')) return Promise.resolve({ data: dashData });
    return Promise.resolve({ data: [] });
  },
}));

import PtOsDashboard from '@/components/dashboards/PtOsDashboard';

const FULL_TREND = [...dashData.revenueTrend];

describe('PT-OS dashboard KPIs', () => {
  beforeEach(() => {
    requested.length = 0;
    // One test trims the series to prove the floor; put it back.
    dashData.revenueTrend = [...FULL_TREND];
  });

  it('shows the three metrics that are on every screen size', async () => {
    render(<PtOsDashboard />);
    for (const label of ['Active Clients', 'PT Revenue', 'Retention']) {
      expect(await screen.findByText(label)).toBeTruthy();
    }
  });

  it('no longer offers advice under the revenue split', async () => {
    // "₹10,000 can be collected from 1 member" sat under Today's Revenue,
    // restating the two figures directly above it as a sentence. The card
    // already says what was collected, what is pending, and from how many
    // members; the strip was the same facts a second time in prose.
    render(<PtOsDashboard />);
    await screen.findByText('Active Clients');
    expect(screen.queryByText(/can be collected from/i)).toBeNull();
    expect(screen.queryByText(/Nothing outstanding/i)).toBeNull();
    expect(screen.queryByText(/No payments yet today/i)).toBeNull();
  });

  it('no longer shows Outstanding', async () => {
    render(<PtOsDashboard />);
    await screen.findByText('Active Clients');
    expect(screen.queryByText('Outstanding')).toBeNull();
  });

  it('keeps Commission on small screens but hides it on desktop', async () => {
    // Hidden with a breakpoint utility rather than dropped, so the card is
    // still in the DOM here — jsdom has no viewport to apply `lg:hidden`
    // against. Asserting the class is the only honest check at this level;
    // what it must NOT be is absent, which would mean it went from mobile too.
    render(<PtOsDashboard />);
    const commission = await screen.findByText('Commission');
    const card = commission.closest('.group');
    expect(card).toBeTruthy();
    expect(card!.className).toMatch(/lg:hidden/);
  });

  it('does not hide any of the metrics that should stay on desktop', async () => {
    render(<PtOsDashboard />);
    for (const label of ['Active Clients', 'PT Revenue', 'Retention']) {
      const card = (await screen.findByText(label)).closest('.group');
      expect(card!.className).not.toMatch(/lg:hidden/);
    }
  });

  it('gives a tile a sparkline only when the series is its own', async () => {
    // revenueTrend is the ONLY series this endpoint carries, and it is
    // revenue's. PT Revenue and Commission may draw it; Active Clients and
    // Retention have no series of their own and must draw nothing.
    render(<PtOsDashboard />);
    const bars = async (label: string) => {
      const card = (await screen.findByText(label)).closest('.group');
      return card!.querySelector('[role="img"]');
    };

    expect(await bars('PT Revenue')).not.toBeNull();
    expect(await bars('Commission')).not.toBeNull();
    expect(await bars('Active Clients')).toBeNull();
    expect(await bars('Retention')).toBeNull();
  });

  it('labels the sparkline it does draw with its own metric', async () => {
    // The accessible name is the guard against the two series being swapped:
    // both are six numbers in a row and look identical.
    render(<PtOsDashboard />);
    const card = (await screen.findByText('PT Revenue')).closest('.group');
    const chart = card!.querySelector('[role="img"]');
    expect(chart!.getAttribute('aria-label')).toMatch(/^PT Revenue,/);
    // dashData's revenue series, not its incentives series.
    expect(chart!.getAttribute('aria-label')).toContain('70000, 80000, 90000');
  });

  it('ends every card on the same band, charted or not', async () => {
    // The grid stretches all four cards to one height. Two of them have a
    // series and two never will, so without a matching band on the others
    // the row's bottom edge is level only by accident — and the two without
    // read as a number floating in a pool of white, which is how they looked
    // before this.
    render(<PtOsDashboard />);
    await screen.findByText('Active Clients');
    for (const label of ['Active Clients', 'PT Revenue', 'Commission', 'Retention']) {
      const card = (await screen.findByText(label)).closest('.group');
      expect(card!.querySelectorAll('[data-kpi-foot]'), `${label}'s foot`).toHaveLength(1);
    }
  });

  it('draws no sparkline at all on too few months to be a shape', async () => {
    // Two months render as two half-width slabs — one pale, one solid. That
    // is not a sparkline, it is a broken-looking pair of blocks, and it is
    // what every studio in its second month was shown. A shape needs three
    // readings before it is one.
    dashData.revenueTrend = dashData.revenueTrend.slice(-2);
    render(<PtOsDashboard />);
    const card = (await screen.findByText('PT Revenue')).closest('.group');
    expect(card!.querySelector('[role="img"]')).toBeNull();
    // The card still ends on the same band, so the grid stays level.
    expect(card!.textContent).toContain('₹90K');
  });

  it('gives Active Clients no percentage badge either', async () => {
    // The badge came from the same wrong series. A number with nothing under
    // it and nothing beside it is the honest render.
    render(<PtOsDashboard />);
    const card = (await screen.findByText('Active Clients')).closest('.group');
    expect(card!.textContent).not.toMatch(/%/);
  });

  it('no longer shows Net Revenue or Consent Signed', async () => {
    render(<PtOsDashboard />);
    // Wait for the grid to actually be on screen, so this cannot pass simply
    // because nothing has rendered yet.
    await screen.findByText('Active Clients');
    expect(screen.queryByText('Net Revenue')).toBeNull();
    expect(screen.queryByText('Consent Signed')).toBeNull();
  });

  it('stops fetching the consent list it no longer displays', async () => {
    render(<PtOsDashboard />);
    await screen.findByText('Active Clients');
    await waitFor(() => expect(requested.length).toBeGreaterThan(0));
    expect(requested.some((u) => u.includes('informed-consent'))).toBe(false);
  });
});
