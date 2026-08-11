// A dashboard that cannot load says so.
//
// DASHBOARD-AUDIT.md logged this as Critical #3 and it survived the report:
// the root rendered `{loading && !d && <Skeleton/>}` and `{d && <content/>}`
// and nothing else, so a failed fetch left BOTH branches false. The content
// area went blank — no skeleton, no message, no retry — and stayed blank.
// Indistinguishable from a studio with no data, on the screen every admin
// lands on after login.
//
// The failure mode is invisible in the happy path, which is why it shipped:
// every render test passed, because they all mock a resolving fetch. This one
// mocks a rejecting one. It is deliberately about behaviour rather than about
// wording, so the copy can be rewritten without touching this file.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { name: 'Abhishek Katiyar', organization_name: 'MY PT STUDIO' } }),
}));
vi.mock('@/components/ui', () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/** Flipped per-test so one module mock can serve both cases. */
let failing = true;

vi.mock('@/lib/http', () => ({
  default: (url: string) => {
    if (failing) return Promise.reject(new Error('Network request failed'));
    if (url.startsWith('/api/pt-os/dashboard/ops')) return Promise.resolve({ data: {} });
    if (url.startsWith('/api/pt-os/dashboard')) {
      return Promise.resolve({
        data: {
          active_pt_clients: 4, expired_clients: 3, clients_with_balance: 1,
          overdue_clients: 0, total_monthly_pt_revenue: 20000,
          total_monthly_commission: 5000, total_outstanding: 10000,
          today_collected: 0, today_payments: 0, trainers: [], revenueTrend: [],
        },
      });
    }
    return Promise.resolve({ data: [] });
  },
}));

import PtOsDashboard from '@/components/dashboards/PtOsDashboard';

describe('the dashboard when the API is down', () => {
  beforeEach(() => { failing = true; });

  it('shows an error with a retry instead of rendering nothing', async () => {
    const { container } = render(<PtOsDashboard />);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeTruthy();

    // The specific regression: a live retry affordance, not just a message.
    const retry = await screen.findByRole('button', { name: /try again/i });
    expect(retry).toBeTruthy();

    // And the thing that actually went wrong — the area was EMPTY. Text
    // length rather than a snapshot, so the copy stays free to change.
    expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(20);
  });

  it('does not show the error once data loads', async () => {
    failing = false;
    render(<PtOsDashboard />);

    await waitFor(() => expect(screen.getByText('Active Clients')).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
