// Pure, framework-free calculation/classification functions for the
// Fitness Testing module. Backend twin: 619-erp-backend/src/modules/progress/fitness-scoring.js
//
// Formula-bundle version. Bump whenever any formula in this module changes.
// Persisting it per assessment requires the approval-gated migration described
// in F10 (new nullable `scoring_formula_version` column on pt_assessments);
// until then this is documentation only and legacy rows are treated as unknown.
export const FITNESS_SCORING_VERSION = '2';
// (same formulas, duplicated deliberately since there's no shared package
// between the two apps). These are used client-side for live preview only —
// the backend recomputes and stores the authoritative values.

import type { FitnessScores } from '@/components/pt-os/fitness-testing/FitnessDashboard';

export type FitnessCategory = 'Excellent' | 'Good' | 'Average' | 'Below Average' | 'Poor';
export type BpCategory = 'Normal' | 'Elevated' | 'Hypertension Stage 1' | 'Hypertension Stage 2' | 'Hypertensive Crisis' | 'Hypotension';
export type RhrCategory = 'Low' | 'Normal' | 'High Normal' | 'High';
export type Spo2Category = 'Normal' | 'Mildly Low' | 'Critical';
export type VitalsSafetyLevel = 'safe' | 'caution' | 'stop';
export type Gender = 'Male' | 'Female' | 'Other';

/** A pg numeric arrives as a string; an absent metric as null. Both collapse
 *  to a number or null — never a plausible-looking zero. */
export function scoreNum(v: unknown): number | null {
  const f = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(f) ? f : null;
}

/** A stored assessment row, read back as the seven scores the UI renders. */
export function scoresFromAssessmentRow(row: Record<string, unknown>): FitnessScores {
  return {
    cardioScore: scoreNum(row.cardio_score_computed),
    strengthScore: scoreNum(row.strength_score_computed),
    enduranceScore: scoreNum(row.endurance_score_computed),
    mobilityScore: scoreNum(row.mobility_score_computed),
    bodyCompositionScore: scoreNum(row.body_composition_score),
    healthRiskScore: scoreNum(row.health_risk_score),
    overallScore: scoreNum(row.overall_fitness_score),
  };
}

