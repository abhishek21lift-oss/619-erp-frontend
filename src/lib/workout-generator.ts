// Deterministic workout generation — framework-free twin of
// 619-erp-backend/src/modules/pt-os/workout-generator.js.
//
// The same pure function runs client-side for a live preview; the backend
// recomputes before anything is saved, so a tampered client cannot store a
// session the rules would not produce.
//
// Deterministic: same input, same output. No clock, no randomness.

import { prescribeStrengthLoad, type ExperienceLevel, type TrainingGoal } from './strength-prescription';
import { sequenceWorkout, type SeqExercise, type SequencedExercise } from './exercise-sequencing';

export interface GeneratorExercise extends SeqExercise {
  primaryMuscle?: string;
  difficulty?: string;
  equipment?: string;
}

export interface GeneratorClient {
  experience?: ExperienceLevel;
  goal?: TrainingGoal;
  avoidPatterns?: string[];
  avoidMuscles?: string[];
  equipment?: string[];
  maxDifficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface GeneratorOptions {
  includeCardio?: boolean;
  cardioMinutes?: number;
  modality?: string;
  hasVerified1RM?: boolean;
}

export interface GeneratedExercise extends SequencedExercise {
  primaryMuscle?: string;
  difficulty?: string;
  equipment?: string;
  prescription: ReturnType<typeof prescribeStrengthLoad>;
}

export interface GeneratedWorkout {
  goal: string;
  experience: ExperienceLevel;
  warmup: Array<{ name: string; minutes: number; intensity: string; notes: string }>;
  mainWork: GeneratedExercise[];
  conditioning: { modality: string; minutes: number; intensity: string; notes: string } | null;
  cooldown: Array<{ name: string; minutes: number; intensity: string; notes: string }>;
  excluded: Array<{ id: string; name: string; reason: string }>;
  warnings: string[];
  explanations: Array<{ exerciseId: string; reason: string; prescriptionBasis: string }>;
  totals: {
    exercises: number;
    strengthMinutes: number;
    cardioMinutes: number;
    warmupMinutes: number;
    cooldownMinutes: number;
  };
}

const GOAL_SHAPE: Record<string, { mainCount: number; patterns: string[]; cardioMinutes: number }> = {
  strength: { mainCount: 5, patterns: ['Squat', 'Hinge', 'Horizontal Push', 'Horizontal Pull', 'Vertical Push'], cardioMinutes: 0 },
  powerlifting: { mainCount: 4, patterns: ['Squat', 'Hinge', 'Horizontal Push', 'Vertical Push'], cardioMinutes: 0 },
  hypertrophy: { mainCount: 6, patterns: ['Horizontal Push', 'Horizontal Pull', 'Squat', 'Vertical Push', 'Vertical Pull', 'Hinge'], cardioMinutes: 10 },
  fat_loss: { mainCount: 4, patterns: ['Squat', 'Horizontal Push', 'Horizontal Pull', 'Hinge'], cardioMinutes: 20 },
  endurance: { mainCount: 4, patterns: ['Squat', 'Horizontal Pull', 'Anti-Extension', 'Hinge'], cardioMinutes: 25 },
  general_fitness: { mainCount: 5, patterns: ['Squat', 'Horizontal Push', 'Horizontal Pull', 'Hinge', 'Anti-Extension'], cardioMinutes: 15 },
};

const DEFAULT_SHAPE = GOAL_SHAPE.general_fitness;

function norm(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

export function suitability(
  exercise: GeneratorExercise,
  client: GeneratorClient,
): { ok: true } | { ok: false; reason: string } {
  const avoidPatterns = new Set((client.avoidPatterns || []).map(norm));
  const avoidMuscles = new Set((client.avoidMuscles || []).map(norm));
  const allowedEquipment = client.equipment && client.equipment.length
    ? new Set(client.equipment.map(norm))
    : null;

  if (avoidPatterns.has(norm(exercise.movementPattern))) {
    return { ok: false, reason: `movement pattern "${exercise.movementPattern}" is restricted for this client` };
  }
  if (avoidMuscles.has(norm(exercise.primaryMuscle))) {
    return { ok: false, reason: `primary muscle "${exercise.primaryMuscle}" is restricted for this client` };
  }
  if (allowedEquipment && exercise.equipment && !allowedEquipment.has(norm(exercise.equipment))) {
    return { ok: false, reason: `equipment "${exercise.equipment}" is not available` };
  }
  if (client.maxDifficulty && exercise.difficulty) {
    const order: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
    const cap = order[norm(client.maxDifficulty)] || 3;
    const lvl = order[norm(exercise.difficulty)] || 1;
    if (lvl > cap) return { ok: false, reason: `difficulty "${exercise.difficulty}" exceeds the client's level` };
  }
  return { ok: true };
}

function isWarmupCategory(ex: GeneratorExercise): boolean {
  const cat = norm(ex.category);
  const pattern = norm(ex.movementPattern);
  return cat === 'stretching' || cat === 'mobility' || pattern === 'mobility';
}

function isCardioExercise(ex: GeneratorExercise): boolean {
  const cat = norm(ex.category);
  return cat === 'cardio' || norm(ex.movementPattern) === 'locomotion';
}

export function generateWorkout(input: {
  client?: GeneratorClient;
  pool: GeneratorExercise[];
  options?: GeneratorOptions;
}): GeneratedWorkout {
  const client = input?.client || {};
  const pool = input?.pool || [];
  const options = input?.options || {};
  const goal = norm(client.goal) || 'general_fitness';
  const shape = GOAL_SHAPE[goal] || DEFAULT_SHAPE;
  const experience: ExperienceLevel = client.experience || 'beginner';
  const hasVerified1RM = !!options.hasVerified1RM;

  const excluded: Array<{ id: string; name: string; reason: string }> = [];
  const usable: GeneratorExercise[] = [];
  for (const ex of pool) {
    const verdict = suitability(ex, client);
    if (verdict.ok) usable.push(ex);
    else excluded.push({ id: ex.id, name: ex.name, reason: verdict.reason });
  }

  const strength = usable.filter((e) => !isWarmupCategory(e) && !isCardioExercise(e));
  const cardioOptions = usable.filter(isCardioExercise);

  const chosen: GeneratorExercise[] = [];
  const chosenIds = new Set<string>();
  for (const pattern of shape.patterns) {
    const candidates = strength.filter((e) => norm(e.movementPattern) === norm(pattern) && !chosenIds.has(e.id));
    if (!candidates.length) continue;
    candidates.sort((a, b) => {
      const ac = norm(a.mechanic) === 'compound' ? 0 : 1;
      const bc = norm(b.mechanic) === 'compound' ? 0 : 1;
      return ac - bc;
    });
    const pick = candidates[0];
    chosen.push(pick);
    chosenIds.add(pick.id);
  }

  if (chosen.length < shape.mainCount) {
    const rest = strength
      .filter((e) => !chosenIds.has(e.id) && norm(e.mechanic) === 'compound')
      .concat(strength.filter((e) => !chosenIds.has(e.id) && norm(e.mechanic) !== 'compound'));
    for (const ex of rest) {
      if (chosen.length >= shape.mainCount) break;
      chosen.push(ex);
      chosenIds.add(ex.id);
    }
  }

  const sequenced = sequenceWorkout(chosen).map((ex) => {
    const rx = prescribeStrengthLoad({
      experience,
      goal: (GOAL_SHAPE[goal] ? goal : 'general_fitness') as TrainingGoal,
      mechanic: ex.mechanic,
      hasVerified1RM,
    });
    return { ...ex, prescription: rx };
  });

  const warmup = [
    { name: 'General warm-up', minutes: 5, intensity: 'easy', notes: 'Raise body temperature and heart rate gradually.' },
    {
      name: 'Specific preparation',
      minutes: 5,
      intensity: 'easy',
      notes: sequenced.length
        ? `Rehearse the ${sequenced[0].movementPattern || 'first'} pattern with light load.`
        : "Rehearse today's first movement with light load.",
    },
  ];

  const cardioMinutes = options.cardioMinutes != null ? options.cardioMinutes : shape.cardioMinutes;
  const includeCardio = options.includeCardio != null ? !!options.includeCardio : cardioMinutes > 0;
  let conditioning: GeneratedWorkout['conditioning'] = null;
  if (includeCardio && cardioMinutes > 0) {
    const modality = options.modality || (cardioOptions[0] ? cardioOptions[0].name : 'Cycling');
    conditioning = { modality, minutes: cardioMinutes, intensity: 'moderate', notes: 'Steady state or intervals per tolerance.' };
  }

  const cooldown = [
    { name: 'Cool-down', minutes: 5, intensity: 'easy', notes: 'Gradually reduce intensity; breathing back to conversational.' },
    { name: 'Static stretching', minutes: 5, intensity: 'rest', notes: 'Hold 20-30s per stretch for muscles trained today.' },
  ];

  const warnings: string[] = [];
  if (!sequenced.length) warnings.push("No suitable exercises were found in the library pool for this client's constraints.");
  if (excluded.length) warnings.push(`${excluded.length} exercise(s) were excluded by recorded restrictions.`);

  const explanations = sequenced.map((ex) => ({
    exerciseId: ex.id,
    reason: ex.reason,
    prescriptionBasis: ex.prescription.notes,
  }));

  return {
    goal,
    experience,
    warmup,
    mainWork: sequenced,
    conditioning,
    cooldown,
    excluded,
    warnings,
    explanations,
    totals: {
      exercises: sequenced.length,
      strengthMinutes: sequenced.length * 6,
      cardioMinutes: conditioning ? conditioning.minutes : 0,
      warmupMinutes: warmup.reduce((s, p) => s + p.minutes, 0),
      cooldownMinutes: cooldown.reduce((s, p) => s + p.minutes, 0),
    },
  };
}

export { GOAL_SHAPE, DEFAULT_SHAPE };
