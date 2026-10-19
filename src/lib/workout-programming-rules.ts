/**
 * Module 4 — review rules on top of the sequencing engine.
 *
 * This module does not sequence anything itself. Ordering lives in
 * exercise-sequencing.ts (which has a backend twin) and the RM bands live in
 * strength-prescription.ts, so there is no second answer that can disagree
 * with the plan the trainer is looking at. What is here only reports what a
 * trainer should review, and validates form input.
 *
 * Pure: no fetching, no injury inference, no persistence.
 */

import {
  exercisePriority,
  isCompoundExercise,
  isIsolationExercise,
  isPowerExercise,
  type SeqExercise,
} from './exercise-sequencing';

export interface WorkoutRuleIssue {
  code: 'MISSING_METADATA' | 'POWER_ORDER' | 'UNSUPPORTED_COMPOUND_ORDER' | 'ISOLATION_BEFORE_COMPOUND';
  severity: 'warning' | 'error';
  message: string;
}

/**
 * Review a proposed order without silently rewriting a trainer's saved plan.
 *
 * The rules are one-directional: an exercise is only flagged when something
 * that should have come after it is already above it. That keeps the engine's
 * own output clean — auditing `sequenceWorkout(x)` must never report a
 * problem the sequencer itself created.
 */
export function auditWorkoutOrder(exercises: readonly SeqExercise[]): WorkoutRuleIssue[] {
  const issues: WorkoutRuleIssue[] = [];
  const firstCompound = exercises.findIndex(isCompoundExercise);
  let seenNonPower = false;

  exercises.forEach((exercise, index) => {
    // Reachable for legacy rows: every metadata field is optional, so this is
    // the branch that keeps them labelled "needs review" instead of guessed.
    if ((!exercise.jointAction && !exercise.mechanic) || !exercise.structuralStatus) {
      issues.push({
        code: 'MISSING_METADATA',
        severity: 'warning',
        message: `${exercise.name}: programming metadata is incomplete; sequencing cannot be fully verified.`,
      });
    }

    if (isPowerExercise(exercise) && seenNonPower) {
      issues.push({
        code: 'POWER_ORDER',
        severity: 'warning',
        message: `${exercise.name}: power-priority work is not first; review whether it should move earlier.`,
      });
    }

    if (
      !isPowerExercise(exercise) &&
      isCompoundExercise(exercise) &&
      exercise.structuralStatus === 'unsupported' &&
      exercises.slice(0, index).some((e) => exercisePriority(e) > exercisePriority(exercise))
    ) {
      issues.push({
        code: 'UNSUPPORTED_COMPOUND_ORDER',
        severity: 'warning',
        message: `${exercise.name}: unsupported structural compound work appears after work that should follow it.`,
      });
    }

    if (isIsolationExercise(exercise) && firstCompound !== -1 && index < firstCompound) {
      issues.push({
        code: 'ISOLATION_BEFORE_COMPOUND',
        severity: 'warning',
        message: `${exercise.name}: isolation work precedes compound work; review the session goal and sequencing.`,
      });
    }

    if (!isPowerExercise(exercise)) seenNonPower = true;
  });

  return issues;
}

/**
 * Minimal eligibility check for trainer-facing forms; not a medical clearance.
 * Takes `string` on purpose — the values arrive from a form, so validating
 * them is the point rather than something the type system already guarantees.
 */
export function validateProgrammingInputs(input: {
  experience: string;
  goal: string;
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
