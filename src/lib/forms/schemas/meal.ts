/**
 * A meal in the studio's library.
 *
 * Every plan built afterwards references these rows, and the plan's daily
 * totals are the sum of them — so a meal saved with the wrong macros is not one
 * wrong record, it is every plan that includes it.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 *     calories: Number(form.calories) || 0, protein_g: Number(form.protein_g) || 0,
 *     carbs_g:  Number(form.carbs_g)  || 0, fats_g:   Number(form.fats_g)   || 0,
 *
 * Four substitutions. A meal added with the macros left blank — the common
 * case, because a coach often knows the calories and fills the rest in later —
 * was stored as 0 g protein, 0 g carbs, 0 g fats. Not "unknown": zero. The
 * plan's protein total then reads as though that meal contributes none, and
 * the number a client is coached against is wrong in the direction that
 * matters.
 *
 * ── Absent and zero are both real here, and they are different ──────────────
 *
 * Unlike a price, 0 g of fat is a legitimate macro — black coffee, plain rice
 * cakes. So these are OPTIONAL fields that keep `null` for absent and 0 for a
 * deliberate zero, and the two travel to the server as different values.
 *
 * ── The bounds ──────────────────────────────────────────────────────────────
 *
 * Per SERVING, not per day. 5000 kcal is far beyond any single serving and far
 * below the mistyped 20000 that would wreck a plan's totals; 1000 g of a single
 * macro is the same reasoning — a 1 kg portion of pure protein does not exist.
 */

import { z } from 'zod';
import { textField, enumField, decimalField, integerField } from '../primitives';

/**
 * The six the database's CHECK constraint accepts.
 *
 * Copied from migration 006 rather than guessed at, and the detail that matters
 * is `snacks` — plural. A `snack` sent here would be refused by the constraint
 * as a 500, not as a validation message.
 */
export const MEAL_TYPES = [
  'breakfast', 'lunch', 'snacks', 'dinner', 'pre_workout', 'post_workout',
] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'pre_workout', label: 'Pre Workout' },
  { value: 'post_workout', label: 'Post Workout' },
] as const;

/**
 * A macro in grams. Optional, bounded, and never silently zero.
 *
 * The column is `NUMERIC(6,1)`, so a value is stored to one decimal place. The
 * bound is 1000 rather than the column's own 99999.9: a 1 kg portion of pure
 * protein does not exist, and the column's ceiling is not a business rule.
 */
const macro = (label: string) =>
  decimalField({ label, min: 0, max: 1000, unit: 'g' });

export const mealSchema = z.object({
  name: textField({ label: 'Meal name', required: true, maxLength: 120 }),
  meal_type: enumField(MEAL_TYPES, { label: 'Meal type', required: true }),
  /**
   * Required, unlike the macros, and that is the COLUMN talking rather than a
   * preference: `calories INT NOT NULL DEFAULT 0`. There is no way to store
   * "unknown calories", so asking for the number is the only honest option —
   * the alternative is a 0 that reads as a fact.
   */
  calories: integerField({ label: 'Calories', required: true, min: 0, max: 5000, unit: 'kcal' }),
  protein_g: macro('Protein'),
  carbs_g: macro('Carbs'),
  fats_g: macro('Fats'),
  serving_size: textField({ label: 'Serving size', maxLength: 60 }),
});

export type MealValues = z.output<typeof mealSchema>;

export type MealFormState = {
  name: string;
  meal_type: MealType;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fats_g: string;
  serving_size: string;
};

export function blankMeal(): MealFormState {
  return {
    name: '', meal_type: 'breakfast',
    calories: '', protein_g: '', carbs_g: '', fats_g: '',
    serving_size: '',
  };
}

/**
 * The payload.
 *
 * `null` where the coach left a macro blank, so the row stores "unknown"
 * rather than a zero a plan's total will later add in. The three macro columns
 * are nullable (`NUMERIC(6,1) DEFAULT 0`, no NOT NULL), so null is storable —
 * checked in migration 006, not assumed.
 *
 * The server has to stop substituting too: `routes/diet.js` does
 * `parseFloat(d.protein_g) || 0`, which turns this null straight back into a
 * zero. That is fixed alongside this.
 */
export function toMealPayload(v: MealValues) {
  return {
    name: v.name as string,
    meal_type: v.meal_type as MealType,
    calories: v.calories,
    protein_g: v.protein_g,
    carbs_g: v.carbs_g,
    fats_g: v.fats_g,
    serving_size: v.serving_size,
  };
}
