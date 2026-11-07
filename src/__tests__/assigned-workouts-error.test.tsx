// A failed read on Assigned Workouts must say so. It used to toast and then
// render "No programmes assigned yet", which reads as a fact about the client
// and sends a trainer to assign a second plan to someone who already has one.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Suspense } from 'react';

const mocks = vi.hoisted(() => ({ list: vi.fn(), retire: vi.fn() }));

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/api', () => ({
  api: { workouts: { assignments: { list: mocks.list, retire: mocks.retire } } },
}));
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }),
}));

import AssignedWorkoutsPage from '@/app/(chrome)/pt-os/clients/[id]/training/assigned/page';

const ROW = {
  id: 'a1',
  plan_name: 'Full Body A',
  status: 'active',
  duration_weeks: 4,
  sessions_per_week: 3,
  start_date: '2026-01-01',
  end_date: null,
  progress_pct: 50,
  workout_plan_id: 'p1',
};

beforeEach(() => { vi.clearAllMocks(); });

// The page unwraps `params` with use(), which suspends on the first render.
const renderPage = async () => {
  const params = Promise.resolve({ id: 'c1' });
  await act(async () => {
    render(
      <Suspense fallback="loading">
        <AssignedWorkoutsPage params={params} />
      </Suspense>,
    );
    await params;
  });
};

describe('Assigned Workouts distinguishes a failed read from an empty one', () => {
  it('shows a load error, not "No programmes assigned yet"', async () => {
    mocks.list.mockRejectedValueOnce(new Error('network down'));

    await renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load programmes/i);
    expect(screen.queryByText(/No programmes assigned yet/i)).toBeNull();
  });

  it('retries the read instead of leaving the error on screen', async () => {
    mocks.list
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce([ROW]);

    await renderPage();
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Full Body A')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
