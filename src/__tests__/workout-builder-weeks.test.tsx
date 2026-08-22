// Editing week 6 of a programme, from the builder.
//
// The programme stores week 1 and a rule; every later week is computed. Those
// weeks are editable now, and an edit means "from here on" — week 6 changes
// weeks 6..N and leaves 1-5 alone.
//
// The server does the hard part (writing the week out, resolving the row id
// it was handed). What this file guards is the one thing the CLIENT has to get
// right, over and over, in five different callbacks:
//
//   EVERY WRITE CARRIES ITS WEEK.
//
// A patch, delete, reorder, duplicate or add that forgets the week edits week
// 1 — and week 1 is the week every other week is computed from, so one missing
// parameter silently rewrites the whole programme. Nothing on screen would
// show it: the card displays the number that was typed either way, and the
// save indicator still says "Saved".
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

const push = vi.fn();
const replace = vi.fn();
let params = new URLSearchParams('plan=p1&day=1');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back: vi.fn() }),
  usePathname: () => '/pt-os/clients/c1/training/builder',
  useSearchParams: () => params,
}));

const successToast = vi.fn();
// One object, not a fresh one per call. The real useToast memoises what it
// returns, and the builder's load effect lists `toast` in its dependencies —
// a mock that mints a new object every render turns that effect into an
// infinite loop and every test here hangs inside act().
const mockToast = { success: successToast, error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: mockToast }) }));

/**
 * framer-motion's Reorder needs real layout, which jsdom does not have, so a
 * drag cannot be fired here. The group is replaced with a button that calls
 * `onReorder` with the day reversed — the same callback a drag would invoke.
 * Without it the reorder path is simply untested, and "reorder forgot its
 * week" is a mutation that survives.
 */
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    Reorder: {
      ...actual.Reorder,
      Group: ({ values, onReorder, children }: {
        values: { id: string }[];
        onReorder: (next: { id: string }[]) => void;
        children: React.ReactNode;
      }) => (
        <div>
          <button onClick={() => onReorder([...values].reverse())}>stub-reorder</button>
          {children}
        </div>
      ),
      // Item has to go with it: the real one asserts it is inside a real
      // Group's context, which the stub above does not provide.
      Item: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    },
  };
});

const detail = vi.fn();
const patch = vi.fn(async () => ({ exercise: {} }));
const add = vi.fn(async () => ({ exercise: { id: 'new', day_of_week: 1 } }));
const remove = vi.fn(async () => ({}));
const reorder = vi.fn(async () => ({}));
const resetWeek = vi.fn(async () => ({ message: 'ok', week: 6, removed: 2 }));
vi.mock('@/lib/api', () => ({
  api: {
    workouts: {
      plans: {
        detail: (...a: unknown[]) => detail(...(a as [])),
        update: vi.fn(async () => ({})),
        resetWeek: (...a: unknown[]) => resetWeek(...(a as [])),
        exercises: {
          patch: (...a: unknown[]) => patch(...(a as [])),
          add: (...a: unknown[]) => add(...(a as [])),
          remove: (...a: unknown[]) => remove(...(a as [])),
          reorder: (...a: unknown[]) => reorder(...(a as [])),
        },
      },
    },
  },
}));

import WorkoutBuilder from '@/components/pt-os/builder/WorkoutBuilder';

const SQUAT = {
  id: 'w1-squat', exercise_id: 'x-squat', name: 'Back Squat', muscle_group: 'legs',
  sets: 4, reps: 8, rest_seconds: 90, day_of_week: 1, sort_order: 0, notes: null,
  target_weight: 60, tempo: null, rpe: 7, warmup_sets: 1, superset_group: null, config: null,
};

/**
 * A plan as the server returns it for a given week.
 *
 * Cached per week, because setPlan with a structurally-equal but new object
 * re-renders, and a re-render re-runs the load effect — the same loop the
 * toast mock above avoids.
 */
const planCache = new Map<string, unknown>();
const planFor = (week: number, extra: Record<string, unknown> = {}) => {
  const key = `${week}:${JSON.stringify(extra)}`;
  if (!planCache.has(key)) planCache.set(key, buildPlan(week, extra));
  return planCache.get(key);
};

const buildPlan = (week: number, extra: Record<string, unknown> = {}) => ({
  id: 'p1', name: 'Hypertrophy', duration_weeks: 8, version: 1,
  progression_type: 'weight', progression_amount: 2.5, progression_every_weeks: 1,
  week, week_source: week === 1 ? 'base' : 'derived', anchor_week: 1, override_weeks: [],
  exercises: [
    { ...SQUAT, target_weight: 60 + 2.5 * (week - 1) },
    { ...SQUAT, id: 'w1-bench', exercise_id: 'x-bench', name: 'Bench Press', sort_order: 1, target_weight: 40 + 2.5 * (week - 1) },
  ],
  ...extra,
});


const renderBuilder = async () => {
  await act(async () => { render(<WorkoutBuilder planId="p1" clientId="c1" />); });
};

/** Walk the week stepper forward n times. */
const goToWeek = async (n: number) => {
  for (let i = 1; i < n; i += 1) {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /next week/i }));
    });
  }
};

/**
 * Wait for the 600ms autosave debounce to fire.
 *
 * Real timers, not fake ones. The builder's first paint is three awaited
 * promises deep, and fake timers stall the very `waitFor`/`findBy` polling
 * that would let it settle — every test in this file timed out that way
 * before the wait cost anything. 700ms per save is a price worth paying to
 * exercise the real debounce.
 */
