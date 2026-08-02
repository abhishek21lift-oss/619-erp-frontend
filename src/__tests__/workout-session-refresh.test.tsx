// The workout session logger must not blank the page when a set is saved.
//
// Reported as "with every click and every digit the page refreshes and moves
// to the top". It did. Every set edit calls loadSession() to pick up the
// server's recomputed totals and PR flags, and loadSession raised `loading` on
// every call — while `loading` returns a centred spinner INSTEAD of the whole
// session:
//
//   if (loading) return <Loader2 … />;
//
// So tapping + on a set in the third exercise swapped the page for a spinner
// and swapped it back. React unmounted the list, the browser had nothing to
// anchor scroll against, and the view landed at the top. Mid-workout, at the
// bottom of a long list, that is the screen being unusable rather than untidy.
//
// The fix is that only the first load may blank the page.
//
// Testing this needs care. The obvious version — click, await, assert the
// exercise is still there — passes against the BROKEN code, because by the
// time the assertion runs the spinner has already come and gone. A DOM node
// identity check passes too: when the refetch resolves immediately React
// never commits the intermediate state at all. Both are tests that cannot
// fail, which is worse than no test.
//
// So the refresh is held open, and the assertion runs while it is in flight —
// the state the user is actually looking at. Verified by restoring the old
// `setLoading(true)` on every call: that test fails, the others do not.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Suspense } from 'react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/components/Guard', () => ({ default: ({ children }: never) => children }));
vi.mock('@/components/AppShell', () => ({ default: ({ children }: never) => children }));
vi.mock('@/components/pt-os/workout-log/ExercisePicker', () => ({ default: () => null }));
vi.mock('@/components/pt-os/workout-log/SessionSummary', () => ({ default: () => null }));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }) }));

const session = {
  id: 's1', client_id: 'c1', program_name: 'PPL', workout_day: 'Push',
  session_date: '2026-08-02', notes: null, planned: null, workout_assignment_id: null,
  exercises: [{
    id: 'e1', exercise_id: 'x1', exercise_name: 'Incline Push-Up', notes: null,
    sets: [{ id: 'st1', set_number: 1, weight_kg: 0, reps: 13, rpe: null, rir: null,
             completed: false, rest_seconds: null, tempo: null }],
  }],
  status: 'in_progress',
  // session.summary, which the sticky bar reads unguarded.
  summary: {
    total_sets: 0, total_reps: 0, total_volume: 0,
    exercises_completed: 0, exercises_total: 1, avg_rpe: null,
  },
};

const getSession = vi.fn(async () => ({ data: session }));
const updateSet = vi.fn(async () => ({ data: {} }));

vi.mock('@/lib/api', () => ({
  api: {
    progress: {
      workoutLog: {
        sessions: {
          get: (...a: unknown[]) => getSession(...(a as [])),
          plannedDayOptions: async () => ({ data: [] }),
          update: async () => ({ data: {} }),
        },
        sets: {
          update: (...a: unknown[]) => updateSet(...(a as [])),
          add: async () => ({ data: {} }),
          delete: async () => ({ data: {} }),
        },
        exercises: { add: async () => ({ data: {} }), remove: async () => ({}), update: async () => ({}) },
        previous: async () => ({ data: null }),
      },
    },
  },
}));

import WorkoutSessionPage from '@/app/pt-os/clients/[id]/workout-log/[sessionId]/page';

// The page reads its route params with React's `use()`. A bare
// Promise.resolve() suspends and never resumes here — nothing outside React
// re-renders the boundary — so the tree stays on the fallback and the
// component's effects never run. React reads a promise synchronously when it
// carries the tracked-promise fields it sets itself, which is what Next.js
// hands the page in practice; this reproduces that.
function settled<T>(value: T) {
  return Object.assign(Promise.resolve(value), { status: 'fulfilled', value });
}

function open() {
  return render(
    <Suspense fallback={<div data-testid="route-suspense" />}>
      <WorkoutSessionPage params={settled({ id: 'c1', sessionId: 's1' }) as never} />
    </Suspense>,
  );
}

beforeEach(() => {
  getSession.mockClear();
  updateSet.mockClear();
});

describe('saving a set', () => {
  it('keeps the session on screen WHILE the refresh is in flight', async () => {
    // The refresh is held open deliberately. Sampling after it settles proves
    // nothing — the spinner has already come and gone by then, and the whole
    // complaint is about that flash. This asserts on the state that exists
    // only during the round trip, which is the state the user is looking at.
    open();
    await waitFor(() => expect(screen.getByText('Incline Push-Up')).toBeTruthy());

    let release: (v: unknown) => void = () => {};
    getSession.mockImplementationOnce(() => new Promise((r) => { release = r; }));

    fireEvent.click(screen.getByLabelText('Increase reps'));
    await waitFor(() => expect(getSession).toHaveBeenCalledTimes(2));

    // Mid-refresh: the session must still be there.
    expect(screen.queryByText('Incline Push-Up')).toBeTruthy();

    release({ data: session });
    await waitFor(() => expect(screen.getByText('Incline Push-Up')).toBeTruthy());
  });

  it('still refreshes from the server, so totals and PRs update', async () => {
    // The refetch is the point of onChanged — making it silent must not make
    // it stop happening.
    open();
    await waitFor(() => expect(getSession).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByLabelText('Increase weight'));
    await waitFor(() => expect(getSession).toHaveBeenCalledTimes(2));
  });

  it('survives a failed background refresh without losing the session', async () => {
    open();
    await waitFor(() => expect(screen.getByText('Incline Push-Up')).toBeTruthy());

    getSession.mockRejectedValueOnce(new Error('network'));
    fireEvent.click(screen.getByLabelText('Increase reps'));

    await waitFor(() => expect(getSession).toHaveBeenCalledTimes(2));
    // The set already saved; a failed totals fetch must not replace the page
    // with an error and throw away a workout in progress.
    expect(screen.queryByText('Incline Push-Up')).toBeTruthy();
  });
});

describe('the first load', () => {
  it('does show a spinner before anything has arrived', async () => {
    // The fix must not remove the loading state altogether — an empty screen
    // with no explanation is its own bug.
    let release: (v: unknown) => void = () => {};
    getSession.mockImplementationOnce(() => new Promise((r) => { release = r; }));
    const { container } = open();

    await waitFor(() => expect(container.querySelector('.animate-spin')).toBeTruthy());
    release({ data: session });
    await waitFor(() => expect(screen.getByText('Incline Push-Up')).toBeTruthy());
  });
});
