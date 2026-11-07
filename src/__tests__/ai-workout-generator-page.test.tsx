// /ai/workout-generator — what it sends, and the two facts it used to invent.
//
// The form started with general_fitness, beginner, gym and four days and sent
// all four as trainer-stated facts. For a client whose record was thin they
// became the programme's inputs even though nobody typed them. Blank now
// means blank: the server's record is the authority and omission is how the
// browser says "I have nothing to add".
//
// It also offers body recomp — the goal the studio actually records — and a
// place to record the studio's equipment once, because the AI reads that
// setting and no screen wrote it.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('client_id=c1'),
}));

const generateWorkout = vi.fn();
const saveFromGeneration = vi.fn();
const settingsGetAll = vi.fn();
const settingsUpdate = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    ai: { generateWorkout: (...a: unknown[]) => generateWorkout(...a) },
    workouts: { plans: { saveFromGeneration: (...a: unknown[]) => saveFromGeneration(...a) } },
    settings: {
      getAll: (...a: unknown[]) => settingsGetAll(...a),
      update: (...a: unknown[]) => settingsUpdate(...a),
    },
    clients: {
      list: async () => [],
      search: async () => [],
    },
  },
}));

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const prefillState: { facts: null; loading: boolean; failed: boolean } = {
  facts: null, loading: false, failed: false,
};
vi.mock('@/lib/ai-client-prefill', () => ({
  useAiClientPrefill: () => prefillState,
  applyFacts: (form: Record<string, string>) => form,
  hasAnyFact: () => false,
}));

vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }),
}));

import WorkoutGeneratorPage from '@/app/(chrome)/ai/workout-generator/page';

beforeEach(() => {
  prefillState.failed = false;
  generateWorkout.mockReset().mockResolvedValue({
    data: { weekly_schedule: {} }, model: 'm', generation_id: 'g1',
  });
  saveFromGeneration.mockReset().mockResolvedValue({
    message: 'ok', plan_id: 'p1', client_id: 'c1', name: 'Foundation',
    saved: 18, unresolved: [], unknown_days: [], assigned: true,
    other_active_assignments: 0,
  });
  settingsGetAll.mockReset().mockResolvedValue({ settings: {} });
  settingsUpdate.mockReset().mockResolvedValue({ message: 'ok', count: 1 });
});

describe('the standalone AI workout generator', () => {
  it('sends the client id and nothing the trainer did not state', async () => {
    render(<WorkoutGeneratorPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Generate Workout Plan/i }));

    await waitFor(() => expect(generateWorkout).toHaveBeenCalledTimes(1));
    expect(generateWorkout).toHaveBeenCalledWith(
      { client_id: 'c1' },
      expect.any(AbortSignal),
    );
  });

  it('offers body recomposition as a goal', async () => {
    render(<WorkoutGeneratorPage />);

    const goal = await screen.findByLabelText('Fitness Goal');
    expect(within(goal).getByRole('option', { name: 'Body Recomposition' })).toBeTruthy();
  });

  it('records the studio equipment the generator reads', async () => {
    settingsGetAll.mockResolvedValue({ settings: { studio_equipment: 'barbell, rack, bench' } });
    render(<WorkoutGeneratorPage />);

    const input = await screen.findByLabelText(/Studio equipment/i);
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('barbell, rack, bench'));

    fireEvent.change(input, { target: { value: 'barbell, rack, bench, dumbbells' } });
    fireEvent.click(screen.getByRole('button', { name: /Save equipment/i }));

    await waitFor(() => expect(settingsUpdate).toHaveBeenCalledWith({
      studio_equipment: 'barbell, rack, bench, dumbbells',
    }));
  });

  it('saves and assigns the generated plan', async () => {
    render(<WorkoutGeneratorPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Generate Workout Plan/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Save & assign/i }));

    await waitFor(() => expect(saveFromGeneration).toHaveBeenCalledWith({ generation_id: 'g1' }));
    expect(await screen.findByText(/now live for this client/i)).toBeTruthy();
  });

  it.each([
    ['Progress this programme', 'adapt'],
    ['Start a new one', 'new'],
  ])('offers "%s" when the client is already on a programme', async (label, mode) => {
    generateWorkout
      .mockRejectedValueOnce(Object.assign(new Error('Foundation is active and this is week 2 of 8. Choose whether to progress it or start a new one.'), {
        status: 409,
        code: 'ACTIVE_PROGRAM',
        payload: { program: { plan_name: 'Foundation', current_week: 2, duration_weeks: 8 } },
      }))
      .mockResolvedValueOnce({ data: { weekly_schedule: {} }, model: 'm', generation_id: 'g2' });

    render(<WorkoutGeneratorPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Generate Workout Plan/i }));

    expect(await screen.findByText(/Foundation is active/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(label, 'i') }));

    await waitFor(() => expect(generateWorkout).toHaveBeenLastCalledWith(
      { client_id: 'c1', mode },
      expect.any(AbortSignal),
    ));
  });

  it('shows the screen, rule check, quality and second opinion the server sent', async () => {
    generateWorkout.mockResolvedValue({
      data: { weekly_schedule: {} }, model: 'm', generation_id: 'g1',
      quality: { score: 80, max: 100, components: {}, basis: 'no critical findings' },
      screen: {
        screened: false, sources: [],
        constraints: [], referrals: [], excluded_exercises: [], not_assessed: [],
        gate: { status: 'unknown', cleared: false },
      },
      critique: [{ severity: 'high', point: 'No horizontal pull', because: 'Push/pull imbalance' }],
    });

    render(<WorkoutGeneratorPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Generate Workout Plan/i }));

    expect(await screen.findByText(/Not screened against this client/i)).toBeTruthy();
    expect(screen.getByText(/Quality 80\/100/)).toBeTruthy();
    expect(screen.getByText(/No horizontal pull/i)).toBeTruthy();
  });

  it('says so when the proposal could not be recorded', async () => {
    generateWorkout.mockResolvedValue({ data: { weekly_schedule: {} }, model: 'm', generation_id: null });

    render(<WorkoutGeneratorPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Generate Workout Plan/i }));

    expect(await screen.findByText(/could not be recorded/i)).toBeTruthy();
  });

  it('offers the trainer override when nobody has screened the client', async () => {
    generateWorkout
      .mockRejectedValueOnce(Object.assign(new Error('This client has no health screening on file'), {
        status: 409, code: 'CLEARANCE_REQUIRED',
      }))
      .mockResolvedValueOnce({ data: { weekly_schedule: {} }, model: 'm', generation_id: 'g2' });

    render(<WorkoutGeneratorPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Generate Workout Plan/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Generate without a screen/i }));

    await waitFor(() => expect(generateWorkout).toHaveBeenLastCalledWith(
      { client_id: 'c1', acknowledge_unscreened: true },
      expect.any(AbortSignal),
    ));
  });

  it('sends the block length the trainer chose', async () => {
    render(<WorkoutGeneratorPage />);

    fireEvent.change(await screen.findByLabelText('Programme Length'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Workout Plan/i }));

    await waitFor(() => expect(generateWorkout).toHaveBeenCalledWith(
      { client_id: 'c1', duration_weeks: 12 },
      expect.any(AbortSignal),
    ));
  });

  it('gives the client picker back when the linked client cannot be read', async () => {
    prefillState.failed = true;
    render(<WorkoutGeneratorPage />);

    expect(await screen.findByLabelText('Search clients by name')).toBeTruthy();
  });
});
