// Cardio actuals in the legacy Workout Log set row.
//
// A logged treadmill run had nowhere to put its numbers: the set row was
// weight × reps × RPE × RIR by construction, because workout_sets only had
// those columns. Migration 179 added the cardio actuals and the session
// detail now publishes each exercise's type + allowed prescription modes,
// so the row can render exactly what the exercise is prescribed AS.
//
// Pinned here:
//   - A Cardio exercise renders Duration/Distance/Calories/Avg HR (+RPE)
//     and does NOT render weight, reps or RIR.
//   - Duration is edited in minutes but saved as seconds (30 min → 1800).
//   - Distance always travels with its unit.
//   - An exercise without library metadata (exercise_type gone) falls back
//     to the strength fields — ad-hoc rows must keep logging kg × reps.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Suspense } from 'react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/components/Guard', () => ({ default: ({ children }: never) => children }));
vi.mock('@/components/AppShell', () => ({ default: ({ children }: never) => children }));
vi.mock('@/components/pt-os/workout-log/ExercisePicker', () => ({ default: () => null }));
vi.mock('@/components/pt-os/workout-log/SessionSummary', () => ({ default: () => null }));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }) }));

const updateSet = vi.fn(async () => ({ data: {} }));

function makeSession(exercise: Record<string, unknown>) {
  return {
    id: 's1', client_id: 'c1', program_name: null, workout_day: null,
    session_date: '2026-08-21', notes: null, planned: null, workout_assignment_id: null,
    exercises: [{
      id: 'e1', exercise_id: 'x1', exercise_name: 'Running, Treadmill', notes: null,
      sets: [{ id: 'st1', set_number: 1, weight_kg: null, reps: null, rpe: null, rir: null,
               completed: false, rest_seconds: null, tempo: null,
               duration_seconds: 1800, distance: 5, distance_unit: 'km',
               average_speed: null, speed_unit: null }],
      ...exercise,
    }],
    status: 'in_progress',
    summary: {
      total_sets: 0, total_reps: 0, total_volume: 0,
      exercises_completed: 0, exercises_total: 1, avg_rpe: null,
    },
  };
}

let session: Record<string, unknown>;

