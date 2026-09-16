'use client';

import { useEffect, useId, useRef } from 'react';

/** Everything that can hold focus, in document order, inside the dialog. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalA11y {
  /** Spread onto the panel element. Carries the role, the name and the tab stop. */
  panelProps: {
    ref: React.RefObject<HTMLDivElement | null>;
    role: 'dialog';
    'aria-modal': true;
    'aria-labelledby': string;
    tabIndex: -1;
  };
  /** Put this id on the element that holds the dialog's visible title. */
  titleId: string;
}

/**
 * The behaviour `role="dialog"` promises, in one place.
 *
 * ── Why this is a hook and not a comment on each modal ───────────────────────
 *
 * The app has modals built three different ways — PremiumModal, and two
 * bespoke `<m.div>` overlays — and every one of them had the same gap. They
 * looked like dialogs and behaved like dialogs for a mouse; to anything that
 * is not a mouse they were a `<div>` that happened to be on top:
 *
 *   · no role and no `aria-modal`, so a screen reader kept reading the page
 *     underneath — the list, the nav, the whole shell — with no indication
 *     that a form had opened over it
 *   · no accessible name, though the heading was right there
 *   · focus never moved in, so the first Tab after opening went to the next
 *     thing in the PAGE rather than the first field of the form
 *   · nothing kept focus in, so Tab walked out into the list behind the
 *     overlay, where every control is still clickable
 *   · and on close focus was wherever it had wandered to — usually `<body>`,
 *     which drops a keyboard user back at the top of the document
 *
 * Declaring the role without the behaviour would be worse than declaring
 * nothing: assistive technology announces a dialog, and then the user finds
 * themselves outside it with no way to tell. So the role and its keyboard
 * contract ship together, from here, once.
 *
 * Escape is included because a dialog must be dismissible from the keyboard;
 * a modal whose only exit is a mouse click on an X is a trap by another name.
 */
export function useModalA11y(open: boolean, onClose: () => void): ModalA11y {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const titleId = `${useId()}-dialog-title`;

  // Held in a ref so the effect below depends on `open` ALONE. Callers pass an
  // inline arrow — `onClose={() => setOpen(false)}` — which is a new function
  // on every parent render, and an effect that re-ran on it would tear down and
  // rebuild the trap mid-interaction: the teardown restores focus to whatever
  // opened the dialog, so a parent re-render while somebody was typing would
  // yank the caret out of the field they were in.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    // The first FIELD, not simply the first focusable thing.
    //
    // Those differ, and the difference is the whole point: in a modal whose
    // header carries a close button, the first focusable element is that
    // close button — so "focus the first focusable" lands a keyboard user on
    // Dismiss, and every single use of the form starts with a Tab. A dialog
    // that exists to be typed into should open with the caret in it.
    //
    // Falls back to the first focusable element (a confirmation dialog has no
    // fields at all), and then to the panel itself.
    const firstField = panel?.querySelector<HTMLElement>(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
    );
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (firstField ?? firstFocusable ?? panel)?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key !== 'Tab' || !panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) { e.preventDefault(); panel.focus(); return; }

      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;

      // Wrap at both ends, and pull focus back in if it has escaped — a click
      // on the overlay can leave it on <body>.
      if (e.shiftKey && (active === firstItem || !panel.contains(active))) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && (active === lastItem || !panel.contains(active))) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', handler);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = previousOverflow;
      // `panel`, the element captured when the effect ran — NOT panelRef.current.
      //
      // React detaches refs as part of removing a subtree, so by the time this
      // cleanup runs on an unmount the ref is already null. Reading it here
      // made the containment check silently false, the restore never fired,
      // and closing the dialog with Escape left focus on a button that no
      // longer existed — which the browser resolves to <body>, i.e. the top of
      // the document. The closure still holds the element, which is the whole
      // reason to capture it.
      //
      // Guarded rather than unconditional: a close that deliberately moved
      // focus somewhere else must not be undone.
      const target = restoreFocusTo.current;
      if (target && document.contains(target)) {
        const active = document.activeElement;
        if (!active || active === document.body || panel?.contains(active)) {
          target.focus();
        }
      }
    };
  }, [open]);

  return {
    panelProps: {
      ref: panelRef,
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': titleId,
      tabIndex: -1,
    },
    titleId,
  };
}
