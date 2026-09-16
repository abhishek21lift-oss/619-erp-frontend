/**
 * What a trainer may state about a client for one AI generation.
 *
 * ── Why these fields are optional, and must stay optional ───────────────────
 *
 * The server is the authority on a client's age, weight, height, goal and
 * experience: `resolveClientFacts` reads them from named columns and reports
 * what it could not find rather than filling the gap. The generator form only
 * ever SUPPLIES A GAP, and whatever it supplies is labelled in the prompt as
 * "stated by the trainer for this session, not on file".
 *
 * So the asterisks this form used to paint beside Age, Weight and Height were
 * not merely unenforced — they were wrong. A blank box is the ordinary case
 * and means "the record already knows, or nobody does".
 *
 * ── What was actually missing ───────────────────────────────────────────────
 *
 *     const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
 *
 * Blank was handled. Nothing else was. `Number('12abc')` is NaN, which
 * `JSON.stringify` writes as `null`; `-70` is a negative weight; `750` is a
 * weight; `9999` is an age. Each of those went into a prompt that writes a
 * training programme, or a calorie target, for a real person.
 *
 * The backend now refuses them too (`numInRange` in
 * `modules/pt-os/client-facts.js`, shared by both generators). Checking here
 * as well is not redundant: a generation is a billed model call, and being
 * told "that is not a weight" before it is spent is the difference between a
 * correction and a wasted one.
 *
 * ── The bounds ──────────────────────────────────────────────────────────────
 *
 * Copies of `STATED_RANGE` on the server, and deliberately wide: they exclude
 * the impossible, not the unusual. A 95-year-old client and a 180kg client are
 * both real and neither should be turned away by a range check.
 */

import { z } from 'zod';
import { decimalField, integerField, textField } from '../primitives';

/** Mirrors `STATED_RANGE` in `619-erp-backend/src/modules/pt-os/client-facts.js`. */
export const STATED_RANGE = {
  age: [10, 120],
  weight_kg: [20, 400],
  height_cm: [90, 260],
  training_days: [1, 7],
  meal_frequency: [1, 12],
} as const;

const ageField = integerField({
  label: 'Age', min: STATED_RANGE.age[0], max: STATED_RANGE.age[1], unit: 'years',
});
const weightField = decimalField({
  label: 'Weight', min: STATED_RANGE.weight_kg[0], max: STATED_RANGE.weight_kg[1], unit: 'kg',
});
const heightField = decimalField({
  label: 'Height', min: STATED_RANGE.height_cm[0], max: STATED_RANGE.height_cm[1], unit: 'cm',
});

/** The facts both generators share. All optional — see the note above. */
const sharedFacts = {
  age: ageField,
  weight_kg: weightField,
  height_cm: heightField,
};

export const aiWorkoutInputSchema = z.object({
  ...sharedFacts,
  training_days: integerField({
    label: 'Training days',
    min: STATED_RANGE.training_days[0],
    max: STATED_RANGE.training_days[1],
    unit: 'a week',
  }),
  // A trainer's free text about what a client cannot do. Never defaulted to
  // "none" anywhere in this system: the server's own comment explains that the
  // old `|| 'none'` printed a clean bill of health for every client nobody had
  // written a note about.
  injuries: textField({ label: 'Injuries or limitations', maxLength: 500 }),
});

export const aiDietInputSchema = z.object({
  ...sharedFacts,
  meal_frequency: integerField({
    label: 'Meals a day',
    min: STATED_RANGE.meal_frequency[0],
    max: STATED_RANGE.meal_frequency[1],
  }),
  dietary_preferences: textField({ label: 'Dietary preferences', maxLength: 300 }),
  allergies: textField({ label: 'Allergies', maxLength: 300 }),
});

export type AiWorkoutInput = z.output<typeof aiWorkoutInputSchema>;
export type AiDietInput = z.output<typeof aiDietInputSchema>;

/**
 * A validated number, or `undefined` to leave the field out of the payload.
 *
 * `undefined` rather than `null`: the server's rule is "a field the client did
 * not send is left alone", and `null` is a value, not an absence.
 */
export function stated(value: number | null): number | undefined {
  return value === null ? undefined : value;
}
