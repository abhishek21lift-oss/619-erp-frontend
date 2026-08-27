import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useRef, useState } from 'react';
import { useDialogA11y } from '@/hooks/useDialogA11y';

// The behaviour sixteen hand-rolled dialogs were missing.
//
// Several of them declared `aria-modal="true"`. That is a statement to
// assistive technology and has no effect on the Tab key — so focus sat behind
// the dialog on open, Tab walked out of it into the page underneath, seven had
// no way to close without a mouse, and closing dropped focus to the top of the
// document. Among them: payment verification, subscription approval and the
// client payment dialogs.

function Harness({
  onClose,
  escapeCloses,
  useInitial = false,
  empty = false,
}: {
  onClose?: () => void;
  escapeCloses?: boolean;
  useInitial?: boolean;
  empty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const second = useRef<HTMLButtonElement | null>(null);
  const ref = useDialogA11y({
    open,
    onClose: () => { setOpen(false); onClose?.(); },
    escapeCloses,
    initialFocus: useInitial ? second : undefined,
  });

  return (
    <div>
      <button onClick={() => setOpen(true)}>open</button>
      <button>behind</button>
      {open && (
        <div ref={ref as (n: HTMLDivElement | null) => void} role="dialog" aria-modal="true" aria-label="Test">
          {!empty && (
            <>
              <button>first</button>
              <button ref={second}>second</button>
              <button>last</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const openIt = () => act(() => { fireEvent.click(screen.getByText('open')); });
const tab = (shift = false) =>
  act(() => { fireEvent.keyDown(document.activeElement ?? document, { key: 'Tab', shiftKey: shift }); });

beforeEach(() => { document.body.innerHTML = ''; });

describe('focus moves into the dialog when it opens', () => {
  it('focuses the first focusable child', () => {
    render(<Harness />);
    openIt();
    // The bug: focus stayed on the trigger, so a screen reader was never told
    // a dialog had appeared.
    expect(document.activeElement).toBe(screen.getByText('first'));
  });

  it('honours an explicit initial focus', () => {
    render(<Harness useInitial />);
    openIt();
    expect(document.activeElement).toBe(screen.getByText('second'));
  });

  it('focuses the container when there is nothing inside to focus', () => {
    render(<Harness empty />);
    openIt();
    const dialog = screen.getByRole('dialog');
    expect(document.activeElement).toBe(dialog);
    // Must be programmatically focusable to receive it, but never a tab stop.
    expect(dialog.getAttribute('tabindex')).toBe('-1');
  });
});

describe('Tab is trapped inside the dialog', () => {
  it('wraps forward from the last child to the first', () => {
    render(<Harness />);
    openIt();
    screen.getByText('last').focus();
    tab();
    expect(document.activeElement).toBe(screen.getByText('first'));
  });

  it('wraps backward from the first child to the last', () => {
    render(<Harness />);
    openIt();
    screen.getByText('first').focus();
    tab(true);
    expect(document.activeElement).toBe(screen.getByText('last'));
  });

  it('pulls focus back if it has drifted outside', () => {
    // A click on the backdrop can land focus on the body. Without this, the
    // next Tab resumes in the page behind the dialog.
    render(<Harness />);
    openIt();
    screen.getByText('behind').focus();
    tab();
    expect(document.activeElement).toBe(screen.getByText('first'));
  });

  it('does not intercept Tab in the middle of the dialog', () => {
    // Trapping must not mean hijacking: the browser still moves focus normally
    // between the ends.
    render(<Harness />);
    openIt();
    screen.getByText('first').focus();
    const prevented = !fireEvent.keyDown(screen.getByText('first'), { key: 'Tab' });
    expect(prevented).toBe(false);
  });

  it('holds focus when the dialog has no focusable children', () => {
    render(<Harness empty />);
    openIt();
    const dialog = screen.getByRole('dialog');
    const prevented = !fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(prevented).toBe(true);
  });
});

describe('Escape closes, and restores focus to where it came from', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    openIt();
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('returns focus to the element that opened it', () => {
    render(<Harness />);
    const trigger = screen.getByText('open');
    trigger.focus();
    openIt();
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    // Dropping focus to the top of the document loses a keyboard user's place
    // on the page entirely.
    expect(document.activeElement).toBe(trigger);
  });

  it('leaves Escape alone when the caller opts out', () => {
    // A dialog mid-payment may need a deliberate choice rather than a
    // dismissal.
    const onClose = vi.fn();
    render(<Harness onClose={onClose} escapeCloses={false} />);
    openIt();
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('it does nothing while closed', () => {
  it('does not steal focus before the dialog opens', () => {
    render(<Harness />);
    const behind = screen.getByText('behind');
    behind.focus();
    expect(document.activeElement).toBe(behind);
  });

  it('does not swallow Escape before the dialog opens', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(onClose).not.toHaveBeenCalled();
  });
});
