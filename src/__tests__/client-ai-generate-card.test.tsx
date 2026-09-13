// The Generate AI Workout / Generate AI Diet card on the client profile.
//
// Two buttons, one tap each, wired to the same SSE generator endpoints the
// workout/diet generator pages and the AI coach use. The interesting failure
// modes: a double tap billing the studio twice, and a button that claims the
// plan was saved when nothing was written — the backend generate endpoints
// only stream a plan back, and this card must not say otherwise.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ClientLoginStatus } from '@/lib/api';
import ClientAiGenerateCard from '@/components/pt-os/ClientAiGenerateCard';
import ClientLoginCard from '@/components/pt-os/ClientLoginCard';

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { error: mockToastError, success: mockToastSuccess } }),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn(), replace: vi.fn() }),
}));

const mockGenerateWorkout = vi.fn();
const mockGenerateDiet = vi.fn();
const mockLoginStatus = vi.fn();
const mockSaveFromGeneration = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    ai: {
      generateWorkout: (...args: unknown[]) => mockGenerateWorkout(...args),
      generateDiet: (...args: unknown[]) => mockGenerateDiet(...args),
    },
    clientLogin: {
      status: (...args: unknown[]) => mockLoginStatus(...args),
    },
    workouts: {
      plans: {
        saveFromGeneration: (...args: unknown[]) => mockSaveFromGeneration(...args),
      },
    },
  },
}));

const CLIENT = {
  id: 'cl-1',
  name: 'Rahul Sharma',
  gender: 'male',
  dob: '1995-04-10',
  weight: 82,
};

const WORKOUT_PLAN = {
  name: '8-Week Hypertrophy Foundation',
  goal: 'muscle_gain',
  level: 'beginner',
  weeks: 8,
  days_per_week: 4,
  equipment: ['full gym'],
  warm_up: '5 min cardio + dynamic stretches',
  cool_down: 'Static holds',
  progression_notes: 'Add 2.5 kg every fortnight on the main lifts.',
  weekly_schedule: {
    monday: { name: 'Push', focus: 'Chest, shoulders, triceps', exercises: [{ name: 'Bench Press' }, { name: 'OHP' }] },
    tuesday: { name: 'Pull', focus: 'Back, biceps', exercises: [{ name: 'Deadlift' }] },
  },
  nutrition_notes: '',
};

const DIET_PLAN = {
  name: 'High-Protein Fat Loss Plan',
  goal: 'fat_loss',
  total_calories: 2100,
  macros: { protein_g: 160, carbs_g: 210, fat_g: 70 },
  meal_frequency: 4,
  meals: [
    { name: 'Breakfast', time: '8:00 am', calories: 450, protein_g: 30, carbs_g: 45, fat_g: 15, foods: [] },
    { name: 'Lunch', time: '1:00 pm', calories: 620, protein_g: 50, carbs_g: 70, fat_g: 18, foods: [] },
  ],
  grocery_list: [],
  supplements: [],
  hydration_ml: 3200,
  notes: 'Drink water before meals.',
};

const LOGIN_STATUS: ClientLoginStatus = {
  client_id: 'cl-1',
  login_activated: false,
  login_enabled: false,
  login_email: 'rahul@example.com',
  email_verified_at: null,
  last_login_at: null,
  locked_until: null,
  activation_sent_at: null,
  can_activate: true,
  blocked_reason: null,
  blocked_message: null,
  invitation: null,
};

const renderCard = (props?: Partial<React.ComponentProps<typeof ClientAiGenerateCard>>) =>
  render(<ClientAiGenerateCard client={CLIENT} {...props} />);

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mockGenerateWorkout.mockReset();
  mockGenerateDiet.mockReset();
  mockLoginStatus.mockReset();
  mockToastError.mockReset();
  mockLoginStatus.mockResolvedValue({ data: LOGIN_STATUS });
});

afterEach(() => vi.clearAllMocks());

describe('the two buttons', () => {
  it('renders both, workout above diet', () => {
    const { container } = renderCard();
    const buttons = container.querySelectorAll('button');
    const labels = Array.from(buttons).map((b) => b.textContent ?? '');
    expect(labels[0]).toContain('Generate AI Workout');
    expect(labels[1]).toContain('Generate AI Diet');
  });

  it('sits above the Client Login card, which is unchanged', async () => {
    const { container } = render(
      <>
        <ClientAiGenerateCard client={CLIENT} />
        <ClientLoginCard clientId="cl-1" />
      </>,
    );
    // The login card reads its status from the API, then renders its own
    // action buttons — wait for it so ordering is against the real outcome.
    await screen.findByText('Activate client login');

    const names = Array.from(container.querySelectorAll('button')).map((b) => b.textContent ?? '');
    const workout = names.findIndex((n) => n.includes('Generate AI Workout'));
    const diet = names.findIndex((n) => n.includes('Generate AI Diet'));
    const activate = names.findIndex((n) => n.includes('Activate client login'));
    expect(workout).toBeGreaterThanOrEqual(0);
    expect(diet).toBeGreaterThan(workout);
    expect(activate).toBeGreaterThan(diet);
  });
});

