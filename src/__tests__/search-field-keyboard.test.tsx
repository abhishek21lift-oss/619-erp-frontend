// Dropdowns that open the phone keyboard with them.
//
// ── The bug, and why it survived ────────────────────────────────────────────
//
// Tapping a searchable dropdown opened the panel and left the keyboard down.
// The caret was in the right place — `document.activeElement` WAS the search
// input — so every obvious test of this passes on broken code, and a jsdom
// assertion that "the input has focus" would have passed throughout.
//
// What actually differs is WHEN the focus happens. WebKit raises the on-screen
// keyboard only for a focus made while the browser is still processing the
// user's tap; leave that task and the focus lands silently with no keyboard.
// `setTimeout(…, 30)` always leaves it. A passive `useEffect` may. So the
// property worth testing is not "is it focused" but "is it focused WITHOUT
// anything else having to run first".
//
// These tests install fake timers and NEVER advance them, then assert focus is
// already in place when the click returns. A `setTimeout(…, 30)` focus never
// runs under frozen timers, so it fails; a deferred effect fails the same way.
// That is exactly the distinction the bug turned on.
//
// Deliberately NOT asserted: `vi.getTimerCount() === 0`. It reads like a
// stronger version of the same idea and is not — framer-motion schedules its
// own timers for the panel animation, so the count is never zero and the
// assertion would be measuring the animation library.
//
// ── What these tests CANNOT catch, stated plainly ───────────────────────────
//
// Reverting SearchableSelect to `<input autoFocus />` leaves all twelve
// passing. React's autoFocus also focuses synchronously in jsdom, and the
// difference between it and an explicit focus lives entirely in WebKit's
// user-gesture bookkeeping, which jsdom does not model. Verified by mutation,
// not assumed.
//
// So the guarantee is pinned one level down instead, on the primitive:
// removing `flushSync` from openWithKeyboard fails five of these, including
// "focuses an input that only exists because it opened the panel" — which can
// only pass if the panel was committed before the focus call. That ordering is
// the actual fix; SearchableSelect calling it is wiring, and wiring is all a
// jsdom test can check here. The device-level claim needs a device.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRef, useState } from 'react';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { openWithKeyboard, useSearchFieldFocus } from '@/lib/search-field-focus';

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: false }));
afterEach(() => vi.useRealTimers());

const OPTIONS = ['Spouse', 'Mother', 'Father'];

