// Pure, framework-free calculation/classification functions for the
// Lifestyle Assessment module. Backend twin: 619-erp-backend/src/modules/progress/lifestyle-scoring.js
// (same formulas, duplicated deliberately since there's no shared package
// between the two apps). These are used client-side for live preview only —
// the backend recomputes and stores the authoritative values.

export type SleepCategory = 'Excellent' | 'Good' | 'Fair' | 'Poor';
export type HydrationCategory = 'Low' | 'Moderate' | 'Optimal' | 'Excellent';
export type ActivityLevel = 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Active' | 'Very Active';
export type RiskLevel = 'Low' | 'Moderate' | 'High';
export type LifestyleReadiness = 'Excellent' | 'Good' | 'Average' | 'Needs Improvement' | 'High Risk';
export type OccupationType = 'desk_job' | 'active_job' | 'physical_labor' | 'student' | 'homemaker' | 'driver' | 'healthcare' | 'police' | 'fitness_professional' | 'retired' | 'other';
export type DailyStepsBracket = '<3000' | '3000_5000' | '5000_8000' | '8000_10000' | '10000_plus';
export type BreakfastHabit = 'daily' | 'sometimes' | 'never';
export type SmokingStatus = 'never' | 'occasionally' | 'daily' | 'former';
export type AlcoholStatus = 'never' | 'occasionally' | 'weekly' | 'frequently';
export type RecoveryQuality = 'poor' | 'average' | 'good' | 'excellent';

