import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const push = vi.fn();
let searchParams = new URLSearchParams();
const overview = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/api', () => ({
  api: { progress: { retest: { overview: (...args: unknown[]) => overview(...args) } } },
}));

import TrainerProgressPage from '@/app/(chrome)/pt-os/progress/page';

const ROSTER = {
  today: '2026-10-19',
  timezone: 'Asia/Kolkata',
  counts: { total: 1, missing_baseline: 0, not_scheduled: 0, upcoming: 0, due: 0, overdue: 1, rescheduled: 0 },
  clients: [{
    client_id: 'c1', name: 'Asha', email: 'asha@example.com', mobile: null,
    client_status: 'active', trainer_name: 'Coach Meera', assessment_count: 1,
    baseline_date: '2026-01-01', latest_date: '2026-10-01', latest_score: 62,
    schedule_id: 's1', scheduled_date: '2026-10-01', cadence_months: 4,
    schedule_status: 'overdue', rescheduled_from: null,
    state: { state: 'overdue', days_until: -18, label: 'Overdue by 18 days' },
  }],
  page: 1,
  limit: 20,
  total: 1,
  pages: 1,
};

beforeEach(() => {
  push.mockReset();
  searchParams = new URLSearchParams();
  overview.mockReset();
  overview.mockResolvedValue({ data: ROSTER });
});

describe('<TrainerProgressPage /> roster', () => {
  it('renders the server-derived state and refetches when a state chip is chosen', async () => {
    render(<TrainerProgressPage />);

    await screen.findByText('Asha');
    expect(screen.getByText(/18 days overdue/)).toBeTruthy();
    expect(screen.getByText(/1 assessment/)).toBeTruthy();
    expect(overview).toHaveBeenCalledWith({ search: '', status: 'all', page: 1, limit: 20 });

    fireEvent.click(screen.getByRole('button', { name: /^Overdue/ }));
    await waitFor(() => expect(overview).toHaveBeenLastCalledWith({
      search: '', status: 'overdue', page: 1, limit: 20,
    }));
  }, 15000);
});
