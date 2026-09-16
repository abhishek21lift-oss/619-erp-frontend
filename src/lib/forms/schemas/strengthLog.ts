/**
 * Logging a lift on the strength-tracking screen.
 *
 * Small form, three numbers, and the numbers feed an estimate that becomes a
 * LABEL on the client's profile: the Epley 1RM is derived from weight and
 * reps, and `classifyStrength` turns that into "Novice / Intermediate /
 * Advanced" against the population norms for their bodyweight and sex. A wrong
 * rep count does not produce a wrong number, it produces a wrong judgement
 * about a person.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 *     await onLog(w, parseInt(sets, 10) || 3, parseInt(reps, 10) || 10);
 *
 * `|| 3` and `|| 10` are not defaults, they are substitutions. Clearing the
 * Sets box logged THREE SETS — a number nobody entered, indistinguishable in
 * the history from one somebody did. Clearing Reps logged ten, and ten reps is
 * what the 1RM formula divides by.
 *
 * `parseFloat` compounded it: it parses a PREFIX, so "100kg" logged 100 and
 * "1,00" logged 1. And the guard on the way in was `if (!w) return` — so a
 * weight of 0, or anything unparseable, silently did nothing at all: the
 * button appeared to work, the panel stayed open, and no lift was recorded.
 *
 * ── The bounds ──────────────────────────────────────────────────────────────
 *
 * Deliberately generous and not open-ended. 500 kg is above every listed world
 * record for the lifts this screen tracks, so it cannot refuse a real one; it
 * is far below the mistyped 5000 that would put a client at the top of every
 * percentile chart in the product.
 */

import { z } from 'zod';
import { decimalField, integerField } from '../primitives';

export const strengthLogSchema = z.object({
  weight_kg: decimalField({
    label: 'Weight', required: true, min: 0.5, max: 500, unit: 'kg',
  }),
  sets: integerField({ label: 'Sets', required: true, min: 1, max: 50 }),
  reps: integerField({ label: 'Reps', required: true, min: 1, max: 100 }),
});

export type StrengthLogValues = z.output<typeof strengthLogSchema>;
export type StrengthLogState = { weight_kg: string; sets: string; reps: string };

/**
 * A blank lift entry.
 *
 * Sets and reps are pre-filled with the common case, which is a genuine default
 * — a value the form OFFERS and the user can see and change — as opposed to the
 * `|| 3` it replaces, which was a value substituted after the user had cleared
 * the box, with nothing on screen to say so.
 */
export function blankStrengthLog(): StrengthLogState {
  return { weight_kg: '', sets: '3', reps: '10' };
}
