// Making a non-button behave like one, correctly, in one place.
//
// A `<div onClick>` is invisible to a keyboard: no tab stop, no Enter, no
// Space. WCAG 2.1.1 is Level A — the lowest bar there is — and this app had
// seven of them, including two file drop zones whose click opened the file
// picker. A keyboard-only user could not attach a photo at all.
//
// The obvious fix is `<button>`, and where that works it is the right answer:
// it brings focus, activation, and the role for free. These seven could not
// take it — a button cannot legally contain the interactive content some of
// them wrap, and two are drop zones that also carry drag handlers. So they get
// the button contract applied by hand, from here, rather than seven slightly
// different keydown handlers that each forget something.
//
// What is easy to forget, and why this exists:
//
//   · Space scrolls the page by default. Without preventDefault the user gets
//     the action AND a jump down the document.
//   · Enter fires on keydown for buttons, Space on keyup — but handling both
//     on keydown is what every UI library does and what users expect, so the
//     difference is deliberately flattened here.
//   · The handler must ignore keys that bubbled up from a real control inside
//     it. Enter in a nested text field should not also trigger the card.

import type { KeyboardEvent } from 'react';

/** Elements that handle their own Enter/Space and must not be double-fired. */
const INTERACTIVE = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']);

export interface ActivatableOptions {
  /**
   * Accessible name. Required when the element's own content does not read as
   * a label — an image tile, an icon-only affordance. Omit when the visible
   * text inside already says what activating it does.
   */
  label?: string;
  /** Skip the tab stop and the role, e.g. when a prop-driven onClick is absent. */
  disabled?: boolean;
}

/**
 * Props that give a non-button element the keyboard contract of a button.
 *
 * ```tsx
 * <div {...activatable(() => setEditNotes(true), { label: 'Edit notes' })}>
 * ```
 */
export function activatable(onActivate: () => void, options: ActivatableOptions = {}) {
  const { label, disabled } = options;
  if (disabled) return {} as const;

  return {
    role: 'button',
    tabIndex: 0,
    ...(label ? { 'aria-label': label } : {}),
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      // A keypress that came from a real control inside this one belongs to
      // that control.
      const target = e.target as HTMLElement | null;
      if (target && target !== e.currentTarget) {
        if (INTERACTIVE.has(target.tagName) || target.isContentEditable) return;
      }
      // Space scrolls; Enter can submit an enclosing form.
      e.preventDefault();
      onActivate();
    },
  } as const;
}
