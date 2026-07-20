// Pure, framework-free calculation/classification functions for the
// Fitness Testing module. Backend twin: 619-erp-backend/src/modules/progress/fitness-scoring.js
// (same formulas, duplicated deliberately since there's no shared package
// between the two apps). These are used client-side for live preview only —
// the backend recomputes and stores the authoritative values.

export type FitnessCategory = 'Excellent' | 'Good' | 'Average' | 'Below Average' | 'Poor';
export type BpCategory = 'Normal' | 'Elevated' | 'Hypertension Stage 1' | 'Hypertension Stage 2' | 'Hypotension';
export type Gender = 'Male' | 'Female' | 'Other';

function round(n: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// ── Step 1: Blood Pressure ── AHA guideline thresholds.
export function classifyBp(systolic: number | null, diastolic: number | null): { category: BpCategory | null; isUnsafe: boolean } {
  if (systolic == null || diastolic == null) return { category: null, isUnsafe: false };
  if (systolic < 90 || diastolic < 60) return { category: 'Hypotension', isUnsafe: true };
  if (systolic >= 140 || diastolic >= 90) return { category: 'Hypertension Stage 2', isUnsafe: true };
  if (systolic >= 130 || diastolic >= 80) return { category: 'Hypertension Stage 1', isUnsafe: false };
  if (systolic >= 120 && diastolic < 80) return { category: 'Elevated', isUnsafe: false };
  return { category: 'Normal', isUnsafe: false };
}

// ── Step 2: Anthropometric ──
export function calcBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return round(weightKg / (heightM * heightM), 1);
}

export function calcWhr(waistCm: number | null, hipsCm: number | null): number | null {
  if (!waistCm || !hipsCm) return null;
  return round(waistCm / hipsCm, 2);
}

// ── Step 3: Body Composition ── Mifflin-St Jeor (1990).
export function calcBmr(weightKg: number | null, heightCm: number | null, age: number | null, gender: Gender | null): number | null {
  if (!weightKg || !heightCm || !age || !gender) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'Male' ? base + 5 : base - 161);
}

export function calcLeanBodyMass(weightKg: number | null, bodyFatPct: number | null): number | null {
  if (!weightKg || bodyFatPct == null) return null;
  return round(weightKg * (1 - bodyFatPct / 100), 2);
}

export function calcFatMass(weightKg: number | null, bodyFatPct: number | null): number | null {
  if (!weightKg || bodyFatPct == null) return null;
  return round(weightKg * (bodyFatPct / 100), 2);
}

// ── Step 4: Cardiorespiratory Endurance ──
// Kline et al. (1987) — Rockport 1-Mile Walk Test.
export function calcVo2MaxRockport(weightKg: number | null, age: number | null, gender: Gender | null, timeMin: number | null, heartRate: number | null): number | null {
  if (!weightKg || !age || !timeMin || !heartRate) return null;
  const weightLb = weightKg * 2.20462;
  const genderTerm = gender === 'Male' ? 1 : 0;
  const vo2 = 132.853 - 0.0769 * weightLb - 0.3877 * age + 6.315 * genderTerm - 3.2649 * timeMin - 0.1565 * heartRate;
  return round(vo2, 2);
}

// Cooper (1968) — 12-Minute Run Test.
export function calcVo2MaxCooper(distanceMeters: number | null): number | null {
  if (!distanceMeters) return null;
  return round((distanceMeters - 504.9) / 44.73, 2);
}

// Foster et al. (1984) — Bruce Protocol treadmill-time estimate.
export function calcVo2MaxBruce(treadmillMinutes: number | null): number | null {
  if (!treadmillMinutes) return null;
  const t = treadmillMinutes;
  return round(14.8 - 1.379 * t + 0.451 * t * t - 0.012 * t * t * t, 2);
}

// Harvard Step Test — Physical Efficiency Index (long form). Classified
// directly; no VO2max output.
export function calcHarvardPei(durationSec: number | null, pulse1: number | null, pulse2: number | null, pulse3: number | null): number | null {
  if (!durationSec || !pulse1 || !pulse2 || !pulse3) return null;
  return round((durationSec * 100) / (2 * (pulse1 + pulse2 + pulse3)), 1);
}

export function classifyHarvardPei(pei: number | null): FitnessCategory | null {
  if (pei == null) return null;
  if (pei < 50) return 'Poor';
  if (pei < 80) return 'Below Average';
  if (pei < 90) return 'Average';
  if (pei <= 100) return 'Good';
  return 'Excellent';
}

