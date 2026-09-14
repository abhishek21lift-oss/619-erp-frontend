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

const mockToastWarning = vi.fn();

vi.mock('@/lib/toast', () => ({
  useToast: () => ({
    toast: { error: mockToastError, success: mockToastSuccess, warning: mockToastWarning },
  }),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn(), replace: vi.fn() }),
}));

const mockGenerateWorkout = vi.fn();
const mockWorkoutContext = vi.fn();
const mockGenerateDiet = vi.fn();
const mockLoginStatus = vi.fn();
const mockSaveFromGeneration = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    ai: {
      generateWorkout: (...args: unknown[]) => mockGenerateWorkout(...args),
      generateDiet: (...args: unknown[]) => mockGenerateDiet(...args),
      workoutContext: (...args: unknown[]) => mockWorkoutContext(...args),
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
  // Found by name rather than by index. This asserted buttons[0] and
  // buttons[1], which broke the moment a disclosure for trainer-stated context
  // was added above them — a test failing because the card gained a control is
  // testing the DOM's shape, not the requirement, which is only that workout
  // comes before diet.
  it('renders both, workout above diet', () => {
    const { container } = renderCard();
    const generate = Array.from(container.querySelectorAll('button'))
      .map((b) => b.textContent ?? '')
      .filter((t) => t.includes('Generate AI'));
    expect(generate).toHaveLength(2);
    expect(generate[0]).toContain('Generate AI Workout');
    expect(generate[1]).toContain('Generate AI Diet');
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
  // ── The request carries an id, and no claims about the person ───────────
  //
  // This test used to assert the opposite, field by field: age 31, gender
  // male, weight 82, experience "beginner", four training days. Three of
  // those five were invented by this component — a client with no experience
  // level on file got "beginner", one with no frequency got four days, one
  // with no height got 175cm — and the prompt printed them under the heading
  // CLIENT AUTHORITATIVE DATA.
  //
  // The server resolves all of it from the client's own record now, so the
  // assertion is inverted: these keys must be ABSENT. A regression here is a
  // component that has started making claims about a person again.
  it('sends the client id and asserts nothing about the client', async () => {
    const { promise, resolve } = deferred<{ data: unknown }>();
    mockGenerateWorkout.mockReturnValue(promise);

    renderCard({ goalType: 'muscle_gain' });
    fireEvent.click(screen.getByText('Generate AI Workout'));

    await waitFor(() => expect(mockGenerateWorkout).toHaveBeenCalledTimes(1));
    const params = mockGenerateWorkout.mock.calls[0][0];
    expect(params.client_id).toBe('cl-1');
    expect(Object.keys(params)).toEqual(['client_id']);
    for (const invented of ['age', 'gender', 'weight_kg', 'height_cm', 'goal', 'experience_level', 'training_days']) {
      expect(params[invented]).toBeUndefined();
    }
    expect(mockGenerateDiet).not.toHaveBeenCalled();

    resolve({ data: WORKOUT_PLAN });
    await screen.findByText('8-Week Hypertrophy Foundation');
  });

  // The goal a client has no record of is the server's to report as missing,
  // and it refuses rather than programming for "general_fitness". What this
  // component must not do is substitute one on the way out — including for
  // 'custom', which was the case the old default existed to paper over.
  it('never substitutes a goal, not even for a custom one', async () => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN });
    renderCard({ goalType: 'custom' });
    fireEvent.click(screen.getByText('Generate AI Workout'));
    await waitFor(() => expect(mockGenerateWorkout).toHaveBeenCalled());
    expect(mockGenerateWorkout.mock.calls[0][0].goal).toBeUndefined();
  });

  it('shows "Generating AI Workout..." and disables both buttons while streaming', async () => {
    const { promise, resolve } = deferred<{ data: unknown }>();
    mockGenerateWorkout.mockReturnValue(promise);

    const { container } = renderCard();
    fireEvent.click(screen.getByText('Generate AI Workout'));

    expect(screen.getByText('Generating AI Workout...')).toBeInTheDocument();
    // The two GENERATE buttons. The disclosure that opens the trainer-stated
    // fields stays usable mid-stream on purpose: it starts nothing, and
    // freezing the whole card would be disabling a panel rather than guarding
    // an action.
    const generateButtons = () => Array.from(container.querySelectorAll('button'))
      .filter((b) => /Generat(e|ing) AI/.test(b.textContent ?? ''));
    expect(generateButtons().every((b) => (b as HTMLButtonElement).disabled)).toBe(true);

    resolve({ data: WORKOUT_PLAN });
    await screen.findByText('8-Week Hypertrophy Foundation');
    expect(screen.queryByText('Generating AI Workout...')).toBeNull();
    // `.some` rather than `.every(...) === false`: the old form passed as soon
    // as ANY button on the card was enabled, which the new disclosure would
    // have satisfied on its own even with both generate buttons still frozen.
    expect(generateButtons()).toHaveLength(2);
    expect(generateButtons().every((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
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
    // Same contract as the workout request: an id, and nothing asserted about
    // the person. The diet generator does need body metrics — they set the
    // calorie target — so where the record lacks them it answers with the
    // field list, which is what the trainer now sees instead of a plan built
    // on 175cm and 75kg.
    expect(Object.keys(params)).toEqual(['client_id']);
    expect(params.age).toBeUndefined();
    expect(params.gender).toBeUndefined();
    expect(params.weight_kg).toBeUndefined();
    expect(params.goal).toBeUndefined();
    // 'moderate' was this card's guess at how active a client is. It is a
    // clinical input to a calorie target and nobody had asked.
    expect(params.activity_level).toBeUndefined();
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

describe('whether the saved programme is actually live', () => {
  // Accepting a proposal used to write a workout_plans row and assign it to
  // nobody. The plan existed, appeared on no screen — Today lists clients by
  // active assignment — and no logged session could ever be attributed back to
  // the proposal that produced it. The backend assigns it now; this card has
  // to say what that did, because "saved" and "live" are different facts and
  // the trainer is about to expect the client on Today.

  const saved = (over: Record<string, unknown> = {}) => ({
    message: 'ok', plan_id: 'plan-9', client_id: 'cl-1', name: 'Block', saved: 6,
    unresolved: [], unknown_days: [], assigned: true, assignment_id: 'asg-1',
    other_active_assignments: 0, ...over,
  });

  const generateThenSave = async () => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN, generation_id: 'gen-1' });
    renderCard();
    fireEvent.click(screen.getByText('Generate AI Workout'));
    await screen.findByText('8-Week Hypertrophy Foundation');
    fireEvent.click(screen.getByText('Save as programme'));
  };

  it('says the programme is live for this client', async () => {
    mockSaveFromGeneration.mockResolvedValue(saved());
    await generateThenSave();

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled());
    expect(mockToastSuccess.mock.calls[0][1]).toEqual({ description: 'Now live for Rahul Sharma.' });
    expect(mockToastWarning).not.toHaveBeenCalled();
  });

  it('warns, rather than congratulates, when the client is now on several programmes', async () => {
    // The one case the trainer has to act on: the session log links a new
    // session to a plan automatically only when there is exactly one active
    // assignment, so from here attribution is theirs to make by hand.
    mockSaveFromGeneration.mockResolvedValue(saved({ other_active_assignments: 3 }));
    await generateThenSave();

    await waitFor(() => expect(mockToastWarning).toHaveBeenCalled());
    expect(mockToastSuccess).not.toHaveBeenCalled();
    const [, opts] = mockToastWarning.mock.calls[0];
    expect(opts.description).toContain('4 active programmes');
    expect(opts.description).toContain('will no longer pick one automatically');
  });

  it('says so plainly when the plan was saved but not assigned', async () => {
    mockSaveFromGeneration.mockResolvedValue(saved({ assigned: false, assignment_id: null }));
    await generateThenSave();

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled());
    expect(mockToastSuccess.mock.calls[0][1].description)
      .toContain('not assigned — it will not appear on Rahul Sharma');
  });

  it('claims nothing about liveness when the server did not say', async () => {
    // A server that predates the assignment fix sends neither field. An absent
    // answer must not render as a confident "now live".
    mockSaveFromGeneration.mockResolvedValue({
      message: 'ok', plan_id: 'plan-9', client_id: 'cl-1', name: 'Block', saved: 6,
      unresolved: [], unknown_days: [],
    });
    await generateThenSave();

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled());
    expect(mockToastSuccess.mock.calls[0][1]).toBeUndefined();
  });
});

