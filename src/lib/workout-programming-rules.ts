/**
 * Module 4 — deterministic workout-programming rules.
 *
 * This module is intentionally pure: it does not fetch client data, infer
 * injuries, or persist a workout. The caller must provide reviewed exercise
 * metadata and run the server-side safety/authorization checks before saving.
 *
 * Screenshot-derived defaults are preserved, but treated as coaching
 * guidelines rather than universal prescriptions.
 */

export type JointAction = 'isolation' | 'compound';
export type StructuralStatus = 'supported' | 'unsupported';
export type ExerciseTool =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'bodyweight'
  | 'plate-loaded-machine'
  | 'selectorized-machine'
  | 'smith-machine'
  | 'band'
  | 'other';
export type ForceLine = 'vertical' | 'horizontal' | 'diagonal' | 'rotational' | 'mixed' | 'unknown';
export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';
export type ProgrammingGoal = 'strength' | 'hypertrophy' | 'endurance' | 'fat_loss' | 'general_fitness' | 'powerlifting';

export interface ExerciseProgrammingMetadata {
  id: string;
  name: string;
  jointAction: JointAction;
  structuralStatus: StructuralStatus;
  tools: ExerciseTool[];
  forceLine: ForceLine;
  /** Explicit trainer-defined priority, e.g. competition lift or power movement. */
  powerPriority?: boolean;
  /** Stable source order is preserved within the same sequencing tier. */
  sourceOrder?: number;
  /** Optional, explicitly reviewed contraindication/restriction tags. */
  restrictionTags?: string[];
}

export interface ExerciseFilter {
  jointAction?: JointAction | 'all';
  structuralStatus?: StructuralStatus | 'all';
  tool?: ExerciseTool | 'all';
  forceLine?: ForceLine | 'all';
}

export interface SequencedExercise extends ExerciseProgrammingMetadata {
  sequenceTier: 1 | 2 | 3;
  sequenceReason: string;
}

/**
 * The screenshot's sequence rules:
 * 1. Power work and unsupported structural compound exercises (e.g. squat,
 *    deadlift) start the session while the client is fresh.
 * 2. Supported compounds follow.
 * 3. Isolation work follows compounds.
 *
 * Power priority is an explicit, reviewed flag; it is never inferred from a
 * free-text exercise name. This avoids brittle guesses and accidental loading
 * of an unsafe movement. The function is stable for equal-tier exercises.
 */
export function sequenceWorkout<T extends ExerciseProgrammingMetadata>(exercises: readonly T[]): Array<T & SequencedExercise> {
  return exercises
    .map((exercise, index) => {
      const tier: 1 | 2 | 3 = exercise.powerPriority
        ? 1
        : exercise.jointAction === 'compound' && exercise.structuralStatus === 'unsupported'
          ? 1
          : exercise.jointAction === 'compound'
            ? 2
            : 3;
      const sequenceReason = exercise.powerPriority
        ? 'Power-priority movement: perform early while fresh.'
        : tier === 1
          ? 'Unsupported structural compound: prioritize early while technique and bracing are fresh.'
          : tier === 2
            ? 'Supported compound: follows priority lifts.'
            : 'Isolation movement: follows compound work.';
      return {
        exercise,
        index,
        tier,
        result: { ...exercise, sequenceTier: tier, sequenceReason },
      };
    })
    .sort((a, b) =>
      a.tier - b.tier ||
      (a.exercise.sourceOrder ?? a.index) - (b.exercise.sourceOrder ?? b.index) ||
      a.index - b.index,
    )
    .map(({ result }) => result);
}

/** Filters only against reviewed structured tags; unknown metadata is not guessed. */
export function filterExerciseLibrary<T extends ExerciseProgrammingMetadata>(
  exercises: readonly T[],
  filter: ExerciseFilter,
): T[] {
  return exercises.filter((exercise) =>
    (!filter.jointAction || filter.jointAction === 'all' || exercise.jointAction === filter.jointAction) &&
    (!filter.structuralStatus || filter.structuralStatus === 'all' || exercise.structuralStatus === filter.structuralStatus) &&
    (!filter.tool || filter.tool === 'all' || exercise.tools.includes(filter.tool)) &&
    (!filter.forceLine || filter.forceLine === 'all' || exercise.forceLine === filter.forceLine),
  );
}

