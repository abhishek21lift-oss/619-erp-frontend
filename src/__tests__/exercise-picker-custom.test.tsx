// The "Custom" option in the exercise picker.
//
// A trainer coaching a movement the library has never heard of — a rehab
// variation, a machine unique to the gym, something a physio prescribed — had
// no way to log it. Search returned "Nothing matches" and that was the end of
// the road, so the set went unrecorded or got filed under the wrong exercise.
//
// The schema was already built for this: workout_session_exercises.exercise_id
// is nullable and exercise_name is NOT NULL, so a logged row can carry the
// name itself. Only the dialog was missing.
//
// The most important test here is the one asserting the option is ABSENT by
// default — a programme row has nowhere to put a custom name, so offering it
// there would take the trainer's input and quietly discard it.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExercisePicker } from '@/components/pt-os/workout-log/ExercisePicker';

vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }) }));

const listMock = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    exercises: {
      meta: async () => ({ muscles_by_region: {}, equipment: [] }),
      recent: async () => ({ exercises: [] }),
      list: (...a: unknown[]) => listMock(...a),
      markUsed: async () => ({}),
    },
  },
}));

const BENCH = {
  id: 'x1', name: 'Barbell Bench Press', primary_muscle: 'chest',
  equipment_name: 'barbell', mechanic: 'compound', is_favorite: false, is_custom: false,
};

function setup(props: Partial<React.ComponentProps<typeof ExercisePicker>> = {}) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  render(<ExercisePicker open onClose={onClose} onSelect={onSelect} allowCustom {...props} />);
  return { onSelect, onClose };
}

/** The debounce inside the picker is 220ms. */
const settle = () => waitFor(() => expect(listMock).toHaveBeenCalled(), { timeout: 1500 });

describe('Custom exercise', () => {
  beforeEach(() => {
    listMock.mockReset();
    listMock.mockResolvedValue({ exercises: [] });
  });

  it('is not offered unless the caller can store it', async () => {
    // The guard that matters. workout_plan_exercises has no name column, so a
    // custom pick in the programme builder would be accepted here and dropped
    // on save. Absent by default is the safe direction.
    setup({ allowCustom: false });
    await settle();
    expect(screen.queryByTestId('custom-exercise')).toBeNull();
  });

  it('is offered when the caller opted in', async () => {
    setup();
    await settle();
    expect(screen.getByTestId('custom-exercise')).toBeTruthy();
  });

  it('invites a name before one is typed, and does not fire empty', async () => {
    const { onSelect, onClose } = setup();
    await settle();

    const custom = screen.getByTestId('custom-exercise');
    expect(custom.textContent).toContain('Custom exercise');

    fireEvent.click(custom);
    // An empty name would fail the server's min(1) after the sheet had already
    // closed, so it focuses the field instead of pretending to work.
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('offers the typed name back verbatim', async () => {
    setup();
    await settle();
    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: 'Copenhagen plank' } });
    await waitFor(() => expect(screen.getByTestId('custom-exercise').textContent).toContain('Copenhagen plank'));
  });

  it('emits an empty id, which is what marks it as not from the library', async () => {
    const { onSelect, onClose } = setup();
    await settle();

    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: 'Copenhagen plank' } });
    fireEvent.click(screen.getByTestId('custom-exercise'));

    expect(onSelect).toHaveBeenCalledWith({ id: '', name: 'Copenhagen plank' });
    expect(onClose).toHaveBeenCalled();
  });

  it('tidies whitespace rather than storing it', async () => {
    const { onSelect } = setup();
    await settle();
    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: '  Copenhagen   plank  ' } });
    fireEvent.click(screen.getByTestId('custom-exercise'));
    expect(onSelect).toHaveBeenCalledWith({ id: '', name: 'Copenhagen plank' });
  });

  it('clips to the 255 the column accepts instead of being rejected on save', async () => {
    const { onSelect } = setup();
    await settle();
    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: 'a'.repeat(400) } });
    fireEvent.click(screen.getByTestId('custom-exercise'));
    expect(onSelect.mock.calls[0][0].name).toHaveLength(255);
  });

  it('stays available even when the library does have matches', async () => {
    // A trainer may want "Bench Press (paused)" precisely because the plain
    // one exists. Hiding Custom behind a no-results state would block that.
    listMock.mockResolvedValue({ exercises: [BENCH] });
    setup();
    await settle();
    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: 'Bench Press (paused)' } });
    await waitFor(() => expect(screen.getByTestId('custom-exercise').textContent).toContain('Bench Press (paused)'));
  });

  it('takes Enter as "use it anyway" when nothing matched', async () => {
    const { onSelect } = setup();
    await settle();
    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: 'Jefferson curl' } });
    await waitFor(() => expect(screen.getByTestId('custom-exercise').textContent).toContain('Jefferson curl'));

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith({ id: '', name: 'Jefferson curl' });
  });

  it('lets Enter pick the highlighted library row rather than the custom one', async () => {
    // Custom must never steal the keyboard from a real match.
    listMock.mockResolvedValue({ exercises: [BENCH] });
    const { onSelect } = setup();
    await waitFor(() => expect(screen.getByText('Barbell Bench Press')).toBeTruthy());

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith({ id: 'x1', name: 'Barbell Bench Press' });
  });

  it('points at the Custom option when a search comes back empty', async () => {
    setup();
    await settle();
    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: 'Jefferson curl' } });
    await waitFor(() => expect(screen.getByText(/Use the Custom option above/i)).toBeTruthy());
  });
});