const flushAutosave = () => waitFor(() => expect(patch).toHaveBeenCalled(), { timeout: 2500 });

beforeEach(() => {
  push.mockReset(); replace.mockReset();
  successToast.mockReset();
  patch.mockClear(); add.mockClear(); remove.mockClear();
  reorder.mockClear(); resetWeek.mockClear();
  detail.mockReset();
  detail.mockImplementation(async (_id: string, q?: { week?: number }) => planFor(q?.week ?? 1));
  params = new URLSearchParams('plan=p1&day=1');
});

describe('a later week is editable', () => {
  it('renders inputs, not a read-only list', async () => {
    await renderBuilder();
    await goToWeek(6);
    // Week 6's squat is 60 + 2.5×5 = 72.5, in a field the trainer can type in.
    expect(await screen.findByDisplayValue('72.5')).toBeInTheDocument();
  });

  it('says where the week’s numbers come from', async () => {
    await renderBuilder();
    await goToWeek(6);
    expect(screen.getByText(/Week 6 follows week 1/i)).toBeInTheDocument();
  });
});

describe('every write carries its week', () => {
  it('a field edit sends the week it was made in', async () => {
    await renderBuilder();
    await goToWeek(6);

    const field = await screen.findByDisplayValue('72.5');
    fireEvent.change(field, { target: { value: '50' } });
    fireEvent.blur(field);
    await flushAutosave();

    expect(patch).toHaveBeenCalled();
    expect(patch.mock.calls[0][2]).toMatchObject({ target_weight: 50, week_number: 6 });
  });

  it('an edit in week 1 sends no week at all', async () => {
    // Week 1 is the row itself. Naming a week there would be harmless but
    // would also mean the client cannot tell the two cases apart.
    await renderBuilder();

    const field = await screen.findByDisplayValue('60');
    fireEvent.change(field, { target: { value: '65' } });
    fireEvent.blur(field);
    await flushAutosave();

    expect(patch.mock.calls[0][2]).not.toHaveProperty('week_number');
  });

  it('binds the week at the KEYSTROKE, not at the save', async () => {
    // The autosave debounces for 600ms. A trainer who types in week 6 and
    // steps to week 7 before it fires must not have that edit land on week 7 —
    // reading the current week inside save() would do exactly that, and the
    // number would appear on the right card either way.
    await renderBuilder();
    await goToWeek(6);

    const field = await screen.findByDisplayValue('72.5');
    fireEvent.change(field, { target: { value: '50' } });
    fireEvent.blur(field);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /next week/i }));
    });
    await flushAutosave();

    expect(patch.mock.calls[0][2]).toMatchObject({ week_number: 6 });
  });

  it('removing an exercise names the week', async () => {
    await renderBuilder();
    await goToWeek(6);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /remove back squat/i }));
    });
    await waitFor(() => expect(remove).toHaveBeenCalledWith('p1', 'w1-squat', 6));
  });

  it('reordering a day names the week', async () => {
    await renderBuilder();
    await goToWeek(6);
    await act(async () => { fireEvent.click(screen.getByText('stub-reorder')); });

    await waitFor(() => expect(reorder).toHaveBeenCalled());
    expect(reorder.mock.calls[0]).toEqual(['p1', 1, ['w1-bench', 'w1-squat'], 6]);
  });

  it('duplicating an exercise names the week', async () => {
    await renderBuilder();
    await goToWeek(6);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /duplicate back squat/i }));
    });
    await waitFor(() => expect(add).toHaveBeenCalled());
    expect(add.mock.calls[0][1]).toMatchObject({ week_number: 6 });
  });
});

describe('once a week has been edited', () => {
  it('offers to put it back on the rule', async () => {
    detail.mockImplementation(async (_id: string, q?: { week?: number }) => {
      const w = q?.week ?? 1;
      return w === 6
        ? planFor(6, { week_source: 'override', anchor_week: 6, override_weeks: [6] })
        : planFor(w);
    });
    await renderBuilder();
    await goToWeek(6);

    expect(screen.getByText(/written by hand/i)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /put week 6 back on the rule/i }));
    });
    expect(resetWeek).toHaveBeenCalledWith('p1', 6);
  });

  it('offers nothing to reset on a week that just follows the rule', async () => {
    await renderBuilder();
    await goToWeek(6);
    expect(screen.queryByRole('button', { name: /back on the rule/i })).toBeNull();
  });

  it('says nothing about following a week, on week 1', async () => {
    // Week 1 is the programme, not an edit of it and not a follower of one.
    // "Week 1 follows week 1" is the sentence this guards against.
    await renderBuilder();
    expect(screen.queryByRole('button', { name: /back on the rule/i })).toBeNull();
    expect(screen.queryByText(/follows week/i)).toBeNull();
    expect(screen.queryByText(/written by hand/i)).toBeNull();
  });

  it('says the week stands on its own as soon as an edit is made', async () => {
    // The server decides this, but waiting for a refetch would leave the
    // banner calling the week computed while the trainer edits it.
    await renderBuilder();
    await goToWeek(6);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /remove back squat/i }));
    });
    await waitFor(() => expect(screen.getByText(/written by hand/i)).toBeInTheDocument());
  });
});
