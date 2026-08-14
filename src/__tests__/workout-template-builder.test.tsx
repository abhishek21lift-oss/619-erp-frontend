// The builder for one workout day.
//
// Three properties are worth pinning, and each is a consequence of the new
// schema rather than a styling choice:
//
//   · a day reads warm-up first and cool-down last, whatever order the rows
//     were added in — sections are information, because volume analytics
//     counts working sets differently from warm-ups;
//   · a cardio row and a strength row sit in the same day and describe
//     themselves differently, which the old builder could not do at all;
//   · reordering inside one section must not scramble the others, because
//     order_index is global and the reorder endpoint takes the whole list.
//
// The third is pure function territory and is tested directly — a drag is
// hard to simulate honestly and the arithmetic is where the bug would be.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkoutTemplateBuilder, { groupBySection, reorderWithinSection }
  from '@/components/pt-os/training/WorkoutTemplateBuilder';
import type { PrescriptionTypeMeta, TemplateExercise, WorkoutSection } from '@/lib/api';

const updateExercise = vi.fn(async () => ({ data: {}, warnings: [] as string[] }));
const removeExercise = vi.fn(async () => ({ data: { id: 'x', deleted: true } }));
const addExercise = vi.fn(async () => ({ data: {}, warnings: [] as string[] }));
const reorder = vi.fn(async () => ({ data: { id: 't1', reordered: 2 } }));

vi.mock('@/lib/api', () => ({
  api: {
    training: {
      templates: {
        updateExercise: (...a: unknown[]) => updateExercise(...(a as [])),
        removeExercise: (...a: unknown[]) => removeExercise(...(a as [])),
        addExercise: (...a: unknown[]) => addExercise(...(a as [])),
        reorder: (...a: unknown[]) => reorder(...(a as [])),
      },
    },
  },
}));

const info = vi.fn();
const errorToast = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: errorToast, info, warning: vi.fn() } }),
}));

const TYPES: PrescriptionTypeMeta[] = [
  { type: 'SETS_REPS', required: ['target_sets'], optional: ['target_weight'],
    fields: ['target_sets', 'target_weight'], logs_as: 'sets' },
  { type: 'TIME_DISTANCE', required: ['target_duration_seconds'], optional: ['target_incline'],
    fields: ['target_duration_seconds', 'target_incline'], logs_as: 'cardio' },
];

const row = (over: Partial<TemplateExercise> & { id: string }): TemplateExercise => ({
  workout_template_id: 't1', exercise_id: 'ex', exercise_name: 'Exercise',
  section: 'MAIN', order_index: 0, superset_group: null, circuit_group: null,
  prescription_type: 'SETS_REPS',
  target_sets: null, target_reps_min: null, target_reps_max: null, target_weight: null,
  weight_unit: 'kg', target_rpe: null, target_rir: null, target_tempo: null,
  target_rest_seconds: null, percentage_1rm: null,
  target_duration_seconds: null, target_distance: null, distance_unit: null,
  target_speed: null, target_incline: null, target_resistance: null,
  target_heart_rate: null, target_calories: null, target_pace_seconds: null,
  work_interval_seconds: null, rest_interval_seconds: null, target_rounds: null,
  warmup: false, optional: false, notes: null,
  ...over,
});

/** A realistic day: warm-up treadmill, main squat, cardio finisher. */
const DAY: TemplateExercise[] = [
  row({ id: 'r-squat', exercise_name: 'Back Squat', section: 'MAIN', order_index: 1,
        summary: '4 × 6 · 100kg · RPE 8' }),
  row({ id: 'r-tread', exercise_name: 'Treadmill', section: 'WARMUP', order_index: 0,
        prescription_type: 'TIME_DISTANCE', summary: '5 min' }),
  row({ id: 'r-bike', exercise_name: 'Cycling', section: 'CARDIO', order_index: 2,
        prescription_type: 'TIME_DISTANCE', summary: '15 min · 3 km' }),
];

const props = {
  templateId: 't1', types: TYPES, onChanged: vi.fn(), onAddExercise: vi.fn(),
};

beforeEach(() => {
  updateExercise.mockClear(); removeExercise.mockClear();
  addExercise.mockClear(); reorder.mockClear();
  info.mockClear(); errorToast.mockClear();
  props.onChanged = vi.fn(); props.onAddExercise = vi.fn();
});

