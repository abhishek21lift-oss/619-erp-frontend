// The New Programme → Builder → Add Exercises flow.
//
// Three things changed shape, and each has a way of quietly reverting:
//
//   · The client is chosen FIRST and fills the rest of the form. The obvious
//     wrong version fills fields the trainer has already typed into, so their
//     own work vanishes when they change their mind about the client.
//   · Adding exercises is a page. It was a floating window over the plan being
//     edited, and the plan detail screen still had one.
//   · The builder and that page are reachable for a plan with nobody on it.
//     Both used to live only under a client route, so an unassigned programme
//     had no way in.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { appPath, routeExists, srcPath } from '@/__tests__/helpers/app-routes';
import { stripComments } from '@/__tests__/helpers/strip-comments';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const clientRow = vi.fn();
const goalsList = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      clients: async () => ({ data: [{ id: 'c1', name: 'Rahul Sharma' }] }),
      client: (...a: unknown[]) => clientRow(...a),
    },
    progress: { goals: { list: (...a: unknown[]) => goalsList(...a) } },
    workouts: {
      plans: { create: async () => ({ plan: { id: 'p1' } }) },
      assign: async () => ({}),
    },
  },
}));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }) }));

import NewProgrammeDialog, {
  goalFromClient, difficultyFromClient,
} from '@/components/pt-os/builder/NewProgrammeDialog';

beforeEach(() => {
  push.mockClear();
  clientRow.mockReset();
  clientRow.mockResolvedValue({ data: { id: 'c1', name: 'Rahul Sharma' } });
  goalsList.mockReset();
  goalsList.mockResolvedValue({ data: [] });
});
afterEach(cleanup);

const openDialog = () => render(<NewProgrammeDialog open onClose={() => {}} />);
const nameField = () => screen.getByPlaceholderText(/Upper \/ Lower Split/i) as HTMLInputElement;
// By inputMode, not by role: 'spinbutton' is the implicit role of
// `<input type="number">`, and the design system no longer renders one — a
// wheel over a focused number input silently changes its value. The
// assertions are unchanged.
const numbers = () =>
  Array.from(document.querySelectorAll('input[inputmode="numeric"]')) as HTMLInputElement[];
// The client list is fetched on open, so the row is not there on first paint.
const pickClient = async () =>
  fireEvent.click(await screen.findByRole('button', { name: 'Rahul Sharma' }));

