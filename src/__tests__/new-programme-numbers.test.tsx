// Weeks and Sessions/week in the New programme dialog.
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
// on blur and on submit. These tests drive the real component through the real
// sequence of change events rather than asserting on the handler, because the
// bug lived in the round trip between state and the rendered value.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

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

import NewProgrammeDialog, { clamp } from '@/components/pt-os/builder/NewProgrammeDialog';

function open() {
  render(<NewProgrammeDialog open onClose={() => {}} presetClientId="c1" />);
  const [weeks, perWeek] = screen.getAllByRole('spinbutton') as HTMLInputElement[];
  return { weeks, perWeek };
}

beforeEach(() => {
  push.mockClear();
  createPlan.mockClear();
  assign.mockClear();
});

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

  it('does the same for sessions per week', () => {
    const { perWeek } = open();
    fireEvent.change(perWeek, { target: { value: '' } });
    fireEvent.change(perWeek, { target: { value: perWeek.value + '5' } });
    expect(perWeek.value).toBe('5');
  });
});

describe('clamping on blur', () => {
  it('an empty field falls back to the minimum, not to nothing', () => {
    const { weeks } = open();
    fireEvent.change(weeks, { target: { value: '' } });
    fireEvent.blur(weeks);
    expect(weeks.value).toBe('1');
  });

  it('holds the upper bound, which was never enforced before', () => {
    // max={52} is a hint the browser does not apply to typed input, and the
    // old Math.max only had a floor — 999 weeks submitted happily.
    const { weeks } = open();
    fireEvent.change(weeks, { target: { value: '999' } });
    fireEvent.blur(weeks);
    expect(weeks.value).toBe('52');
  });

  it('holds the lower bound', () => {
    const { perWeek } = open();
    fireEvent.change(perWeek, { target: { value: '0' } });
    fireEvent.blur(perWeek);
    expect(perWeek.value).toBe('1');
  });

  it('caps sessions per week at 14', () => {
    const { perWeek } = open();
    fireEvent.change(perWeek, { target: { value: '40' } });
    fireEvent.blur(perWeek);
    expect(perWeek.value).toBe('14');
  });
});

describe('what reaches the API', () => {
  it('submits the typed number, not the starting one', async () => {
    const { weeks, perWeek } = open();
    fireEvent.change(screen.getByPlaceholderText(/Upper \/ Lower Split/i), {
      target: { value: 'Push Pull Legs' },
    });
    fireEvent.change(weeks, { target: { value: '' } });
    fireEvent.change(weeks, { target: { value: '8' } });
    fireEvent.change(perWeek, { target: { value: '' } });
    fireEvent.change(perWeek, { target: { value: '5' } });

    fireEvent.click(screen.getByText(/Create and add exercises/i));

    await waitFor(() => expect(createPlan).toHaveBeenCalled());
    expect(createPlan.mock.calls[0][0]).toMatchObject({
      duration_weeks: 8,
      sessions_per_week: 5,
    });
  });

  it('submits a number even if the field is left mid-edit and empty', async () => {
    // Submitting without blurring is reachable: tap the button directly from
    // the field. The API must not receive NaN.
    const { weeks } = open();
    fireEvent.change(screen.getByPlaceholderText(/Upper \/ Lower Split/i), {
      target: { value: 'Test' },
    });
    fireEvent.change(weeks, { target: { value: '' } });
    fireEvent.click(screen.getByText(/Create and add exercises/i));

    await waitFor(() => expect(createPlan).toHaveBeenCalled());
    const body = createPlan.mock.calls[0][0] as { duration_weeks: number };
    expect(Number.isFinite(body.duration_weeks)).toBe(true);
    expect(body.duration_weeks).toBe(1);
  });
});

describe('clamp()', () => {
  it('floors, bounds, and survives junk', () => {
    expect(clamp('8', 1, 52)).toBe(8);
    expect(clamp('', 1, 52)).toBe(1);
    expect(clamp('0', 1, 52)).toBe(1);
    expect(clamp('999', 1, 52)).toBe(52);
    expect(clamp('-4', 1, 52)).toBe(1);
    expect(clamp('3.7', 1, 52)).toBe(3);
    expect(clamp('abc', 1, 52)).toBe(1);
  });
});
