// Shapes of a generated workout draft.
//
// These used to live next to a client-side copy of the generator. That copy
// was never called — the server builds the draft — so only the types remain,
// shared by the workout-generator page and the API endpoint definition.

import type { prescribeStrengthLoad, ExperienceLevel } from './strength-prescription';
import type { SequencedExercise } from './exercise-sequencing';

/**
 * A prescription as it comes back from the server. The deterministic twin
 * produces the RM fields; a powerlifting block adds the load its percentage
 * resolved to, and says which basis produced it.
 */
export type GeneratedPrescription = ReturnType<typeof prescribeStrengthLoad> & {
  target_weight?: number | null;
  basis?: 'training_max' | 'rpe' | string;
};

export interface GeneratedExercise extends SequencedExercise {
  primaryMuscle?: string;
  difficulty?: string;
  equipment?: string;
  prescription: GeneratedPrescription;
}

export type PeriodizationPhase =
  | 'base' | 'strength' | 'intensification' | 'peaking' | 'taper';

export interface GeneratedConditioningFitt {
  frequencyPerWeek: number;
  timeMinutes: number;
  intensity: string;
  modalityCategory: string | null;
  programType: string;
  basis: 'requested' | 'application-default';
  /** FITT fields that fell back to an application default. */
  defaults?: Array<'intensity' | 'frequency' | 'programme'>;
}

export interface GeneratedTargetHeartRate {
  method: string;
  minBpm: number;
  maxBpm: number;
  /** '% MHR' or '% HRR' — never mixed. */
  basisLabel: string;
}

export interface GeneratedConditioning {
  modality: string;
  minutes: number;
  intensity: string;
  notes: string;
  fitt?: GeneratedConditioningFitt;
  targetHeartRate?: GeneratedTargetHeartRate | null;
  warnings?: string[];
}

export interface GeneratedSession {
  /** ISO weekday number, 1 = Monday. */
  day_of_week: number;
  day_name: string;
  name: string;
  focus: string;
  /** Present on powerlifting block sessions; absent on generic drafts. */
  phase?: string;
  phase_label?: string;
  is_deload?: boolean;
  warmup: Array<{ name: string; minutes: number; intensity: string; notes: string }>;
  mainWork: GeneratedExercise[];
  conditioning: GeneratedConditioning | null;
  cooldown: Array<{ name: string; minutes: number; intensity: string; notes: string }>;
  estimated_minutes: number;
  totals: {
    exercises: number;
    strengthMinutes: number;
    cardioMinutes: number;
    warmupMinutes: number;
    cooldownMinutes: number;
  };
}

/** One week of a powerlifting block, with the sessions that week holds. */
export interface PeriodizationWeek {
  week: number;
  phase: PeriodizationPhase;
  label: string;
  week_in_phase: number;
  phase_weeks: number;
  is_deload: boolean;
  sessions: GeneratedSession[];
}

/** The whole block the powerlifting generator returns, not just one week. */
export interface PeriodizationBlock {
  model: 'powerlifting_block';
  block_weeks: number;
  phases: Array<{
    phase: PeriodizationPhase;
    label: string;
    start_week: number;
    end_week: number;
    weeks: number[];
    focus: string;
  }>;
  weeks: PeriodizationWeek[];
  training_maxes: Array<{
    exercise_id: string;
    name: string;
    lift: string;
    training_max_kg: number;
  }>;
  missing_training_maxes: Array<{ exercise_id: string; name: string; lift: string }>;
}

export interface GeneratedWorkout {
  goal: string;
  experience: ExperienceLevel;
  /** How many sessions the week holds; `sessions` is the whole week. */
  daysPerWeek: number;
  sessionMinutes: number | null;
  /** The first session, repeated in the fields below for older readers. */
  warmup: Array<{ name: string; minutes: number; intensity: string; notes: string }>;
  mainWork: GeneratedExercise[];
  conditioning: GeneratedConditioning | null;
  cooldown: Array<{ name: string; minutes: number; intensity: string; notes: string }>;
  sessions: GeneratedSession[];
  /** Present only when the powerlifting block engine built the draft. */
  periodization?: PeriodizationBlock;
  excluded: Array<{ id: string; name: string; reason: string }>;
  warnings: string[];
  explanations: Array<{ exerciseId: string; reason: string; prescriptionBasis: string }>;
  totals: {
    exercises: number;
    strengthMinutes: number;
    cardioMinutes: number;
    warmupMinutes: number;
    cooldownMinutes: number;
    sessions: number;
    estimatedMinutes: number;
  };
}
