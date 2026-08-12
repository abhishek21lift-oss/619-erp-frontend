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
// every other render test mocks a resolving fetch, so they all passed
// throughout. This one mocks a rejecting fetch.
//
// Deliberately about behaviour rather than wording — the copy can be
// rewritten without touching this file. What it pins is that SOMETHING with
// an alert role and a working retry appears, and that it does not appear when
// the data loads normally.

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

    expect(await screen.findByRole('alert')).toBeTruthy();

    // The specific regression: a live retry affordance, not just a message.
    expect(await screen.findByRole('button', { name: /try again/i })).toBeTruthy();

    // And the thing that actually went wrong — the area was EMPTY. Asserted on
    // text length rather than a snapshot so the copy stays free to change.
    expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(20);
  });

  it('does not show the error once data loads', async () => {
    failing = false;
    render(<PtOsDashboard />);

    await waitFor(() => expect(screen.getByText('Active Clients')).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

// The other half of the same class of bug, and the one that actually took the
// screen down in practice.
//
// AICoach passes the birthdays list to buildCoachInsights, which calls
// .filter on it. The call site used `?? []`, which only catches undefined —
// so any OTHER wrong shape reached .filter and threw, and because that throw
// happens during render of the dashboard subtree, the whole screen went to
// the error boundary rather than just that card.
describe('a malformed birthdays payload', () => {
  it('costs the AI Coach card, not the whole dashboard', async () => {
    failing = false;
    // Rebind http so /clients/birthdays returns an object where the component
    // expects an array — exactly what a mis-ordered route serves.
    vi.resetModules();
    vi.doMock('@/lib/http', () => ({
      default: (url: string) => {
        if (url.startsWith('/api/pt-os/clients/birthdays')) {
          return Promise.resolve({ data: { id: 'c-1', name: 'Not An Array' } });
        }
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

    const { default: Dash } = await import('@/components/dashboards/PtOsDashboard');
    render(<Dash />);

    // The dashboard still renders. Before the guard this threw
    // "t.filter is not a function" during render.
    await waitFor(() => expect(screen.getByText('Active Clients')).toBeTruthy());
  });
});
