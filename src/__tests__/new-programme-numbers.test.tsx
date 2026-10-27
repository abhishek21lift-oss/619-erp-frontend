// Weeks in the New programme dialog.
//
// Sessions/week used to be a second number field here. It is gone: the count
// comes from the days the builder programmes (backend migration 219).
//
// Reported as "not changing — if I try to change it, it becomes 1 and then the
// value starts after 1". That is precisely what the old code did:
//
//   const [weeks, setWeeks] = useState(4);
//   onChange={(e) => setWeeks(Math.max(1, Number(e.target.value) || 1))}
//
// Numeric state cannot hold "". Select the contents and type 8, and the
// browser fires change with "" before it fires change with "8". Number("") is
// 0, `|| 1` turns that into 1, the box re-renders as "1", and the 8 you typed
// lands after it — 18. The only values reachable were the ones you could build
// by appending digits to a 1.
//
// The fix is to hold what is typed as a string and only turn it into a number
// on submit. These tests drive the real component through the real sequence of
// change events rather than asserting on the handler, because the bug lived in
// the round trip between state and the rendered value.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

const createPlan = vi.fn(async () => ({ plan: { id: 'p1' } }));
const assign = vi.fn(async () => ({}));
vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      clients: async () => ({ data: [{ id: 'c1', name: 'Ajeet Yadav' }] }),
      // Picking a client fills the rest of the form from that client's record,
      // so the dialog reads the row on selection. These tests are about the
      // number fields, and this client answers none of them — which is the
      // case that must leave the typed values alone.
      client: async () => ({ data: { id: 'c1', name: 'Ajeet Yadav' } }),
    },
    // The goal now comes from the goal-setting screening. This client has not
    // been screened, which is the case that leaves the form's goal alone.
    progress: { goals: { list: async () => ({ data: [] }) } },
    workouts: {
      plans: { create: (...a: unknown[]) => createPlan(...(a as [])) },
      assign: (...a: unknown[]) => assign(...(a as [])),
    },
  },
}));

vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }) }));

import { NewProgrammeForm } from '@/components/pt-os/builder/NewProgrammeForm';

/*
 * Queried by inputMode rather than by role.
 *
 * These used to be `getAllByRole('spinbutton')`, which is the implicit role
 * of `<input type="number">` — so the query was coupled to the very thing
 * that made the field unsafe. A scroll wheel over a focused number input
 * silently changes its value, and the design system no longer renders one.
 *
 * Every assertion below is unchanged; only the way the fields are found is.
 */
function numericFields() {
  return Array.from(
    document.querySelectorAll('input[inputmode="numeric"]'),
  ) as HTMLInputElement[];
}

function open() {
  render(<NewProgrammeForm presetClientId="c1" />);
  const [weeks] = numericFields();
  return { weeks };
}

function nameField() {
  return screen.getByPlaceholderText(/Upper \/ Lower Split/i);
}

beforeEach(() => {
  push.mockClear();
  createPlan.mockClear();
  assign.mockClear();
});

afterEach(cleanup);

describe('typing a new value', () => {
  it('lets the field be cleared without snapping to 1', () => {
    // The exact first half of the reported sequence. Under the old code this
    // assertion read "1".
    const { weeks } = open();
    fireEvent.change(weeks, { target: { value: '' } });
    expect(weeks.value).toBe('');
  });

  it('types 8 into a cleared field and gets 8, not 18', () => {
    // Typed the way a browser types: the next change carries whatever is
    // ALREADY displayed plus the new digit. fireEvent.change with a literal
    // '8' would replace the whole value and pass even against the old code —
    // it is the re-render to "1" that makes the browser append to a 1.
    const { weeks } = open();
    fireEvent.change(weeks, { target: { value: '' } });
    fireEvent.change(weeks, { target: { value: weeks.value + '8' } });
    expect(weeks.value).toBe('8');
  });

  it('types a two-digit value a digit at a time', () => {
    // 12 weeks. Under the old code: "" → 1, then "1" → 1, then "12" → 12 by
    // luck; but "" → 1 then typing 2 gave 12 only because the 1 was already
    // there. Starting from 4 it gave 42.
    const { weeks } = open();
    fireEvent.change(weeks, { target: { value: '' } });
    fireEvent.change(weeks, { target: { value: weeks.value + '1' } });
    fireEvent.change(weeks, { target: { value: weeks.value + '2' } });
    expect(weeks.value).toBe('12');
  });

  it('has no sessions-per-week field left to type in', () => {
    // Counted from the programmed days instead; a number typed before any
    // exercise existed disagreed with them on 30 of 35 production plans.
    open();
    expect(numericFields()).toHaveLength(1);
    expect(screen.queryByText(/Sessions \/ week/i)).toBeNull();
  });
});