vi.mock('@/lib/api', () => ({
  api: {
    progress: {
      workoutLog: {
        sessions: {
          get: async () => ({ data: session }),
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

import WorkoutSessionPage from '@/app/(chrome)/pt-os/clients/[id]/workout-log/[sessionId]/page';

function settled<T>(value: T) {
  return Object.assign(Promise.resolve(value), { status: 'fulfilled', value });
}

beforeEach(() => {
  updateSet.mockClear();
});

describe('cardio set row', () => {
  it('renders the published cardio fields and none of the strength ones', async () => {
    session = makeSession({
      exercise_type: 'Cardio',
      prescription_mode_primary: 'TIME_SPEED',
      prescription_mode_allowed: ['TIME', 'DISTANCE', 'SPEED', 'CALORIES', 'HEART_RATE', 'RPE'],
    });
    render(
      <Suspense fallback={<div />}>
        <WorkoutSessionPage params={settled({ id: 'c1', sessionId: 's1' }) as never} />
      </Suspense>,
    );
    await waitFor(() => expect(screen.getByText('Running, Treadmill')).toBeTruthy());

    expect(screen.getByLabelText('Duration (min)')).toBeTruthy();
    expect(screen.getByLabelText('Distance')).toBeTruthy();
    expect((screen.getByLabelText('Distance unit for Distance') as HTMLSelectElement).value).toBe('km');
    expect(screen.getByLabelText('Speed')).toBeTruthy();
    expect(screen.getByLabelText('Calories')).toBeTruthy();
    expect(screen.getByLabelText('Avg HR')).toBeTruthy();
    expect(screen.queryByText('Weight (kg)')).toBeNull();
    expect(screen.queryByLabelText('Reps')).toBeNull();
    // RPE stays (it is in the allowed modes); RIR is strength-only.
    expect(screen.getByText('RPE')).toBeTruthy();
    expect(screen.queryByText('RIR')).toBeNull();
  });

  it('saves duration as seconds and keeps the distance unit attached', async () => {
    session = makeSession({
      exercise_type: 'Cardio',
      prescription_mode_allowed: ['TIME', 'DISTANCE', 'RPE'],
    });
    render(
      <Suspense fallback={<div />}>
        <WorkoutSessionPage params={settled({ id: 'c1', sessionId: 's1' }) as never} />
      </Suspense>,
    );
    await waitFor(() => expect(screen.getByLabelText('Duration (min)')).toBeTruthy());

    const minutes = screen.getByLabelText('Duration (min)');
    fireEvent.change(minutes, { target: { value: '32.5' } });
    fireEvent.blur(minutes);
    await waitFor(() => expect(updateSet).toHaveBeenCalled());

    // ── Why every duration-bearing call, rather than calls[0] ──────────────
    //
    // This assertion used to index the first recorded call, and it failed once
    // on CI — 1800 where 1950 was expected. 1800 is this fixture's own
    // pristine duration (30 min), so something saved the value the row started
    // with instead of the one just typed. It has not reproduced in four full
    // local runs, so the mechanism is not yet known: a stale save landing
    // first, or the typed save never happening at all, are different bugs and
    // calls[0] cannot tell them apart — it reports the same message for both.
    //
    // Listing every call that carries duration_seconds distinguishes them the
    // next time it happens. [1800] means the typed value never reached the
    // API; [1800, 1950] means a spurious save of the pristine value raced
    // ahead of the real one. Either is a defect worth having named.
    //
    // Deliberately STRONGER than what it replaces, not weaker: it requires
    // exactly one duration save carrying exactly what was typed, so a
    // spurious extra save now fails here rather than hiding behind an index.
    const durations = updateSet.mock.calls
      .map((c) => c[1] as Record<string, unknown>)
      .filter((patch) => patch && Object.prototype.hasOwnProperty.call(patch, 'duration_seconds'))
      .map((patch) => patch.duration_seconds);
    expect(durations).toEqual([1950]);

    const dist = screen.getByLabelText('Distance');
    fireEvent.change(dist, { target: { value: '6' } });
    fireEvent.blur(dist);
    await waitFor(() => expect(updateSet.mock.calls[1]).toBeTruthy());
    expect(updateSet.mock.calls[1][1]).toMatchObject({ distance: 6, distance_unit: 'km' });
  });

  it('saves what the field holds, not what state held at the last render', async () => {
    // ── The race, made deterministic ───────────────────────────────────────
    //
    // The sibling test above catches this about one run in six, which is how
    // it reached main: green on the PR, red on the merge commit, identical
    // tree. Its failure signature named the mechanism — `[1800]`, a single
    // save carrying the row's PRISTINE duration, with no second call
    // correcting it. The typed value never reached the API at all.
    //
    // That is a stale closure. `onChange` only SCHEDULES a state update; the
    // blur handler belongs to the render it was created in. When blur is
    // processed before React re-renders, the handler saves the value the field
    // started with, while the input goes on showing what was typed — so the
    // screen and the database disagree and nothing reports it.
    //
    // Blurring with a target value and no preceding change IS that state:
    // the DOM holds 32.5, React state still holds 30. No timing, no flake —
    // if the handler reads state it saves 1800 every single time, and if it
    // reads the field it saves 1950 every single time.
    session = makeSession({
      exercise_type: 'Cardio',
      prescription_mode_allowed: ['TIME', 'DISTANCE', 'RPE'],
    });
    render(
      <Suspense fallback={<div />}>
        <WorkoutSessionPage params={settled({ id: 'c1', sessionId: 's1' }) as never} />
      </Suspense>,
    );
    await waitFor(() => expect(screen.getByLabelText('Duration (min)')).toBeTruthy());

    const minutes = screen.getByLabelText('Duration (min)');
    fireEvent.blur(minutes, { target: { value: '32.5' } });

    await waitFor(() => expect(updateSet).toHaveBeenCalled());
    expect(updateSet.mock.calls[0][1]).toMatchObject({ duration_seconds: 1950 });
  });

  it('clears a field the trainer emptied, rather than re-saving the old value', async () => {
    // The same read, in the case where being wrong is most visible: emptying
    // a field has to clear it, not write its previous value back.
    session = makeSession({
      exercise_type: 'Cardio',
      prescription_mode_allowed: ['TIME', 'DISTANCE', 'RPE'],
    });
    render(
      <Suspense fallback={<div />}>
        <WorkoutSessionPage params={settled({ id: 'c1', sessionId: 's1' }) as never} />
      </Suspense>,
    );
    await waitFor(() => expect(screen.getByLabelText('Duration (min)')).toBeTruthy());

    fireEvent.blur(screen.getByLabelText('Duration (min)'), { target: { value: '' } });

    await waitFor(() => expect(updateSet).toHaveBeenCalled());
    expect(updateSet.mock.calls[0][1]).toMatchObject({ duration_seconds: null });
  });

  it('falls back to strength fields when the exercise has no library metadata', async () => {
    session = makeSession({});
    render(
      <Suspense fallback={<div />}>
        <WorkoutSessionPage params={settled({ id: 'c1', sessionId: 's1' }) as never} />
      </Suspense>,
    );
    await waitFor(() => expect(screen.getByText('Running, Treadmill')).toBeTruthy());

    expect(screen.getByText('Weight (kg)')).toBeTruthy();
    expect(screen.getByLabelText('Increase reps')).toBeTruthy();
    expect(screen.queryByText('Duration (min)')).toBeNull();
  });
});
