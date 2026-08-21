// Batch mode: pick several exercises, then add them once.
//
// ── What it replaces ───────────────────────────────────────────────────────
//
// pick() called onSelect() and then onClose(). One click added one exercise
// and shut the dialog, so laying out a six-movement day meant opening the
// picker six times — and each reopen threw away the search text, the filters
// and the scroll position, so the trainer re-found their place in the library
// on every single one.
//
// ── Why it is opt-in ───────────────────────────────────────────────────────
//
// Three other callers want exactly one exercise and their own follow-up UI: a
// logged session row, a template row, a plan-detail row. Only the programme
// builder is a "sit down and lay out the day" screen. Default single-select
// keeps those three byte-identical, which is asserted here rather than
// assumed.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExercisePicker } from '@/components/pt-os/workout-log/ExercisePicker';

vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }) }));

const listMock = vi.fn();
const markUsed = vi.fn(async () => ({}));
vi.mock('@/lib/api', () => ({
  api: {
    exercises: {
      meta: async () => ({ muscles_by_region: {}, equipment: [] }),
      recent: async () => ({ exercises: [] }),
      list: (...a: unknown[]) => listMock(...a),
      markUsed: (...a: unknown[]) => markUsed(...a),
    },
  },
}));

const ex = (id: string, name: string) => ({
  id, name, primary_muscle: 'chest', equipment_name: 'barbell',
  mechanic: 'compound', is_favorite: false, is_custom: false,
});
const SQUAT = ex('x1', 'Back Squat');
const BENCH = ex('x2', 'Barbell Bench Press');
const ROW   = ex('x3', 'Barbell Row');

const settle = () => waitFor(() => expect(listMock).toHaveBeenCalled(), { timeout: 1500 });

function setup(props: Partial<React.ComponentProps<typeof ExercisePicker>> = {}) {
  const onSelect = vi.fn();
  const onSelectMany = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <ExercisePicker open onClose={onClose} onSelect={onSelect} onSelectMany={onSelectMany} multiple {...props} />,
  );
  return { onSelect, onSelectMany, onClose, view };
}

beforeEach(() => {
  listMock.mockReset();
  markUsed.mockClear();
  listMock.mockResolvedValue({ exercises: [SQUAT, BENCH, ROW] });
});

describe('selecting does not close the dialog', () => {
  it('collects picks instead of firing one at a time', async () => {
    const { onSelect, onSelectMany, onClose } = setup();
    await settle();

    fireEvent.click(await screen.findByText('Back Squat'));
    fireEvent.click(screen.getByText('Barbell Bench Press'));

    // The old behaviour: each click called onSelect and onClose.
    expect(onSelect).not.toHaveBeenCalled();
    expect(onSelectMany).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /add 2/i })).toBeInTheDocument();
  });

  it('marks the row as chosen for assistive tech', async () => {
    // Nothing moves focus and nothing closes, so without aria-pressed a screen
    // reader is told nothing at all when a selection changes.
    setup();
    await settle();
    const row = (await screen.findByText('Back Squat')).closest('button')!;
    expect(row).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles a second click off again', async () => {
    setup();
    await settle();
    const row = (await screen.findByText('Back Squat')).closest('button')!;
    fireEvent.click(row);
    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
  });
});