describe('sections', () => {
  it('reads warm-up first and cardio last, whatever order the rows arrived in', () => {
    render(<WorkoutTemplateBuilder {...props} exercises={DAY} />);
    const headings = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(headings).toEqual(['Warm-up · 1', 'Main · 1', 'Cardio · 1']);
  });

  it('skips sections with nothing in them', () => {
    // Eight empty headings would be a form, not a workout.
    render(<WorkoutTemplateBuilder {...props} exercises={DAY} />);
    expect(screen.queryByText(/Cool-down/)).toBeNull();
    expect(screen.queryByText(/Mobility/)).toBeNull();
  });

  it('treats a row with no section as MAIN rather than dropping it', () => {
    const orphan = [{ ...row({ id: 'r-x', exercise_name: 'Orphan' }), section: null as unknown as WorkoutSection }];
    render(<WorkoutTemplateBuilder {...props} exercises={orphan} />);
    expect(screen.getByText('Orphan')).toBeTruthy();
  });

  it('offers Add per section, and says which one', () => {
    render(<WorkoutTemplateBuilder {...props} exercises={DAY} />);
    fireEvent.click(screen.getByLabelText('Add exercise to Cardio'));
    expect(props.onAddExercise).toHaveBeenCalledWith('CARDIO');
  });
});

describe('a strength row and a cardio row in the same day', () => {
  it('each describes itself with the server-rendered summary', () => {
    // The old builder showed SETS/REPS/WEIGHT/REST for both, because the
    // schema forced every row to claim sets and reps.
    render(<WorkoutTemplateBuilder {...props} exercises={DAY} />);
    expect(screen.getByText('4 × 6 · 100kg · RPE 8')).toBeTruthy();
    expect(screen.getByText('15 min · 3 km')).toBeTruthy();
  });

  it('falls back to the type name when the server sent no summary', () => {
    render(<WorkoutTemplateBuilder {...props}
      exercises={[row({ id: 'r1', exercise_name: 'Row', summary: undefined })]} />);
    expect(screen.getByText('SETS REPS')).toBeTruthy();
  });

  it('opens the type-aware editor for the row that was tapped', () => {
    render(<WorkoutTemplateBuilder {...props} exercises={DAY} />);
    fireEvent.click(screen.getByText('Cycling'));
    // The cardio row's editor, so duration — not sets.
    expect(screen.getByLabelText(/Duration/)).toBeTruthy();
    expect(screen.queryByLabelText(/^Sets/)).toBeNull();
  });

  it('opens one row at a time', () => {
    render(<WorkoutTemplateBuilder {...props} exercises={DAY} />);
    fireEvent.click(screen.getByText('Back Squat'));
    expect(screen.getByLabelText(/^Sets/)).toBeTruthy();
    fireEvent.click(screen.getByText('Cycling'));
    expect(screen.queryByLabelText(/^Sets/)).toBeNull();
    expect(screen.getByLabelText(/Duration/)).toBeTruthy();
  });
});

describe('superset and warm-up markers', () => {
  it('labels rows that share a superset group', () => {
    // Migration 136 added the column; nothing ever rendered it.
    render(<WorkoutTemplateBuilder {...props} exercises={[
      row({ id: 'a', exercise_name: 'Press', superset_group: 'A' }),
      row({ id: 'b', exercise_name: 'Row', superset_group: 'A', order_index: 1 }),
    ]} />);
    expect(screen.getAllByText('A')).toHaveLength(2);
  });

  it('marks a warm-up row, because volume counts it differently', () => {
    render(<WorkoutTemplateBuilder {...props} exercises={[row({ id: 'w', warmup: true })]} />);
    expect(screen.getByText('warm-up')).toBeTruthy();
  });
});

