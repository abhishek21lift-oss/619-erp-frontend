import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Suspense } from 'react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/components/Guard', () => ({ default: ({ children }: never) => children }));
vi.mock('@/components/AppShell', () => ({ default: ({ children }: never) => children }));
vi.mock('@/components/pt-os/workout-log/SessionSummary', () => ({ default: () => null }));

let nextPick: { id: string; name: string } = { id: 'ex-9', name: 'Squat' };
vi.mock('@/components/pt-os/workout-log/ExercisePicker', () => ({
  default: ({ open, onSelect }: { open: boolean; onSelect: (p: { id: string; name: string }) => void }) =>
    open ? <button onClick={() => onSelect(nextPick)}>pick-exercise</button> : null,
}));

const errorToast = vi.fn();
const successToast = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { error: errorToast, success: successToast } }),
}));

const getSession = vi.fn();
const addSession = vi.fn(async () => ({ data: { id: 'se-9' } }));
const addPlan = vi.fn(async () => ({ message: 'Exercise added' }));
const removePlan = vi.fn(async () => ({ message: 'Exercise removed' }));

vi.mock('@/lib/api', () => ({
  api: {
    progress: {
      workoutLog: {
        sessions: {
          get: (...a: unknown[]) => getSession(...a),
          plannedDayOptions: async () => ({ data: [] }),
          update: async () => ({ data: {} }),
        },
        sets: {
          update: async () => ({ data: {} }),
          add: async () => ({ data: {} }),
          delete: async () => ({ data: {} }),
        },
        exercises: {
          add: (...a: unknown[]) => addSession(...a),
          remove: async () => ({}),
          update: async () => ({}),
        },
        previous: async () => ({ data: null }),
      },
    },
    workouts: {
      plans: {
        exercises: {
          add: (...a: unknown[]) => addPlan(...a),
          remove: (...a: unknown[]) => removePlan(...a),
        },
      },
    },
  },
}));

import WorkoutSessionPage from '@/app/(chrome)/pt-os/clients/[id]/workout-log/[sessionId]/page';

const session = {
  id: 's1', client_id: 'c1', program_name: 'PPL', workout_day: 'Monday',
  session_date: '2026-11-06', notes: null, workout_assignment_id: 'wa-1',
  status: 'in_progress',
  planned: {
    plan_id: 'plan-1', plan_name: 'PPL', day_of_week: 1, week: 2,
    duration_weeks: 4, source: 'derived',
    exercises: [{
      row_id: 'we-1', exercise_id: 'ex-1', name: 'Bench Press',
      sets: 3, reps: 8, rest_seconds: 90, sort_order: 0,
    }],
  },
  exercises: [],
  summary: {
    total_sets: 0, total_reps: 0, total_volume: 0,
    exercises_completed: 0, exercises_total: 0, avg_rpe: null,
  },
};

function settled<T>(value: T) {
  return Object.assign(Promise.resolve(value), { status: 'fulfilled', value });
}

function open() {
  return render(
    <Suspense fallback={null}>
      <WorkoutSessionPage params={settled({ id: 'c1', sessionId: 's1' }) as never} />
    </Suspense>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  nextPick = { id: 'ex-9', name: 'Squat' };
  getSession.mockResolvedValue({ data: session });
});

describe('planned exercise removal', () => {
  it('removes the exercise from the plan for the session week', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    open();
    await screen.findByText('Bench Press');

    fireEvent.click(screen.getByLabelText('Remove Bench Press from plan'));

    await waitFor(() => expect(removePlan).toHaveBeenCalledWith('plan-1', 'we-1', 2));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('every client assigned'));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Week 2'));
    await waitFor(() => expect(getSession).toHaveBeenCalledTimes(2));
    confirm.mockRestore();
  });
});

describe('adding an exercise', () => {
  it('adds a library exercise to the session and the plan', async () => {
    open();
    await screen.findByText('Bench Press');
    fireEvent.click(screen.getByText('Add Exercise'));
    fireEvent.click(screen.getByText('pick-exercise'));

    await waitFor(() => expect(addSession).toHaveBeenCalledWith('s1', {
      exercise_id: 'ex-9', exercise_name: 'Squat',
    }));
    await waitFor(() => expect(addPlan).toHaveBeenCalledWith('plan-1', {
      exercise_id: 'ex-9', day_of_week: 1, week_number: 2,
      sets: 3, reps: 12, rest_seconds: 60,
    }));
  });

  it('keeps a custom exercise in the session only', async () => {
    nextPick = { id: '', name: 'Custom Move' };
    open();
    await screen.findByText('Bench Press');
    fireEvent.click(screen.getByText('Add Exercise'));
    fireEvent.click(screen.getByText('pick-exercise'));

    await waitFor(() => expect(addSession).toHaveBeenCalledWith('s1', {
      exercise_id: null, exercise_name: 'Custom Move',
    }));
    expect(addPlan).not.toHaveBeenCalled();
    expect(successToast).toHaveBeenCalledWith(expect.stringContaining('session only'));
  });

  it('does not duplicate an exercise already in the plan', async () => {
    nextPick = { id: 'ex-1', name: 'Bench Press' };
    open();
    await screen.findByText('Bench Press');
    fireEvent.click(screen.getByText('Add Exercise'));
    fireEvent.click(screen.getByText('pick-exercise'));

    await waitFor(() => expect(successToast).toHaveBeenCalledWith(
      expect.stringContaining("already in today's plan"),
    ));
    expect(addPlan).not.toHaveBeenCalled();
  });

  it('does not touch the plan when the session has no linked plan', async () => {
    getSession.mockResolvedValue({ data: { ...session, planned: null } });
    open();
    await screen.findByText('Add Exercise');
    fireEvent.click(screen.getByText('Add Exercise'));
    fireEvent.click(screen.getByText('pick-exercise'));

    await waitFor(() => expect(successToast).toHaveBeenCalledWith(
      'Added to session only — this session has no linked plan.',
    ));
    expect(addPlan).not.toHaveBeenCalled();
  });

  it('keeps the session exercise when the plan update fails', async () => {
    addPlan.mockRejectedValueOnce(new Error('plan locked'));
    open();
    await screen.findByText('Bench Press');
    fireEvent.click(screen.getByText('Add Exercise'));
    fireEvent.click(screen.getByText('pick-exercise'));

    await waitFor(() => expect(addPlan).toHaveBeenCalled());
    expect(addSession).toHaveBeenCalled();
    expect(errorToast).toHaveBeenCalledWith('Added to session, but the plan was not updated.');
  });
});