// ── What the trainer knows that the record does not ────────────────────────
//
// The rest of this card asserts nothing about the client, deliberately: a
// browser that can supply age, goal or experience is a browser that can invent
// a person, which is what this component used to do.
//
// A trainer genuinely does know things the database has not been told — the
// rack is booked, the client mentioned a shoulder on the way in — and refusing
// to hear that would be its own dishonesty. So these are accepted, and what
// these tests hold is that they stay labelled as the trainer's statement and
// never become a claim about the person.
describe('trainer-stated context', () => {
  const CONTEXT = {
    client: { id: 'cl-1', name: 'Test Client' },
    facts: {
      age: { value: null, source: null, origin: 'missing' },
      gender: { value: null, source: null, origin: 'missing' },
      weight_kg: { value: null, source: null, origin: 'missing' },
      height_cm: { value: null, source: null, origin: 'missing' },
      goal: { value: null, source: null, origin: 'missing' },
      experience_level: { value: null, source: null, origin: 'missing' },
      training_days: { value: null, source: null, origin: 'missing' },
      equipment: { value: null, source: null, origin: 'missing' },
    },
    data_quality: {
      recorded: [], stated: [],
      missing: [
        { field: 'goal', blocking: true },
        { field: 'experience_level', blocking: true },
        { field: 'training_days', blocking: true },
      ],
      conflicting: [],
      blocking: ['goal', 'experience_level', 'training_days'],
      completeness_pct: 0,
    },
    safety: null, current_program: { active: false }, training_history: null,
  };

  const withContext = async () => {
    mockWorkoutContext.mockResolvedValue(CONTEXT);
    const view = renderCard();
    await screen.findByText('What the AI will use');
    return view;
  };

  const type = (label: RegExp, value: string) => {
    const input = screen.getByText(label).parentElement?.querySelector('input');
    if (!input) throw new Error(`no input for ${label}`);
    fireEvent.change(input, { target: { value } });
  };

  it('keeps the generate button shut until the blocking fields are answered', async () => {
    await withContext();
    const workout = screen.getByText('Generate AI Workout').closest('button') as HTMLButtonElement;
    expect(workout.disabled).toBe(true);

    type(/^Goal$/, 'muscle_gain');
    type(/^Experience$/, 'intermediate');
    expect((screen.getByText('Generate AI Workout').closest('button') as HTMLButtonElement).disabled).toBe(true);

    // The last one opens it — and only because the trainer answered it, not
    // because anything was assumed on their behalf.
    type(/Days \/ week/, '3');
    expect((screen.getByText('Generate AI Workout').closest('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('sends what the trainer stated, and still nothing else about the client', async () => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN });
    await withContext();
    type(/^Goal$/, 'strength');
    type(/^Experience$/, 'advanced');
    type(/Days \/ week/, '4');
    type(/Equipment today/, 'barbell, rack, bench');
    type(/Constraint today/, 'left shoulder irritated');

    fireEvent.click(screen.getByText('Generate AI Workout'));
    await waitFor(() => expect(mockGenerateWorkout).toHaveBeenCalled());

    const params = mockGenerateWorkout.mock.calls[0][0];
    expect(params).toEqual({
      client_id: 'cl-1',
      goal: 'strength',
      experience_level: 'advanced',
      training_days: 4,
      equipment: 'barbell, rack, bench',
      injuries: 'left shoulder irritated',
    });
    // The body metrics stay absent. A trainer stating a training constraint is
    // not an invitation to start guessing heights again.
    for (const invented of ['age', 'gender', 'weight_kg', 'height_cm']) {
      expect(params[invented]).toBeUndefined();
    }
  });

  it('sends nothing extra when the trainer states nothing', async () => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN });
    mockWorkoutContext.mockResolvedValue({
      ...CONTEXT,
      data_quality: { ...CONTEXT.data_quality, blocking: [], missing: [] },
    });
    renderCard();
    await screen.findByText('What the AI will use');
    fireEvent.click(screen.getByText('Generate AI Workout'));
    await waitFor(() => expect(mockGenerateWorkout).toHaveBeenCalled());
    expect(Object.keys(mockGenerateWorkout.mock.calls[0][0])).toEqual(['client_id']);
  });

  it('says on screen that a stated value is not saved to the client', async () => {
    await withContext();
    expect(screen.getByText(/Trainer-stated for this generation/)).toBeInTheDocument();
    expect(screen.getByText(/not saved to the client/)).toBeInTheDocument();
  });
});

