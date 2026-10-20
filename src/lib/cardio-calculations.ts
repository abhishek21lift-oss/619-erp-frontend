// Pure calculation helpers for the Cardio & FITT module.
// Backend twin: 619-erp-backend/src/modules/pt-os/cardio.js
//
// Two different percentages live in this file and must never be conflated:
//
//   K11 intensity bands   % of MAX heart rate (MHR)   -> training intensity
//   Progression phases    % of HEART-RATE RESERVE      -> multi-week stage
//
// MHR method:   THR = MHR x fraction
// Karvonen:     HRR = MHR - RHR
//               THR = round(((MHR - RHR) x fraction) + RHR)
//
// The K11 band values are the supplied programme reference. RPE and talk-test
// text is application guidance, not part of that reference, and is labelled as
// such so it is never mistaken for a measured or published threshold.
//
// The canonical five-phase template is 5 + 3 + 20 + 5 + 5 = 38 minutes. The
// work phase is the main work; warm-up, re-warm-up, cool-down and stretching
// are separate and must not be added to the FITT main-work time.

export type CardioModalityCategory =
  | 'weight-bearing-high-impact'
  | 'weight-bearing-low-impact'
  | 'non-weight-bearing';

export type CardioIntensity = 'low' | 'moderate' | 'high' | 'very-high';
export type CardioCalculationMethod = 'mhr' | 'karvonen';
export type CardioProgramType = 'continuous-liss' | 'liit-miit' | 'hiit' | 'fartlek';
export type CardioProgressionPhase = 'initial' | 'improvement' | 'maintenance';
export type CardioTraineeLevel = 'beginner' | 'intermediate' | 'advanced' | 'super-advanced';

export interface KarvonenInput {
  maxHeartRate: number;
  restingHeartRate: number;
  intensityFraction: number;
}

export interface K11IntensityBand {
  key: CardioIntensity;
  label: string;
  traineeLevel: string;
  minFraction: number;
  maxFraction: number;
  /** Application guidance, not part of the K11 percentage reference. */
  rpe: string;
  /** Application guidance, not part of the K11 percentage reference. */
  talkTest: string;
  guidanceBasis: 'application-guidance';
}

/**
 * Supplied K11 bands, expressed as fractions of MAX heart rate.
 * Do not swap these for the HRR progression phases below.
 */
export const K11_INTENSITY_BANDS: readonly K11IntensityBand[] = [
  {
    key: 'low',
    label: 'Low',
    traineeLevel: 'Beginner',
    minFraction: 0.5,
    maxFraction: 0.6,
    rpe: 'RPE 3-4',
    talkTest: 'Full conversation is comfortable.',
    guidanceBasis: 'application-guidance',
  },
  {
    key: 'moderate',
    label: 'Moderate',
    traineeLevel: 'Intermediate',
    minFraction: 0.6,
    maxFraction: 0.7,
    rpe: 'RPE 5-6',
    talkTest: 'Short sentences; breathing is noticeable.',
    guidanceBasis: 'application-guidance',
  },
  {
    key: 'high',
    label: 'High',
    traineeLevel: 'Advanced',
    minFraction: 0.7,
    maxFraction: 0.85,
    rpe: 'RPE 7-8',
    talkTest: 'A few words at a time.',
    guidanceBasis: 'application-guidance',
  },
  {
    key: 'very-high',
    label: 'Very high',
    traineeLevel: 'Super advanced',
    minFraction: 0.85,
    maxFraction: 1,
    rpe: 'RPE 9-10',
    talkTest: 'Talking is difficult; use only where the client is prepared for it.',
    guidanceBasis: 'application-guidance',
  },
];

export const K11_TRAINEE_LEVELS: readonly {
  key: CardioTraineeLevel;
  label: string;
  suggestedIntensity: CardioIntensity;
}[] = [
  { key: 'beginner', label: 'Beginner', suggestedIntensity: 'low' },
  { key: 'intermediate', label: 'Intermediate', suggestedIntensity: 'moderate' },
  { key: 'advanced', label: 'Advanced', suggestedIntensity: 'high' },
  { key: 'super-advanced', label: 'Super advanced', suggestedIntensity: 'very-high' },
];

export const CARDIO_GOALS: readonly { key: string; label: string }[] = [
  { key: 'general-fitness', label: 'General fitness' },
  { key: 'fat-loss', label: 'Fat loss' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'recovery', label: 'Recovery / active recovery' },
  { key: 'performance', label: 'Performance' },
];

