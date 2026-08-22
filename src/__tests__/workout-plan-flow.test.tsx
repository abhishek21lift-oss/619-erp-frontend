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
  goalFromClient, perWeekFromClient,
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
const numbers = () => screen.getAllByRole('spinbutton') as HTMLInputElement[];
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
    clientRow.mockResolvedValue({ data: { id: 'c1', name: 'Rahul Sharma', sessions_per_week: 4 } });
    goalsList.mockResolvedValue({ data: [{ goal_type: 'fat_loss', is_active: true }] });
    openDialog();
    await pickClient();

    await waitFor(() => expect((numbers()[1]).value).toBe('4'));
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

  it('takes sessions per week from what the client is enrolled at', async () => {
    // pt_clients.sessions_per_week is the PT Enrollment field, and it beats
    // the older free-text `frequency` when both are present.
    clientRow.mockResolvedValue({
      data: { id: 'c1', name: 'Rahul Sharma', sessions_per_week: 5, frequency: '2x/week' },
    });
    openDialog();
    await pickClient();

    await waitFor(() => expect((numbers()[1]).value).toBe('5'));
    expect((numbers()[0]).value).toBe('4');
  });

  it('falls back to the onboarding frequency when the enrolment field is empty', async () => {
    // Clients who predate migration 053 still fill the field.
    clientRow.mockResolvedValue({ data: { id: 'c1', name: 'Rahul Sharma', frequency: '3 days' } });
    openDialog();
    await pickClient();

    await waitFor(() => expect((numbers()[1]).value).toBe('3'));
  });

  it('leaves the goal alone when the client has never been screened', async () => {
    goalsList.mockResolvedValue({ data: [] });
    clientRow.mockResolvedValue({ data: { id: 'c1', name: 'Rahul Sharma', sessions_per_week: 2 } });
    openDialog();
    await pickClient();

    await waitFor(() => expect((numbers()[1]).value).toBe('2'));
    // By text, not by role name: `Field` wraps the whole group in a <label>,
    // so the FIRST goal button inherits the label's text as its accessible
    // name ("Goal Weight Loss Endurance …"). Pre-existing markup, unrelated
    // to what this test is about.
    expect(screen.getByText('Muscle Gain').closest('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves a field alone once the trainer has typed in it', async () => {
    // Change your mind about the client after setting the sessions and the
    // number must survive.
    clientRow.mockResolvedValue({ data: { id: 'c1', name: 'Rahul Sharma', sessions_per_week: 5 } });
    goalsList.mockResolvedValue({ data: [{ goal_type: 'fat_loss' }] });
    openDialog();
    const [, perWeek] = numbers();
    fireEvent.change(perWeek, { target: { value: '2' } });

    await pickClient();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Weight Loss' })).toHaveAttribute('aria-pressed', 'true'));

    expect((numbers()[1]).value).toBe('2');
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

  it('reads the first number out of a free-text frequency', () => {
    expect(perWeekFromClient('3')).toBe(3);
    expect(perWeekFromClient('4 days')).toBe(4);
    expect(perWeekFromClient('5x/week')).toBe(5);
  });

  it('refuses a frequency it cannot read, or one out of range', () => {
    // "twice weekly" has no digits; 0 and 99 are outside what the field takes.
    expect(perWeekFromClient('twice weekly')).toBeUndefined();
    expect(perWeekFromClient('0')).toBeUndefined();
    expect(perWeekFromClient('99')).toBeUndefined();
    expect(perWeekFromClient(undefined)).toBeUndefined();
  });

  it('maps the screening vocabulary onto a programme goal where they agree', () => {
    expect(goalFromClient('fat_loss')).toBe('weight_loss');
    expect(goalFromClient('marathon_prep')).toBe('endurance');
  });

  it('refuses the screening goals that have no honest equivalent', () => {
    // Five programme goals against fourteen screening ones. Mapping
    // powerlifting onto Muscle Gain would put a goal on the programme that
    // nobody chose.
    for (const t of ['powerlifting', 'strength_gain', 'body_recomposition', 'mobility',
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

  it('renders the same screen as the client-scoped route, not a copy of it', () => {
    // Two routes, one component. A second implementation is how the two
    // versions drift into different search, filters and keyboard behaviour.
    for (const route of [
      '/pt-os/workout-plans/[id]/builder/add-exercises',
      '/pt-os/clients/[id]/training/builder/add-exercises',
    ]) {
      const src = readFileSync(appPath(route, 'page.tsx'), 'utf8');
      expect(src).toContain('AddExercisesScreen');
    }
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
