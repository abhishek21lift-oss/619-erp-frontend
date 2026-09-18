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
          // A DEEP COPY per call, which is what a real refetch produces: the
          // same values wrapped in new objects. The row's re-seed effect used
          // to depend on that object's identity, so every refetch overwrote
          // whatever the trainer was part-way through typing.
          get: async () => ({ data: JSON.parse(JSON.stringify(session)) }),
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

    // ── Why the typed value is awaited before blurring ─────────────────────
    //
    // This blur carries no target value on purpose: the point of the test is
    // that the handler reads the FIELD. But that only tests anything once the
    // field actually holds 32.5, and `change` merely schedules the state
    // update that puts it there. Blurring on the next line assumed the commit
    // had landed — true on an idle machine, not guaranteed on a loaded CI box
    // running 182 files across four workers. When it had not landed, blur read
    // the pristine 30 out of the DOM and the test reported `[1800]`: the exact
    // signature of the two page bugs below, from a test artefact rather than
    // from either bug. That is the worst kind of failure — it accuses code
    // that is working.
    //
    // Waiting on the field is also a stronger assertion than the one it adds
    // to: the controlled input has to have ACCEPTED what was typed, which this
    // test previously took on faith. If it never commits, this fails here
    // saying so, instead of downstream with a number.
    await waitFor(() => expect((minutes as HTMLInputElement).value).toBe('32.5'));

    fireEvent.blur(minutes);
    await waitFor(() => expect(updateSet).toHaveBeenCalled());

    // ── Why every duration-bearing call, rather than calls[0] ──────────────
    //
    // This assertion used to index the first recorded call, and it failed
    // intermittently — 1800 where 1950 was expected. 1800 is this fixture's own
    // pristine duration (30 min), so something saved the value the row started
    // with instead of the one just typed. Listing every call that carries
    // duration_seconds was written to distinguish the two possible causes:
    // [1800] means the typed value never reached the API, [1800, 1950] means a
    // spurious save raced ahead of the real one.
    //
    // It reported [1800], and that named the mechanism. The row re-seeded every
    // local field from the `set` prop whenever that OBJECT changed — and `set`
    // is `session.exercises[].sets[]`, a fresh object on every refetch whether
    // or not anything in it changed. A refetch landing between the change and
    // the blur reset the controlled input to the stored 30, so the blur read 30
    // out of the DOM. Fixed in the page: the effect now depends on the VALUES.
    // 'does not overwrite what is being typed when a refetch lands' below
    // reproduces it without the timing.
    //
    // This assertion stays as it is: it is stronger than the index it replaced
    // — exactly one duration save, carrying exactly what was typed — so a
    // spurious extra save fails here rather than hiding behind an index.
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

  it('does not overwrite what is being typed when a refetch lands', async () => {
    // ── The other half of the same failure, made deterministic ─────────────
    //
    // The row re-seeded every local field from the `set` prop whenever that
    // OBJECT changed — and `set` is `session.exercises[].sets[]`, a fresh
    // object on every refetch whether or not anything in it changed. So a
    // refetch triggered by one field's save reset the field beside it, mid-
    // edit, back to the stored value.
    //
    // That is the mechanism behind the sibling test's one-run-in-six `[1800]`:
    // the typed 32.5 was replaced by the stored 30 before blur read the DOM,
    // so the save carried the pristine value and nothing corrected it.
    //
    // Here the refetch is forced rather than raced. Saving Distance triggers
    // onChanged(), which refetches and hands back a new object holding the
    // same numbers. If the re-seed keys on identity, Duration snaps back to 30
    // and the blur saves 1800. If it keys on the values, 32.5 survives.
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

    // Type into Duration, but do not leave it.
    const minutes = screen.getByLabelText('Duration (min)');
    fireEvent.change(minutes, { target: { value: '32.5' } });

    // Save the field NEXT DOOR, which refetches the whole session.
    const dist = screen.getByLabelText('Distance');
    fireEvent.blur(dist, { target: { value: '6' } });
    await waitFor(() => expect(updateSet).toHaveBeenCalled());

    // The in-progress edit is still there.
    await waitFor(() => {
      expect((screen.getByLabelText('Duration (min)') as HTMLInputElement).value).toBe('32.5');
    });

    // And leaving it saves what was typed, not what the server held.
    fireEvent.blur(minutes);
    await waitFor(() => {
      const durations = updateSet.mock.calls
        .map((c) => c[1] as Record<string, unknown>)
        .filter((patch) => patch && Object.prototype.hasOwnProperty.call(patch, 'duration_seconds'))
        .map((patch) => patch.duration_seconds);
      expect(durations).toEqual([1950]);
    });
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