describe('the client is the first thing the form asks for', () => {
  it('puts the client field above the programme name', () => {
    // It used to sit at the bottom, under the very fields it now fills.
    openDialog();
    const client = screen.getByText('Client');
    const programme = screen.getByText('Programme name');
    expect(client.compareDocumentPosition(programme) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });
});

describe('picking a client fills the form', () => {
  it('leaves the programme name empty for the trainer to write', async () => {
    // What kind of plan this is — Push/Pull/Legs, Upper/Lower, a deload block
    // — is the trainer's call, and nothing in the client's record knows it.
    clientRow.mockResolvedValue({ data: { id: 'c1', name: 'Rahul Sharma', workout_experience_level: 'advanced' } });
    goalsList.mockResolvedValue({ data: [{ goal_type: 'fat_loss', is_active: true }] });
    openDialog();
    await pickClient();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Advanced' })).toHaveAttribute('aria-pressed', 'true'));
    expect(nameField().value).toBe('');
  });

  it('takes the goal from the goal-setting screening', async () => {
    // fat_loss is what the screening stores; Weight Loss is what a programme
    // calls the same thing.
    goalsList.mockResolvedValue({ data: [{ goal_type: 'fat_loss', is_active: true }] });
    openDialog();
    await pickClient();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Weight Loss' })).toHaveAttribute('aria-pressed', 'true'));
  });

  it('turns a powerlifting screening into a Strength programme', async () => {
    goalsList.mockResolvedValue({ data: [{ goal_type: 'powerlifting', is_active: true }] });
    openDialog();
    await pickClient();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Strength' })).toHaveAttribute('aria-pressed', 'true'));
  });

  it('takes the difficulty from the workout experience recorded at enrolment', async () => {
    clientRow.mockResolvedValue({ data: { id: 'c1', name: 'Rahul Sharma', workout_experience_level: 'beginner' } });
    openDialog();
    await pickClient();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Beginner' })).toHaveAttribute('aria-pressed', 'true'));
    // Weeks is not "filled" — nothing on the record says how long a block runs.
    expect(numbers()[0].value).toBe('4');
  });

  it('leaves the goal and difficulty alone when the record answers neither', async () => {
    goalsList.mockResolvedValue({ data: [] });
    clientRow.mockResolvedValue({ data: { id: 'c1', name: 'Rahul Sharma' } });
    openDialog();
    await pickClient();

    await waitFor(() => expect(clientRow).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Muscle Gain' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Intermediate' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves a field alone once the trainer has chosen it', async () => {
    // Change your mind about the client after choosing a difficulty and the
    // choice must survive.
    clientRow.mockResolvedValue({ data: { id: 'c1', name: 'Rahul Sharma', workout_experience_level: 'advanced' } });
    goalsList.mockResolvedValue({ data: [{ goal_type: 'fat_loss' }] });
    openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Beginner' }));

    await pickClient();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Weight Loss' })).toHaveAttribute('aria-pressed', 'true'));

    expect(screen.getByRole('button', { name: 'Beginner' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('survives both reads failing', async () => {
    clientRow.mockRejectedValue(new Error('offline'));
    goalsList.mockRejectedValue(new Error('offline'));
    openDialog();
    await pickClient();
    await waitFor(() => expect(clientRow).toHaveBeenCalled());
    expect(nameField().value).toBe('');
  });
});

describe('reading a client record', () => {
  it('matches a goal however it was stored', () => {
    for (const raw of ['muscle_gain', 'Muscle Gain', 'MUSCLE-GAIN', ' muscle gain ']) {
      expect(goalFromClient(raw)).toBe('muscle_gain');
    }
  });

  it('gives up on a goal nobody listed rather than picking one', () => {
    expect(goalFromClient('get shredded')).toBeUndefined();
    expect(goalFromClient('')).toBeUndefined();
    expect(goalFromClient(null)).toBeUndefined();
  });

  it('reads a difficulty out of the recorded workout experience', () => {
    expect(difficultyFromClient('beginner')).toBe('beginner');
    expect(difficultyFromClient('Intermediate')).toBe('intermediate');
    expect(difficultyFromClient('advanced')).toBe('advanced');
    // An athlete gets an advanced programme — there is no fourth level.
    expect(difficultyFromClient('athlete')).toBe('advanced');
  });

  it('gives up on an experience level it does not know', () => {
    expect(difficultyFromClient('')).toBeUndefined();
    expect(difficultyFromClient(null)).toBeUndefined();
    expect(difficultyFromClient('gym rat')).toBeUndefined();
  });

  it('maps the screening vocabulary onto a programme goal where they agree', () => {
    expect(goalFromClient('fat_loss')).toBe('weight_loss');
    expect(goalFromClient('marathon_prep')).toBe('endurance');
    // Strength is a programme goal since migration 219.
    expect(goalFromClient('strength_gain')).toBe('strength');
    expect(goalFromClient('powerlifting')).toBe('strength');
  });

  it('refuses the screening goals that have no honest equivalent', () => {
    // Six programme goals against fourteen screening ones. Mapping
    // body recomposition onto Muscle Gain would put a goal on the programme
    // that nobody chose.
    for (const t of ['body_recomposition', 'mobility',
      'medical_fitness', 'senior_fitness', 'athletic_performance', 'custom']) {
      expect(goalFromClient(t)).toBeUndefined();
    }
  });
});

describe('a plan with nobody on it is still editable', () => {
  it('has a builder addressed by the plan', () => {
    expect(routeExists('/pt-os/workout-plans/[id]/builder')).toBe(true);
  });

  it('has an add-exercises page beside it', () => {
    expect(routeExists('/pt-os/workout-plans/[id]/builder/add-exercises')).toBe(true);
  });

  it('is the only add-exercises route', () => {
    // There were two, one under the plan and one under the client, mounting
    // the same AddExercisesScreen. Two routes onto one component is how the
    // two versions drift into different search, filters and keyboard
    // behaviour; the client-scoped one is gone and redirects here.
    const src = readFileSync(appPath('/pt-os/workout-plans/[id]/builder/add-exercises', 'page.tsx'), 'utf8');
    expect(src).toContain('AddExercisesScreen');
    expect(routeExists('/pt-os/clients/[id]/training/builder/add-exercises')).toBe(false);
    expect(routeExists('/pt-os/clients/[id]/training/builder')).toBe(false);
  });

  it('sends the builder to the plan-scoped page when there is no client', () => {
    const src = stripComments(readFileSync(srcPath('components/pt-os/builder/WorkoutBuilder.tsx'), 'utf8'));
    expect(src).toContain('/builder/add-exercises');
    expect(src).toMatch(/workout-plans\/\$\{encodeURIComponent\(planId\)\}\/builder\/add-exercises/);
  });
});

describe('the plan detail screen has no floating picker left', () => {
  const src = () => stripComments(readFileSync(appPath('/pt-os/workout-plans/[id]', 'page.tsx'), 'utf8'));

  it('does not mount the exercise picker dialog', () => {
    // The whole point of point 3: adding exercises stopped being a modal on
    // top of the thing being edited.
    expect(src()).not.toContain('<ExercisePicker');
    expect(src()).not.toContain('pickerOpen');
  });

  it('sends both of its edit actions to the builder', () => {
    const text = src();
    expect(text).toContain('openBuilder');
    expect(text).not.toContain('startEditing');
  });
});
