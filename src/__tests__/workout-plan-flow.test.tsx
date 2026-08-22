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
vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      clients: async () => ({ data: [{ id: 'c1', name: 'Rahul Sharma' }] }),
      client: (...a: unknown[]) => clientRow(...a),
    },
    workouts: {
      plans: { create: async () => ({ plan: { id: 'p1' } }) },
      assign: async () => ({}),
    },
  },
}));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }) }));

import NewProgrammeDialog, {
  goalFromClient, perWeekFromClient, programmeNameFor,
} from '@/components/pt-os/builder/NewProgrammeDialog';

beforeEach(() => {
  push.mockClear();
  clientRow.mockReset();
  clientRow.mockResolvedValue({ data: { id: 'c1', name: 'Rahul Sharma' } });
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
  it('takes the goal and the sessions per week off the client record', async () => {
    clientRow.mockResolvedValue({
      data: { id: 'c1', name: 'Rahul Sharma', goal: 'weight_loss', frequency: '5x/week' },
    });
    openDialog();
    await pickClient();

    await waitFor(() => expect(nameField().value).toContain('Rahul Sharma'));
    const [weeks, perWeek] = numbers();
    expect(weeks.value).toBe('4');
    expect(perWeek.value).toBe('5');
    expect(screen.getByRole('button', { name: 'Weight Loss' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves a field alone once the trainer has typed in it', async () => {
    // Change your mind about the client after naming the programme and the
    // name must survive. The obvious implementation overwrites it.
    clientRow.mockResolvedValue({
      data: { id: 'c1', name: 'Rahul Sharma', goal: 'weight_loss', frequency: '5' },
    });
    openDialog();
    fireEvent.change(nameField(), { target: { value: 'Push Pull Legs' } });
    const [, perWeek] = numbers();
    fireEvent.change(perWeek, { target: { value: '2' } });

    await pickClient();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Weight Loss' })).toHaveAttribute('aria-pressed', 'true'));

    expect(nameField().value).toBe('Push Pull Legs');
    expect((numbers()[1]).value).toBe('2');
  });

  it('claims nothing when the record answers nothing', async () => {
    // A client with no goal and no frequency leaves the form's own defaults
    // standing rather than inventing a programme shape for them.
    clientRow.mockResolvedValue({ data: { id: 'c1', name: 'Rahul Sharma' } });
    openDialog();
    await pickClient();

    await waitFor(() => expect(nameField().value).toContain('Rahul Sharma'));
    const [weeks, perWeek] = numbers();
    expect(weeks.value).toBe('4');
    expect(perWeek.value).toBe('3');
  });

  it('survives a client read that fails', async () => {
    clientRow.mockRejectedValue(new Error('offline'));
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

  it('names the programme after the client, with the goal when it knows it', () => {
    expect(programmeNameFor('Rahul Sharma', 'muscle_gain')).toBe('Rahul Sharma — Muscle Gain');
    expect(programmeNameFor('Rahul Sharma')).toBe('Rahul Sharma — Training Plan');
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
