// Pure calculation helpers for the Cardio & FITT module.
// Backend twin: 619-erp-backend/src/modules/pt-os/cardio.js
//
// Karvonen target heart rate:
//   HRR = MHR - RHR
//   THR = (HRR * intensityFraction) + RHR

export type CardioModalityCategory =
  | 'weight-bearing-high-impact'
  | 'weight-bearing-low-impact'
  | 'non-weight-bearing';

export type CardioIntensityZone = 'easy' | 'moderate' | 'vigorous' | 'interval';

export interface KarvonenInput {
  maxHeartRate: number;
  restingHeartRate: number;
  intensityFraction: number;
}

export function calcHrr(maxHeartRate: number, restingHeartRate: number): number | null {
  if (!Number.isFinite(maxHeartRate) || !Number.isFinite(restingHeartRate)) return null;
  if (maxHeartRate <= 0 || restingHeartRate < 0) return null;
  if (restingHeartRate >= maxHeartRate) return null;
  return maxHeartRate - restingHeartRate;
}

export function calcTargetHeartRate(input: KarvonenInput): number | null {
  const { maxHeartRate, restingHeartRate, intensityFraction } = input;
  const hrr = calcHrr(maxHeartRate, restingHeartRate);
  if (hrr == null) return null;
  if (!Number.isFinite(intensityFraction) || intensityFraction < 0 || intensityFraction > 1) return null;
  return Math.round(hrr * intensityFraction + restingHeartRate);
}

export function calcTargetHeartRateRange(
  maxHeartRate: number,
  restingHeartRate: number,
  minFraction: number,
  maxFraction: number,
): { min: number; max: number } | null {
  const min = calcTargetHeartRate({ maxHeartRate, restingHeartRate, intensityFraction: minFraction });
  const max = calcTargetHeartRate({ maxHeartRate, restingHeartRate, intensityFraction: maxFraction });
  if (min == null || max == null) return null;
  if (min > max) return { min: max, max: min };
  return { min, max };
}

// Age-based estimate only. Clearly labeled as an estimate, not a measurement.
export function estimateMaxHeartRate(age: number): number | null {
  if (!Number.isFinite(age) || age <= 0 || age > 120) return null;
  return 220 - age;
}

export const CARDIO_MODALITY_CATEGORY: Record<string, CardioModalityCategory> = {
  running: 'weight-bearing-high-impact',
  jogging: 'weight-bearing-high-impact',
  sprinting: 'weight-bearing-high-impact',
  elliptical: 'weight-bearing-low-impact',
  walking: 'weight-bearing-low-impact',
  hiking: 'weight-bearing-low-impact',
  cycling: 'non-weight-bearing',
  rowing: 'non-weight-bearing',
  swimming: 'non-weight-bearing',
  'stationary bike': 'non-weight-bearing',
};

export function classifyCardioModality(modality: string): CardioModalityCategory | null {
  if (!modality) return null;
  const key = modality.trim().toLowerCase();
  if (CARDIO_MODALITY_CATEGORY[key]) return CARDIO_MODALITY_CATEGORY[key];
  // fuzzy contains
  if (/run|jog|sprint|jump/.test(key)) return 'weight-bearing-high-impact';
  if (/walk|ellipt|hike|stair/.test(key)) return 'weight-bearing-low-impact';
  if (/cycl|row|swim|bike/.test(key)) return 'non-weight-bearing';
  return null;
}

export interface CardioPhase {
  name: string;
  durationMinutes: number;
  intensityFraction?: number | null;
  targetHeartRate?: number | null;
  targetHeartRateRange?: { min: number; max: number } | null;
  notes?: string;
}

export interface CardioSessionInput {
  maxHeartRate: number;
  restingHeartRate: number;
  phases: Array<{
    name: string;
    durationMinutes: number;
    intensityFraction?: number | null;
    minFraction?: number | null;
    maxFraction?: number | null;
    notes?: string;
  }>;
}

export function buildCardioSession(input: CardioSessionInput): {
  phases: CardioPhase[];
  totalMinutes: number;
} | null {
  const { maxHeartRate, restingHeartRate } = input;
  if (!Number.isFinite(maxHeartRate) || !Number.isFinite(restingHeartRate)) return null;
  if (maxHeartRate <= 0 || restingHeartRate < 0 || restingHeartRate >= maxHeartRate) return null;
  const phases: CardioPhase[] = [];
  let total = 0;
  for (const p of input.phases) {
    if (!p || !Number.isFinite(p.durationMinutes) || p.durationMinutes < 0) return null;
    let thr: number | null = null;
    let range: { min: number; max: number } | null = null;
    if (p.intensityFraction != null) {
      thr = calcTargetHeartRate({ maxHeartRate, restingHeartRate, intensityFraction: p.intensityFraction });
    }
    if (p.minFraction != null && p.maxFraction != null) {
      range = calcTargetHeartRateRange(maxHeartRate, restingHeartRate, p.minFraction, p.maxFraction);
    }
    phases.push({
      name: p.name,
      durationMinutes: p.durationMinutes,
      intensityFraction: p.intensityFraction ?? null,
      targetHeartRate: thr,
      targetHeartRateRange: range,
      notes: p.notes,
    });
    total += p.durationMinutes;
  }
  return { phases, totalMinutes: total };
}

export const FIVE_PHASE_CARDIO_DEFAULTS = {
  generalWarmup: { name: 'General Warm-up', durationMinutes: 5, intensityFraction: 0.4 },
  rewarmup: { name: 'Re-warm-up / Specific Prep', durationMinutes: 3, intensityFraction: 0.5 },
  work: { name: 'Work Phase', durationMinutes: 20, intensityFraction: 0.7 },
  cooldown: { name: 'Cool-down', durationMinutes: 5, intensityFraction: 0.4 },
  stretching: { name: 'Static Stretching', durationMinutes: 5, intensityFraction: 0.3 },
};

export function buildFivePhaseCardio(
  maxHeartRate: number,
  restingHeartRate: number,
  overrides?: Partial<Record<keyof typeof FIVE_PHASE_CARDIO_DEFAULTS, { durationMinutes?: number; intensityFraction?: number }>>,
): ReturnType<typeof buildCardioSession> {
  const keys = Object.keys(FIVE_PHASE_CARDIO_DEFAULTS) as Array<keyof typeof FIVE_PHASE_CARDIO_DEFAULTS>;
  const phases = keys.map((k) => {
    const base = FIVE_PHASE_CARDIO_DEFAULTS[k];
    const ov = overrides?.[k] || {};
    return {
      name: base.name,
      durationMinutes: ov.durationMinutes ?? base.durationMinutes,
      intensityFraction: ov.intensityFraction ?? base.intensityFraction,
    };
  });
  return buildCardioSession({ maxHeartRate, restingHeartRate, phases });
}

export const INTENSITY_ZONE_FRACTIONS: Record<CardioIntensityZone, [number, number]> = {
  easy: [0.4, 0.5],
  moderate: [0.5, 0.7],
  vigorous: [0.7, 0.85],
  interval: [0.85, 1.0],
};