export const CARDIO_PROGRAM_TYPES: readonly {
  key: CardioProgramType;
  label: string;
  description: string;
}[] = [
  { key: 'continuous-liss', label: 'Continuous / LISS', description: 'Steady effort held for the main-work duration.' },
  { key: 'liit-miit', label: 'LIIT / MIIT', description: 'Light or moderate intervals with recovery between efforts.' },
  { key: 'hiit', label: 'HIIT', description: 'Short, hard efforts with planned recovery.' },
  { key: 'fartlek', label: 'Fartlek', description: 'Unstructured pace changes within one continuous session.' },
];

export const CARDIO_MODALITY_CATEGORIES: readonly {
  key: CardioModalityCategory;
  label: string;
  examples: readonly string[];
}[] = [
  {
    key: 'weight-bearing-high-impact',
    label: 'Weight-bearing, impact-based',
    examples: ['Running', 'Jogging', 'Jump rope'],
  },
  {
    key: 'weight-bearing-low-impact',
    label: 'Weight-bearing, non-impact',
    examples: ['Elliptical', 'Walking', 'Stair climber'],
  },
  {
    key: 'non-weight-bearing',
    label: 'Non-weight-bearing, non-impact',
    examples: ['Cycling', 'Swimming', 'Rowing', 'Ski erg'],
  },
];

/** FITT reference ranges. Main work excludes warm-up and cool-down. */
export const K11_FITT_REFERENCE = {
  frequencyPerWeek: { min: 3, max: 5 },
  mainWorkMinutes: { min: 20, max: 60 },
} as const;

/**
 * Application guardrails, not physiological maxima. They stop typos, decimals,
 * NaN and infinity; they do not claim to be safe upper limits for a person.
 */
export const CARDIO_FREQUENCY_LIMITS = { min: 1, max: 14 } as const;
export const CARDIO_MAIN_WORK_LIMITS = { min: 5, max: 180 } as const;
/** Matches the backend's plan-config validator and the generator route schema. */
export const CARDIO_MODALITY_MAX_LENGTH = 80;

export interface K11ProgressionPhase {
  key: CardioProgressionPhase;
  label: string;
  durationWeeks: { min: number; max: number };
  intensityHrr: { min: number; max: number };
  /** null means the reference says the frequency varies. */
  frequencyDays: { min: number; max: number } | null;
  /** null means the reference says the session time varies. */
  minutes: { min: number; max: number } | null;
  note: string;
}

/**
 * Supplied K11 progression reference, expressed as fractions of HEART-RATE
 * RESERVE. Maintenance intentionally has no frequency or duration defaults:
 * the reference says they vary, and this app does not invent them.
 */
export const K11_PROGRESSION_PHASES: readonly K11ProgressionPhase[] = [
  {
    key: 'initial',
    label: 'Initial Conditioning',
    durationWeeks: { min: 4, max: 8 },
    intensityHrr: { min: 0.4, max: 0.6 },
    frequencyDays: { min: 3, max: 5 },
    minutes: { min: 20, max: 40 },
    note: 'Build the habit and tolerate the work.',
  },
  {
    key: 'improvement',
    label: 'Improvement',
    durationWeeks: { min: 8, max: 20 },
    intensityHrr: { min: 0.6, max: 0.8 },
    frequencyDays: { min: 3, max: 6 },
    minutes: { min: 45, max: 60 },
    note: 'Increase the stimulus while keeping technique and recovery intact.',
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    durationWeeks: { min: 24, max: 50 },
    intensityHrr: { min: 0.8, max: 0.9 },
    frequencyDays: null,
    minutes: null,
    note: 'Frequency and time vary. Set them from the client’s schedule and response; no default is supplied.',
  },
];

export type FivePhaseKey =
  | 'generalWarmup'
  | 'rewarmup'
  | 'work'
  | 'cooldown'
  | 'stretching';

export interface FivePhaseDefault {
  key: FivePhaseKey;
  name: string;
  durationMinutes: number;
  intensityFraction: number;
}

