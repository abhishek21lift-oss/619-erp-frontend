// Shared form shape for the Nutrition Assessment module — imported by the
// main page and every step component so they don't depend on each other.

import type {
  FoodsToAvoidReason, MealRegularity, MealTimingConsistency, EatingOutFrequency,
  WeekendEatingHabits, CravingFrequency, MealPreparer, NutritionBudget,
  Supplement, DigestiveIssue,
} from '@/lib/nutrition-calculations';

export interface CoachNotes {
  dietary_advice: string;
  meal_planning: string;
  supplement_advice: string;
  medical_notes: string;
  special_instructions: string;
}

export interface NutritionFormData {
  assessmentDate: string;

  // Step 1 — Diet Preference
  dietPreferences: string[];

  // Step 2 — Food Restrictions
  foodAllergies: string[];
  foodAllergyOther: string;
  foodsToAvoid: string[];
  foodsToAvoidOther: string;
  foodsToAvoidReason: FoodsToAvoidReason | '';

  // Step 3 — Favourite Foods
  favouriteFoods: string[];
  favouriteFoodOther: string;

  // Step 4 — Supplement Usage
  takesSupplements: boolean | null;
  supplements: Supplement[];

  // Step 5 — Digestive Health
  digestiveIssues: DigestiveIssue[];

  // Step 6 — Meal Pattern & Eating Behaviour
  mealsPerDay: string;
  breakfastRegularity: MealRegularity | '';
  lunchRegularity: MealRegularity | '';
  dinnerRegularity: MealRegularity | '';
  snacksPerDay: string;
  lateNightEating: boolean | null;
  mealTimingConsistency: MealTimingConsistency | '';
  eatingOutFrequency: EatingOutFrequency | '';
  weekendEatingHabits: WeekendEatingHabits | '';
  eatingBehaviours: string[];

  // Step 7 — Hydration & Cravings
  waterIntakeLiters: string;
  teaCupsPerDay: string;
  coffeeCupsPerDay: string;
  softDrinksPerDay: string;
  juicesPerDay: string;
  alcoholicDrinksPerWeek: string;
  cravings: string[];
  cravingFrequency: CravingFrequency | '';

  // Step 8 — Context
  mealPreparer: MealPreparer | '';
  nutritionBudget: NutritionBudget | '';
  medicalConditions: string[];
  medicalNotes: string;

  coachNotes: CoachNotes;
}

export interface FormErrors {
  dietPreference?: string;
  foodRestrictions?: string;
  favouriteFoods?: string;
  supplements?: string;
  digestiveHealth?: string;
  mealPatternBehaviour?: string;
  hydrationCravings?: string;
  context?: string;
}

export const STEPS = [
  { id: 1, key: 'dietPreference', label: 'Diet Preference' },
  { id: 2, key: 'foodRestrictions', label: 'Food Restrictions' },
  { id: 3, key: 'favouriteFoods', label: 'Favourite Foods' },
  { id: 4, key: 'supplements', label: 'Supplements' },
  { id: 5, key: 'digestiveHealth', label: 'Digestive Health' },
  { id: 6, key: 'mealPatternBehaviour', label: 'Meal Pattern' },
  { id: 7, key: 'hydrationCravings', label: 'Hydration & Cravings' },
  { id: 8, key: 'context', label: 'Context' },
] as const;

export type StepId = typeof STEPS[number]['id'];

export function initNutritionForm(): NutritionFormData {
  return {
    assessmentDate: new Date().toISOString().slice(0, 10),
    dietPreferences: [],
    foodAllergies: [], foodAllergyOther: '',
    foodsToAvoid: [], foodsToAvoidOther: '', foodsToAvoidReason: '',
    favouriteFoods: [], favouriteFoodOther: '',
    takesSupplements: null, supplements: [],
    digestiveIssues: [],
    mealsPerDay: '', breakfastRegularity: '', lunchRegularity: '', dinnerRegularity: '',
    snacksPerDay: '', lateNightEating: null, mealTimingConsistency: '', eatingOutFrequency: '',
    weekendEatingHabits: '', eatingBehaviours: [],
    waterIntakeLiters: '', teaCupsPerDay: '', coffeeCupsPerDay: '', softDrinksPerDay: '', juicesPerDay: '',
    alcoholicDrinksPerWeek: '', cravings: [], cravingFrequency: '',
    mealPreparer: '', nutritionBudget: '', medicalConditions: [], medicalNotes: '',
    coachNotes: { dietary_advice: '', meal_planning: '', supplement_advice: '', medical_notes: '', special_instructions: '' },
  };
}

export const n = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const f = parseFloat(t);
  return Number.isFinite(f) ? f : null;
};

/** The Coach Notes areas for this assessment, beside the type they key into.
 *  Passed to the shared CoachNotesPanel — see components/pt-os/shared. */
export const COACH_NOTE_FIELDS: { key: keyof CoachNotes & string; label: string }[] = [
  { key: 'dietary_advice', label: 'Dietary Advice' },
  { key: 'meal_planning', label: 'Meal Planning' },
  { key: 'supplement_advice', label: 'Supplement Advice' },
  { key: 'medical_notes', label: 'Medical Notes' },
  { key: 'special_instructions', label: 'Special Instructions' },
];
