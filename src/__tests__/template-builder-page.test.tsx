// The page that mounts the workout day builder.
//
// It is deliberately thin — load, hold the picker's open state, hand the rest
// to WorkoutTemplateBuilder — so the things worth testing are the seams:
//
//   · the picker adds into the section its Add button belongs to, not always
//     into MAIN;
//   · adding to a cardio section starts as a cardio prescription, so a trainer
//     putting a treadmill in the Cardio block is not first shown sets and reps
//     they have to clear;
//   · exercises already in the day are marked rather than hidden, because a
//     trainer who cannot find a movement they know exists assumes the search
//     is broken;
//   · a failed load says so and offers Retry instead of rendering an empty
//     builder that looks like an empty workout.
import { Suspense } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/pt-os/training/templates/t1',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const errorToast = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: errorToast, info: vi.fn(), warning: vi.fn() } }),
}));

/** Stand-in for the real picker: it only needs to report a selection. */
let pickerOpen = false;
let pickerExistingIds: string[] = [];
vi.mock('@/components/pt-os/workout-log/ExercisePicker', () => ({
  default: ({ open, onSelect, existingIds }: {
    open: boolean; onSelect: (e: { id: string; name: string }) => void; existingIds?: string[];
  }) => {
    pickerOpen = open;
    pickerExistingIds = existingIds ?? [];
    return open
      ? <button onClick={() => onSelect({ id: 'ex-tread', name: 'Treadmill' })}>pick-treadmill</button>
      : null;
  },
}));

const META = {
  prescription_types: [
    { type: 'SETS_REPS', required: ['target_sets'], optional: [], fields: ['target_sets'], logs_as: 'sets' },
    { type: 'TIME', required: ['target_duration_seconds'], optional: [],
      fields: ['target_duration_seconds'], logs_as: 'cardio' },
  ],
  sections: [], progression_types: [], record_types: [], set_types: [], cardio_types: [],
  units: { weight: ['kg'], distance: ['km'] },
};

const LEG_DAY = {
  id: 't1', organization_id: 'o1', program_id: null, week_id: null,
  name: 'Leg Day A', description: null, day_number: 1, day_label: 'Monday',
  goal: 'Strength', estimated_duration_minutes: 60, notes: null,
  exercises: [{
    id: 'r1', workout_template_id: 't1', exercise_id: 'ex-squat', exercise_name: 'Back Squat',
    section: 'MAIN', order_index: 0, superset_group: null, circuit_group: null,
    prescription_type: 'SETS_REPS', target_sets: 4, target_reps_min: 6,
    target_reps_max: null, target_weight: 100, weight_unit: 'kg',
    target_rpe: null, target_rir: null, target_tempo: null, target_rest_seconds: null,
    percentage_1rm: null, target_duration_seconds: null, target_distance: null,
    distance_unit: null, target_speed: null, target_incline: null, target_resistance: null,
    target_heart_rate: null, target_calories: null, target_pace_seconds: null,
    work_interval_seconds: null, rest_interval_seconds: null, target_rounds: null,
    warmup: false, optional: false, notes: null, summary: '4 × 6 · 100kg',
  }],
};

const templateGet = vi.fn();
const addExercise = vi.fn(async () => ({ data: {}, warnings: [] }));

vi.mock('@/lib/api', () => ({
  api: {
    training: {
      meta: async () => ({ data: META }),
      templates: {
        get: (...a: unknown[]) => templateGet(...(a as [])),
        addExercise: (...a: unknown[]) => addExercise(...(a as [])),
        updateExercise: vi.fn(async () => ({ data: {}, warnings: [] })),
        removeExercise: vi.fn(async () => ({ data: {} })),
        reorder: vi.fn(async () => ({ data: {} })),
      },
    },
  },
}));

import TemplateBuilderPage from '@/app/(chrome)/pt-os/training/templates/[id]/page';
import { __resetTrainingMetaCache } from '@/lib/training/useTrainingMeta';

// The page reads its route params with React's `use`, so it suspends on first
// render. Next.js supplies the boundary in production; the test has to — and
// the retry after the params promise settles only runs inside an awaited act,
// so the helper is async.
const renderPage = async () => {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <TemplateBuilderPage params={Promise.resolve({ id: 't1' })} />
      </Suspense>,
    );
  });
};

beforeEach(() => {
  // mockReset, not mockClear: a test that seeds a whole day with
  // mockResolvedValue needs that seed gone before the next one runs, or the
  // next test silently asserts against the previous test's workout.
  templateGet.mockReset();
  templateGet.mockResolvedValue({ data: LEG_DAY });
  addExercise.mockReset();
  addExercise.mockResolvedValue({ data: {}, warnings: [] });
  errorToast.mockClear();
  pickerOpen = false; pickerExistingIds = [];
  __resetTrainingMetaCache();
});