/** Canonical five-phase template: 5 + 3 + 20 + 5 + 5 = 38 minutes. */
export const FIVE_PHASE_CARDIO_DEFAULTS: readonly FivePhaseDefault[] = [
  { key: 'generalWarmup', name: 'General warm-up', durationMinutes: 5, intensityFraction: 0.4 },
  { key: 'rewarmup', name: 'Re-warm-up / specific prep', durationMinutes: 3, intensityFraction: 0.5 },
  { key: 'work', name: 'Main work', durationMinutes: 20, intensityFraction: 0.7 },
  { key: 'cooldown', name: 'Cool-down', durationMinutes: 5, intensityFraction: 0.4 },
  { key: 'stretching', name: 'Static stretching', durationMinutes: 5, intensityFraction: 0.3 },
];

export const FIVE_PHASE_CARDIO_TOTAL_MINUTES = FIVE_PHASE_CARDIO_DEFAULTS.reduce(
  (sum, phase) => sum + phase.durationMinutes,
  0,
);

export function getK11IntensityBand(key: string | null | undefined): K11IntensityBand | null {
  if (!key) return null;
  return K11_INTENSITY_BANDS.find((band) => band.key === key) ?? null;
}

export function getProgressionPhase(key: string | null | undefined): K11ProgressionPhase | null {
  if (!key) return null;
  return K11_PROGRESSION_PHASES.find((phase) => phase.key === key) ?? null;
}

export function isCardioIntensity(value: unknown): value is CardioIntensity {
  return typeof value === 'string' && K11_INTENSITY_BANDS.some((band) => band.key === value);
}

export function isCardioCalculationMethod(value: unknown): value is CardioCalculationMethod {
  return value === 'mhr' || value === 'karvonen';
}

export function isCardioProgramType(value: unknown): value is CardioProgramType {
  return typeof value === 'string' && CARDIO_PROGRAM_TYPES.some((type) => type.key === value);
}

export function isProgressionPhase(value: unknown): value is CardioProgressionPhase {
  return typeof value === 'string' && K11_PROGRESSION_PHASES.some((phase) => phase.key === value);
}

export function isCardioModalityCategory(value: unknown): value is CardioModalityCategory {
  return typeof value === 'string'
    && CARDIO_MODALITY_CATEGORIES.some((category) => category.key === value);
}

