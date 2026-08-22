// Today's Sessions, as it renders.
//
// The queue's ORDER is settled in today-queue.test.ts. What this file is
// about is what the card SAYS about the two rows it shows, because the two
// rows make two different promises:
//
//   ON THE FLOOR — this session has been started and not finished. It is the
//     person the trainer is standing in front of right now.
//   NEXT — the first one that has not been started.
//
// Getting this from the row's position instead of its state is the mistake
// worth guarding: the queue puts a running session first, so "row one is
// running" is false on every morning nobody has begun — which is most of
// them, and the card would tell a trainer somebody is mid-set when the gym is
// empty. The badge and the button label both follow from the same flag.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { name: 'Abhishek', organization_name: 'MY PT STUDIO' } }),
}));
vi.mock('@/components/ui', () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const client = (over: Record<string, unknown>) => ({
  assignment_id: 'a1',
  client_name: 'Client',
  client_photo: null,
  plan_id: 'p1',
  plan_name: 'Full Body',
  progress_pct: 0,
  planned_exercises: 2,
  start_time: null,
  source: 'programme',
  is_rest_day: false,
  session_id: null,
  session_status: null,
  ...over,
});

let roster: ReturnType<typeof client>[] = [];

vi.mock('@/lib/http', () => ({
  default: (url: string) => {
    if (url.startsWith('/api/pt-os/workout-log/today')) {
      return Promise.resolve({ data: { date: '2026-08-22', day_of_week: 'Saturday', clients: roster } });
    }
    if (url.startsWith('/api/pt-os/dashboard/ops')) return Promise.resolve({ data: {} });
    if (url.startsWith('/api/pt-os/dashboard')) {
      return Promise.resolve({ data: { active_pt_clients: 1, expired_clients: 0, trainers: [], revenueTrend: [] } });
    }
    return Promise.resolve({ data: [] });
  },
}));

import PtOsDashboard from '@/components/dashboards/PtOsDashboard';

/** The row containing a client's name, as an element to read labels off. */
const rowFor = async (name: string) => {
  const label = await screen.findByText(name);
  return label.closest('button')!;
};

beforeEach(() => { push.mockReset(); roster = []; });

describe('when somebody is mid-session', () => {
  beforeEach(() => {
    roster = [
      client({ client_id: 'run', client_name: 'Stuti Yadav', session_status: 'in_progress', start_time: '07:00' }),
      client({ client_id: 'next', client_name: 'Vipul Bhatia', start_time: '07:30' }),
    ];
  });

  it('says the running client is on the floor', async () => {
    render(<PtOsDashboard />);
    const row = await rowFor('Stuti Yadav');
    expect(row.textContent).toMatch(/on the floor/i);
    expect(row.textContent).not.toMatch(/next/i);
  });

  it('says the one behind them is next', async () => {
    render(<PtOsDashboard />);
    const row = await rowFor('Vipul Bhatia');
    expect(row.textContent).toMatch(/next/i);
    expect(row.textContent).not.toMatch(/on the floor/i);
  });

  it('offers Resume for the open log and Start for the one not begun', async () => {
    // Pressing Start on a session already running is how a trainer ends up
    // with two logs for one workout.
    render(<PtOsDashboard />);
    expect((await rowFor('Stuti Yadav')).textContent).toMatch(/resume/i);
    expect((await rowFor('Vipul Bhatia')).textContent).toMatch(/start/i);
  });
});

describe('when nothing has been started', () => {
  beforeEach(() => {
    roster = [
      client({ client_id: 'a', client_name: 'Stuti Yadav', start_time: '07:00' }),
      client({ client_id: 'b', client_name: 'Vipul Bhatia', start_time: '07:30' }),
    ];
  });

  it('calls the first one next, not live', async () => {
    // The case the position-based version got wrong on most mornings.
    render(<PtOsDashboard />);
    const row = await rowFor('Stuti Yadav');
    expect(row.textContent).toMatch(/next/i);
    expect(row.textContent).not.toMatch(/on the floor/i);
  });

  it('labels nobody else', async () => {
    render(<PtOsDashboard />);
    const row = await rowFor('Vipul Bhatia');
    expect(row.textContent).not.toMatch(/next/i);
    expect(row.textContent).not.toMatch(/on the floor/i);
  });

  it('offers Start on both', async () => {
    render(<PtOsDashboard />);
    expect((await rowFor('Stuti Yadav')).textContent).toMatch(/start/i);
    expect((await rowFor('Vipul Bhatia')).textContent).toMatch(/start/i);
    await waitFor(() => expect(screen.queryByText(/resume/i)).toBeNull());
  });
});

describe('the sequence moves up as sessions finish', () => {
  it('drops a finished client and promotes the rest', async () => {
    roster = [
      client({ client_id: 'done', client_name: 'Finished Person', session_status: 'completed' }),
      client({ client_id: 'run', client_name: 'Stuti Yadav', session_status: 'in_progress' }),
      client({ client_id: 'next', client_name: 'Vipul Bhatia' }),
    ];
    render(<PtOsDashboard />);

    await screen.findByText('Stuti Yadav');
    expect(screen.queryByText('Finished Person')).toBeNull();
    expect((await rowFor('Stuti Yadav')).textContent).toMatch(/on the floor/i);
    expect((await rowFor('Vipul Bhatia')).textContent).toMatch(/next/i);
  });
});
