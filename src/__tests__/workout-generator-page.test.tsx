// The rules generator's save used to open the builder — a screen that edits a
// plan nobody is on. The trainer left with a programme saved and unassigned,
// and had to remember to come back and assign it. Saving now lands on the
// assign surface, filtered to this client, so the next tap is the one that
// makes the plan live.
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
const mockCreatePlan = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    workoutGenerator: { preview: (...a: unknown[]) => mockPreview(...a) },
    workouts: { plans: { create: (...a: unknown[]) => mockCreatePlan(...a) } },
  },
}));

import WorkoutGeneratorPage from '@/app/(chrome)/pt-os/workout-generator/page';

const DRAFT = {
  goal: 'strength',
  experience: 'intermediate',
  warmup: [{ name: 'Bike', minutes: 5, intensity: 'low', notes: 'Easy' }],
  mainWork: [{
    id: 'squat',
    name: 'Back Squat',
    phase: 'main',
    movementPattern: 'Squat',
    primaryMuscle: 'Quadriceps',
    equipment: 'Barbell',
    difficulty: 'intermediate',
    reason: 'Primary lower-body pattern for a strength goal.',
    prescription: {
      sets: 3, reps: '5', restSeconds: 120, rpe: 7, notes: 'Leave one in reserve.',
      intensityPct1RM: 80,
    },
  }],
  conditioning: null,
  cooldown: [],
  excluded: [],
  warnings: [],
  explanations: [],
  totals: {
    exercises: 1, strengthMinutes: 20, cardioMinutes: 0, warmupMinutes: 5, cooldownMinutes: 0,
  },
};

beforeEach(() => {
  mockPush.mockReset();
  mockToastError.mockReset();
  mockToastSuccess.mockReset();
  mockPreview.mockReset();
  mockCreatePlan.mockReset();
  mockPreview.mockResolvedValue({
    client: { id: 'c1', name: 'Asha' },
    draft: DRAFT,
    poolSize: 2,
    validation: { ok: true, problems: [] },
  });
  mockCreatePlan.mockResolvedValue({ message: 'ok', plan: { id: 'plan-9' } });
});

describe('saving a rules-generated session', () => {
  it('opens the assign surface for this client, not the builder', async () => {
    render(<WorkoutGeneratorPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Save plan & assign/ }));

    await waitFor(() => expect(mockCreatePlan).toHaveBeenCalledTimes(1));
    expect(mockPush).toHaveBeenCalledWith('/pt-os/workout-plans?client_id=c1');
    expect(mockToastSuccess.mock.calls[0][0]).toMatch(/assign/i);
  });
});
