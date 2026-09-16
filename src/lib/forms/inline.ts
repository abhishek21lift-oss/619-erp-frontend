/**
 * Numbers in a control that saves on blur, with no submit behind it.
 *
 * The app has a whole class of these — per-set inputs in the workout logger,
 * per-row editors in a table, a stepper beside a figure. A schema does not fit
 * them: there is no payload, no submit and no reset, and each blur is its own
 * write. What they still need is the one decision `normalize.ts` exists to
 * make, applied at the right moment.
 *
 * ── Three outcomes, not two ─────────────────────────────────────────────────
 *
 * A form's schema can afford to answer "valid" or "invalid" and block the
 * submit. A per-blur editor cannot block anything — the blur has already
 * happened — so it needs a third answer:
 *
 *     null        the box is empty. Clear the stored value.
 *     a number    save it.
 *     undefined   the box holds something that is not a number. Save NOTHING.
 *
 * The third is the one that matters. `Number('12kg')` is NaN, and NaN
 * serialises to `null` over JSON — so saving it CLEARS the stored weight
 * because the trainer typed a unit after the figure. Skipping the write leaves
 * the stored value alone and leaves the text on screen to be corrected.
 *
 * This is also what makes `type="text" inputMode="decimal"` safe on those
 * fields. `type="number"` hides the problem by reporting `''` for anything it
 * cannot parse — which loses the user's text — and brings its own: a scroll
 * wheel over a focused number input silently changes the value.
 */

import { toNumberOrNull } from './normalize';

/**
 * One inline field's value, ready to save.
 *
 * @returns `null` to clear, a number to save, `undefined` to skip the write.
 */
export function inlineNumber(raw: string): number | null | undefined {
  const n = toNumberOrNull(raw);
  if (n === null) return null;
  return Number.isNaN(n) ? undefined : n;
}

/**
 * The starting point for a stepper beside an inline field.
 *
 * A blank box steps from 0, which is what a "+" on an empty field is expected
 * to do. A box holding something unparseable steps from nothing: `null`, so
 * the caller makes the press a no-op rather than writing `NaN` into the field
 * and `null` into the record.
 */
export function stepFrom(raw: string): number | null {
  const n = toNumberOrNull(raw);
  if (n === null) return 0;
  return Number.isNaN(n) ? null : n;
}