/** 0.6 -> "60%" (whole percentages only; the reference has no finer step). */
export function formatIntensityPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isFraction(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function validateAge(age: unknown): string | null {
  if (typeof age !== 'number' || !Number.isFinite(age) || !Number.isInteger(age)) {
    return 'Age must be a whole number.';
  }
  if (age < 1 || age > 120) return 'Age must be between 1 and 120.';
  return null;
}

export function validateRestingHeartRate(restingHeartRate: unknown): string | null {
  if (!isPositiveFinite(restingHeartRate)) return 'Resting heart rate must be a positive number.';
  return null;
}

export function validateMaxHeartRate(maxHeartRate: unknown): string | null {
  if (!isPositiveFinite(maxHeartRate)) return 'Max heart rate must be a positive number.';
  return null;
}

export function validateMeasuredMaxHeartRate(
  measuredMaxHeartRate: unknown,
  restingHeartRate?: number | null,
): string | null {
  if (!isPositiveFinite(measuredMaxHeartRate)) return 'Measured max heart rate must be a positive number.';
  if (isPositiveFinite(restingHeartRate) && measuredMaxHeartRate <= restingHeartRate) {
    return 'Measured max heart rate must be greater than resting heart rate.';
  }
  return null;
}

export function validateIntensityFraction(fraction: unknown): string | null {
  if (!isFraction(fraction)) return 'Intensity must be between 0% and 100%.';
  return null;
}

export function validateFrequencyPerWeek(frequency: unknown): string | null {
  if (typeof frequency !== 'number' || !Number.isInteger(frequency)) {
    return 'Frequency must be a whole number of sessions per week.';
  }
  if (frequency < CARDIO_FREQUENCY_LIMITS.min || frequency > CARDIO_FREQUENCY_LIMITS.max) {
    return `Frequency must be between ${CARDIO_FREQUENCY_LIMITS.min} and ${CARDIO_FREQUENCY_LIMITS.max} sessions per week.`;
  }
  return null;
}

export function validateMainWorkMinutes(minutes: unknown): string | null {
  if (typeof minutes !== 'number' || !Number.isInteger(minutes)) {
    return 'Main-work time must be a whole number of minutes.';
  }
  if (minutes < CARDIO_MAIN_WORK_LIMITS.min || minutes > CARDIO_MAIN_WORK_LIMITS.max) {
    return `Main-work time must be between ${CARDIO_MAIN_WORK_LIMITS.min} and ${CARDIO_MAIN_WORK_LIMITS.max} minutes.`;
  }
  return null;
}

export function calcHrr(maxHeartRate: number, restingHeartRate: number): number | null {
  if (!isPositiveFinite(maxHeartRate) || !isPositiveFinite(restingHeartRate)) return null;
  if (restingHeartRate >= maxHeartRate) return null;
  return maxHeartRate - restingHeartRate;
}

/** Karvonen target: % of heart-rate reserve, added back to resting HR. */
export function calcTargetHeartRate(input: KarvonenInput): number | null {
  const { maxHeartRate, restingHeartRate, intensityFraction } = input;
  const hrr = calcHrr(maxHeartRate, restingHeartRate);
  if (hrr == null || !isFraction(intensityFraction)) return null;
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

/** MHR target: % of maximum heart rate, no resting HR in the formula. */
export function calcMhrTargetHeartRate(maxHeartRate: number, fraction: number): number | null {
  if (!isPositiveFinite(maxHeartRate) || !isFraction(fraction)) return null;
  return Math.round(maxHeartRate * fraction);
}

export function calcMhrTargetHeartRateRange(
  maxHeartRate: number,
  minFraction: number,
  maxFraction: number,
): { min: number; max: number } | null {
  const min = calcMhrTargetHeartRate(maxHeartRate, minFraction);
  const max = calcMhrTargetHeartRate(maxHeartRate, maxFraction);
  if (min == null || max == null) return null;
  if (min > max) return { min: max, max: min };
  return { min, max };
}

// Age-based estimate only. Clearly labelled as an estimate, not a measurement.
export function estimateMaxHeartRate(age: number): number | null {
  if (validateAge(age) != null) return null;
  return 220 - age;
}

export interface HeartRateInput {
  age?: number | null;
  measuredMaxHeartRate?: number | null;
  restingHeartRate?: number | null;
}

export interface ResolvedHeartRate {
  maxHeartRate: number;
  maxHeartRateSource: 'measured' | 'estimated';
  estimatedMaxHeartRate: number | null;
  restingHeartRate: number;
  heartRateReserve: number;
}

/**
 * Measured MHR wins. The age estimate is used only when no measured value was
 * supplied, and it never overwrites one.
 */
export function resolveHeartRateInputs(input: HeartRateInput): {
  value: ResolvedHeartRate | null;
  errors: string[];
} {
  const errors: string[] = [];
  const resting = input.restingHeartRate;
  const restingError = validateRestingHeartRate(resting);
  if (restingError) errors.push(restingError);

  const age = input.age;
  const ageError = age == null ? null : validateAge(age);
  if (ageError) errors.push(ageError);

  const estimated = age != null && ageError == null ? estimateMaxHeartRate(age) : null;

  let maxHeartRate: number | null = null;
  let source: 'measured' | 'estimated' | null = null;

  if (input.measuredMaxHeartRate != null) {
    const measuredError = validateMeasuredMaxHeartRate(input.measuredMaxHeartRate, resting);
    if (measuredError) errors.push(measuredError);
    else {
      maxHeartRate = input.measuredMaxHeartRate;
      source = 'measured';
    }
  } else if (age == null) {
    errors.push('Enter an age for the estimate, or a measured max heart rate.');
  } else if (ageError == null) {
    maxHeartRate = estimated;
    source = 'estimated';
  }

  if (maxHeartRate == null || source == null || !isPositiveFinite(resting)) {
    return { value: null, errors: dedupe(errors) };
  }
  if (resting >= maxHeartRate) {
    errors.push('Resting heart rate must be lower than max heart rate.');
    return { value: null, errors: dedupe(errors) };
  }

  return {
    value: {
      maxHeartRate,
      maxHeartRateSource: source,
      estimatedMaxHeartRate: estimated,
      restingHeartRate: resting,
      heartRateReserve: maxHeartRate - resting,
    },
    errors: dedupe(errors),
  };
}

export interface HeartRateTarget {
  minBpm: number;
  maxBpm: number;
  minFraction: number;
  maxFraction: number;
  method: CardioCalculationMethod;
  basisLabel: '% MHR' | '% HRR';
}

export function calcTargetRangeForBand(input: {
  maxHeartRate: number;
  restingHeartRate: number;
  method: CardioCalculationMethod;
  intensity: CardioIntensity;
}): HeartRateTarget | null {
  const { maxHeartRate, restingHeartRate, method, intensity } = input;
  const band = getK11IntensityBand(intensity);
  if (!band || !isCardioCalculationMethod(method)) return null;

  const range = method === 'mhr'
    ? calcMhrTargetHeartRateRange(maxHeartRate, band.minFraction, band.maxFraction)
    : calcTargetHeartRateRange(maxHeartRate, restingHeartRate, band.minFraction, band.maxFraction);

  if (!range) return null;
  return {
    minBpm: range.min,
    maxBpm: range.max,
    minFraction: band.minFraction,
    maxFraction: band.maxFraction,
    method,
    basisLabel: method === 'mhr' ? '% MHR' : '% HRR',
  };
}

export const CARDIO_MODALITY_CATEGORY: Record<string, CardioModalityCategory> = {
  running: 'weight-bearing-high-impact',
  jogging: 'weight-bearing-high-impact',
  sprinting: 'weight-bearing-high-impact',
  'jump rope': 'weight-bearing-high-impact',
  'treadmill running': 'weight-bearing-high-impact',
  elliptical: 'weight-bearing-low-impact',
  walking: 'weight-bearing-low-impact',
  hiking: 'weight-bearing-low-impact',
  'stair climber': 'weight-bearing-low-impact',
  'stair mill': 'weight-bearing-low-impact',
  cycling: 'non-weight-bearing',
  rowing: 'non-weight-bearing',
  swimming: 'non-weight-bearing',
  'stationary bike': 'non-weight-bearing',
  'assault bike': 'non-weight-bearing',
  'ski erg': 'non-weight-bearing',
};

export function classifyCardioModality(modality: string): CardioModalityCategory | null {
  if (!modality) return null;
  const key = modality.trim().toLowerCase();
  if (!key) return null;
  if (CARDIO_MODALITY_CATEGORY[key]) return CARDIO_MODALITY_CATEGORY[key];
  // Word-ish matching so "rowing" classifies and "throwing" does not.
  if (/(^|\s)(run|jog|sprint|jump rope|treadmill)(\s|$)/.test(key)) return 'weight-bearing-high-impact';
  if (/(^|\s)(walk|elliptical|hike|stair|climber)(\s|$)/.test(key)) return 'weight-bearing-low-impact';
  if (/(^|\s)(cycl|row|swim|bike|erg)(\s|$)/.test(key)) return 'non-weight-bearing';
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
  if (calcHrr(maxHeartRate, restingHeartRate) == null) return null;
  if (!Array.isArray(input.phases)) return null;

  const phases: CardioPhase[] = [];
  let total = 0;
  for (const p of input.phases) {
    if (!p || !Number.isInteger(p.durationMinutes) || p.durationMinutes < 0) return null;

    let thr: number | null = null;
    let range: { min: number; max: number } | null = null;

    if (p.intensityFraction != null) {
      if (!isFraction(p.intensityFraction)) return null;
      thr = calcTargetHeartRate({ maxHeartRate, restingHeartRate, intensityFraction: p.intensityFraction });
      if (thr == null) return null;
    }
    if (p.minFraction != null || p.maxFraction != null) {
      if (p.minFraction == null || p.maxFraction == null) return null;
      if (!isFraction(p.minFraction) || !isFraction(p.maxFraction)) return null;
      range = calcTargetHeartRateRange(maxHeartRate, restingHeartRate, p.minFraction, p.maxFraction);
      if (range == null) return null;
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

export function buildFivePhaseCardio(
  maxHeartRate: number,
  restingHeartRate: number,
  overrides?: Partial<Record<FivePhaseKey, { durationMinutes?: number; intensityFraction?: number }>>,
): ReturnType<typeof buildCardioSession> {
  const phases = FIVE_PHASE_CARDIO_DEFAULTS.map((base) => {
    const ov = overrides?.[base.key] ?? {};
    return {
      name: base.name,
      durationMinutes: ov.durationMinutes ?? base.durationMinutes,
      intensityFraction: ov.intensityFraction ?? base.intensityFraction,
    };
  });
  return buildCardioSession({ maxHeartRate, restingHeartRate, phases });
}

export interface ProgressionPrescriptionInput {
  phase: CardioProgressionPhase | string;
  intensityFraction: number;
  frequencyPerWeek: number;
  minutesPerSession: number;
  maxHeartRate: number;
  restingHeartRate: number;
}

export interface ProgressionPrescription {
  phase: K11ProgressionPhase;
  intensityFraction: number;
  prescribedBpm: number;
  referenceRangeBpm: { min: number; max: number };
  frequencyPerWeek: number;
  minutesPerSession: number;
  warnings: string[];
}

/**
 * The phase is an HRR reference. The trainer prescribes a single HRR
 * percentage inside the phase's range, and that percentage produces a single
 * BPM target plus the phase's reference range for context.
 */
export function buildProgressionPrescription(input: ProgressionPrescriptionInput): {
  value: ProgressionPrescription | null;
  errors: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const phase = getProgressionPhase(String(input.phase));
  if (!phase) errors.push('Choose a valid progression phase.');

  if (calcHrr(input.maxHeartRate, input.restingHeartRate) == null) {
    errors.push('Max heart rate and resting heart rate must be valid, with resting below max.');
  }

  const intensityError = validateIntensityFraction(input.intensityFraction);
  if (intensityError) errors.push(intensityError);
  else if (phase) {
    if (input.intensityFraction < phase.intensityHrr.min || input.intensityFraction > phase.intensityHrr.max) {
      errors.push(
        `${formatIntensityPercent(input.intensityFraction)} HRR is outside ${phase.label}'s `
        + `${formatIntensityPercent(phase.intensityHrr.min)}-${formatIntensityPercent(phase.intensityHrr.max)} HRR range.`,
      );
    }
  }

  const frequencyError = validateFrequencyPerWeek(input.frequencyPerWeek);
  if (frequencyError) errors.push(frequencyError);
  const minutesError = validateMainWorkMinutes(input.minutesPerSession);
  if (minutesError) errors.push(minutesError);

  if (phase && frequencyError == null && phase.frequencyDays) {
    if (
      input.frequencyPerWeek < phase.frequencyDays.min
      || input.frequencyPerWeek > phase.frequencyDays.max
    ) {
      warnings.push(
        `${input.frequencyPerWeek} sessions/week is outside ${phase.label}'s `
        + `${phase.frequencyDays.min}-${phase.frequencyDays.max} day reference.`,
      );
    }
  }
  if (phase && minutesError == null && phase.minutes) {
    if (input.minutesPerSession < phase.minutes.min || input.minutesPerSession > phase.minutes.max) {
      warnings.push(
        `${input.minutesPerSession} min is outside ${phase.label}'s `
        + `${phase.minutes.min}-${phase.minutes.max} min reference.`,
      );
    }
  }
  if (
    frequencyError == null
    && (input.frequencyPerWeek < K11_FITT_REFERENCE.frequencyPerWeek.min
      || input.frequencyPerWeek > K11_FITT_REFERENCE.frequencyPerWeek.max)
  ) {
    warnings.push(
      `${input.frequencyPerWeek} sessions/week is outside the K11 FITT reference of `
      + `${K11_FITT_REFERENCE.frequencyPerWeek.min}-${K11_FITT_REFERENCE.frequencyPerWeek.max}.`,
    );
  }
  if (
    minutesError == null
    && (input.minutesPerSession < K11_FITT_REFERENCE.mainWorkMinutes.min
      || input.minutesPerSession > K11_FITT_REFERENCE.mainWorkMinutes.max)
  ) {
    warnings.push(
      `${input.minutesPerSession} min is outside the K11 FITT main-work reference of `
      + `${K11_FITT_REFERENCE.mainWorkMinutes.min}-${K11_FITT_REFERENCE.mainWorkMinutes.max} min.`,
    );
  }

  if (errors.length > 0 || !phase) return { value: null, errors: dedupe(errors) };

  const prescribedBpm = calcTargetHeartRate({
    maxHeartRate: input.maxHeartRate,
    restingHeartRate: input.restingHeartRate,
    intensityFraction: input.intensityFraction,
  });
  const referenceRangeBpm = calcTargetHeartRateRange(
    input.maxHeartRate,
    input.restingHeartRate,
    phase.intensityHrr.min,
    phase.intensityHrr.max,
  );
  if (prescribedBpm == null || referenceRangeBpm == null) {
    return { value: null, errors: ['Max heart rate and resting heart rate must be valid, with resting below max.'] };
  }

  return {
    value: {
      phase,
      intensityFraction: input.intensityFraction,
      prescribedBpm,
      referenceRangeBpm,
      frequencyPerWeek: input.frequencyPerWeek,
      minutesPerSession: input.minutesPerSession,
      warnings: dedupe(warnings),
    },
    errors: dedupe(errors),
  };
}

export interface FittPrescriptionInput {
  maxHeartRate: number;
  restingHeartRate: number;
  method: CardioCalculationMethod | string;
  intensity: CardioIntensity | string;
  frequencyPerWeek: number;
  mainWorkMinutes: number;
  modality: string;
  programType: CardioProgramType | string;
}

export interface FittPrescription {
  frequencyPerWeek: number;
  intensity: K11IntensityBand;
  targetHeartRate: HeartRateTarget;
  mainWorkMinutes: number;
  modality: string;
  modalityCategory: CardioModalityCategory | null;
  programType: CardioProgramType;
  warnings: string[];
}

export function buildFittPrescription(input: FittPrescriptionInput): {
  value: FittPrescription | null;
  errors: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isCardioCalculationMethod(input.method)) errors.push('Choose the MHR or Karvonen method.');
  const band = getK11IntensityBand(input.intensity);
  if (!band) errors.push('Choose a valid K11 intensity.');

  const frequencyError = validateFrequencyPerWeek(input.frequencyPerWeek);
  if (frequencyError) errors.push(frequencyError);
  const minutesError = validateMainWorkMinutes(input.mainWorkMinutes);
  if (minutesError) errors.push(minutesError);

  if (!isCardioProgramType(input.programType)) errors.push('Choose a valid cardio programme type.');

  const modality = typeof input.modality === 'string' ? input.modality.trim() : '';
  if (!modality) errors.push('Enter a cardio modality.');
  else if (modality.length > CARDIO_MODALITY_MAX_LENGTH) {
    errors.push(`Modality must be ${CARDIO_MODALITY_MAX_LENGTH} characters or fewer.`);
  }

  if (calcHrr(input.maxHeartRate, input.restingHeartRate) == null) {
    errors.push('Max heart rate and resting heart rate must be valid, with resting below max.');
  }

  if (
    frequencyError == null
    && (input.frequencyPerWeek < K11_FITT_REFERENCE.frequencyPerWeek.min
      || input.frequencyPerWeek > K11_FITT_REFERENCE.frequencyPerWeek.max)
  ) {
    warnings.push(
      `${input.frequencyPerWeek} sessions/week is outside the K11 FITT reference of `
      + `${K11_FITT_REFERENCE.frequencyPerWeek.min}-${K11_FITT_REFERENCE.frequencyPerWeek.max}.`,
    );
  }
  if (
    minutesError == null
    && (input.mainWorkMinutes < K11_FITT_REFERENCE.mainWorkMinutes.min
      || input.mainWorkMinutes > K11_FITT_REFERENCE.mainWorkMinutes.max)
  ) {
    warnings.push(
      `${input.mainWorkMinutes} min is outside the K11 FITT main-work reference of `
      + `${K11_FITT_REFERENCE.mainWorkMinutes.min}-${K11_FITT_REFERENCE.mainWorkMinutes.max} min.`,
    );
  }

  const modalityCategory = modality ? classifyCardioModality(modality) : null;
  if (modality && !modalityCategory) {
    warnings.push('This modality is unclassified; the prescription is still valid.');
  }

  if (errors.length > 0 || !band) return { value: null, errors: dedupe(errors) };

  const targetHeartRate = calcTargetRangeForBand({
    maxHeartRate: input.maxHeartRate,
    restingHeartRate: input.restingHeartRate,
    method: input.method as CardioCalculationMethod,
    intensity: band.key,
  });
  if (!targetHeartRate) {
    return { value: null, errors: ['Max heart rate and resting heart rate must be valid, with resting below max.'] };
  }

  return {
    value: {
      frequencyPerWeek: input.frequencyPerWeek,
      intensity: band,
      targetHeartRate,
      mainWorkMinutes: input.mainWorkMinutes,
      modality,
      modalityCategory,
      programType: input.programType as CardioProgramType,
      warnings: dedupe(warnings),
    },
    errors: dedupe(errors),
  };
}

export interface CardioPlanPrescription {
  method: CardioCalculationMethod;
  intensity: CardioIntensity;
  targetHeartRate: HeartRateTarget;
  frequencyPerWeek: number;
  mainWorkMinutes: number;
  modality: string;
  modalityCategory: CardioModalityCategory | null;
  programType: CardioProgramType;
  goal?: string | null;
  progression?: {
    phase: CardioProgressionPhase;
    intensityPercent: number;
  } | null;
}

/**
 * Flat config keys, stored inside `workout_exercises.config`. The canonical
 * workout_exercises table has no target_heart_rate column; the column with that
 * name lives on the training-domain tables retired by migration 195. `config`
 * is the existing JSON column migration 136 reserved for parameters like this,
 * so this path needs no schema change.
 */
export interface CardioPlanConfig {
  cardio_source: 'k11';
  target_heart_rate: number;
  target_heart_rate_min: number;
  target_heart_rate_max: number;
  target_heart_rate_basis: '% MHR' | '% HRR';
  cardio_method: CardioCalculationMethod;
  cardio_intensity: CardioIntensity;
  cardio_frequency_per_week: number;
  cardio_main_work_minutes: number;
  cardio_modality: string;
  cardio_modality_category: CardioModalityCategory | null;
  cardio_program_type: CardioProgramType;
  cardio_goal: string | null;
  cardio_progression_phase: CardioProgressionPhase | null;
  cardio_progression_intensity_percent: number | null;
}

/**
 * `target_heart_rate` is the rounded midpoint of the prescribed band, kept for
 * consumers that only understand a single target. The min/max pair is
 * authoritative and is what the calculator and builder display.
 *
 * Only the progression phase and its %HRR are persisted. The phase reference
 * frequency/time are context, not a second prescription; the FITT frequency
 * and main-work time are the active ones for this exercise.
 */
export function toCardioPlanConfig(prescription: CardioPlanPrescription): CardioPlanConfig {
  const { targetHeartRate } = prescription;
  return {
    cardio_source: 'k11',
    target_heart_rate: Math.round((targetHeartRate.minBpm + targetHeartRate.maxBpm) / 2),
    target_heart_rate_min: targetHeartRate.minBpm,
    target_heart_rate_max: targetHeartRate.maxBpm,
    target_heart_rate_basis: targetHeartRate.basisLabel,
    cardio_method: prescription.method,
    cardio_intensity: prescription.intensity,
    cardio_frequency_per_week: prescription.frequencyPerWeek,
    cardio_main_work_minutes: prescription.mainWorkMinutes,
    cardio_modality: prescription.modality,
    cardio_modality_category: prescription.modalityCategory,
    cardio_program_type: prescription.programType,
    cardio_goal: prescription.goal ?? null,
    cardio_progression_phase: prescription.progression?.phase ?? null,
    cardio_progression_intensity_percent: prescription.progression?.intensityPercent ?? null,
  };
}

export const CARDIO_PLAN_DRAFT_KEY = 'ptos.cardio.plan-draft.v1';
export const CARDIO_PLAN_DRAFT_EVENT = 'ptos:cardio-plan-draft';

export interface CardioPlanDraft {
  version: 1;
  createdAt: string;
  config: CardioPlanConfig;
  summary: {
    intensityLabel: string;
    minBpm: number;
    maxBpm: number;
    programTypeLabel: string;
    mainWorkMinutes: number;
    frequencyPerWeek: number;
  };
}

function notifyDraftChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CARDIO_PLAN_DRAFT_EVENT));
}

/** Explicit save only: the calculator calls this when the trainer asks. */
export function writeCardioPlanDraft(draft: CardioPlanDraft): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(CARDIO_PLAN_DRAFT_KEY, JSON.stringify(draft));
    notifyDraftChanged();
    return true;
  } catch {
    return false;
  }
}

/**
 * Shape-checked read. The draft comes from localStorage, so a stale or
 * hand-edited object is discarded rather than trusted.
 */
export function readCardioPlanDraft(): CardioPlanDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CARDIO_PLAN_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Partial<CardioPlanDraft>;
    if (candidate.version !== 1 || !candidate.config || typeof candidate.config !== 'object') return null;
    const config = candidate.config as Partial<CardioPlanConfig>;
    if (
      config.cardio_source !== 'k11'
      || typeof config.target_heart_rate !== 'number'
      || !Number.isFinite(config.target_heart_rate)
      || typeof config.target_heart_rate_min !== 'number'
      || typeof config.target_heart_rate_max !== 'number'
    ) {
      return null;
    }
    if (typeof candidate.summary !== 'object' || candidate.summary == null) return null;
    return candidate as CardioPlanDraft;
  } catch {
    return null;
  }
}

export function clearCardioPlanDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CARDIO_PLAN_DRAFT_KEY);
  } catch {
    // A blocked storage API is not a reason to break the builder.
  }
  notifyDraftChanged();
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