describe('the touch targets', () => {
  // globals.css sets `html { font-size: 14px }`, so every rem-based Tailwind
  // size renders at 87.5% of its name: h-10 is 35px, not 40. Both of these
  // buttons shipped as h-10 and measured 35 — a third under the 44px this app
  // holds every other control to, on a card whose whole purpose is two taps.
  //
  // Read off the source rather than the DOM: jsdom has no layout, so a
  // rendered element's height is 0 and any assertion on it passes whatever
  // the class says.
  const src = readFileSync(
    join(process.cwd(), 'src', 'components', 'pt-os', 'ClientAiGenerateCard.tsx'),
    'utf8',
  );

  it('are 44px, in pixels rather than a rem class', () => {
    const heights = [...src.matchAll(/className="flex h-\[(\d+)px\] w-full items-center justify-center/g)]
      .map((m) => Number(m[1]));
    expect(heights).toHaveLength(2);
    for (const h of heights) expect(h).toBe(44);
  });

  it('uses no rem height class on either of them', () => {
    expect(src).not.toMatch(/className="flex h-\d+ w-full items-center justify-center/);
  });
});

describe('generating a workout', () => {
  it('sends the client profile fields to the existing endpoint', async () => {
    const { promise, resolve } = deferred<{ data: unknown }>();
    mockGenerateWorkout.mockReturnValue(promise);

    renderCard({ goalType: 'muscle_gain' });
    fireEvent.click(screen.getByText('Generate AI Workout'));

    await waitFor(() => expect(mockGenerateWorkout).toHaveBeenCalledTimes(1));
    const params = mockGenerateWorkout.mock.calls[0][0];
    expect(params.age).toBe(31); // 1995-04-10, in Aug 2026
    expect(params.gender).toBe('male');
    expect(params.weight_kg).toBe(82);
    expect(params.goal).toBe('muscle_gain');
    expect(params.experience_level).toBe('beginner');
    expect(params.training_days).toBe(4);
    expect(params.client_id).toBe('cl-1');
    expect(mockGenerateDiet).not.toHaveBeenCalled();

    resolve({ data: WORKOUT_PLAN });
    await screen.findByText('8-Week Hypertrophy Foundation');
  });

  it('defaults the goal when the client has none, and custom does not leak through', async () => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN });
    renderCard({ goalType: 'custom' });
    fireEvent.click(screen.getByText('Generate AI Workout'));
    await waitFor(() => expect(mockGenerateWorkout).toHaveBeenCalled());
    expect(mockGenerateWorkout.mock.calls[0][0].goal).toBe('general_fitness');
  });

  it('shows "Generating AI Workout..." and disables both buttons while streaming', async () => {
    const { promise, resolve } = deferred<{ data: unknown }>();
    mockGenerateWorkout.mockReturnValue(promise);

    const { container } = renderCard();
    fireEvent.click(screen.getByText('Generate AI Workout'));

    expect(screen.getByText('Generating AI Workout...')).toBeInTheDocument();
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.every((b) => (b as HTMLButtonElement).disabled)).toBe(true);

    resolve({ data: WORKOUT_PLAN });
    await screen.findByText('8-Week Hypertrophy Foundation');
    expect(screen.queryByText('Generating AI Workout...')).toBeNull();
    const reEnabled = Array.from(container.querySelectorAll('button'));
    expect(reEnabled.every((b) => (b as HTMLButtonElement).disabled)).toBe(false);
  });

  it('never double-fires on a double click', async () => {
    const { promise, resolve } = deferred<{ data: unknown }>();
    mockGenerateWorkout.mockReturnValue(promise);

    renderCard();
    const btn = screen.getByText('Generate AI Workout');
    fireEvent.click(btn);
    fireEvent.click(btn);

    expect(mockGenerateWorkout).toHaveBeenCalledTimes(1);
    resolve({ data: WORKOUT_PLAN });
    await screen.findByText('8-Week Hypertrophy Foundation');
  });

  it('offers no save when the server recorded no proposal', async () => {
    // generation_id is null when the ledger write failed — generation is never
    // blocked on its own bookkeeping. With nothing to save against, the card
    // says so rather than offering a button that would fail.
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN });

    renderCard();
    fireEvent.click(screen.getByText('Generate AI Workout'));

    await screen.findByText('8-Week Hypertrophy Foundation');
    expect(screen.getByText(/AI workout\s*—\s*review before saving/)).toBeInTheDocument();
    expect(screen.getByText(/nothing has been saved to Rahul Sharma/i)).toBeInTheDocument();
    expect(screen.queryByText('Save as programme')).not.toBeInTheDocument();
  });
});

