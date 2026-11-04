// Shared form shape for the Lifestyle Assessment module — imported by the
// main page and every step component so they don't depend on each other.

import { todayISO } from '@/lib/forms/domain';
import type {
  OccupationType, DailyStepsBracket, BreakfastHabit, SmokingStatus, AlcoholStatus, RecoveryQuality,
} from '@/lib/lifestyle-calculations';

export interface CoachNotes {
  recovery: string;
  nutrition: string;
  lifestyle: string;
  stress: string;
  sleep: string;
  special_instructions: string;
}

export interface LifestyleFormData {
  assessmentDate: string;

  // Step 1 — Sleep
  sleepDurationHours: string;
  bedTime: string;
  wakeTime: string;
  sleepQuality: string;

  // Step 2 — Stress
  stressLevel: string;

  // Step 3 — Water
  waterIntakeLiters: string;

  // Step 4 — Occupation & Activity
  occupationType: OccupationType | '';
  dailyStepsBracket: DailyStepsBracket | '';

  // Workout Experience is no longer a step in this wizard (it's collected on
  // the client Enrollment page instead), but the fields stay here so older
  // submitted assessments — and the Fitness Testing "skip 1RM for beginners"
  // convenience, which reads workoutExperienceLevel off the most recent
  // lifestyle assessment — keep working. Nothing sets them anymore.
  workoutExperienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'athlete' | '';
  yearsOfExperience: string;

  // Step 6 — Food Preference
  foodPreferences: string[];
  foodPreferenceOther: string;

  // Step 7 — Meal Frequency
  mealFrequency: string;
  breakfastHabit: BreakfastHabit | '';
  lateNightEating: boolean | null;

  // Step 8 — Smoking & Alcohol
  smokingStatus: SmokingStatus | '';
  cigarettesPerDay: string;
  yearsSmoking: string;
  alcoholStatus: AlcoholStatus | '';
  drinksPerWeek: string;

  // Step 9 — Additional Lifestyle Factors
  screenTimeBracket: '<2' | '2_4' | '4_6' | '6_8' | '8_plus' | '';
  travelFrequency: 'rarely' | 'monthly' | 'weekly' | 'daily' | '';
  energyLevel: string;
  motivationToExercise: string;
  recoveryQuality: RecoveryQuality | '';

  coachNotes: CoachNotes;
}

export interface FormErrors {
  sleep?: string;
  stress?: string;
  water?: string;
  occupationActivity?: string;
  foodPreference?: string;
  smokingAlcohol?: string;
  additionalFactors?: string;
}

// Water and food preference are asked in Nutrition, and motivation in Goal:
// asking them here as well gave the client two answers to one question, and
// the two could disagree. Lifestyle's hydration and nutrition scores read the
// latest Nutrition answers instead (the API does this on save). The fields
// stay on the form so older assessments keep displaying them.
export const STEPS = [
  { id: 1, key: 'sleep', label: 'Sleep' },
  { id: 2, key: 'stress', label: 'Stress' },
  { id: 3, key: 'occupationActivity', label: 'Occupation & Activity' },
  { id: 4, key: 'smokingAlcohol', label: 'Smoking & Alcohol' },
  { id: 5, key: 'additionalFactors', label: 'Additional Factors' },
] as const;

/** "Step 3 of 5", from the list — each step used to hard-code its own
 *  number, and after steps were added and removed they said "of 9". */
export function stepLabel(key: typeof STEPS[number]['key']): string {
  return `Step ${STEPS.findIndex((s) => s.key === key) + 1} of ${STEPS.length}`;
}

export type StepId = typeof STEPS[number]['id'];

/** Food preferences an older Lifestyle assessment may hold (the question now
 *  lives in Nutrition); kept so those records still read back correctly. */
export const FOOD_PREFERENCE_OPTIONS = [
  'Vegetarian', 'Eggetarian', 'Non-Vegetarian', 'Vegan', 'Jain', 'Lactose-Free', 'Mixed',
].map((value) => ({ value, label: value }));

export function initLifestyleForm(): LifestyleFormData {
  return {
    // The studio's calendar day, not UTC's. Sliders start unset: a default
    // position used to be saved as the client's answer.
    assessmentDate: todayISO(),
    sleepDurationHours: '', bedTime: '', wakeTime: '', sleepQuality: '',
    stressLevel: '',
    waterIntakeLiters: '',
    occupationType: '', dailyStepsBracket: '',
    workoutExperienceLevel: '', yearsOfExperience: '',
    foodPreferences: [], foodPreferenceOther: '',
    mealFrequency: '', breakfastHabit: '', lateNightEating: null,
    smokingStatus: '', cigarettesPerDay: '', yearsSmoking: '',
    alcoholStatus: '', drinksPerWeek: '',
    screenTimeBracket: '', travelFrequency: '', energyLevel: '', motivationToExercise: '', recoveryQuality: '',
    coachNotes: { recovery: '', nutrition: '', lifestyle: '', stress: '', sleep: '', special_instructions: '' },
  };
}

// One parser for every measurement in the app. See toMeasurementOrNull for
// what the five hand-rolled copies of this used to get wrong.
export { toMeasurementOrNull as n } from '@/lib/forms/normalize';

/** The Coach Notes areas for this assessment, beside the type they key into.
 *  Passed to the shared CoachNotesPanel — see components/pt-os/shared. */
export const COACH_NOTE_FIELDS: { key: keyof CoachNotes & string; label: string }[] = [
  { key: 'recovery', label: 'Recovery' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'stress', label: 'Stress' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'special_instructions', label: 'Special Instructions' },
];