function round(n: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
function mean(vals: (number | null)[]): number | null {
  const filtered = vals.filter((v): v is number => v != null);
  if (!filtered.length) return null;
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

// ── Step 1: Sleep ── duration scored against a 7-9h ideal range, averaged with quality.
export function classifySleep(durationHours: number | null, quality: number | null): { category: SleepCategory | null; score: number | null } {
  const durationScore = durationHours == null ? null
    : durationHours >= 7 && durationHours <= 9 ? 100
    : clamp(100 - (durationHours < 7 ? 7 - durationHours : durationHours - 9) * 20, 0, 100);
  const qualityScore = quality == null ? null : quality * 10;
  const score = mean([durationScore, qualityScore]);
  if (score == null) return { category: null, score: null };
  const category: SleepCategory = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
  return { category, score: round(score) };
}

// ── Step 2: Stress ──
export function calcStressScore(stressLevel: number | null): number | null {
  if (stressLevel == null) return null;
  return clamp((11 - stressLevel) * 10, 0, 100);
}

// ── Step 3: Water ──
export function classifyHydration(liters: number | null): { category: HydrationCategory | null; score: number | null } {
  if (liters == null) return { category: null, score: null };
  if (liters < 1.5) return { category: 'Low', score: 25 };
  if (liters < 2.5) return { category: 'Moderate', score: 55 };
  if (liters < 3.5) return { category: 'Optimal', score: 85 };
  return { category: 'Excellent', score: 100 };
}

// ── Step 4: Occupation & Activity ──
const ACTIVITY_BASE: Record<DailyStepsBracket, number> = { '<3000': 20, '3000_5000': 40, '5000_8000': 60, '8000_10000': 80, '10000_plus': 100 };
const ACTIVITY_LEVEL: Record<DailyStepsBracket, ActivityLevel> = { '<3000': 'Sedentary', '3000_5000': 'Lightly Active', '5000_8000': 'Moderately Active', '8000_10000': 'Active', '10000_plus': 'Very Active' };
const ACTIVE_OCCUPATIONS: OccupationType[] = ['physical_labor', 'active_job', 'fitness_professional', 'police'];
const SEDENTARY_OCCUPATIONS: OccupationType[] = ['desk_job', 'driver', 'student', 'retired'];
export function classifyActivity(stepsBracket: DailyStepsBracket | null, occupationType: OccupationType | null): { level: ActivityLevel | null; score: number | null } {
  if (!stepsBracket) return { level: null, score: null };
  let score = ACTIVITY_BASE[stepsBracket];
  if (occupationType && ACTIVE_OCCUPATIONS.includes(occupationType)) score += 10;
  else if (occupationType && SEDENTARY_OCCUPATIONS.includes(occupationType)) score -= 10;
  return { level: ACTIVITY_LEVEL[stepsBracket], score: clamp(score, 0, 100) };
}

// ── Step 7: Meal Frequency / Nutrition ──
export function calcNutritionScore(mealFrequency: number | null, breakfastHabit: BreakfastHabit | null, lateNightEating: boolean | null): number | null {
  if (mealFrequency == null && breakfastHabit == null && lateNightEating == null) return null;
  let score = 100;
  if (mealFrequency != null) {
    if (mealFrequency === 2 || mealFrequency === 5) score -= 10;
    else if (mealFrequency >= 6) score -= 20;
  }
  if (breakfastHabit === 'sometimes') score -= 15;
  else if (breakfastHabit === 'never') score -= 30;
  if (lateNightEating === true) score -= 15;
  return clamp(round(score), 0, 100);
}

// ── Step 9: Recovery ──
const RECOVERY_QUALITY_SCORE: Record<RecoveryQuality, number> = { poor: 20, average: 50, good: 75, excellent: 100 };
export function calcRecoveryScore(sleepScore: number | null, stressScore: number | null, energyLevel: number | null, recoveryQuality: RecoveryQuality | null): number | null {
  const energyScore = energyLevel == null ? null : energyLevel * 10;
  const qualityScore = recoveryQuality ? RECOVERY_QUALITY_SCORE[recoveryQuality] ?? null : null;
  const score = mean([sleepScore, stressScore, energyScore, qualityScore]);
  return score == null ? null : round(score);
}

// ── Risk classification (shared by sedentary + recovery risk) ──
export function classifyRisk(score: number | null): RiskLevel | null {
  if (score == null) return null;
  return score >= 70 ? 'Low' : score >= 40 ? 'Moderate' : 'High';
}

export interface HabitRiskInputs {
  smokingStatus: SmokingStatus | null;
  alcoholStatus: AlcoholStatus | null;
  sleepScore: number | null;
  stressScore: number | null;
  hydrationScore: number | null;
  activityScore: number | null;
  nutritionScore: number | null;
}

export function calcHabitRiskScore({ smokingStatus, alcoholStatus, sleepScore, stressScore, hydrationScore, activityScore, nutritionScore }: HabitRiskInputs): number {
  let risk = 0;
  if (smokingStatus === 'daily') risk += 30;
  else if (smokingStatus === 'occasionally') risk += 15;
  else if (smokingStatus === 'former') risk += 5;

  if (alcoholStatus === 'frequently') risk += 20;
  else if (alcoholStatus === 'weekly') risk += 10;
  else if (alcoholStatus === 'occasionally') risk += 5;

  if (sleepScore != null && sleepScore < 40) risk += 15;
  if (stressScore != null && stressScore < 40) risk += 15;
  if (hydrationScore != null && hydrationScore < 55) risk += 10;
  if (activityScore != null && activityScore < 40) risk += 15;
  if (nutritionScore != null && nutritionScore < 50) risk += 10;

  return clamp(risk, 0, 100);
}

export function buildLifestyleRiskFactors({ smokingStatus, alcoholStatus, sleepScore, stressScore, hydrationScore, activityScore, nutritionScore }: HabitRiskInputs): string[] {
  const factors: string[] = [];
  if (sleepScore != null && sleepScore < 40) factors.push('Poor Sleep');
  if (stressScore != null && stressScore < 40) factors.push('High Stress');
  if (hydrationScore != null && hydrationScore < 55) factors.push('Low Water Intake');
  if (activityScore != null && activityScore < 40) factors.push('Low Activity');
  if (smokingStatus === 'daily' || smokingStatus === 'occasionally') factors.push('Smoking');
  if (alcoholStatus && alcoholStatus !== 'never') factors.push('Alcohol');
  if (nutritionScore != null && nutritionScore < 50) factors.push('Poor Meal Frequency');
  return factors;
}

// ── Overall composite ──
export interface LifestyleSixScores {
  sleep: number | null;
  stress: number | null;
  hydration: number | null;
  activity: number | null;
  nutrition: number | null;
  recovery: number | null;
}

export function calcLifestyleScore(sixScores: LifestyleSixScores, habitRiskScore: number | null): number | null {
  const base = mean(Object.values(sixScores));
  if (base == null) return null;
  const penalty = (habitRiskScore || 0) * 0.2;
  return clamp(round(base - penalty), 0, 100);
}

export function classifyLifestyleReadiness(lifestyleScore: number | null): LifestyleReadiness | null {
  if (lifestyleScore == null) return null;
  if (lifestyleScore >= 85) return 'Excellent';
  if (lifestyleScore >= 70) return 'Good';
  if (lifestyleScore >= 50) return 'Average';
  if (lifestyleScore >= 30) return 'Needs Improvement';
  return 'High Risk';
}
