// Which KPIs the PT-OS dashboard shows.
//
// Net Revenue and Consent Signed were removed. Net Revenue was PT Revenue
// minus Commission — two cards that were already on the row either side of it
// — and Consent Signed was the only thing on the dashboard reading
// /api/pt-os/informed-consent, so that request went with it rather than being
// left to load a list nothing renders.
//
// The grid dropped from six columns to five so the remaining cards fill the
// row instead of leaving a hole where Net Revenue used to be.
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

  it('no longer repeats Outstanding, which Today\'s Revenue already carries', async () => {
    // The same ₹10K was on screen four times: this card, the "Pending" half of
    // Today's Revenue, the AI Coach's "₹10K due" row, and that card's own
    // insight line. Only one of those can be acted on, so only one survives —
    // Pending, which names the members and links to the dues list.
    //
    // Asserted as an absence because a metric quietly returning is exactly the
    // kind of change nobody notices in review.
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
