// Shared form shape for the Lifestyle Assessment module — imported by the
// main page and every step component so they don't depend on each other.

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

// Deep-audit finding: StepWater and StepFoodPreference were fully built
// (and their fields, and the hydration score / "drink 3L water" habit
// suggestion that read them, were never removed) but were missing from
// this list — there was no way for a new assessment to ever record water
// intake or food preference. Restored at the positions the field comments
// above (Step 3 — Water, Step 6 — Food Preference) already documented.
export const STEPS = [
  { id: 1, key: 'sleep', label: 'Sleep' },
  { id: 2, key: 'stress', label: 'Stress' },
  { id: 3, key: 'water', label: 'Water Intake' },
  { id: 4, key: 'occupationActivity', label: 'Occupation & Activity' },
  { id: 5, key: 'foodPreference', label: 'Food Preference' },
  { id: 6, key: 'smokingAlcohol', label: 'Smoking & Alcohol' },
  { id: 7, key: 'additionalFactors', label: 'Additional Factors' },
] as const;

export type StepId = typeof STEPS[number]['id'];

export function initLifestyleForm(): LifestyleFormData {
  return {
    assessmentDate: new Date().toISOString().slice(0, 10),
    sleepDurationHours: '7', bedTime: '', wakeTime: '', sleepQuality: '',
    stressLevel: '5',
    waterIntakeLiters: '',
    occupationType: '', dailyStepsBracket: '',
    workoutExperienceLevel: '', yearsOfExperience: '',
    foodPreferences: [], foodPreferenceOther: '',
    mealFrequency: '', breakfastHabit: '', lateNightEating: null,
    smokingStatus: '', cigarettesPerDay: '', yearsSmoking: '',
    alcoholStatus: '', drinksPerWeek: '',
    screenTimeBracket: '', travelFrequency: '', energyLevel: '5', motivationToExercise: '5', recoveryQuality: '',
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
