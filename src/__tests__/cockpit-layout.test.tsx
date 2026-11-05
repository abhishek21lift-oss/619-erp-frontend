// The cockpit's section order, and what survives when the roster sweep fails.
//
// Order is the design: the day's schedule, then the one thing to do, then the
// rest of the board, then who to call, then money. A reorder here is a product
// decision, so it is pinned in one place rather than inferred from source.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { signalsMock } = vi.hoisted(() => ({ signalsMock: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { name: 'Abhishek Katiyar', organization_name: 'MY PT STUDIO' } }),
}));
vi.mock('@/components/ui', () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/lib/api', () => ({ api: { pt: { signals: signalsMock } } }));

const dashData = {
  active_pt_clients: 12, expired_clients: 3, clients_with_balance: 2,
  overdue_clients: 0, total_monthly_pt_revenue: 90000, total_outstanding: 15000,
  today_collected: 0, today_payments: 0, revenueTrend: [],
};
const opsData = {
  today_sessions: [], today_unscheduled: [], renewals_due: [], top_dues: [],
  session_stats: { this_month_total: 0, this_month_completed: 0, last_month_completed: 0 },
  trainer_sessions: [],
};

vi.mock('@/lib/http', () => ({
  default: (url: string) => {
    if (url.startsWith('/api/pt-os/dashboard/ops')) return Promise.resolve({ data: opsData });
    if (url.startsWith('/api/pt-os/dashboard')) return Promise.resolve({ data: dashData });
    return Promise.resolve({ data: [] });
  },
}));

import PtOsDashboard from '@/components/dashboards/PtOsDashboard';

const SWEEP = { clients: 3, clients_with_signals: 0, critical: 0, not_assessable: 0, clients_detail: [] };

async function assertOrder(labels: (string | RegExp)[]) {
  // Each section has its own fetch. Waiting only for the first one made this
  // assertion race the rest; `findByText` waits for every label before the
  // order check, so a slow worker cannot turn a layout pass into a failure.
  const nodes = [];
  for (const l of labels) nodes.push(await screen.findByText(l, undefined, { timeout: 10_000 }));
  for (let i = 0; i < nodes.length - 1; i++) {
    const rel = nodes[i].compareDocumentPosition(nodes[i + 1]);
    expect(
      rel & Node.DOCUMENT_POSITION_FOLLOWING,
      `${String(labels[i])} should render before ${String(labels[i + 1])}`,
    ).toBeTruthy();
  }
}

describe('cockpit section order', () => {
  beforeEach(() => {
    signalsMock.mockReset();
    signalsMock.mockResolvedValue({ data: SWEEP });
  });

  it('orders the day: schedule, next action, board, who to call, money', async () => {
    render(<PtOsDashboard />);
    await screen.findByText('Active Clients', undefined, { timeout: 3000 });
    await assertOrder([
      /Today.s Sessions/i,
      'Next Best Action',
      'AI Coach',
      'Who to call',
      'Progress Radar',
      'This Month',
      'Key Metrics',
    ]);
  }, 30_000);

  it('keeps the rest of the cockpit when the roster sweep fails', async () => {
    signalsMock.mockRejectedValue(new Error('sweep down'));
    render(<PtOsDashboard />);
    // A full cockpit render under a loaded machine can outrun findBy's
    // one-second default; the assertion is about presence, not speed.
    await screen.findByText(/roster sweep did not come back/i, undefined, { timeout: 3000 });
    expect(screen.getByText('Next Best Action')).toBeTruthy();
    expect(screen.getByText('Active Clients')).toBeTruthy();
  });
});
