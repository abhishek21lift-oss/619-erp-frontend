'use client';

/**
 * Escape, focus trap and focus restore for a hand-rolled dialog.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * The app has seventeen modal surfaces. One is built on Radix (which does all
 * of this itself). The other sixteen are hand-rolled, and none of them trapped
 * focus. Several declared `aria-modal="true"`, which is a promise made to
 * assistive technology and does nothing whatsoever to the Tab key.
 *
 * For anyone not using a mouse that meant:
 *
 *   · opening a dialog left focus behind it, so a screen reader was never told
 *     anything had happened
 *   · Tab walked straight out of the dialog into the page underneath, which
 *     was still fully interactive behind the backdrop
 *   · seven of them had no Escape handler, so there was no way to leave at all
 *   · closing one dropped focus to the top of the document, losing the
 *     reader's place
 *
 * Among the sixteen are the payment-verification dialog, the subscription
 * approval dialog and the client-payment dialogs. WCAG 2.2 AA 2.1.1 (Keyboard)
 * and 2.4.3 (Focus Order).
 *
 * ── Why a hook and not `<dialog>` or a library ─────────────────────────────
 *
 * The native `<dialog>` element would bring all of this for free, and swapping
 * sixteen bespoke overlays onto it means re-doing sixteen sets of animation,
 * backdrop and layout decisions — a visual change, on dialogs that handle
 * money. This hook adds the behaviour and touches nothing that renders.
 *
 * ── The one thing it deliberately does not do ──────────────────────────────
 *
 * It does not make the backdrop keyboard-activatable. `jsx-a11y` flags those
 * `<div onClick={close}>` backdrops, and "fixing" them with an `onKeyDown`
 * would add a tab stop that does nothing and reads as an unlabelled control.
 * Click-outside-to-close is a mouse affordance; Escape is its keyboard
 * equivalent, and that is what this provides. The backdrops are marked
 * `aria-hidden` instead, so assistive tech never sees them at all.
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * Selector for things a user can Tab to.
 *
 * `[tabindex]:not([tabindex="-1"])` rather than `[tabindex]`: a roving-tabindex
 * list marks its inactive items `-1` precisely so they are skipped, and
 * treating them as stops would make Tab walk every row of a long list.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Focusable descendants that are actually reachable right now.
 *
 * Visibility is tested with `checkVisibility()` where the browser has it, and
 * otherwise assumed. It deliberately does NOT measure geometry. A first draft
 * filtered on `offsetParent !== null` with a bounding-rect fallback, and that
 * was wrong twice over: `offsetParent` is null for every `position: fixed`
 * element, which is most of these dialogs, and a rect is zero-sized while a
 * dialog is animating in — so the trap would have found nothing to trap
 * during the exact frames a user is most likely to press Tab. It also made
 * the hook untestable, since jsdom reports null and zeroes for both.
 *
 * Assuming visible is the safe direction to be wrong in: at worst an
 * off-screen control keeps a tab stop it already had, which is the behaviour
 * before this hook existed.
 */
function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    if (el.hasAttribute('hidden')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const check = (el as HTMLElement & { checkVisibility?: () => boolean }).checkVisibility;
    return typeof check === 'function' ? check.call(el) : true;
  });
}

export interface DialogA11yOptions {
  /** Whether the dialog is currently rendered. */
  open: boolean;
  /** Called on Escape. Omit to leave Escape to the caller. */
  onClose?: () => void;
  /**
   * Skip Escape handling — for a dialog that already has its own, or one that
   * must not be dismissible (a required confirmation mid-payment).
   */
  escapeCloses?: boolean;
  /** Focus this instead of the first focusable child when opening. */
  initialFocus?: React.RefObject<HTMLElement | null>;
}

/**
 * @returns a ref to put on the dialog's container — the element carrying
 *          `role="dialog"`, not the backdrop.
 */
export function useDialogA11y({
  open,
  onClose,
  escapeCloses = true,
  initialFocus,
}: DialogA11yOptions) {
  const containerRef = useRef<HTMLElement | null>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  // Held in a ref so the effect below does not re-run — and therefore does not
  // re-steal focus — every time the parent re-renders with a new closure.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const setRef = useCallback((node: HTMLElement | null) => {
    containerRef.current = node;
  }, []);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    // Remember where focus came from BEFORE moving it. Restoring to the
    // trigger is what lets someone dismiss a dialog and carry on down the page
    // from where they were, rather than being dropped at the top of it.
    restoreTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const target = initialFocus?.current ?? focusableWithin(container)[0] ?? container;
    // A container with nothing focusable in it still has to receive focus, or
    // the reader is left outside the dialog it was just told about.
    if (target === container && !container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '-1');
    }
    target.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && escapeCloses && onCloseRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusableWithin(container);
      if (items.length === 0) {
        // Nothing to move between; keep focus where it is rather than letting
        // Tab escape into the page behind.
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      // Wrap at the ends. Also catches focus having drifted outside entirely
      // (a click on the backdrop, say), which would otherwise let the next Tab
      // continue from wherever it landed in the page behind.
      if (!active || !container.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // `window`, capture phase.
    //
    // Capture so this runs before a child's own key handling and a nested
    // listener cannot swallow Escape before the dialog sees it.
    //
    // `window` rather than `document` because it is strictly broader. A real
    // key event targets the focused element and passes through both, but an
    // event dispatched directly ON window — which is what several of this
    // repo's tests do, and what the handlers this hook replaces listened
    // for — has a propagation path of just [window], so a document listener
    // never sees it. Attaching to document silently broke the AI assistant's
    // "closes on Escape" test, and would have broken any caller that
    // synthesises a shortcut the same way.
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      // Restore only when focus is ours to give back: either still inside the
      // dialog, or dropped entirely.
      //
      // Both cases are needed, and the second is the one that actually fires
      // on close. React detaches the dialog BEFORE this cleanup runs, so by
      // now `document.activeElement` has already fallen back to <body> and an
      // "is it still inside?" test can never be true. A first draft checked
      // only that, and silently restored nothing — the hook looked right and
      // left a keyboard user at the top of the document, which is the defect
      // it was written to fix.
      //
      // What both conditions exclude is the case worth excluding: something
      // else has deliberately taken focus since — a second dialog opening over
      // this one — and yanking it back would fight that.
      const active = document.activeElement;
      const droppedToBody = !active || active === document.body;
      const stillInside = container.contains(active);
      if ((droppedToBody || stillInside) && restoreTo.current && document.contains(restoreTo.current)) {
        restoreTo.current.focus();
      }
    };
  }, [open, escapeCloses, initialFocus]);

  return setRef;
}

export default useDialogA11y;
