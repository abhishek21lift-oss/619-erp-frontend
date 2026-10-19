import { describe, expect, it } from 'vitest';
import {
  auditWorkoutOrder,
  defaultRepPrescription,
  filterExerciseLibrary,
  sequenceWorkout,
  validateProgrammingInputs,
  type ExerciseProgrammingMetadata,
} from '@/lib/workout-programming-rules';

const squat: ExerciseProgrammingMetadata = {
  id: 'squat', name: 'Back Squat', jointAction: 'compound', structuralStatus: 'unsupported',
  tools: ['barbell'], forceLine: 'vertical', sourceOrder: 1,
};
const row: ExerciseProgrammingMetadata = {
  id: 'row', name: 'Chest-Supported Row', jointAction: 'compound', structuralStatus: 'supported',
  tools: ['dumbbell'], forceLine: 'horizontal', sourceOrder: 2,
};
const curl: ExerciseProgrammingMetadata = {
  id: 'curl', name: 'Cable Curl', jointAction: 'isolation', structuralStatus: 'supported',
  tools: ['cable'], forceLine: 'diagonal', sourceOrder: 3,
};

describe('Module 4 exercise library rules', () => {
  it('filters by joint action, structural status, tool and force line', () => {
    expect(filterExerciseLibrary([squat, row, curl], { jointAction: 'compound' }).map((e) => e.id))
      .toEqual(['squat', 'row']);
    expect(filterExerciseLibrary([squat, row, curl], { structuralStatus: 'supported', tool: 'dumbbell' }).map((e) => e.id))
      .toEqual(['row']);
    expect(filterExerciseLibrary([squat, row, curl], { forceLine: 'diagonal' }).map((e) => e.id))
      .toEqual(['curl']);
  });
});

describe('Module 4 workout sequencing', () => {
  it('places unsupported structural compounds before supported compounds and isolation', () => {
    const ordered = sequenceWorkout([curl, row, squat]);
    expect(ordered.map((e) => e.id)).toEqual(['squat', 'row', 'curl']);
    expect(ordered.map((e) => e.sequenceTier)).toEqual([1, 2, 3]);
  });

  it('places explicit power-priority exercises first without guessing from names', () => {
    const power = { ...row, id: 'power-clean', name: 'Power Clean', powerPriority: true };
    expect(sequenceWorkout([curl, row, power]).map((e) => e.id)).toEqual(['power-clean', 'row', 'curl']);
  });

  it('flags a trainer-authored order that breaks sequencing guidance', () => {
    expect(auditWorkoutOrder([curl, squat]).map((issue) => issue.code))
      .toContain('ISOLATION_BEFORE_COMPOUND');
    expect(auditWorkoutOrder([curl, squat]).map((issue) => issue.code))
      .toContain('UNSUPPORTED_COMPOUND_ORDER');
  });
});

describe('Module 4 RM guidelines', () => {
  it('preserves screenshot rep bands while making effort guidance explicit', () => {
    expect(defaultRepPrescription('beginner')).toMatchObject({ minReps: 15, maxReps: 20, targetRir: 3 });
    expect(defaultRepPrescription('intermediate')).toMatchObject({ minReps: 10, maxReps: 15, targetRir: 2 });
    expect(defaultRepPrescription('advanced')).toMatchObject({ minReps: 6, maxReps: 8, targetRir: 1 });
  });
});

describe('Module 4 input validation', () => {
  it('rejects invalid frequency and session duration', () => {
    expect(validateProgrammingInputs({
      experience: 'beginner', goal: 'general_fitness', sessionsPerWeek: 0, sessionMinutes: 300,
    })).toHaveLength(2);
  });

  it('accepts bounded valid inputs', () => {
    expect(validateProgrammingInputs({
      experience: 'intermediate', goal: 'hypertrophy', sessionsPerWeek: 4, sessionMinutes: 60,
    })).toEqual([]);
  });
});
