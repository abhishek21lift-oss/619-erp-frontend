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

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }));
vi.mock('@/components/Guard', () => ({ default: ({ children }: never) => children }));
vi.mock('@/components/AppShell', () => ({ default: ({ children }: never) => children }));
vi.mock('@/components/pt-os/workout-log/ExercisePicker', () => ({ default: () => null }));
// Mirrors the real component's contract: it exists only while open and calls
// onFinish with the summary patch. Keeping it this thin lets the page's own
// finish/error behaviour be tested without re-testing the summary form.
vi.mock('@/components/pt-os/workout-log/SessionSummary', () => ({
  default: ({ open, onFinish }: { open: boolean; onFinish: (p: unknown) => Promise<void> }) =>
    open
      ? <button onClick={() => { void onFinish({ notes: null, duration_minutes: 45 }); }}>confirm-finish</button>
      : null,
}));
const errorToast = vi.fn();
const successToast = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { error: errorToast, success: successToast } }),
}));

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
const addSet = vi.fn(async () => ({ data: {} }));
const updateSession = vi.fn(async () => ({ data: {} }));

vi.mock('@/lib/api', () => ({
  api: {
    progress: {
      workoutLog: {
        sessions: {
          get: (...a: unknown[]) => getSession(...(a as [])),
          plannedDayOptions: async () => ({ data: [] }),
          update: (...a: unknown[]) => updateSession(...(a as [])),
        },
        sets: {
          update: (...a: unknown[]) => updateSet(...(a as [])),
          add: (...a: unknown[]) => addSet(...(a as [])),
          delete: async () => ({ data: {} }),
        },
        exercises: { add: async () => ({ data: {} }), remove: async () => ({}), update: async () => ({}) },
        previous: async () => ({ data: null }),
      },
    },
  },
}));

import WorkoutSessionPage from '@/app/(chrome)/pt-os/clients/[id]/workout-log/[sessionId]/page';

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
  addSet.mockClear();
  updateSession.mockClear();
  push.mockClear();
  errorToast.mockClear();
  successToast.mockClear();
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
    await waitFor(() => expect(getSession).toHaveBeenCalledTimes(2), { timeout: 5000 });

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
    await waitFor(() => expect(getSession).toHaveBeenCalledTimes(2), { timeout: 5000 });
  });

  it('survives a failed background refresh without losing the session', async () => {
    open();
    await waitFor(() => expect(screen.getByText('Incline Push-Up')).toBeTruthy());

    getSession.mockRejectedValueOnce(new Error('network'));
    fireEvent.click(screen.getByLabelText('Increase reps'));

    await waitFor(() => expect(getSession).toHaveBeenCalledTimes(2), { timeout: 5000 });
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

describe('adding a set after one was deleted', () => {
  it('numbers it above the highest remaining set, not the row count', async () => {
    // Deleting set 2 leaves 1 and 3. Length + 1 is 3, which is already taken;
    // the add then failed with a duplicate-number 409.
    const gapped = {
      ...session,
      exercises: [{
        ...session.exercises[0],
        sets: [
          { ...session.exercises[0].sets[0], id: 'st1', set_number: 1 },
          { ...session.exercises[0].sets[0], id: 'st3', set_number: 3 },
        ],
      }],
    };
    getSession.mockResolvedValueOnce({ data: gapped });
    open();

    await waitFor(() => expect(screen.getByText('Incline Push-Up')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Add Set' }));

    await waitFor(() => expect(addSet).toHaveBeenCalledWith(
      'e1', expect.objectContaining({ set_number: 4 }),
    ));
  });
});

describe('finishing a workout', () => {
  const completed = {
    ...session,
    exercises: [{
      ...session.exercises[0],
      sets: [{ ...session.exercises[0].sets[0], completed: true }],
    }],
  };

  async function finish() {
    getSession.mockResolvedValueOnce({ data: completed });
    open();
    await waitFor(() => expect(screen.getByText('Incline Push-Up')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Finish Workout' }));
    fireEvent.click(await screen.findByRole('button', { name: 'confirm-finish' }));
  }

  it('keeps the summary open and claims nothing when the completion save fails', async () => {
    updateSession.mockRejectedValueOnce(new Error('500'));

    await finish();

    await waitFor(() => expect(updateSession).toHaveBeenCalled());
    expect(successToast).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'confirm-finish' })).toBeTruthy();
  });

  it('closes the summary and returns to the log when it succeeds', async () => {
    updateSession.mockResolvedValueOnce({ data: {} });

    await finish();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/pt-os/clients/c1/workout-log'));
    expect(successToast).toHaveBeenCalledWith('Workout session completed.');
    expect(screen.queryByRole('button', { name: 'confirm-finish' })).toBeNull();
  });
});
