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
  revenueTrend: [
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

describe('PT-OS dashboard KPIs', () => {
  beforeEach(() => { requested.length = 0; });

  it('shows the three metrics that are on every screen size', async () => {
    render(<PtOsDashboard />);
    for (const label of ['Active Clients', 'PT Revenue', 'Retention']) {
      expect(await screen.findByText(label)).toBeTruthy();
    }
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
    expect(chart!.getAttribute('aria-label')).toContain('80000, 90000');
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