describe('saving a generated programme', () => {
  // Until this existed the generator could not write a plan anywhere: every
  // consumer rendered it and stopped, which is why production showed 95
  // generations and 9 live plans. The nine were typed.
  beforeEach(() => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN, generation_id: 'gen-1' });
  });

  const generateThenSave = async () => {
    renderCard();
    fireEvent.click(screen.getByText('Generate AI Workout'));
    await screen.findByText('8-Week Hypertrophy Foundation');
    fireEvent.click(screen.getByText('Save as programme'));
  };

  it('sends the generation id, never the plan', async () => {
    mockSaveFromGeneration.mockResolvedValue({
      message: 'ok', plan_id: 'plan-9', client_id: 'cl-1', name: 'Block', saved: 6,
      unresolved: [], unknown_days: [],
    });

    await generateThenSave();

    await waitFor(() => expect(mockSaveFromGeneration).toHaveBeenCalledTimes(1));
    // The server reads the proposal back from its own ledger. Posting the plan
    // would let a caller file anything as an accepted AI proposal.
    expect(mockSaveFromGeneration).toHaveBeenCalledWith({ generation_id: 'gen-1' });
    expect(mockPush).toHaveBeenCalledWith('/pt-os/workout-plans/plan-9/builder');
  });

  it('names the exercises the library could not hold', async () => {
    mockSaveFromGeneration.mockResolvedValue({
      message: 'ok', plan_id: 'plan-9', client_id: 'cl-1', name: 'Block', saved: 5,
      unresolved: [{ day: 'Tuesday', position: 2, name: 'Jefferson Curl', reason: 'not in the exercise library' }],
      unknown_days: [],
    });

    await generateThenSave();

    // One generated name in eight will not resolve, so this is the normal
    // case rather than a fault — and a trainer who is not told ends up with a
    // short session they only notice mid-workout.
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled());
    const msg = String(mockToastSuccess.mock.calls[0][0]);
    expect(msg).toContain('Jefferson Curl');
    expect(msg).toContain('add them in the builder');
  });

  it('reports a failure without navigating away from the preview', async () => {
    mockSaveFromGeneration.mockRejectedValue(new Error('This proposal has already been saved'));

    await generateThenSave();

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('This proposal has already been saved'));
    expect(mockPush).not.toHaveBeenCalled();
    // The preview stays put so the trainer can try again or start over.
    expect(screen.getByText('8-Week Hypertrophy Foundation')).toBeInTheDocument();
  });

  it('never double-saves on a double click', async () => {
    // Honest limit: fireEvent flushes state between clicks, so this proves the
    // guard holds but cannot tell a ref apart from the disabled attribute. The
    // component uses a ref (setSaving is async, so a real double tap can beat
    // the re-render), and the backend refuses a second accept with a 409
    // regardless — that is the guarantee, this is the courtesy.
    let resolve!: (v: unknown) => void;
    mockSaveFromGeneration.mockReturnValue(new Promise((r) => { resolve = r; }));

    renderCard();
    fireEvent.click(screen.getByText('Generate AI Workout'));
    await screen.findByText('8-Week Hypertrophy Foundation');

    const btn = screen.getByText('Save as programme');
    fireEvent.click(btn);
    fireEvent.click(btn);

    expect(mockSaveFromGeneration).toHaveBeenCalledTimes(1);
    resolve({ message: 'ok', plan_id: 'p', client_id: 'c', name: 'n', saved: 1, unresolved: [], unknown_days: [] });
  });
});

describe('generating a diet', () => {
  it('sends the diet fields to the existing endpoint', async () => {
    mockGenerateDiet.mockResolvedValue({ data: DIET_PLAN });

    renderCard({ goalType: 'fat_loss' });
    fireEvent.click(screen.getByText('Generate AI Diet'));

    await screen.findByText('High-Protein Fat Loss Plan');
    const params = mockGenerateDiet.mock.calls[0][0];
    expect(params.age).toBe(31);
    expect(params.gender).toBe('male');
    expect(params.weight_kg).toBe(82);
    expect(params.goal).toBe('fat_loss');
    expect(params.activity_level).toBe('moderate');
    expect(params.client_id).toBe('cl-1');
    expect(mockGenerateWorkout).not.toHaveBeenCalled();
  });

  it('shows the diet preview with macros, meals and the review note', async () => {
    mockGenerateDiet.mockResolvedValue({ data: DIET_PLAN });

    renderCard();
    fireEvent.click(screen.getByText('Generate AI Diet'));

    await screen.findByText('High-Protein Fat Loss Plan');
    expect(screen.getByText(/2100 kcal/)).toBeInTheDocument();
    expect(screen.getByText(/160g/)).toBeInTheDocument();
    expect(screen.getByText(/Breakfast/)).toBeInTheDocument();
    expect(screen.getByText(/AI diet\s*—\s*review before saving/)).toBeInTheDocument();
  });
});

