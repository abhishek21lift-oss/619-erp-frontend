import { describe, expect, it } from 'vitest';
import { sequenceWorkout, type SeqExercise } from '@/lib/exercise-sequencing';
import { auditWorkoutOrder, validateProgrammingInputs } from '@/lib/workout-programming-rules';

// Reviewed Module 4 metadata.
const power: SeqExercise = {
  id: 'power-clean', name: 'Power Clean', jointAction: 'compound',
  structuralStatus: 'unsupported', powerPriority: true,
};
const squat: SeqExercise = {
  id: 'squat', name: 'Back Squat', mechanic: 'compound', jointAction: 'compound',
  structuralStatus: 'unsupported', movementPattern: 'Squat',
};
const row: SeqExercise = {
  id: 'row', name: 'Chest-Supported Row', mechanic: 'compound', jointAction: 'compound',
  structuralStatus: 'supported',
};
const curl: SeqExercise = {
  id: 'curl', name: 'Cable Curl', mechanic: 'isolation', jointAction: 'isolation',
  structuralStatus: 'supported',
};

describe('Module 4 workout order review', () => {
  it('the engine’s own order passes its review', () => {
    // The sequencer puts power first, then the unsupported structural compound.
    // Auditing that output must not warn about the order the engine produced.
    const ordered = sequenceWorkout([curl, row, squat, power]);
    expect(ordered.map((e) => e.id)).toEqual(['power-clean', 'squat', 'row', 'curl']);
    expect(auditWorkoutOrder(ordered)).toEqual([]);
  });

  it('flags isolation before compound and an unsupported compound placed late', () => {
    expect(auditWorkoutOrder([curl, squat]).map((issue) => issue.code))
      .toEqual(['ISOLATION_BEFORE_COMPOUND', 'UNSUPPORTED_COMPOUND_ORDER']);
  });

  it('flags power work that is not first', () => {
    expect(auditWorkoutOrder([squat, power]).map((issue) => issue.code)).toEqual(['POWER_ORDER']);
  });

  it('does not flag two power movements as a broken order', () => {
    const second: SeqExercise = { ...power, id: 'hang-clean', name: 'Hang Clean' };
    expect(auditWorkoutOrder(sequenceWorkout([second, power]))).toEqual([]);
  });

  it('warns about missing metadata instead of guessing a classification', () => {
    const legacy: SeqExercise = { id: 'legacy', name: 'Legacy Press', mechanic: 'compound' };
    expect(auditWorkoutOrder([legacy]).map((issue) => issue.code)).toEqual(['MISSING_METADATA']);
    expect(auditWorkoutOrder([legacy])[0].message).toContain('cannot be fully verified');
  });
});

describe('Module 4 input validation', () => {
  it('rejects invalid frequency and session duration', () => {
    expect(validateProgrammingInputs({
      experience: 'beginner', goal: 'general_fitness', sessionsPerWeek: 0, sessionMinutes: 300,
    })).toHaveLength(2);
  });

  it('rejects values that are not a known experience level or goal', () => {
    expect(validateProgrammingInputs({
      experience: 'athlete', goal: 'bulk', sessionsPerWeek: 3, sessionMinutes: 60,
    })).toEqual([
      'Select a valid training-experience level.',
      'Select a valid training goal.',
    ]);
  });

  it('accepts bounded valid inputs', () => {
    expect(validateProgrammingInputs({
      experience: 'intermediate', goal: 'hypertrophy', sessionsPerWeek: 4, sessionMinutes: 60,
    })).toEqual([]);
  });
});
