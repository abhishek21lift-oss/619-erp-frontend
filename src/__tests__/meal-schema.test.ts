/**
 * A meal in the studio's library.
 *
 * Every plan built afterwards references these rows and totals them, so a meal
 * saved with the wrong macros is not one wrong record — it is every plan that
 * includes it.
 */

import { describe, it, expect } from 'vitest';
import {
  mealSchema, blankMeal, toMealPayload, MEAL_TYPES, type MealFormState,
} from '../lib/forms/schemas/meal';

function meal(over: Partial<MealFormState> = {}): MealFormState {
  return { ...blankMeal(), name: 'Grilled chicken', calories: '320', ...over };
}

function messages(r: ReturnType<typeof mealSchema.safeParse>) {
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

describe('a blank macro is unknown, not zero', () => {
  it.each(['protein_g', 'carbs_g', 'fats_g'] as const)(
    'leaves %s null when the coach has not measured it',
    (field) => {
      // `Number(form.protein_g) || 0` stored zero, and the plan's protein total
      // then reads as though the meal contributes none.
      const r = mealSchema.safeParse(meal({ [field]: '' }));
      expect(r.success).toBe(true);
      expect(r.data![field]).toBeNull();
    },
  );

  it('treats whitespace as unmeasured too', () => {
    expect(mealSchema.safeParse(meal({ fats_g: '  ' })).data!.fats_g).toBeNull();
  });

  it('keeps a DELIBERATE zero — black coffee really is 0 g of fat', () => {
    const r = mealSchema.safeParse(meal({ fats_g: '0' }));
    expect(r.success).toBe(true);
    expect(r.data!.fats_g).toBe(0);
  });

  it('refuses an unparseable macro rather than zeroing it', () => {
    const r = mealSchema.safeParse(meal({ protein_g: '31g' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Protein must be a number.');
  });

  it('refuses a negative macro and an implausible one', () => {
    expect(mealSchema.safeParse(meal({ carbs_g: '-5' })).success).toBe(false);
    // A 1 kg portion of pure protein does not exist.
    expect(mealSchema.safeParse(meal({ protein_g: '1001' })).success).toBe(false);
  });
});

describe('calories cannot be unknown, because the column cannot hold it', () => {
  it('requires a figure', () => {
    // `calories INT NOT NULL DEFAULT 0` — migration 006. A blank used to be
    // stored as a 0 that then reads as a fact.
    const r = mealSchema.safeParse(meal({ calories: '' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Calories is required.');
  });

  it('refuses a fraction, matching the INT column', () => {
    expect(mealSchema.safeParse(meal({ calories: '320.5' })).success).toBe(false);
  });

  it('refuses a per-day figure typed into a per-serving field', () => {
    expect(mealSchema.safeParse(meal({ calories: '20000' })).success).toBe(false);
  });

  it('accepts a deliberate zero — a zero-calorie drink is a real row', () => {
    expect(mealSchema.safeParse(meal({ calories: '0' })).data!.calories).toBe(0);
  });
});

describe('the meal type matches the database CHECK constraint', () => {
  it.each(MEAL_TYPES)('accepts %s', (t) => {
    expect(mealSchema.safeParse(meal({ meal_type: t })).success).toBe(true);
  });

  it('includes snacks, PLURAL, which is what the constraint spells', () => {
    // A `snack` would be refused by the CHECK as a 500, not as a message.
    expect(MEAL_TYPES).toContain('snacks');
    expect(MEAL_TYPES).not.toContain('snack');
    expect(mealSchema.safeParse(meal({ meal_type: 'snack' as never })).success).toBe(false);
  });

  it('carries the two workout types the constraint also allows', () => {
    expect(MEAL_TYPES).toContain('pre_workout');
    expect(MEAL_TYPES).toContain('post_workout');
  });
});

describe('the payload', () => {
  it('sends null for every unmeasured macro', () => {
    const r = mealSchema.safeParse(meal());
    expect(toMealPayload(r.data!)).toEqual({
      name: 'Grilled chicken',
      meal_type: 'breakfast',
      calories: 320,
      protein_g: null,
      carbs_g: null,
      fats_g: null,
      serving_size: null,
    });
  });

  it('requires a name', () => {
    expect(mealSchema.safeParse(meal({ name: '   ' })).success).toBe(false);
  });
});