// Simplified gender-split, 3-age-band VO2max norms (mL/kg/min).
// Simplification vs. full per-decade Cooper Institute tables — Phase 1
// deliberately trades precision for a small, maintainable table.
const VO2_MAX_NORMS: Record<'Male' | 'Female', Record<'young' | 'mid' | 'senior', [number, number, number, number]>> = {
  Male:   { young: [42, 37, 33, 28], mid: [39, 34, 30, 25], senior: [35, 30, 26, 21] },
  Female: { young: [37, 32, 28, 23], mid: [34, 29, 25, 20], senior: [30, 25, 21, 16] },
};
function ageBand(age: number): 'young' | 'mid' | 'senior' {
  if (age < 30) return 'young';
  if (age < 50) return 'mid';
  return 'senior';
}
export function classifyVo2Max(vo2: number | null, age: number | null, gender: Gender | null): FitnessCategory | null {
  if (vo2 == null) return null;
  const g = gender === 'Male' ? 'Male' : 'Female';
  const [excellent, good, average, belowAverage] = VO2_MAX_NORMS[g][ageBand(age || 30)];
  if (vo2 >= excellent) return 'Excellent';
  if (vo2 >= good) return 'Good';
  if (vo2 >= average) return 'Average';
  if (vo2 >= belowAverage) return 'Below Average';
  return 'Poor';
}

// YMCA 3-Minute Step Test has no standard closed-form VO2max — classify
// heart-rate recovery only, on a simplified single scale.
export function classifyStepTestRecovery(recoveryHr: number | null): FitnessCategory | null {
  if (recoveryHr == null) return null;
  if (recoveryHr < 80) return 'Excellent';
  if (recoveryHr < 90) return 'Good';
  if (recoveryHr < 100) return 'Average';
  if (recoveryHr < 110) return 'Below Average';
  return 'Poor';
}

// ── Step 5: Muscular Strength ──
export function calc1RM(weightKg: number | null, reps: number | null, formula: 'brzycki' | 'epley'): number | null {
  if (!weightKg || !reps) return null;
  if (formula === 'brzycki') {
    const clampedReps = Math.min(reps, 12);
    return round(weightKg * 36 / (37 - clampedReps), 1);
  }
  // Epley (1985) — default.
  return round(weightKg * (1 + reps / 30), 1);
}

// Relative-strength standards (1RM ÷ bodyweight), gender- and exercise-split,
// single scale (no age bands) — Phase 1 simplification, same spirit as the
// endurance/VO2max tables above. Approximate published strength-standard
// ratios, rounded for a small maintainable table.
const STRENGTH_NORMS: Record<'Male' | 'Female', Record<string, [number, number, number, number]>> = {
  Male: {
    'Bench Press':    [1.5, 1.15, 0.85, 0.6],
    'Squat':          [2.0, 1.5, 1.15, 0.85],
    'Deadlift':       [2.25, 1.75, 1.35, 1.0],
    'Shoulder Press': [0.9, 0.7, 0.5, 0.35],
    'Leg Press':      [2.5, 2.0, 1.5, 1.0],
  },
  Female: {
    'Bench Press':    [1.0, 0.75, 0.55, 0.4],
    'Squat':          [1.5, 1.15, 0.85, 0.6],
    'Deadlift':       [1.75, 1.35, 1.0, 0.75],
    'Shoulder Press': [0.6, 0.45, 0.35, 0.25],
    'Leg Press':      [2.0, 1.5, 1.15, 0.85],
  },
};
export function classifyStrength(oneRM: number | null, bodyWeightKg: number | null, exercise: string | null, gender: Gender | null): FitnessCategory | null {
  if (oneRM == null || !bodyWeightKg) return null;
  const g = gender === 'Male' ? 'Male' : 'Female';
  const thresholds = STRENGTH_NORMS[g][exercise || ''] || STRENGTH_NORMS[g]['Bench Press'];
  const ratio = oneRM / bodyWeightKg;
  const [excellent, good, average, belowAverage] = thresholds;
  if (ratio >= excellent) return 'Excellent';
  if (ratio >= good) return 'Good';
  if (ratio >= average) return 'Average';
  if (ratio >= belowAverage) return 'Below Average';
  return 'Poor';
}

