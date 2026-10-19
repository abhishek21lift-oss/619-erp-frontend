// Pure RM & training-load prescription helpers.
// Backend twin: 619-erp-backend/src/modules/pt-os/rm-prescription.js

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type TrainingGoal =
  | 'strength'
  | 'hypertrophy'
  | 'endurance'
  | 'fat_loss'
  | 'general_fitness'
  | 'powerlifting';

export interface RmPrescription {
  sets: number;
  reps: string; // may be a range like "6-8"
  rpe: number | null; // target RPE
  rir: number | null; // reps in reserve
  restSeconds: number;
  intensityPct1RM: number | null; // percent of 1RM where suitable
  notes: string;
}

const RM_RANGES: Record<ExperienceLevel, { min: number; max: number }> = {
  beginner: { min: 15, max: 20 },
  intermediate: { min: 10, max: 15 },
  advanced: { min: 6, max: 8 },
};

export function rmRangeForExperience(level: ExperienceLevel): { min: number; max: number } {
  return RM_RANGES[level] || RM_RANGES.beginner;
}

export function prescribeStrengthLoad(params: {
  experience: ExperienceLevel;
  goal: TrainingGoal;
  mechanic?: 'compound' | 'isolation' | string;
  hasVerified1RM?: boolean;
}): RmPrescription {
  const { experience, goal, mechanic, hasVerified1RM } = params;
  const base = rmRangeForExperience(experience);

  // Goal-specific overrides
  let reps = `${base.min}-${base.max}`;
  let sets = mechanic === 'compound' ? 4 : 3;
  let restSeconds = mechanic === 'compound' ? 120 : 60;
  let rpe: number | null = 7;
  let rir: number | null = 2;
  let intensityPct1RM: number | null = null;
  const notes: string[] = [];

  if (goal === 'strength' || goal === 'powerlifting') {
    reps = experience === 'advanced' ? '3-5' : '5-8';
    sets = mechanic === 'compound' ? 5 : 3;
    restSeconds = 180;
    rpe = 8;
    rir = 1;
    if (hasVerified1RM) intensityPct1RM = 85;
    notes.push('Strength focus: longer rest, lower reps.');
  } else if (goal === 'hypertrophy') {
    reps = '8-12';
    sets = 3;
    restSeconds = 90;
    rpe = 8;
    rir = 1;
    if (hasVerified1RM) intensityPct1RM = 70;
  } else if (goal === 'endurance') {
    reps = '15-20';
    sets = 2;
    restSeconds = 45;
    rpe = 6;
    rir = 3;
  } else if (goal === 'fat_loss') {
    reps = '10-15';
    sets = 3;
    restSeconds = 60;
    rpe = 7;
    rir = 2;
  }

  // Beginner guard: never auto-prescribe maximal loading
  if (experience === 'beginner') {
    rpe = Math.min(rpe ?? 7, 6);
    if (intensityPct1RM != null) intensityPct1RM = Math.min(intensityPct1RM, 60);
    notes.push('Beginner: conservative load, prioritize technique.');
  }
  if (!hasVerified1RM) {
    intensityPct1RM = null;
    notes.push('No verified 1RM: use RPE/RIR autoregulation, conservative estimates.');
  }

  return {
    sets,
    reps,
    rpe,
    rir,
    restSeconds,
    intensityPct1RM,
    notes: notes.join(' '),
  };
}

export function warmupSetsFor(prescription: RmPrescription): Array<{ sets: number; reps: string; loadPct: number }> {
  // Simple warm-up ramp: 2 sets at 50% and 70% of working load.
  return [
    { sets: 1, reps: '5', loadPct: 50 },
    { sets: 1, reps: '3', loadPct: 70 },
  ];
}

// Experience from training age (years)
export function experienceFromTrainingAge(years: number | null): ExperienceLevel {
  if (years == null || !Number.isFinite(years) || years < 0) return 'beginner';
  if (years < 1) return 'beginner';
  if (years < 3) return 'intermediate';
  return 'advanced';
}