describe('errors', () => {
  it('shows the failure inline and in a toast, and re-enables the buttons', async () => {
    const { promise, reject } = deferred<{ data: unknown }>();
    mockGenerateWorkout.mockReturnValue(promise);

    const { container } = renderCard();
    fireEvent.click(screen.getByText('Generate AI Workout'));

    reject(new Error('AI workout generation failed.'));
    await screen.findByRole('alert');
    expect(screen.getByText('AI workout generation failed.')).toBeInTheDocument();
    expect(mockToastError).toHaveBeenCalledWith('AI workout generation failed.');

    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.every((b) => (b as HTMLButtonElement).disabled)).toBe(false);
  });
});

describe('the review panel', () => {
  it('dismisses on New, leaving the buttons ready for the other kind', async () => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN });

    renderCard();
    fireEvent.click(screen.getByText('Generate AI Workout'));
    await screen.findByText('8-Week Hypertrophy Foundation');

    fireEvent.click(screen.getByText('New'));
    expect(screen.queryByText('8-Week Hypertrophy Foundation')).toBeNull();

    mockGenerateDiet.mockResolvedValue({ data: DIET_PLAN });
    fireEvent.click(screen.getByText('Generate AI Diet'));
    await screen.findByText('High-Protein Fat Loss Plan');
  });
});
describe('the evidence the trainer approves against', () => {
  // The generator has always returned the screen, the audit, a quality score
  // and a critique. The card used to render the plan and drop all four, which
  // made approval — the final gate in this design — a decision taken with less
  // information than the server had when it proposed. These hold the wiring;
  // generation-evidence.test.tsx holds what the block itself says.

  const SCREEN = {
    gate: { status: 'unknown', cleared: false, risk_level: null, assessed_on: null },
    screened: false,
    sources: [],
    constraints: [],
    excluded_exercises: [],
    referrals: [],
    not_assessed: ['PAR-Q'],
  };

  it('shows the screen and audit that came back with the plan', async () => {
    mockGenerateWorkout.mockResolvedValue({
      data: WORKOUT_PLAN,
      generation_id: 'gen-1',
      screen: SCREEN,
      audit: {
        violations: [],
        unverified: [{ day: 'monday', position: 1, name: 'Jefferson Curl' }],
        counts: { exercises: 9, verified: 8, critical: 0, major: 0, minor: 0 },
        revised: false,
      },
      quality: { score: 77, max: 100, components: {}, basis: 'the rules this studio programs by' },
    });

    renderCard();
    fireEvent.click(screen.getByText('Generate AI Workout'));
    await screen.findByText('8-Week Hypertrophy Foundation');

    expect(screen.getByText('Not screened against this client')).toBeInTheDocument();
    expect(screen.getByText('Quality 77/100')).toBeInTheDocument();
    expect(screen.getByText('1 exercise not in the library')).toBeInTheDocument();
  });

  it('puts the evidence before the Save button, not after it', async () => {
    mockGenerateWorkout.mockResolvedValue({
      data: WORKOUT_PLAN, generation_id: 'gen-1', screen: SCREEN,
    });

    const { container } = renderCard();
    fireEvent.click(screen.getByText('Generate AI Workout'));
    await screen.findByText('8-Week Hypertrophy Foundation');

    // Order is the whole point: a warning underneath the button it is a
    // warning about is a warning nobody reads before tapping.
    const text = container.textContent ?? '';
    expect(text.indexOf('Not screened against this client'))
      .toBeLessThan(text.indexOf('Save as programme'));
  });

  it('claims no checks for a diet, which the backend never screens', async () => {
    mockGenerateDiet.mockResolvedValue({ data: DIET_PLAN });

    renderCard();
    fireEvent.click(screen.getByText('Generate AI Diet'));
    await screen.findByText('High-Protein Fat Loss Plan');

    // No evidence block at all — not an "unchecked" one. The diet endpoint
    // returns no screen because nothing screens a diet, and a block saying
    // "review it as unchecked" would imply a check that was meant to happen.
    expect(screen.queryByText(/Review it as unchecked/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Not screened against this client/)).not.toBeInTheDocument();
  });

  it('says a workout came back unchecked when the server sent no screen at all', async () => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN, generation_id: 'gen-1' });

    renderCard();
    fireEvent.click(screen.getByText('Generate AI Workout'));
    await screen.findByText('8-Week Hypertrophy Foundation');

    expect(screen.getByText(/Review it as unchecked/)).toBeInTheDocument();
  });
});