function round(n: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// ── Step 1: Vitals ── AHA blood-pressure bands plus resting heart rate and
// SpO₂. Classification is clinical description only; the exercise-safety
// decision lives in assessVitalsSafety below. A single reading is never a
// diagnosis.
export function classifyBp(systolic: number | null, diastolic: number | null): BpCategory | null {
  if (systolic == null && diastolic == null) return null;
  // Highest-risk band wins when the two numbers disagree: 185/70 is crisis,
  // 160/58 is stage 2, 135/55 is hypotension. The label is what the trainer
  // acts on and refers with.
  if ((systolic != null && systolic >= 180) || (diastolic != null && diastolic >= 120)) return 'Hypertensive Crisis';
  if ((systolic != null && systolic >= 140) || (diastolic != null && diastolic >= 90)) return 'Hypertension Stage 2';
  if ((systolic != null && systolic < 90) || (diastolic != null && diastolic < 60)) return 'Hypotension';
  if ((systolic != null && systolic >= 130) || (diastolic != null && diastolic >= 80)) return 'Hypertension Stage 1';
  // One number is still a reading, but it cannot establish "normal": only the
  // high bands are safe to name from a single systolic value.
  if (systolic != null && systolic >= 120 && (diastolic == null || diastolic < 80)) return 'Elevated';
  if (systolic == null || diastolic == null) return null;
  return 'Normal';
}

// Preferred adult resting range is 60–80 bpm (average ~72); 60–100 is the
// broader adult reference. A low reading is described, not diagnosed —
// trained athletes commonly sit at 40–50 and are handled by context below.
export function classifyRhr(rhr: number | null): RhrCategory | null {
  if (rhr == null || !Number.isFinite(rhr)) return null;
  if (rhr < 60) return 'Low';
  if (rhr <= 80) return 'Normal';
  if (rhr <= 100) return 'High Normal';
  return 'High';
}

export function classifySpo2(spo2: number | null): Spo2Category | null {
  if (spo2 == null || !Number.isFinite(spo2)) return null;
  if (spo2 < 90) return 'Critical';
  if (spo2 < 95) return 'Mildly Low';
  return 'Normal';
}

export interface VitalsSafety {
  level: VitalsSafetyLevel;
  reasons: string[];
  requiresMedicalClearance: boolean;
  repeatBp: boolean;
  athleteLowRhr: boolean;
}

export interface VitalsSafetyInput {
  systolic: number | null;
  diastolic: number | null;
  restingHeartRate: number | null;
  restingSpo2: number | null;
  /** Recorded training level is "athlete". Context only — it never hides a
   *  genuinely dangerous reading. */
  athlete?: boolean;
}

/** The exercise-safety decision, separate from the clinical labels above.
 *  `stop` means no cardio, strength or endurance test today. `caution` means
 *  the test may proceed after rest/recheck. */
export function assessVitalsSafety(v: VitalsSafetyInput): VitalsSafety {
  const reasons: string[] = [];
  let level: VitalsSafetyLevel = 'safe';
  // Read through a function so TypeScript keeps the declared union type: the
  // assignments happen inside the closures below, which flow analysis cannot see.
  const currentLevel = (): VitalsSafetyLevel => level;
  const stop = (reason: string) => { level = 'stop'; reasons.push(reason); };
  const caution = (reason: string) => {
    if (level !== 'stop') level = 'caution';
    reasons.push(reason);
  };

  const bp = classifyBp(v.systolic, v.diastolic);
  const bpKnown = v.systolic != null || v.diastolic != null;
  if (bp === 'Hypertensive Crisis') {
    stop('Blood pressure is in the hypertensive crisis range (≥180/120 mmHg). Stop testing and arrange urgent medical assessment.');
  } else if (bp === 'Hypertension Stage 2') {
    stop('Blood pressure is at hypertension stage 2 (≥140/90 mmHg). Exertion testing requires medical clearance.');
  } else if (bp === 'Hypotension') {
    stop('Blood pressure is low (<90/60 mmHg). Exertion testing requires medical clearance.');
  } else if (bp === 'Hypertension Stage 1') {
    caution('Blood pressure is at hypertension stage 1 (130–139/80–89 mmHg). Rest 5–10 minutes and recheck before exertion testing.');
  } else if (bp === 'Elevated') {
    caution('Blood pressure is elevated (120–129/<80 mmHg). Rest 5–10 minutes and recheck.');
  }

  const rhr = classifyRhr(v.restingHeartRate);
  if (rhr === 'High') {
    stop('Resting heart rate is above 100 bpm. Do not start exertion testing; reassess and refer if it persists.');
  } else if (rhr === 'Low') {
    if (v.restingHeartRate != null && v.restingHeartRate < 40) {
      stop('Resting heart rate is below 40 bpm. Do not start exertion testing without medical review.');
    } else if (!v.athlete) {
      caution('Resting heart rate is below 60 bpm. Confirm the client is well; for a trained athlete this can be normal.');
    }
  } else if (rhr === 'High Normal') {
    caution('Resting heart rate is 81–100 bpm. Recheck after 5 minutes of rest.');
  }

  const spo2 = classifySpo2(v.restingSpo2);
  if (spo2 === 'Critical') {
    stop('Resting SpO₂ is below 90%. Do not start exertion testing; seek medical assessment.');
  } else if (spo2 === 'Mildly Low') {
    caution('Resting SpO₂ is 90–94%. Recheck after rest and monitor for breathlessness.');
  }

  return {
    level: currentLevel(),
    reasons,
    requiresMedicalClearance: currentLevel() === 'stop',
    repeatBp: bpKnown && bp !== 'Normal',
    athleteLowRhr: Boolean(v.athlete) && rhr === 'Low' && (v.restingHeartRate ?? 0) >= 40,
  };
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

// MPTS adult Asian BMI bands.
export type BmiCategory = 'Underweight' | 'Normal' | 'Overweight' | 'Obese';

// The published waist and WHR norms define only the low-risk side. A reading
// at or above the cut-off is described as such — never promoted to an invented
// "moderate" or "high" risk band.
export type AnthropometricRisk = 'Low risk' | 'Above low-risk threshold';

export function classifyBmi(bmi: number | null): BmiCategory | null {
  if (bmi == null || !Number.isFinite(bmi) || bmi <= 0) return null;
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 23) return 'Normal';
  if (bmi < 25) return 'Overweight';
  return 'Obese';
}

// Waist circumference is the narrowest-waist measurement (`waist_cm`), the
// same field the WHR formula uses. The iliac-crest measurement is a separate
// landmark and is never substituted when `waist_cm` is missing.
const WAIST_LOW_RISK_CM: Record<'Male' | 'Female', number> = { Male: 90, Female: 80 };
const WHR_LOW_RISK: Record<'Male' | 'Female', number> = { Male: 0.95, Female: 0.86 };

export function classifyWaistRisk(waistCm: number | null, gender: Gender | null): AnthropometricRisk | null {
  if (waistCm == null || !Number.isFinite(waistCm) || waistCm <= 0) return null;
  const g = sexOf(gender);
  if (!g) return null;
  return waistCm < WAIST_LOW_RISK_CM[g] ? 'Low risk' : 'Above low-risk threshold';
}

export function classifyWhrRisk(whr: number | null, gender: Gender | null): AnthropometricRisk | null {
  if (whr == null || !Number.isFinite(whr) || whr <= 0) return null;
  const g = sexOf(gender);
  if (!g) return null;
  return whr < WHR_LOW_RISK[g] ? 'Low risk' : 'Above low-risk threshold';
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


// 'Male' / 'Female' in any case, or null. Norm tables are split by sex, and
// anything else — null, 'Other', a lowercase 'male' from an older caller —
// used to fall through to the FEMALE table and produce a confident category
// from the wrong norms. No sex, no sex-split category. Mirrors sexOf() in
// the backend's fitness-scoring.js.
function sexOf(gender: string | null | undefined): 'Male' | 'Female' | null {
  const v = typeof gender === 'string' ? gender.trim().toLowerCase() : '';
  return v === 'male' ? 'Male' : v === 'female' ? 'Female' : null;
}

export function classifyHarvardPei(pei: number | null): FitnessCategory | null {
  if (pei == null) return null;
  // Published long-form fitness-index bands: <55 poor, 55–64 low average,
  // 65–79 average, 80–89 good, 90+ excellent. The old cut-offs sat one band
  // high — an 85 read "Average" instead of "Good".
  if (pei < 55) return 'Poor';
  if (pei < 65) return 'Below Average';
  if (pei < 80) return 'Average';
  if (pei < 90) return 'Good';
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
  if (vo2 == null || !Number.isFinite(vo2) || vo2 <= 0) return null;
  const g = sexOf(gender);
  if (!g) return null;
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
  // Implausible recovery heart rate (not a real measurement) must not produce
  // a category — guard the physiological range.
  if (recoveryHr == null || !Number.isFinite(recoveryHr) || recoveryHr < 40 || recoveryHr > 220) return null;
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
  // Epley (1985) — default. A single IS the 1RM: the formula would add 3.3%
  // to it (w × 31/30) and credit a lift nobody made.
  if (reps === 1) return round(weightKg, 1);
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
  const g = sexOf(gender);
  if (!g) return null;
  // No published norms for this lift, no category — bench-press norms applied
  // to a leg press or a lunge were an invented judgement.
  const thresholds = STRENGTH_NORMS[g][exercise || ''];
  if (!thresholds) return null;
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
  // A zero or negative result is not a performed test — never classify it as
  // "Poor" (20), which would masquerade as a real (bad) score.
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  const g = sexOf(gender);
  let thresholds: [number, number, number, number];
  // Plank norms are a single scale; the others are split by sex.
  if (testType === 'Plank') thresholds = PLANK_NORMS_SEC;
  else if (!g) return null;
  else if (testType === 'Push Up Test') thresholds = PUSHUP_NORMS[g];
  else if (testType === 'Curl Up Test') thresholds = CURLUP_NORMS[g];
  // Wall Sit, Bodyweight Squat and Custom have no norms here; plank norms
  // applied to them were an invented category.
  else return null;
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
  // score expected 0-10 (trainer-entered measured/composite score). Out-of-range
  // or non-finite input is not a score — never classify it, so a 25 cannot
  // masquerade as "Excellent" (95). 0 is legitimate ("very limited").
  if (score == null || !Number.isFinite(score) || score < 0 || score > 10) return null;
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

// Body Composition Score: 100 within a gender-specific "ideal" body-fat range,
// linear falloff outside it. Returns null when gender is missing or 'Other' —
// there is no sex-neutral reference range, so no score is invented (F14).
const IDEAL_BODY_FAT: Record<'Male' | 'Female', [number, number]> = { Male: [10, 20], Female: [18, 28] };
export function scoreBodyComposition(bodyFatPct: number | null, gender: Gender | null): number | null {
  if (bodyFatPct == null) return null;
  const g = sexOf(gender);
  if (!g) return null;
  const [low, high] = IDEAL_BODY_FAT[g];
  if (bodyFatPct >= low && bodyFatPct <= high) return 100;
  const distance = bodyFatPct < low ? low - bodyFatPct : bodyFatPct - high;
  return Math.max(0, Math.round(100 - distance * 4));
}

// Health Score (stored column `health_risk_score`): average of a BP-category
// subscore and a BMI-category subscore. Higher is better — 100 is normal BP
// within the healthy BMI band — same direction as the other five categories.
// BP_RISK_SCORE bands follow AHA BP categories.
//
// The BMI bands below are deliberately NOT the MPTS/Asian anthropometric
// categories in classifyBmi(): they are the pre-existing project risk proxy,
// left unchanged so stored Health Scores stay comparable. A BMI of 23–24.9 is
// therefore "Overweight" in the anthropometric block while this score still
// treats 18.5–<25 as healthy. This divergence is documented and pinned by a
// regression test; do not silently reconcile it here.
//
// Healthy band 100, overweight/underweight 60, obese 30 — no separate
// underweight penalty. Discontinuity: BMI 24.9 → 100, BMI 25.0 → 60.
const BP_RISK_SCORE: Record<string, number> = { Normal: 100, Elevated: 80, 'Hypertension Stage 1': 55, 'Hypertension Stage 2': 20, 'Hypertensive Crisis': 5, Hypotension: 40 };
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

// Combined score for a two-test battery: average of both tests' sub-scores
// (same averaging pattern as scoreHealthRisk above). Originally written for
// Muscular Endurance, then reused as-is for Muscular Strength and
// Flexibility once they adopted the same "2 distinct tests required"
// pattern — the maths has never been endurance-specific, just an average of
// up to two numbers, so `scoreTestBattery` is the name every module
// should reach for. `scoreEnduranceBattery` stays as an alias so existing
// call sites don't need to change.
export function scoreTestBattery(score1: number | null, score2: number | null): number | null {
  const scores = [score1, score2].filter((s): s is number => s != null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
export const scoreEnduranceBattery = scoreTestBattery;

export function computeOverallScore(scores: Record<string, number | null>): number | null {
  const vals = Object.values(scores).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// ── Score coverage ── derived, never stored ──
// How many of the six dashboard categories actually have a result, so a
// partial battery (a skipped step, an unscored Custom test, a BP-unsafe skip
// of the exertion tests) is never presented as a complete six-category
// assessment. Counts a valid numeric score as available — including a
// legitimate 0 — and treats null/undefined as missing. Nulls are never
// converted to zero here or anywhere downstream.
export const SCORED_CATEGORY_KEYS = [
  'cardioScore',
  'strengthScore',
  'enduranceScore',
  'mobilityScore',
  'bodyCompositionScore',
  'healthRiskScore',
] as const;

export type ScoredCategoryKey = (typeof SCORED_CATEGORY_KEYS)[number];

export interface ScoreCoverage {
  available: number;
  total: number;
  isComplete: boolean;
}

export function scoreCoverage(scores: Partial<Record<ScoredCategoryKey, number | null | undefined>>): ScoreCoverage {
  const available = SCORED_CATEGORY_KEYS.filter((k) => scores[k] != null).length;
  return { available, total: SCORED_CATEGORY_KEYS.length, isComplete: available === SCORED_CATEGORY_KEYS.length };
}

export function formatCoverage(coverage: ScoreCoverage): string {
  return `${coverage.available} of ${coverage.total} categories scored`;
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
