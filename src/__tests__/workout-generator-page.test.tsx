// The rules generator used to save one session as a one-day-a-week plan and
// leave the trainer to assign it. Saving now writes every generated day with
// its real weekday, the prescription detail (RIR, notes, protocols), and then
// assigns the plan to the client in the same action.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('client_id=c1'),
  useRouter: () => ({ push: mockPush }),
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({
    toast: { error: mockToastError, success: mockToastSuccess, warning: vi.fn() },
  }),
}));

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockPreview = vi.fn();
const mockListTms = vi.fn();
const mockSetTm = vi.fn();
const mockCreatePlan = vi.fn();
const mockAssign = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    workoutGenerator: {
      preview: (...a: unknown[]) => mockPreview(...a),
      trainingMaxes: {
        list: (...a: unknown[]) => mockListTms(...a),
        set: (...a: unknown[]) => mockSetTm(...a),
      },
    },
    workouts: {
      plans: { create: (...a: unknown[]) => mockCreatePlan(...a) },
      assign: (...a: unknown[]) => mockAssign(...a),
    },
  },
}));

import WorkoutGeneratorPage from '@/app/(chrome)/pt-os/workout-generator/page';

const WARMUP = [{ name: 'Bike', minutes: 5, intensity: 'low', notes: 'Easy' }];

const EXERCISE = {
  id: 'squat',
  name: 'Back Squat',
  phase: 'main',
  movementPattern: 'Squat',
  primaryMuscle: 'Quadriceps',
  equipment: 'Barbell',
  difficulty: 'intermediate',
  reason: 'Primary lower-body pattern for a strength goal.',
  prescription: {
    sets: 3, reps: '5', restSeconds: 120, rpe: 7, rir: 2,
    notes: 'Leave one in reserve.', intensityPct1RM: 80,
  },
};

const BENCH = {
  ...EXERCISE,
  id: 'bench',
  name: 'Bench Press',
  movementPattern: 'Horizontal Push',
  primaryMuscle: 'Chest',
  prescription: { ...EXERCISE.prescription, sets: 4, reps: '3', rpe: 8, rir: 1 },
};

const SESSION_A = {
  day_of_week: 1,
  day_name: 'Monday',
  name: 'Squat session',
  focus: 'Squat',
  warmup: WARMUP,
  mainWork: [EXERCISE],
  conditioning: null,
  cooldown: [],
  estimated_minutes: 40,
  totals: {
    exercises: 1, strengthMinutes: 18, cardioMinutes: 0, warmupMinutes: 5, cooldownMinutes: 0,
  },
};

const SESSION_B = {
  ...SESSION_A,
  day_of_week: 4,
  day_name: 'Thursday',
  name: 'Horizontal Push session',
  focus: 'Horizontal Push',
  mainWork: [BENCH],
};

const DRAFT = {
  goal: 'strength',
  experience: 'intermediate',
  daysPerWeek: 2,
  sessionMinutes: 45,
  warmup: WARMUP,
  mainWork: [EXERCISE],
  conditioning: null,
  cooldown: [],
  sessions: [SESSION_A, SESSION_B],
  excluded: [],
  warnings: [],
  explanations: [],
  totals: {
    exercises: 2, strengthMinutes: 36, cardioMinutes: 0, warmupMinutes: 5, cooldownMinutes: 0,
    sessions: 2, estimatedMinutes: 40,
  },
};

// A block is two weeks here, not twelve: the page must save whatever block the
// server returned, and the engine's own week arithmetic is tested in the backend.
const BLOCK_EXERCISE = {
  ...EXERCISE,
  prescription: { ...EXERCISE.prescription, target_weight: 130, basis: 'training_max' },
};
const BLOCK_SESSION = {
  ...SESSION_A,
  phase: 'base',
  phase_label: 'Base',
  is_deload: false,
  mainWork: [BLOCK_EXERCISE],
};
const BLOCK_DRAFT = {
  ...DRAFT,
  goal: 'powerlifting',
  sessions: [BLOCK_SESSION],
  periodization: {
    model: 'powerlifting_block',
    block_weeks: 2,
    phases: [
      { phase: 'base', label: 'Base', start_week: 1, end_week: 1, weeks: [1], focus: 'Volume.' },
      { phase: 'taper', label: 'Taper', start_week: 2, end_week: 2, weeks: [2], focus: 'Sharpening.' },
    ],
    weeks: [
      { week: 1, phase: 'base', label: 'Base', week_in_phase: 1, phase_weeks: 1, is_deload: false, sessions: [BLOCK_SESSION] },
      {
        week: 2,
        phase: 'taper',
        label: 'Taper',
        week_in_phase: 1,
        phase_weeks: 1,
        is_deload: false,
        sessions: [{ ...BLOCK_SESSION, day_of_week: 4, day_name: 'Thursday', mainWork: [{ ...BLOCK_EXERCISE, id: 'bench' }] }],
      },
    ],
    training_maxes: [{ exercise_id: 'squat', name: 'Back Squat', lift: 'squat', training_max_kg: 200 }],
    missing_training_maxes: [],
  },
};