/**
 * Screenshot-preserving RM bands. These are programming defaults, not a claim
 * that every set should be taken to a true repetition maximum or failure.
 */
export const RM_GUIDELINES: Record<TrainingExperience, { min: number; max: number; rationale: string }> = {
  beginner: { min: 15, max: 20, rationale: 'Technique and motor-pattern practice; use a manageable load and stop before form degrades.' },
  intermediate: { min: 10, max: 15, rationale: 'Moderate-load volume; adjust reps and effort to the goal and exercise.' },
  advanced: { min: 6, max: 8, rationale: 'Higher-intensity work; reserve demanding loading for exercises and lifters that can perform it safely.' },
};

export interface RepPrescription {
  minReps: number;
  maxReps: number;
  /** Suggested reps in reserve, not a requirement to reach failure. */
  targetRir: number;
  note: string;
}

/**
 * Uses the screenshot band as a default. Goal-specific prescriptions and
 * individual assessment should override it where appropriate.
 */
export function defaultRepPrescription(experience: TrainingExperience): RepPrescription {
  const band = RM_GUIDELINES[experience];
  return {
    minReps: band.min,
    maxReps: band.max,
    targetRir: experience === 'beginner' ? 3 : experience === 'intermediate' ? 2 : 1,
    note: band.rationale,
  };
}

export interface WorkoutRuleIssue {
  code: 'MISSING_METADATA' | 'POWER_ORDER' | 'UNSUPPORTED_COMPOUND_ORDER' | 'ISOLATION_BEFORE_COMPOUND';
  severity: 'warning' | 'error';
  message: string;
}

/**
 * Review a proposed order without silently rewriting a trainer's saved plan.
 * Unknown or incomplete metadata produces a warning, not an invented value.
 */
export function auditWorkoutOrder(exercises: readonly ExerciseProgrammingMetadata[]): WorkoutRuleIssue[] {
  const issues: WorkoutRuleIssue[] = [];
  const firstCompound = exercises.findIndex((e) => e.jointAction === 'compound');
  exercises.forEach((exercise, index) => {
    if (!exercise.jointAction || !exercise.structuralStatus || !exercise.tools?.length || !exercise.forceLine) {
      issues.push({
        code: 'MISSING_METADATA',
        severity: 'warning',
        message: `${exercise.name}: programming metadata is incomplete; sequencing cannot be fully verified.`,
      });
    }
    if (exercise.powerPriority && index > 0) {
      issues.push({
        code: 'POWER_ORDER',
        severity: 'warning',
        message: `${exercise.name}: power-priority work is not first; review whether it should move earlier.`,
      });
    }
    if (exercise.jointAction === 'compound' && exercise.structuralStatus === 'unsupported' && index > 0) {
      issues.push({
        code: 'UNSUPPORTED_COMPOUND_ORDER',
        severity: 'warning',
        message: `${exercise.name}: unsupported structural compound work appears after another exercise.`,
      });
    }
    if (exercise.jointAction === 'isolation' && firstCompound !== -1 && index < firstCompound) {
      issues.push({
        code: 'ISOLATION_BEFORE_COMPOUND',
        severity: 'warning',
        message: `${exercise.name}: isolation work precedes compound work; review the session goal and sequencing.`,
      });
    }
  });
  return issues;
}

/** Minimal eligibility check for trainer-facing forms; not a medical clearance. */
export function validateProgrammingInputs(input: {
  experience: TrainingExperience;
  goal: ProgrammingGoal;
  sessionsPerWeek: number;
  sessionMinutes: number;
}): string[] {
  const issues: string[] = [];
  if (!Number.isInteger(input.sessionsPerWeek) || input.sessionsPerWeek < 1 || input.sessionsPerWeek > 7) {
    issues.push('Sessions per week must be an integer from 1 to 7.');
  }
  if (!Number.isFinite(input.sessionMinutes) || input.sessionMinutes < 10 || input.sessionMinutes > 240) {
    issues.push('Session duration must be between 10 and 240 minutes.');
  }
  if (!['beginner', 'intermediate', 'advanced'].includes(input.experience)) {
    issues.push('Select a valid training-experience level.');
  }
  if (!['strength', 'hypertrophy', 'endurance', 'fat_loss', 'general_fitness', 'powerlifting'].includes(input.goal)) {
    issues.push('Select a valid training goal.');
  }
  return issues;
}
