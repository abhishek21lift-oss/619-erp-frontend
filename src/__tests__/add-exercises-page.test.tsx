// Add exercises — the route the Workout Builder navigates to.
//
// This screen used to be a dialog on top of the builder, and turning it into a
// route moved three things out of component state and into the URL and the
// navigation stack. Those are the seams worth testing:
//
//   · the day being filled travels in ?day=, so a batch cannot land on Monday
//     because a remount reset a useState — and a hand-edited day is clamped
//     rather than written into day_of_week;
//   · the panel no longer dismisses itself, so this page owns when the trainer
//     leaves: after the writes land, never before, and NOT at all when they
//     all failed, because leaving would take the batch with it;
//   · what the day already holds is fetched here, not carried through the URL.
import { Suspense } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

const push = vi.fn();
let params = new URLSearchParams('plan=p1&day=4');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/pt-os/clients/c1/training/builder/add-exercises',
  useSearchParams: () => params,
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const errorToast = vi.fn();
const successToast = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({
    toast: { success: successToast, error: errorToast, info: vi.fn(), warning: vi.fn() },
  }),
}));

/**
 * Stand-in for the picker panel.
 *
 * It reports what it was handed and offers one button per fake exercise, so
 * the assertions are about this page's behaviour rather than about search,
 * virtualisation or filters — those are the picker's own tests.
 */
let panelProps: { live?: boolean; multiple?: boolean; busy?: boolean; existingIds?: string[] } = {};
vi.mock('@/components/pt-os/workout-log/ExercisePicker', () => ({
  ExercisePickerPanel: (props: {
    live: boolean; multiple?: boolean; busy?: boolean; existingIds?: string[];
    onSelectMany?: (picked: { id: string; name: string }[]) => void;
  }) => {
    panelProps = props;
    return (
      <>
        <button onClick={() => props.onSelectMany?.([
          { id: 'ex-row', name: 'Barbell Row' },
          { id: 'ex-squat', name: 'Back Squat' },
        ])}>
          commit-two
        </button>
        <button onClick={() => props.onSelectMany?.([{ id: 'ex-row', name: 'Barbell Row' }])}>
          commit-one
        </button>
      </>
    );
  },
  default: () => null,
}));

const detail = vi.fn();
const addExercise = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    workouts: {
      plans: {
        detail: (...a: unknown[]) => detail(...(a as [])),
        exercises: { add: (...a: unknown[]) => addExercise(...(a as [])) },
      },
    },
  },
}));

import AddExercisesPage from '@/app/(chrome)/pt-os/clients/[id]/training/builder/add-exercises/page';

const PLAN = {
  id: 'p1',
  exercises: [
    { id: 'r1', exercise_id: 'ex-dl', name: 'Deadlift', day_of_week: 4 },
    { id: 'r2', exercise_id: 'ex-bench', name: 'Bench Press', day_of_week: 2 },
  ],
};

// The page reads its route params with React's `use`, so it suspends on the
// first render; Next supplies the boundary in production, the test has to.
const renderPage = async () => {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <AddExercisesPage params={Promise.resolve({ id: 'c1' })} />
      </Suspense>,
    );
  });
};

beforeEach(() => {
  push.mockReset();
  errorToast.mockReset();
  successToast.mockReset();
  detail.mockReset();
  detail.mockResolvedValue(PLAN);
  addExercise.mockReset();
  addExercise.mockImplementation(async (_planId: string, body: { exercise_id: string }) => ({
    exercise: { id: `row-${body.exercise_id}` },
  }));
  params = new URLSearchParams('plan=p1&day=4');
  panelProps = {};
});

