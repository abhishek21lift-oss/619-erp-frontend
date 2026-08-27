// What the Workout Plans screen can say about people, and where it gets it.
//
// ── The two shapes this replaces ──────────────────────────────────────────
//
// The plans endpoint used to describe a prescription and nothing about its
// use: no roster, and `progress` was the literal 0 the SQL emitted whenever
// no client was named. So every card studio-wide read "0% complete" and the
// completion KPI read 0% for the whole studio.
//
// The first fix for that on this page read /api/workouts/assignments, which
// requires a client_id — so the client name, the week counter and two of the
// four KPIs only existed when the page was opened for ONE client, and the
// studio-wide view had to fall back to numbers about different questions
// ("Clients" meaning the trainer's whole roster, "Sessions / Week" meaning
// prescribed rather than delivered).
//
// The list endpoint now returns each plan's roster, already narrowed
// server-side to the caller's studio and, for a trainer, to their own
// clients. These tests pin what the page does with it — and the arithmetic
// is the point, because each of these numbers has a plausible wrong version
// that looks fine on screen.

import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/pt-os/workout-plans',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }),
}));

const plansList = vi.fn();
/** Must never be called: the roster arrives with the plans now. */
const assignmentsList = vi.fn(async () => []);

vi.mock('@/lib/api', () => ({
  api: {
    exercises: {
      list: async () => ({ exercises: [], total: 890, limit: 50, offset: 0, has_more: true }),
      meta: async () => ({ muscles_by_region: { Chest: [], Back: [] } }),
    },
    workouts: {
      plans: { list: (p?: Record<string, string>) => plansList(p) },
      assignments: { list: (p?: Record<string, string>) => assignmentsList(p) },
    },
    pt: { clients: async () => ({ data: [{ id: 'c9', name: 'Somebody Else' }] }) },
  },
}));

import WorkoutPlansPage from '@/app/(chrome)/pt-os/workout-plans/page';

const plan = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  name: 'Hypertrophy Foundation',
  goal: 'muscle_gain',
  difficulty: 'intermediate',
  duration_weeks: 4,
  sessions_per_week: 3,
  is_active: true,
  exercise_count: 12,
  progress: 52,
  exercises: [],
  assignments: [],
  ...over,
});

const enrol = (id: string, name: string, pct: number, start = '2026-08-10') =>
  ({ client_id: id, client_name: name, progress_pct: pct, start_date: start });

beforeEach(() => {
  plansList.mockReset();
  assignmentsList.mockClear();
});

// Explicit, because this project does not run vitest with `globals: true` and
// testing-library only registers its automatic cleanup when it is. Without
// this every render stays in the document, so `getByText` sees one label per
// test that has run so far — and an assertion about "the" KPI tile quietly
// starts reading the first render's number instead of this one's.
afterEach(cleanup);

/**
 * One KPI tile's number, by its label.
 *
 * The label and the value are separate nodes in the same tile, so reading the
 * tile's textContent gives "Assigned Clients2" — the label has to come off
 * before the digits mean anything.
 */
const kpi = (label: RegExp): string => {
  const labelNode = screen.getByText(label);
  const tile = labelNode.closest('div')?.parentElement as HTMLElement;
  const value = (tile.textContent ?? '').replace(labelNode.textContent ?? '', '');
  return (value.match(/-?\d+/) ?? [''])[0];
};

describe('the roster comes with the plans', () => {
  it('does not call the assignments endpoint at all', async () => {
    // It requires a client_id, so studio-wide it could only ever have been a
    // request per client to decorate a list.
    plansList.mockResolvedValue([plan({ assignments: [enrol('c1', 'Rahul Sharma', 52)] })]);
    render(<WorkoutPlansPage />);
    await screen.findByText('Rahul Sharma');
    expect(assignmentsList).not.toHaveBeenCalled();
  });

  it('names the client from the plan row, not from the clients list', async () => {
    // The old lookup resolved names against /api/pt/clients, so a client that
    // list did not happen to hold rendered as no client at all.
    plansList.mockResolvedValue([plan({ assignments: [enrol('c1', 'Rahul Sharma', 52)] })]);
    render(<WorkoutPlansPage />);
    expect(await screen.findByText('Rahul Sharma')).toBeInTheDocument();
  });

  it('shows the most recently started enrolment when a plan has several', async () => {
    plansList.mockResolvedValue([plan({
      assignments: [
        enrol('c1', 'Older Start', 10, '2026-06-01'),
        enrol('c2', 'Newer Start', 80, '2026-08-01'),
      ],
    })]);
    render(<WorkoutPlansPage />);
    expect(await screen.findByText('Newer Start')).toBeInTheDocument();
    expect(screen.queryByText('Older Start')).not.toBeInTheDocument();
  });
});

describe('the KPI row', () => {
  it('counts people, not enrolments', async () => {
    // One client on three programmes is one assigned client. Summing rosters
    // would say three, which is the plausible wrong version.
    plansList.mockResolvedValue([
      plan({ id: 'p1', assignments: [enrol('c1', 'Rahul Sharma', 50)] }),
      plan({ id: 'p2', assignments: [enrol('c1', 'Rahul Sharma', 20)] }),
      plan({ id: 'p3', assignments: [enrol('c2', 'Anita Desai', 60)] }),
    ]);
    render(<WorkoutPlansPage />);
    await screen.findByText('Anita Desai');
    expect(kpi(/^Assigned Clients$/i)).toBe('2');
  });

  it('averages completion across the people training, not across the plans', async () => {
    // Two clients at 60 and 40, plus a draft nobody is on. Averaging over
    // plans gives 33% — the studio's number would fall every time a trainer
    // started writing something.
    plansList.mockResolvedValue([
      plan({ id: 'p1', progress: 60, assignments: [enrol('c1', 'A', 60)] }),
      plan({ id: 'p2', progress: 40, assignments: [enrol('c2', 'B', 40)] }),
      plan({ id: 'p3', progress: 0, assignments: [] }),
    ]);
    render(<WorkoutPlansPage />);
    await screen.findByText('B');
    expect(kpi(/^Avg Completion$/i)).toBe('50');
  });

  it('counts the sessions actually being delivered, not the ones prescribed', async () => {
    // Two clients on one 3x/week plan is six sessions to run. Summing
    // sessions_per_week over plans gives 3 and describes nobody's week.
    plansList.mockResolvedValue([
      plan({ id: 'p1', sessions_per_week: 3, assignments: [enrol('c1', 'A', 10), enrol('c2', 'B', 20)] }),
      plan({ id: 'p2', sessions_per_week: 4, assignments: [] }),
    ]);
    render(<WorkoutPlansPage />);
    // Both enrolments are on the same plan, so only the card for that plan
    // renders and only one of the two names appears on it.
    await screen.findByText('A');
    expect(kpi(/^Sessions \/ Week$/i)).toBe('6');
  });

  it('reports zero completion for a studio where nobody is training', async () => {
    // Still 0 — but because there is nothing to average, which is a fact
    // about the studio rather than about the query.
    plansList.mockResolvedValue([plan({ progress: 0, assignments: [] })]);
    render(<WorkoutPlansPage />);
    await screen.findByText(/Not assigned|Hypertrophy Foundation/);
    expect(kpi(/^Assigned Clients$/i)).toBe('0');
    expect(kpi(/^Avg Completion$/i)).toBe('0');
  });
});
