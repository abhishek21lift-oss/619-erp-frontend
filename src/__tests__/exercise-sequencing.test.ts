import { describe, expect, it } from 'vitest';
import { isCompoundExercise, sequenceWorkout, type SeqExercise } from '@/lib/exercise-sequencing';

// The engine is already used by the workout generator and the builder, so the
// legacy shapes below are what production passes today: `mechanic`,
// `movementPattern`, `category`, `locked` — no Module 4 metadata.

describe('sequencing keeps the behaviour existing callers rely on', () => {
  it('puts Olympic/power work first, as it always did', () => {
    const clean: SeqExercise = { id: 'clean', name: 'Hang Clean', category: 'Olympic Weightlifting', mechanic: 'compound' };
    const press: SeqExercise = { id: 'press', name: 'Bench Press', mechanic: 'compound' };
    expect(sequenceWorkout([press, clean]).map((e) => e.id)).toEqual(['clean', 'press']);
  });

  it('keeps locked movements first and says why', () => {
    const lockedCurl: SeqExercise = { id: 'curl', name: 'Cable Curl', mechanic: 'isolation', locked: true };
    const squat: SeqExercise = { id: 'squat', name: 'Back Squat', mechanic: 'compound' };
    const ordered = sequenceWorkout([squat, lockedCurl]);
    expect(ordered.map((e) => e.id)).toEqual(['curl', 'squat']);
    expect(ordered[0].reason).toBe('Locked by trainer; order preserved.');
  });

  it('places conditioning after resistance work', () => {
    const curl: SeqExercise = { id: 'curl', name: 'Cable Curl', mechanic: 'isolation' };
    const bike: SeqExercise = { id: 'bike', name: 'Bike Intervals', category: 'Cardio', mechanic: 'isolation' };
    expect(sequenceWorkout([bike, curl]).map((e) => e.id)).toEqual(['curl', 'bike']);
  });

  it('is stable for exercises that land in the same tier', () => {
    const a: SeqExercise = { id: 'a', name: 'Row A', mechanic: 'compound' };
    const b: SeqExercise = { id: 'b', name: 'Row B', mechanic: 'compound' };
    const c: SeqExercise = { id: 'c', name: 'Row C', mechanic: 'compound' };
    expect(sequenceWorkout([c, a, b]).map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });

  it('reads mechanic case-insensitively, as before', () => {
    expect(isCompoundExercise({ id: 'x', name: 'Leg Press', mechanic: 'Compound' })).toBe(true);
  });
});

describe('Module 4 metadata refines the order without a second engine', () => {
  it('puts unsupported structural compounds after power and before supported compounds', () => {
    const power: SeqExercise = {
      id: 'power', name: 'Power Clean', jointAction: 'compound',
      structuralStatus: 'unsupported', powerPriority: true,
    };
    const squat: SeqExercise = {
      id: 'squat', name: 'Back Squat', jointAction: 'compound',
      structuralStatus: 'unsupported', movementPattern: 'Squat',
    };
    const row: SeqExercise = {
      id: 'row', name: 'Chest-Supported Row', jointAction: 'compound', structuralStatus: 'supported',
    };
    const curl: SeqExercise = { id: 'curl', name: 'Cable Curl', jointAction: 'isolation', structuralStatus: 'supported' };

    const ordered = sequenceWorkout([curl, row, squat, power]);
    expect(ordered.map((e) => e.id)).toEqual(['power', 'squat', 'row', 'curl']);
    expect(ordered[1].reason).toContain('Unsupported structural compound');
    expect(ordered.map((e) => e.sequenceOrder)).toEqual([1, 2, 3, 4]);
    expect(ordered.every((e) => e.phase)).toBe(true);
  });

  it('accepts an explicitly reviewed power movement even when its name says nothing', () => {
    const jump: SeqExercise = { id: 'jump', name: 'Trap Bar Jump', jointAction: 'compound', powerPriority: true };
    const row: SeqExercise = { id: 'row', name: 'Chest-Supported Row', jointAction: 'compound', structuralStatus: 'supported' };
    expect(sequenceWorkout([row, jump]).map((e) => e.id)).toEqual(['jump', 'row']);
  });

  it('never promotes a movement whose structural status is unknown or absent', () => {
    const bench: SeqExercise = { id: 'bench', name: 'Bench Press', jointAction: 'compound', structuralStatus: 'unknown' };
    const squat: SeqExercise = { id: 'squat', name: 'Back Squat', jointAction: 'compound', structuralStatus: 'unsupported' };
    expect(sequenceWorkout([bench, squat]).map((e) => e.id)).toEqual(['squat', 'bench']);
  });
});