beforeEach(() => {
  mockPush.mockReset();
  mockToastError.mockReset();
  mockToastSuccess.mockReset();
  mockPreview.mockReset();
  mockListTms.mockReset();
  mockSetTm.mockReset();
  mockCreatePlan.mockReset();
  mockAssign.mockReset();
  mockPreview.mockResolvedValue({
    client: { id: 'c1', name: 'Asha' },
    draft: DRAFT,
    poolSize: 2,
    validation: { ok: true, problems: [] },
  });
  mockListTms.mockResolvedValue({
    lifts: [{
      exercise_id: 'squat',
      name: 'Back Squat',
      lift: 'squat',
      training_max_kg: 200,
      source: 'manual',
      best_e1rm_kg: 220,
      best_e1rm_date: '2026-10-01',
      suggestion: { suggested_kg: 200, applied: false, reason: 'Within one increment. No change.' },
    }],
  });
  mockCreatePlan.mockResolvedValue({ message: 'ok', plan: { id: 'plan-9' } });
  mockAssign.mockResolvedValue({ message: 'ok' });
});

describe('saving a rules-generated week', () => {
  it('writes every day with its weekday, RIR and protocols, then assigns it', async () => {
    render(<WorkoutGeneratorPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Save plan & assign/ }));

    await waitFor(() => expect(mockCreatePlan).toHaveBeenCalledTimes(1));
    const payload = mockCreatePlan.mock.calls[0][0] as {
      sessions_per_week: number;
      duration_weeks: number;
      warmup_protocol: unknown;
      cooldown_protocol: unknown;
      exercises: Array<Record<string, unknown>>;
    };
    expect(payload.sessions_per_week).toBe(2);
    expect(payload.duration_weeks).toBe(4);
    expect(payload.warmup_protocol).toEqual(WARMUP);
    expect(payload.cooldown_protocol).toEqual([]);
    expect(payload.exercises.map((e) => e.day_of_week)).toEqual([1, 4]);
    expect(payload.exercises.map((e) => e.sort_order)).toEqual([1, 1]);
    expect(payload.exercises[0]).toMatchObject({ exercise_id: 'squat', rpe: 7, rir: 2 });
    expect(payload.exercises[1]).toMatchObject({ exercise_id: 'bench', rpe: 8, rir: 1 });
    expect(String(payload.exercises[0].notes)).toMatch(/RIR 2/);

    expect(mockAssign).toHaveBeenCalledWith({ workout_plan_id: 'plan-9', client_id: 'c1' });
    expect(mockPush).toHaveBeenCalledWith('/pt-os/clients/c1/training/assigned');
    expect(mockToastSuccess.mock.calls[0][0]).toMatch(/saved and assigned/i);
  });

  it('drafts the week the trainer asks for and shows every day', async () => {
    render(<WorkoutGeneratorPage />);
    await waitFor(() => expect(mockPreview).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Days per week'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Session minutes'), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate/ }));

    await waitFor(() => expect(mockPreview).toHaveBeenLastCalledWith(
      'c1',
      expect.objectContaining({ daysPerWeek: 2, sessionMinutes: 45 }),
    ));
    expect(await screen.findByText(/1\. Monday/)).toBeTruthy();
    expect(await screen.findByText(/2\. Thursday/)).toBeTruthy();
  });

  it('does not claim the plan was lost when only the assignment fails', async () => {
    mockAssign.mockRejectedValueOnce(new Error('screening blocked'));
    render(<WorkoutGeneratorPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Save plan & assign/ }));

    await waitFor(() => expect(mockAssign).toHaveBeenCalledTimes(1));
    expect(mockToastError.mock.calls[0][0]).toMatch(/Plan saved, but assigning it failed/);
    expect(mockPush).toHaveBeenCalledWith('/pt-os/workout-plans?client_id=c1');
  });
});

describe('saving a powerlifting block', () => {
  it('previews the whole block and saves every week as its own anchor', async () => {
    mockPreview.mockResolvedValue({
      client: { id: 'c1', name: 'Asha' },
      draft: BLOCK_DRAFT,
      poolSize: 2,
      validation: { ok: true, problems: [] },
    });
    render(<WorkoutGeneratorPage />);
    await waitFor(() => expect(mockPreview).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Periodisation'), { target: { value: 'powerlifting_block' } });
    await waitFor(() => expect(mockListTms).toHaveBeenCalledWith('c1'));
    fireEvent.click(screen.getByRole('button', { name: /Generate/ }));

    await waitFor(() => expect(mockPreview).toHaveBeenLastCalledWith(
      'c1',
      expect.objectContaining({ periodization: 'powerlifting_block', blockWeeks: 12 }),
    ));
    expect(await screen.findByText('Week 1 — Base')).toBeTruthy();

    // The trainer can review any week, not only the one the block starts on.
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(await screen.findByText('Week 2 — Taper')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Save plan & assign/ }));

    await waitFor(() => expect(mockCreatePlan).toHaveBeenCalledTimes(1));
    const payload = mockCreatePlan.mock.calls[0][0] as {
      duration_weeks: number;
      sessions_per_week: number;
      periodization_model?: string;
      block_phases?: Array<{ week: number }>;
      exercises: Array<Record<string, unknown>>;
    };
    expect(payload.periodization_model).toBe('powerlifting_block');
    expect(payload.duration_weeks).toBe(2);
    expect(payload.sessions_per_week).toBe(1);
    expect(payload.block_phases?.map((phase) => phase.week)).toEqual([1, 2]);
    expect(payload.exercises.map((ex) => ex.week_number)).toEqual([1, 2]);
    expect(payload.exercises[0]).toMatchObject({ exercise_id: 'squat', target_weight: 130 });
    expect(mockAssign).toHaveBeenCalledWith({ workout_plan_id: 'plan-9', client_id: 'c1' });
  });
});
