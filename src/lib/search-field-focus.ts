'use client';

/**
 * Putting the caret in a dropdown's search box, and getting the on-screen
 * keyboard to come up with it.
 *
 * ── The bug ─────────────────────────────────────────────────────────────────
 *
 * On a phone, tapping a searchable dropdown opened the panel and left the
 * keyboard down. The caret was in the right place — `document.activeElement`
 * was the search input — so nothing looked broken from the DOM's side, and a
 * jsdom test asserting "the input has focus" passed the whole time. But there
 * was no keyboard, so the user had to tap the search box a second time before
 * they could type. On a control whose entire purpose is "type to filter", that
 * second tap is most of the feature.
 *
 * ── Why focus alone is not enough ───────────────────────────────────────────
 *
 * WebKit (iOS Safari, and every iOS browser, since they all use it) refuses to
 * raise the keyboard for a programmatic `.focus()` unless the call happens
 * while the browser is still processing a user gesture. Move the call out of
 * the tap's own task and the focus still lands, silently, with no keyboard.
 * Android Chrome is more forgiving, which is exactly why this survived: it
 * works on the device most people test on.
 *
 * Three ways this codebase left that task, all of which read as reasonable:
 *
 *   setTimeout(() => input.focus(), 30)   always a new task. Never works.
 *   useEffect(() => input.focus())        passive effects are scheduled, not
 *                                         run inline, so React may flush them
 *                                         after the gesture has ended.
 *   <input autoFocus />                   React focuses during commit, which is
 *                                         inside the gesture only while the
 *                                         update stays synchronous — true today
 *                                         for a click, and not something to
 *                                         rest a feature on.
 *
 * The two helpers below are the same idea applied at the two moments a popup
 * can be opened from, and neither leaves the gesture.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';

/** useLayoutEffect warns when React renders on the server. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Open a popup and focus its search field, from inside the tap that opened it.
 *
 * For a dropdown that owns its own trigger: call this from the trigger's
 * onClick instead of setting state directly.
 *
 *     onClick={() => openWithKeyboard(() => setOpen(true), () => searchRef.current)}
 *
 * `flushSync` is what makes it work. React batches the state update and would
 * normally render afterwards; flushSync renders and commits before it returns,
 * so the input is in the DOM and focusable while we are still inside the tap
 * handler — and the focus call that follows is unambiguously part of the
 * gesture, on every engine, regardless of how React schedules elsewhere.
 *
 * A no-op if the input never appears (a dropdown with no search field), so it
 * is safe to call from a trigger that may or may not render one.
 */
export function openWithKeyboard(
  open: () => void,
  getInput: () => HTMLInputElement | HTMLTextAreaElement | null | undefined,
): void {
  flushSync(open);
  const el = getInput();
  if (!el) return;
  el.focus();
  // Caret at the end rather than selecting the existing text, so typing
  // appends to a retained query instead of replacing it.
  const end = el.value.length;
  try { el.setSelectionRange(end, end); } catch { /* not all input types allow it */ }
}

/**
 * Focus a search field when the popup around it becomes open.
 *
 * For a popup whose open state belongs to a PARENT — a modal or a command
 * palette taking an `open` prop — where the component cannot wrap the tap
 * itself. A layout effect is the closest it can get: layout effects run
 * synchronously during commit, so when the parent flipped `open` from its own
 * click handler this still runs inside that gesture. A passive `useEffect` or
 * a `setTimeout` does not.
 *
 * Only fires on the transition into `active`, never on re-renders while
 * already open — re-focusing under the user mid-typing would move their caret.
 */
export function useSearchFieldFocus(
  active: boolean,
  ref: React.RefObject<HTMLInputElement | null>,
): void {
  const wasActive = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (active && !wasActive.current) ref.current?.focus();
    wasActive.current = active;
  }, [active, ref]);
}