describe('loading the day', () => {
  it('shows the workout name and its day label', async () => {
    await renderPage();
    expect(await screen.findByText('Leg Day A')).toBeTruthy();
    expect(screen.getByText(/Monday/)).toBeTruthy();
  });

  it('renders the prescribed exercise with its server-rendered summary', async () => {
    await renderPage();
    expect(await screen.findByText('Back Squat')).toBeTruthy();
    expect(screen.getByText('4 × 6 · 100kg')).toBeTruthy();
  });

  it('says so and offers Retry when the load fails', async () => {
    // An empty builder here would read as an empty workout, which is a
    // different and much more alarming thing than a failed request.
    templateGet.mockRejectedValueOnce(new Error('network down'));
    await renderPage();
    expect(await screen.findByText('network down')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeTruthy();
    expect(screen.queryByText(/Nothing prescribed yet/)).toBeNull();
  });
});

describe('adding an exercise', () => {
  it('adds into the section whose Add button was used', async () => {
    await renderPage();
    await screen.findByText('Back Squat');

    fireEvent.click(screen.getByLabelText('Add exercise to Main'));
    await waitFor(() => expect(pickerOpen).toBe(true));
    fireEvent.click(screen.getByText('pick-treadmill'));

    await waitFor(() => expect(addExercise).toHaveBeenCalled());
    const [, payload] = addExercise.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(payload.section).toBe('MAIN');
    expect(payload.exercise_id).toBe('ex-tread');
  });

  it('starts a strength section as a strength prescription', async () => {
    await renderPage();
    await screen.findByText('Back Squat');
    fireEvent.click(screen.getByLabelText('Add exercise to Main'));
    fireEvent.click(await screen.findByText('pick-treadmill'));

    await waitFor(() => expect(addExercise).toHaveBeenCalled());
    const [, payload] = addExercise.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(payload.prescription_type).toBe('SETS_REPS');
    expect(payload.target_sets).toBe(3);
    expect(payload).not.toHaveProperty('target_duration_seconds');
  });

  it('starts a cardio section as a cardio prescription', async () => {
    // A trainer putting a treadmill in the Cardio block should not first be
    // shown sets and reps they have to clear — which is exactly what the old
    // schema forced for every row.
    templateGet.mockResolvedValueOnce({
      data: { id: 't1', name: 'Conditioning', day_number: null, day_label: null, exercises: [] },
    } as never);
    await renderPage();
    await screen.findByText(/Nothing prescribed yet/);

    // The empty state adds to MAIN; drive the cardio path through the builder's
    // own callback by seeding a cardio row instead.
    templateGet.mockResolvedValueOnce({
      data: {
        id: 't1', name: 'Conditioning', day_number: null, day_label: null,
        exercises: [{
          id: 'c1', workout_template_id: 't1', exercise_id: 'ex-bike', exercise_name: 'Bike',
          section: 'CARDIO', order_index: 0, superset_group: null, circuit_group: null,
          prescription_type: 'TIME', weight_unit: 'kg', warmup: false, optional: false,
          summary: '10 min',
        }],
      },
    } as never);
    fireEvent.click(screen.getByRole('button', { name: /Add exercise/ }));
    fireEvent.click(await screen.findByText('pick-treadmill'));

    await waitFor(() => expect(addExercise).toHaveBeenCalled());
    addExercise.mockClear();

    // Now the Cardio section exists and its Add button carries CARDIO.
    const cardioAdd = await screen.findByLabelText('Add exercise to Cardio');
    fireEvent.click(cardioAdd);
    fireEvent.click(await screen.findByText('pick-treadmill'));

    await waitFor(() => expect(addExercise).toHaveBeenCalled());
    const [, payload] = addExercise.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(payload.section).toBe('CARDIO');
    expect(payload.prescription_type).toBe('TIME');
    expect(payload.target_duration_seconds).toBe(600);
    expect(payload).not.toHaveProperty('target_sets');
  });

  it('marks a warm-up row as one, because volume counts it differently', async () => {
    templateGet.mockResolvedValue({
      data: {
        id: 't1', name: 'Day', day_number: null, day_label: null,
        exercises: [{
          id: 'w1', workout_template_id: 't1', exercise_id: 'ex-a', exercise_name: 'A',
          section: 'WARMUP', order_index: 0, prescription_type: 'SETS_REPS',
          weight_unit: 'kg', warmup: true, optional: false, superset_group: null,
          circuit_group: null, summary: '1 × 10',
        }],
      },
    } as never);
    await renderPage();
    fireEvent.click(await screen.findByLabelText('Add exercise to Warm-up'));
    fireEvent.click(await screen.findByText('pick-treadmill'));

    await waitFor(() => expect(addExercise).toHaveBeenCalled());
    const [, payload] = addExercise.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(payload.warmup).toBe(true);
  });

  it('tells the picker what is already in the day, so it can mark rather than hide', async () => {
    await renderPage();
    await screen.findByText('Back Squat');
    fireEvent.click(screen.getByLabelText('Add exercise to Main'));
    await waitFor(() => expect(pickerExistingIds).toContain('ex-squat'));
  });

  it('reports a failed add rather than silently doing nothing', async () => {
    addExercise.mockRejectedValueOnce(new Error('plan limit reached'));
    await renderPage();
    await screen.findByText('Back Squat');
    fireEvent.click(screen.getByLabelText('Add exercise to Main'));
    fireEvent.click(await screen.findByText('pick-treadmill'));

    await waitFor(() => expect(errorToast).toHaveBeenCalledWith('plan limit reached'));
  });

  it('closes the picker once a selection is made', async () => {
    await renderPage();
    await screen.findByText('Back Squat');
    fireEvent.click(screen.getByLabelText('Add exercise to Main'));
    fireEvent.click(await screen.findByText('pick-treadmill'));
    await waitFor(() => expect(pickerOpen).toBe(false));
  });
});