// ── New block, or the next weeks of the one they are on? ───────────────────
//
// Generating for a client three weeks into a twelve-week block used to produce
// a brand new twelve-week block — a SECOND programme, written as though the
// first did not exist. The server refuses to choose between those, because
// both defaults are wrong, so the card has to put the choice on screen.
describe('a client already on a programme', () => {
  const LIVE = {
    client: { id: 'cl-1', name: 'Test Client' },
    facts: {
      age: { value: 34, source: 'pt_clients.dob', origin: 'recorded' },
      gender: { value: 'female', source: 'pt_clients.gender', origin: 'recorded' },
      weight_kg: { value: null, source: null, origin: 'missing' },
      height_cm: { value: null, source: null, origin: 'missing' },
      goal: { value: 'muscle_gain', source: 'pt_clients.goal', origin: 'recorded' },
      experience_level: { value: 'intermediate', source: 'pt_clients.workout_experience_level', origin: 'recorded' },
      training_days: { value: 3, source: 'pt_clients.sessions_per_week', origin: 'recorded' },
      equipment: { value: null, source: null, origin: 'missing' },
    },
    data_quality: {
      recorded: [], stated: [], missing: [], conflicting: [], blocking: [], completeness_pct: 63,
    },
    safety: null,
    current_program: {
      active: true, plan_id: 'p1', plan_name: 'Base Phase', started_on: '2026-08-24',
      duration_weeks: 12, current_week: 4, weeks_remaining: 8, planned_days_per_week: 3,
      sessions_completed_in_window: 6, progress_pct: 25, expired: false,
    },
    training_history: { has_history: true, window_weeks: 12 },
  };

  const render1 = async (ctx = LIVE) => {
    mockWorkoutContext.mockResolvedValue(ctx);
    const view = renderCard();
    await screen.findByText('What the AI will use');
    return view;
  };

  it('names the programme and the week, and offers both actions', async () => {
    await render1();
    // Twice, deliberately: the context panel's footer states where they are,
    // and the chooser repeats it beside the decision it is asking for.
    expect(screen.getAllByText(/week 4 of 12/).length).toBeGreaterThan(0);
    expect(screen.getByText('Progress it')).toBeInTheDocument();
    expect(screen.getByText('Start a new one')).toBeInTheDocument();
  });

  // The conservative option is pre-selected — continuing what the client has
  // adapted to rather than replacing it — but the trainer still presses a
  // button either way, and the request says which.
  it('defaults to progressing, and sends that', async () => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN });
    await render1();
    expect(screen.getByText('Progress it').closest('button'))
      .toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByText('Generate AI Workout'));
    await waitFor(() => expect(mockGenerateWorkout).toHaveBeenCalled());
    expect(mockGenerateWorkout.mock.calls[0][0].mode).toBe('adapt');
  });

  it('sends a new block when the trainer picks one', async () => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN });
    await render1();
    fireEvent.click(screen.getByText('Start a new one'));
    fireEvent.click(screen.getByText('Generate AI Workout'));
    await waitFor(() => expect(mockGenerateWorkout).toHaveBeenCalled());
    expect(mockGenerateWorkout.mock.calls[0][0].mode).toBe('new');
  });

  // A finished block is a client who needs the NEXT programme. Asking them to
  // choose would be ceremony, and the server does not gate on it either.
  it('asks nothing about a block that has finished', async () => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN });
    await render1({ ...LIVE, current_program: { ...LIVE.current_program, expired: true } });
    expect(screen.queryByText('Progress it')).toBeNull();

    fireEvent.click(screen.getByText('Generate AI Workout'));
    await waitFor(() => expect(mockGenerateWorkout).toHaveBeenCalled());
    expect(mockGenerateWorkout.mock.calls[0][0].mode).toBeUndefined();
  });

  it('asks nothing of a client on no programme, and sends no mode', async () => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN });
    await render1({ ...LIVE, current_program: { active: false } });
    expect(screen.queryByText('Progress it')).toBeNull();

    fireEvent.click(screen.getByText('Generate AI Workout'));
    await waitFor(() => expect(mockGenerateWorkout).toHaveBeenCalled());
    expect(Object.keys(mockGenerateWorkout.mock.calls[0][0])).toEqual(['client_id']);
  });
});

// ── A failed context is not an absent one ──────────────────────────────────
//
// The card used to swallow the error and render nothing, so a summary that
// failed to load looked exactly like a client it had nothing to say about. The
// trainer pressed Generate having been shown nothing and read the result as
// though the checks had run.
describe('when the context cannot be read', () => {
  it('says so rather than rendering silence', async () => {
    mockWorkoutContext.mockRejectedValue(new Error('upstream unavailable'));
    renderCard();
    await screen.findByText(/Client context could not be verified/);
    expect(screen.queryByText('What the AI will use')).toBeNull();
  });

  it('still allows generation, because the server does its own checking', async () => {
    mockWorkoutContext.mockRejectedValue(new Error('upstream unavailable'));
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN });
    renderCard();
    await screen.findByText(/Client context could not be verified/);

    const workout = screen.getByText('Generate AI Workout').closest('button') as HTMLButtonElement;
    expect(workout.disabled).toBe(false);
    fireEvent.click(workout);
    await waitFor(() => expect(mockGenerateWorkout).toHaveBeenCalled());
  });
});
