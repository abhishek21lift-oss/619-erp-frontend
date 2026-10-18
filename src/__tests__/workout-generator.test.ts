import { generateWorkout, suitability } from '@/lib/workout-generator';
import type { GeneratorExercise } from '@/lib/workout-generator';

const pool: GeneratorExercise[] = [
  { id: 'squat', name: 'Back Squat', mechanic: 'compound', movementPattern: 'Squat', primaryMuscle: 'Quadriceps', equipment: 'Barbell', category: 'Strength', difficulty: 'intermediate' },
  { id: 'hinge', name: 'Romanian Deadlift', mechanic: 'compound', movementPattern: 'Hinge', primaryMuscle: 'Hamstrings', equipment: 'Barbell', category: 'Strength', difficulty: 'intermediate' },
  { id: 'bench', name: 'Bench Press', mechanic: 'compound', movementPattern: 'Horizontal Push', primaryMuscle: 'Chest', equipment: 'Barbell', category: 'Strength', difficulty: 'intermediate' },
  { id: 'row', name: 'Barbell Row', mechanic: 'compound', movementPattern: 'Horizontal Pull', primaryMuscle: 'Middle Back', equipment: 'Barbell', category: 'Strength', difficulty: 'intermediate' },
  { id: 'curl', name: 'Bicep Curl', mechanic: 'isolation', movementPattern: 'Isolation', primaryMuscle: 'Biceps', equipment: 'Dumbbell', category: 'Strength', difficulty: 'beginner' },
  { id: 'bike', name: 'Stationary Bike', mechanic: 'isolation', movementPattern: 'Locomotion', primaryMuscle: 'Cardiovascular', equipment: 'Machine', category: 'Cardio', difficulty: 'beginner' },
];

test('excludes restrictions with a reason', () => {
  const r = generateWorkout({ client: { goal: 'strength', avoidPatterns: ['Squat'] }, pool });
  expect(r.mainWork.map((e) => e.id)).not.toContain('squat');
  expect(r.excluded.some((e) => /Squat/.test(e.reason))).toBe(true);
});

test('deterministic', () => {
  const a = generateWorkout({ client: { goal: 'hypertrophy' }, pool });
  const b = generateWorkout({ client: { goal: 'hypertrophy' }, pool });
  expect(a.mainWork.map((e) => e.id)).toEqual(b.mainWork.map((e) => e.id));
});

test('cardio shaping by goal', () => {
  expect(generateWorkout({ client: { goal: 'fat_loss' }, pool }).conditioning?.minutes).toBe(20);
  expect(generateWorkout({ client: { goal: 'strength' }, pool }).conditioning).toBeNull();
});

test('suitability reason', () => {
  expect(suitability({ id: 'x', name: 'X', movementPattern: 'Hinge' }, { avoidPatterns: ['Hinge'] })).toEqual({
    ok: false,
    reason: 'movement pattern "Hinge" is restricted for this client',
  });
});
