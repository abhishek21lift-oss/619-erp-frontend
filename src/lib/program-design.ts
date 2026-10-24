// K11 program-design arithmetic: BMR, TDEE, calories, macros, training split
// and Karvonen heart-rate zones.
//
// Everything here is display-only. The hub page reads the client's existing
// records and shows the numbers; nothing is saved, and a missing input returns
// null rather than a made-up value (the page shows "—" and asks for it).

export type Sex = 'male' | 'female';

export interface ProgramDesignInput {
  sex: Sex | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  measuredBmr: number | null;
  restingHeartRate: number | null;
  trainingDays: number | null;
  goal: string | null;
}

export interface MacroTargets { protein_g: number; fat_g: number; carbs_g: number }
export interface KarvonenZone { label: string; low: number; high: number }

const positive = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;

/** Mifflin-St Jeor, the K11 default when no measured BMR exists. */
export function mifflinStJeor(i: ProgramDesignInput): number | null {
  if (!i.sex || !positive(i.weightKg) || !positive(i.heightCm) || !positive(i.age)) return null;
  const base = 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.age;
  return i.sex === 'male' ? base + 5 : base - 161;
}

/** The latest measured BMR wins; otherwise Mifflin-St Jeor. */
export function basalMetabolicRate(i: ProgramDesignInput): number | null {
  return positive(i.measuredBmr) ? i.measuredBmr : mifflinStJeor(i);
}

/** Training days from the interview → the K11 activity factor. */
export function activityFactor(trainingDays: number | null): number {
  const days = positive(trainingDays) ? trainingDays : 0;
  if (days >= 6) return 1.725;
  if (days >= 4) return 1.55;
  if (days >= 2) return 1.375;
  return 1.2;
}

export function tdee(bmr: number | null, factor: number): number | null {
  return positive(bmr) ? Math.round(bmr * factor) : null;
}

/** Fat loss −500 kcal, muscle gain +300, everything else maintenance. */
export function goalAdjustment(goal: string | null): number {
  if (!goal) return 0;
  if (/fat.?loss|weight.?loss/i.test(goal)) return -500;
  if (/muscle|hypertroph|gain/i.test(goal)) return 300;
  return 0;
}

/** TDEE + the goal adjustment, never below the K11 calorie floor. */
export function calorieTarget(tdeeKcal: number | null, goal: string | null, sex: Sex | null): number | null {
  if (!positive(tdeeKcal)) return null;
  const floor = sex === 'male' ? 1500 : 1200;
  return Math.round(Math.max(tdeeKcal + goalAdjustment(goal), floor));
}

/**
 * Protein 1.8 g/kg, fat 25% of calories, carbs from what is left. Fat grams
 * are rounded before the remainder is taken so the three macros add back up
 * to the calorie target.
 */
export function macroTargets(calories: number | null, weightKg: number | null): MacroTargets | null {
  if (!positive(calories) || !positive(weightKg)) return null;
  const protein_g = Math.round(1.8 * weightKg);
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);
  return { protein_g, fat_g, carbs_g };
}

function cycle(names: string[], days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const round = Math.floor(i / names.length);
    const name = names[i % names.length];
    return round === 0 ? name : `${name} ${String.fromCharCode(65 + round)}`;
  });
}

/** ≤3 days full body, 4 upper/lower, ≥5 push/pull/legs. */
export function splitForDays(days: number | null): { name: string; sessions: string[] } | null {
  if (!positive(days)) return null;
  const n = Math.min(Math.round(days), 7);
  if (n <= 3) return { name: 'Full body', sessions: cycle(['Full body A', 'Full body B', 'Full body C'], n) };
  if (n === 4) return { name: 'Upper / lower', sessions: cycle(['Upper', 'Lower'], n) };
  return { name: 'Push / pull / legs', sessions: cycle(['Push', 'Pull', 'Legs'], n) };
}

/** Karvonen: THR = ((MHR − RHR) × intensity) + RHR, MHR = 220 − age. */
export function karvonen(age: number | null, restingHeartRate: number | null): { maxHr: number; zones: KarvonenZone[] } | null {
  if (!positive(age) || !positive(restingHeartRate)) return null;
  const maxHr = Math.round(220 - age);
  const reserve = maxHr - restingHeartRate;
  const bands: [number, number][] = [[0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 0.9]];
  return {
    maxHr,
    zones: bands.map(([lo, hi]) => ({
      label: `${lo * 100}–${hi * 100}%`,
      low: Math.round(reserve * lo + restingHeartRate),
      high: Math.round(reserve * hi + restingHeartRate),
    })),
  };
}