// ── Step 6: Muscular Endurance ──
// Single-scale, gender-split thresholds (no age bands) — Phase 1 simplification.
const PUSHUP_NORMS: Record<'Male' | 'Female', [number, number, number, number]> = { Male: [36, 29, 22, 17], Female: [30, 21, 15, 10] };
const CURLUP_NORMS: Record<'Male' | 'Female', [number, number, number, number]> = { Male: [40, 30, 20, 10], Female: [35, 25, 15, 8] };
const PLANK_NORMS_SEC: [number, number, number, number] = [120, 60, 30, 15]; // single scale, no standard gender norm

export function classifyEndurance(testType: string | null, value: number | null, gender: Gender | null): FitnessCategory | null {
  if (value == null) return null;
  const g = gender === 'Male' ? 'Male' : 'Female';
  let thresholds: [number, number, number, number];
  if (testType === 'Push Up Test') thresholds = PUSHUP_NORMS[g];
  else if (testType === 'Curl Up Test') thresholds = CURLUP_NORMS[g];
  else thresholds = PLANK_NORMS_SEC; // Wall Sit/Plank/Bodyweight Squat/Custom fallback
  const [excellent, good, average, belowAverage] = thresholds;
  if (value >= excellent) return 'Excellent';
  if (value >= good) return 'Good';
  if (value >= average) return 'Average';
  if (value >= belowAverage) return 'Below Average';
  return 'Poor';
}

// ── Step 7: Flexibility ──
export function checkAsymmetry(left: number | null, right: number | null, thresholdPct = 10): boolean {
  if (left == null || right == null) return false;
  const max = Math.max(Math.abs(left), Math.abs(right));
  if (max === 0) return false;
  return (Math.abs(left - right) / max) * 100 > thresholdPct;
}

export function classifyFlexibilityScore(score: number | null): FitnessCategory | null {
  // score expected 0-10 (trainer-entered measured/composite score)
  if (score == null) return null;
  if (score >= 8) return 'Excellent';
  if (score >= 6) return 'Good';
  if (score >= 4) return 'Average';
  if (score >= 2) return 'Below Average';
  return 'Poor';
}

// ── Category → score mapping (used consistently across Cardio/
//    Endurance/Mobility/Strength for the 0-100 dashboard scores) ──
const CATEGORY_SCORES: Record<FitnessCategory, number> = { Excellent: 95, Good: 80, Average: 60, 'Below Average': 40, Poor: 20 };
export function scoreCategory(category: FitnessCategory | null): number | null {
  return category ? CATEGORY_SCORES[category] : null;
}

// Body Composition Score: 100 within a gender-specific "ideal" body-fat
// range, linear falloff outside it.
const IDEAL_BODY_FAT: Record<'Male' | 'Female', [number, number]> = { Male: [10, 20], Female: [18, 28] };
export function scoreBodyComposition(bodyFatPct: number | null, gender: Gender | null): number | null {
  if (bodyFatPct == null) return null;
  const g = gender === 'Male' ? 'Male' : 'Female';
  const [low, high] = IDEAL_BODY_FAT[g];
  if (bodyFatPct >= low && bodyFatPct <= high) return 100;
  const distance = bodyFatPct < low ? low - bodyFatPct : bodyFatPct - high;
  return Math.max(0, Math.round(100 - distance * 4));
}

// Health Risk Score: average of a BP-category subscore and a BMI-category subscore.
const BP_RISK_SCORE: Record<string, number> = { Normal: 100, Elevated: 80, 'Hypertension Stage 1': 55, 'Hypertension Stage 2': 20, Hypotension: 40 };
function scoreBmiRisk(bmi: number | null): number | null {
  if (bmi == null) return null;
  if (bmi >= 18.5 && bmi < 25) return 100;
  if (bmi < 30) return 60;
  return 30;
}
export function scoreHealthRisk(bpCategory: BpCategory | null, bmi: number | null): number | null {
  const bpScore = bpCategory ? BP_RISK_SCORE[bpCategory] ?? null : null;
  const bmiScore = scoreBmiRisk(bmi);
  const scores = [bpScore, bmiScore].filter((s): s is number => s != null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// Combined Muscular Endurance score: average of the two required tests'
// sub-scores (same averaging pattern as scoreHealthRisk above).
export function scoreEnduranceBattery(score1: number | null, score2: number | null): number | null {
  const scores = [score1, score2].filter((s): s is number => s != null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function computeOverallScore(scores: Record<string, number | null>): number | null {
  const vals = Object.values(scores).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function computeAge(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}