describe('adding the batch', () => {
  it('hands over every pick, in the order they were chosen', async () => {
    // Order is the day's order — the server appends, so this is not cosmetic.
    const { onSelectMany, onClose } = setup();
    await settle();

    fireEvent.click(await screen.findByText('Barbell Row'));
    fireEvent.click(screen.getByText('Back Squat'));
    fireEvent.click(screen.getByRole('button', { name: /add 2/i }));

    expect(onSelectMany).toHaveBeenCalledTimes(1);
    expect(onSelectMany.mock.calls[0][0].map((e: { name: string }) => e.name))
      .toEqual(['Barbell Row', 'Back Squat']);
  });

  it('does NOT dismiss itself — the caller owns that', async () => {
    // Committing a batch is N sequential writes. If the panel dismissed
    // itself on the button press, the caller's failure handling would run
    // against a screen the trainer had already left, and a batch that failed
    // outright would be gone with nothing to retry. The caller keeps the
    // surface until it knows the writes landed.
    const { onSelectMany, onClose } = setup();
    await settle();

    fireEvent.click(await screen.findByText('Back Squat'));
    fireEvent.click(screen.getByRole('button', { name: /add 1/i }));

    expect(onSelectMany).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('records usage only for what was actually added', async () => {
    // markUsed is a usage statistic. A movement selected and then deselected
    // was never used, so firing it on toggle would poison "recently used".
    const { onSelectMany } = setup();
    await settle();

    const squat = (await screen.findByText('Back Squat')).closest('button')!;
    fireEvent.click(squat);
    fireEvent.click(squat);                                   // changed their mind
    fireEvent.click(screen.getByText('Barbell Bench Press'));
    expect(markUsed).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /add 1/i }));
    expect(onSelectMany).toHaveBeenCalled();
    expect(markUsed).toHaveBeenCalledTimes(1);
    expect(markUsed).toHaveBeenCalledWith('x2');
  });

  it('does nothing when nothing is selected', async () => {
    const { onSelectMany, onClose } = setup();
    await settle();
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();

    // Driven through the KEYBOARD, not by clicking the button. A disabled
    // button swallows fireEvent.click, so clicking it passes whether or not
    // the guard inside addSelected exists — a mutation deleting that guard
    // slipped through the first version of this test for exactly that reason.
    // Cmd+Enter reaches addSelected directly.
    fireEvent.keyDown(document, { key: 'Enter', metaKey: true });

    expect(onSelectMany).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clears the batch without closing', async () => {
    const { onClose } = setup();
    await settle();
    fireEvent.click(await screen.findByText('Back Squat'));
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('commits on Cmd+Enter', async () => {
    // Batch mode is otherwise the one path with no keyboard finish: plain
    // Enter toggles, and the Add button is past every visible result.
    const { onSelectMany } = setup();
    await settle();
    fireEvent.click(await screen.findByText('Back Squat'));
    fireEvent.keyDown(document, { key: 'Enter', metaKey: true });
    expect(onSelectMany).toHaveBeenCalledTimes(1);
  });
});

describe('arrowing past the visible window', () => {
  it('scrolls the highlighted row into view', async () => {
    // Regression guard. This effect keys on the HIGHLIGHTED ROW, and during
    // the panel/dialog split its dependency was rewritten to the panel's
    // live flag — which fires once, on mount, and never again. Keyboard
    // navigation then walked the highlight off the bottom of a list that
    // never moved: nothing throws, nothing looks broken, and the trainer
    // arrows into empty space.
    const many = Array.from({ length: 30 }, (_, i) => ex(`m${i}`, `Movement ${i}`));
    listMock.mockResolvedValue({ exercises: many });
    setup();
    await settle();
    await screen.findByText('Movement 0');

    // jsdom lays nothing out, so a real element's scrollTop is permanently 0
    // and a write to it is discarded — asserting on it directly would pass
    // with the effect deleted. The property is replaced with a backing field
    // so the write is observable.
    // The last scroller on the sheet is the library; the first is the row of
    // filter chips.
    const scrollers = document.querySelectorAll('.overflow-y-auto');
    const list = scrollers[scrollers.length - 1] as HTMLElement;
    let scrollTop = 0;
    Object.defineProperty(list, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (v: number) => { scrollTop = v; },
    });

    // Past the ~7 rows a 440px window shows at 56px each.
    for (let i = 0; i < 20; i += 1) fireEvent.keyDown(document, { key: 'ArrowDown' });

    expect(scrollTop).toBeGreaterThan(0);
  });
});

describe('while the caller is writing the batch', () => {
  it('says so on the commit button', async () => {
    const { view, onSelectMany, onClose } = setup();
    await settle();
    fireEvent.click(await screen.findByText('Back Squat'));

    view.rerender(
      <ExercisePicker
        open busy multiple
        onClose={onClose}
        onSelect={() => {}}
        onSelectMany={onSelectMany}
      />,
    );
    expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled();
  });

  it('refuses a second commit', async () => {
    // Two presses would write the batch twice. Driven through Cmd+Enter
    // rather than the button, because a disabled button swallows a click and
    // would pass whether or not the guard exists.
    const { view, onSelectMany, onClose } = setup();
    await settle();
    fireEvent.click(await screen.findByText('Back Squat'));

    view.rerender(
      <ExercisePicker
        open busy multiple
        onClose={onClose}
        onSelect={() => {}}
        onSelectMany={onSelectMany}
      />,
    );
    fireEvent.keyDown(document, { key: 'Enter', metaKey: true });

    expect(onSelectMany).not.toHaveBeenCalled();
  });
});

describe('a batch never outlives the dialog', () => {
  it('is dropped when the picker closes', async () => {
    const { view, onSelectMany } = setup();
    await settle();
    fireEvent.click(await screen.findByText('Back Squat'));
    expect(screen.getByRole('button', { name: /add 1/i })).toBeInTheDocument();

    // Reopening must not resurrect picks the trainer walked away from — they
    // may have been chosen for a different day entirely.
    view.rerender(
      <ExercisePicker open={false} onClose={() => {}} onSelect={() => {}} onSelectMany={onSelectMany} multiple />,
    );
    view.rerender(
      <ExercisePicker open onClose={() => {}} onSelect={() => {}} onSelectMany={onSelectMany} multiple />,
    );
    await settle();
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
  });
});

describe('single-select is untouched', () => {
  it('still adds one and closes immediately', async () => {
    // The three other callers depend on exactly this.
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<ExercisePicker open onClose={onClose} onSelect={onSelect} />);
    await settle();

    fireEvent.click(await screen.findByText('Back Squat'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'x1', name: 'Back Squat' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows no batch bar', async () => {
    render(<ExercisePicker open onClose={() => {}} onSelect={() => {}} />);
    await settle();
    expect(screen.queryByRole('button', { name: /^add( \d+)?$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('leaves rows unmarked, because they are not toggles', async () => {
    render(<ExercisePicker open onClose={() => {}} onSelect={() => {}} />);
    await settle();
    const row = (await screen.findByText('Back Squat')).closest('button')!;
    expect(row).not.toHaveAttribute('aria-pressed');
  });
});