describe('mutations', () => {
  it('saves an edit and tells the parent to refetch', async () => {
    render(<WorkoutTemplateBuilder {...props} exercises={DAY} />);
    fireEvent.click(screen.getByText('Back Squat'));
    fireEvent.change(screen.getByLabelText(/^Sets/), { target: { value: '5' } });

    await waitFor(() => expect(updateExercise).toHaveBeenCalledWith('t1', 'r-squat', { target_sets: 5 }));
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
  });

  it('surfaces a server warning without blocking the save', async () => {
    // "target_sets has no meaning for a TIME prescription" is worth saying and
    // never worth refusing — the row still saved.
    updateExercise.mockResolvedValueOnce({ data: {}, warnings: ['target_sets will be ignored'] });
    render(<WorkoutTemplateBuilder {...props} exercises={DAY} />);
    fireEvent.click(screen.getByText('Back Squat'));
    fireEvent.change(screen.getByLabelText(/^Sets/), { target: { value: '5' } });

    await waitFor(() => expect(info).toHaveBeenCalledWith('target_sets will be ignored'));
    expect(props.onChanged).toHaveBeenCalled();
  });

  it('duplicates the prescription without carrying the id', async () => {
    render(<WorkoutTemplateBuilder {...props} exercises={DAY} />);
    fireEvent.click(screen.getByLabelText('Duplicate Back Squat'));

    await waitFor(() => expect(addExercise).toHaveBeenCalled());
    const [, payload] = addExercise.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('summary');
    expect(payload.exercise_id).toBe('ex');
    expect(payload.order_index).toBe(2);          // straight after the original
  });

  it('removes a row', async () => {
    render(<WorkoutTemplateBuilder {...props} exercises={DAY} />);
    fireEvent.click(screen.getByLabelText('Remove Treadmill'));
    await waitFor(() => expect(removeExercise).toHaveBeenCalledWith('t1', 'r-tread'));
  });

  // NOT TESTED HERE: the reorder failure path (on a rejected reorder the
  // component refetches, so the screen stops showing an order that did not
  // save). Driving it needs a real drag through framer-motion's Reorder.Group,
  // which jsdom cannot produce honestly — and a test that renders the builder
  // and then asserts a heading exists would be green on broken code, which is
  // worse than the gap. The arithmetic the drag feeds is covered below.
});

describe('reordering one section leaves the others alone', () => {
  // order_index is global and the endpoint takes the whole template, so this
  // arithmetic is where a "drag in Main scrambled the warm-up" bug would live.
  const all = [
    row({ id: 'w1', section: 'WARMUP', order_index: 0 }),
    row({ id: 'm1', section: 'MAIN', order_index: 1 }),
    row({ id: 'm2', section: 'MAIN', order_index: 2 }),
    row({ id: 'c1', section: 'CARDIO', order_index: 3 }),
  ];

  it('swaps two Main rows and keeps warm-up and cardio in place', () => {
    const next = reorderWithinSection(all, 'MAIN', [
      all.find((r) => r.id === 'm2')!, all.find((r) => r.id === 'm1')!,
    ]);
    expect(next).toEqual(['w1', 'm2', 'm1', 'c1']);
  });

  it('is a no-op when the order did not change', () => {
    const next = reorderWithinSection(all, 'MAIN', [
      all.find((r) => r.id === 'm1')!, all.find((r) => r.id === 'm2')!,
    ]);
    expect(next).toEqual(['w1', 'm1', 'm2', 'c1']);
  });

  it('returns every row exactly once', () => {
    // A slot-filling bug would drop or repeat one, and the endpoint would
    // then silently reindex the survivors.
    const next = reorderWithinSection(all, 'MAIN', [
      all.find((r) => r.id === 'm2')!, all.find((r) => r.id === 'm1')!,
    ]);
    expect(new Set(next).size).toBe(all.length);
    expect(next).toHaveLength(all.length);
  });

  it('groups by section in reading order regardless of order_index', () => {
    const groups = groupBySection([
      row({ id: 'c', section: 'COOLDOWN', order_index: 0 }),
      row({ id: 'w', section: 'WARMUP', order_index: 9 }),
    ]);
    expect(groups.map((g) => g.section)).toEqual(['WARMUP', 'COOLDOWN']);
  });
});

describe('the empty state', () => {
  it('says what to do and offers the one action', () => {
    render(<WorkoutTemplateBuilder {...props} exercises={[]} />);
    expect(screen.getByText(/Nothing prescribed yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add exercise/ }));
    expect(props.onAddExercise).toHaveBeenCalledWith('MAIN');
  });
});
