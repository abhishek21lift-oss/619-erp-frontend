// The Generate AI Workout / Generate AI Diet card on the client profile.
//
// Two buttons, one tap each, wired to the same SSE generator endpoints the
// workout/diet generator pages and the AI coach use. The interesting failure
// modes: a double tap billing the studio twice, and a button that claims the
// plan was saved when nothing was written — the backend generate endpoints
// only stream a plan back, and this card must not say otherwise.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ClientLoginStatus } from '@/lib/api';
import ClientAiGenerateCard from '@/components/pt-os/ClientAiGenerateCard';
import ClientLoginCard from '@/components/pt-os/ClientLoginCard';

const mockToastError = vi.fn();

vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { error: mockToastError, success: vi.fn() } }),
}));

const mockGenerateWorkout = vi.fn();
const mockGenerateDiet = vi.fn();
const mockLoginStatus = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    ai: {
      generateWorkout: (...args: unknown[]) => mockGenerateWorkout(...args),
      generateDiet: (...args: unknown[]) => mockGenerateDiet(...args),
    },
    clientLogin: {
      status: (...args: unknown[]) => mockLoginStatus(...args),
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

  it('shows the plan for review and says nothing was saved', async () => {
    mockGenerateWorkout.mockResolvedValue({ data: WORKOUT_PLAN });

    renderCard();
    fireEvent.click(screen.getByText('Generate AI Workout'));

    await screen.findByText('8-Week Hypertrophy Foundation');
    expect(screen.getByText(/AI workout\s*—\s*review before saving/)).toBeInTheDocument();
    expect(screen.getByText(/nothing has been saved to Rahul Sharma/i)).toBeInTheDocument();
    // No save endpoint exists to call — the generator streams back only.
    expect(mockGenerateDiet).not.toHaveBeenCalled();
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