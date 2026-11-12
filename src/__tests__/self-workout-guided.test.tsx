// The guided workout now keeps its draft on the server and carries effort
// numbers. These are the pure parts: what goes into the submit payload, and
// which exercise opens next once one is finished.

import { describe, it, expect } from 'vitest';
import {
  newDraft, nextExerciseIndex, toLogInput, type WorkoutDraft,
} from '@/components/member/workoutDraft';

const exercise = (name: string, sets: number) => ({
  name, sets, reps: 8, target_weight: 60,
});

function draft(): WorkoutDraft {
  return newDraft({
    title: 'Monday · Strength',
    assignment_id: 'a1',
    program_name: 'Strength',
    workout_day: 'Monday',
    exercises: [exercise('Squat', 3), exercise('Bench', 3)],
    last: {},
  });
}

describe('toLogInput effort', () => {
  it('carries RPE, RIR and notes into the submit payload', () => {
    const d = draft();
    d.exercises[0].sets[0] = { weight: '60', reps: '8', done: true, rpe: '8', rir: '2', notes: 'smooth' };
    expect(toLogInput(d).exercises[0].sets[0]).toMatchObject({ rpe: 8, rir: 2, notes: 'smooth' });
  });
});

describe('nextExerciseIndex', () => {
  it('opens the first exercise with an unlogged set', () => {
    const d = draft();
    for (const s of d.exercises[0].sets) s.done = true;
    expect(nextExerciseIndex(d)).toBe(1);
  });

  it('stays on the last exercise when everything is logged', () => {
    const d = draft();
    for (const x of d.exercises) for (const s of x.sets) s.done = true;
    expect(nextExerciseIndex(d)).toBe(1);
  });
});