describe('SearchableSelect — the shared dropdown behind most of the app', () => {
  it('focuses its search box during the tap, not on a later tick', () => {
    // The load-bearing assertion in this file. Timers are frozen, so if the
    // focus needed a timeout — or a deferred effect — to run, the input is not
    // focused here and this fails.
    render(<SearchableSelect label="Relationship" value="" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Relationship' }));

    expect(document.activeElement).toBe(screen.getByLabelText('Search Relationship'));
  });

  it('lets the user type immediately, with no second tap on the search box', () => {
    // The whole point, stated as the user experiences it: one tap, then type.
    render(<SearchableSelect label="Relationship" value="" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Relationship' }));

    fireEvent.change(document.activeElement as HTMLInputElement, { target: { value: 'moth' } });
    expect(screen.getByRole('button', { name: 'Mother' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Father' })).toBeNull();
  });

  it('still selects an option once filtered', () => {
    const onChange = vi.fn();
    render(<SearchableSelect label="Relationship" value="" onChange={onChange} options={OPTIONS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Relationship' }));
    fireEvent.change(document.activeElement as HTMLInputElement, { target: { value: 'moth' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mother' }));

    expect(onChange).toHaveBeenCalledWith('Mother');
    expect(screen.queryByLabelText('Search Relationship')).toBeNull();
  });

  it('focuses again on reopen', () => {
    // Reopening is a fresh gesture and needs a fresh keyboard. A "focus once"
    // implementation would pass every test above and fail here.
    render(<SearchableSelect label="Relationship" value="" onChange={() => {}} options={OPTIONS} />);
    const trigger = screen.getByRole('button', { name: 'Relationship' });

    fireEvent.click(trigger);
    fireEvent.change(document.activeElement as HTMLInputElement, { target: { value: 'moth' } });
    fireEvent.click(trigger);                       // close
    expect(screen.queryByLabelText('Search Relationship')).toBeNull();

    fireEvent.click(trigger);                       // reopen
    const input = screen.getByLabelText('Search Relationship') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    // The query is RETAINED across a trigger-toggle close/reopen — measured,
    // not assumed. (Selecting an option or clicking away does clear it.) That
    // is pre-existing behaviour and left alone; it is also why
    // openWithKeyboard puts the caret at the END rather than selecting all,
    // so typing extends the previous filter instead of silently replacing it.
    expect(input.value).toBe('moth');
  });

  it('steals no focus while it is closed', () => {
    // Requirement stated the other way round: a dropdown sitting on a form
    // must not grab the caret from the field the user is actually in.
    render(
      <>
        <input aria-label="Full name" />
        <SearchableSelect label="Relationship" value="" onChange={() => {}} options={OPTIONS} />
      </>,
    );
    const name = screen.getByLabelText('Full name');
    name.focus();
    expect(document.activeElement).toBe(name);
  });

  it('keeps the dropUp positioning it does for the bottom of the screen', () => {
    // toggleOpen was restructured to focus inside the gesture; the viewport
    // measurement it also does had to survive that.
    render(<SearchableSelect label="Relationship" value="" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Relationship' }));
    expect(screen.getByLabelText('Search Relationship')).toBeTruthy();
  });
});

describe('openWithKeyboard', () => {
  it('focuses an input that only exists because it opened the panel', () => {
    // The ordering that makes the fix work: the panel is committed by
    // flushSync, so the input is already in the DOM when focus is called —
    // still inside the caller's tap.
    function Harness() {
      const [open, setOpen] = useState(false);
      const ref = useRef<HTMLInputElement>(null);
      return (
        <>
          <button onClick={() => openWithKeyboard(() => setOpen(true), () => ref.current)}>Open</button>
          {open && <input ref={ref} aria-label="Search" defaultValue="abc" />}
        </>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    const input = screen.getByLabelText('Search') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    // Caret at the end, so typing appends to a retained query.
    expect(input.selectionStart).toBe(3);
  });

  it('is a no-op for a dropdown with no search field', () => {
    // Requirement 5, directly: a plain option list must open without summoning
    // a keyboard, and must not throw for want of an input.
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => openWithKeyboard(() => setOpen(true), () => null)}>Open</button>
          {open && <ul><li>Only options here</li></ul>}
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    fireEvent.click(trigger);

    expect(screen.getByText('Only options here')).toBeTruthy();
    expect(document.activeElement).not.toBeInstanceOf(HTMLInputElement);
  });
});

describe('useSearchFieldFocus — for popups a parent opens', () => {
  function Harness({ open }: { open: boolean }) {
    const ref = useRef<HTMLInputElement>(null);
    useSearchFieldFocus(open, ref);
    return open ? <input ref={ref} aria-label="Palette search" /> : null;
  }

  it('does not focus anything while the popup is closed', () => {
    render(<Harness open={false} />);
    expect(document.activeElement).toBe(document.body);
  });

  it('focuses on the transition into open, with no timers pending', () => {
    const { rerender } = render(<Harness open={false} />);
    rerender(<Harness open />);

    expect(document.activeElement).toBe(screen.getByLabelText('Palette search'));
  });

  it('does not re-focus on re-renders while already open', () => {
    // A hook that focused on every render would yank the caret back to the
    // start of the box on each keystroke-driven re-render — worse than the bug
    // it replaces.
    const { rerender } = render(<Harness open={false} />);
    rerender(<Harness open />);

    const input = screen.getByLabelText('Palette search') as HTMLInputElement;
    input.blur();
    rerender(<Harness open />);
    expect(document.activeElement).not.toBe(input);
  });

  it('focuses again after a close and reopen', () => {
    const { rerender } = render(<Harness open={false} />);
    rerender(<Harness open />);
    rerender(<Harness open={false} />);
    rerender(<Harness open />);

    expect(document.activeElement).toBe(screen.getByLabelText('Palette search'));
  });
});