describe('the day comes from the URL', () => {
  it('writes every pick to that day, in the order they were chosen', async () => {
    await renderPage();
    await act(async () => { fireEvent.click(screen.getByText('commit-two')); });

    expect(addExercise.mock.calls.map((c) => c[1])).toEqual([
      { exercise_id: 'ex-row', day_of_week: 4 },
      { exercise_id: 'ex-squat', day_of_week: 4 },
    ]);
  });

  it('names the day on the screen', async () => {
    await renderPage();
    expect(screen.getByText(/Thursday/)).toBeTruthy();
  });

  it('clamps a day that is not a day', async () => {
    // This value lands in day_of_week. A hand-edited URL returns the trainer
    // to Monday; it does not write a day that does not exist.
    params = new URLSearchParams('plan=p1&day=99');
    await renderPage();
    await act(async () => { fireEvent.click(screen.getByText('commit-one')); });
    expect(addExercise.mock.calls[0][1]).toEqual({ exercise_id: 'ex-row', day_of_week: 1 });
  });

  it('clamps a day that is not a number', async () => {
    params = new URLSearchParams('plan=p1&day=Thursday');
    await renderPage();
    await act(async () => { fireEvent.click(screen.getByText('commit-one')); });
    expect(addExercise.mock.calls[0][1]).toEqual({ exercise_id: 'ex-row', day_of_week: 1 });
  });
});

describe('leaving the screen', () => {
  it('goes back to the builder, on the same day and plan, once the writes land', async () => {
    await renderPage();
    await act(async () => { fireEvent.click(screen.getByText('commit-two')); });

    expect(push).toHaveBeenCalledWith('/pt-os/clients/c1/training/builder?plan=p1&day=4');
    expect(successToast).toHaveBeenCalledWith('2 exercises added');
  });

  it('stays put when the whole batch failed', async () => {
    // Navigating away here would take the batch with it and leave the trainer
    // back on the builder with nothing added and nothing to retry.
    addExercise.mockRejectedValue(new Error('500'));
    await renderPage();
    await act(async () => { fireEvent.click(screen.getByText('commit-two')); });

    expect(push).not.toHaveBeenCalled();
    expect(errorToast).toHaveBeenCalled();
  });

  it('re-enables the commit after a failed batch', async () => {
    // Otherwise the screen is stuck: it stayed put so the batch could be
    // retried, with a button that never comes back.
    addExercise.mockRejectedValue(new Error('500'));
    await renderPage();
    await act(async () => { fireEvent.click(screen.getByText('commit-two')); });
    await waitFor(() => expect(panelProps.busy).toBe(false));
  });

  it('leaves, but says what was lost, when part of the batch failed', async () => {
    addExercise.mockImplementation(async (_p: string, body: { exercise_id: string }) => {
      if (body.exercise_id === 'ex-squat') throw new Error('409');
      return { exercise: { id: 'row-1' } };
    });
    await renderPage();
    await act(async () => { fireEvent.click(screen.getByText('commit-two')); });

    expect(push).toHaveBeenCalled();
    expect(errorToast).toHaveBeenCalledWith('Added 1, but 1 could not be added');
  });

  it('the Back control returns to the same day', async () => {
    await renderPage();
    // PageHero renders its actions twice — once beside the title, once below
    // it — and hides one with a breakpoint class jsdom does not apply. Either
    // copy is the same control.
    fireEvent.click(screen.getAllByRole('button', { name: /back to builder/i })[0]);
    expect(push).toHaveBeenCalledWith('/pt-os/clients/c1/training/builder?plan=p1&day=4');
  });
});

describe('what the day already holds', () => {
  it('marks this day’s exercises, and only this day’s', async () => {
    await renderPage();
    await waitFor(() => expect(panelProps.existingIds).toEqual(['ex-dl']));
  });

  it('opens anyway when that read fails', async () => {
    // Refusing to open the screen over a failed convenience read would be
    // worse than not greying out a duplicate the server will reject anyway.
    detail.mockRejectedValue(new Error('boom'));
    await renderPage();
    await act(async () => { fireEvent.click(screen.getByText('commit-one')); });
    expect(addExercise).toHaveBeenCalled();
  });
});

describe('without a programme', () => {
  it('says so instead of rendering a picker that cannot save', async () => {
    params = new URLSearchParams('day=4');
    await renderPage();
    expect(screen.getByText(/No programme selected/i)).toBeTruthy();
    expect(screen.queryByText('commit-one')).toBeNull();
    expect(detail).not.toHaveBeenCalled();
  });
});

describe('the panel is mounted as a page, not a dialog', () => {
  it('is live and in batch mode from the start', async () => {
    await renderPage();
    expect(panelProps.live).toBe(true);
    expect(panelProps.multiple).toBe(true);
  });
});