describe('bounds without silently rewriting what was typed', () => {
  it('leaves an empty field empty on blur', () => {
    const { weeks } = open();
    fireEvent.change(weeks, { target: { value: '' } });
    fireEvent.blur(weeks);
    expect(weeks.value).toBe('');
  });

  it('leaves an out-of-range value visible on blur so submit can explain it', () => {
    const { weeks } = open();
    fireEvent.change(weeks, { target: { value: '999' } });
    fireEvent.blur(weeks);
    expect(weeks.value).toBe('999');
  });

  it.each([
    ['', 'Weeks is required.'],
    ['0', 'Weeks must be at least 1.'],
    ['53', 'Weeks cannot be more than 52.'],
    ['2.5', 'Weeks must be a whole number.'],
    ['abc', 'Weeks must be a number.'],
  ])('blocks %j weeks and does not create anything', async (raw, message) => {
    const { weeks } = open();
    fireEvent.change(nameField(), { target: { value: 'Test' } });
    fireEvent.change(weeks, { target: { value: raw } });
    fireEvent.click(screen.getByRole('button', { name: /create and add exercises/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(createPlan).not.toHaveBeenCalled();
  });
});

describe('what reaches the API', () => {
  it('submits the typed number, not the starting one', async () => {
    const { weeks } = open();
    fireEvent.change(nameField(), {
      target: { value: 'Push Pull Legs' },
    });
    fireEvent.change(weeks, { target: { value: '' } });
    fireEvent.change(weeks, { target: { value: '8' } });

    fireEvent.click(screen.getByRole('button', { name: /create and add exercises/i }));

    await waitFor(() => expect(createPlan).toHaveBeenCalled());
    const body = createPlan.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toMatchObject({ duration_weeks: 8 });
    expect(body).not.toHaveProperty('sessions_per_week');
  });

  it('saves a client programme as not a template', async () => {
    // The server read an absent flag as TRUE, so every programme made here
    // was stored as a template.
    open();
    fireEvent.change(nameField(), { target: { value: 'PPL' } });
    fireEvent.click(screen.getByRole('button', { name: /create and add exercises/i }));
    await waitFor(() => expect(createPlan).toHaveBeenCalled());
    expect(createPlan.mock.calls[0][0]).toMatchObject({ is_template: false });
  });

  it('sends the difficulty the trainer chose, not a fixed intermediate', async () => {
    open();
    fireEvent.change(nameField(), { target: { value: 'First block' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Beginner' }));
    fireEvent.click(screen.getByRole('button', { name: /create and add exercises/i }));
    await waitFor(() => expect(createPlan).toHaveBeenCalled());
    expect(createPlan.mock.calls[0][0]).toMatchObject({ difficulty: 'beginner' });
  });

  it('asks before throwing away typed changes on Cancel', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { unmount } = render(<NewProgrammeForm presetClientId="c1" />);
    fireEvent.change(nameField(), { target: { value: 'Draft' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(push).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(push).toHaveBeenCalledWith('/pt-os/workout-plans?client_id=c1');
    confirm.mockRestore();
    unmount();
  });
});
