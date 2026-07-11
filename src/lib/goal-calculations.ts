// Pure, framework-free calculation/classification functions for the Goal
// Assessment module. Backend twin: 619-erp-backend/src/modules/progress/goal-scoring.js
// (same formulas, duplicated deliberately since there's no shared package
// between the two apps). These are used client-side for live preview only —
// the backend recomputes and stores the authoritative values.

export type GoalDifficulty = 'Easy' | 'Moderate' | 'Hard' | 'Very Hard';
export type GoalDirection = 'loss' | 'gain' | 'maintain';

export interface LifestyleReadinessAnswers {
  can_train_4_6_days?: boolean | null;
  meal_prep_possible?: boolean | null;
  sleep_7_8_hours?: boolean | null;
  drink_enough_water?: boolean | null;
  family_support?: boolean | null;
  medical_restrictions?: boolean | null;
}

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// ── Lifestyle Readiness ── medical_restrictions is inverted: "No restrictions" is favorable.
export function calcLifestyleReadinessScore(answers: LifestyleReadinessAnswers | null): number | null {
  if (!answers) return null;
  const keys: (keyof LifestyleReadinessAnswers)[] = [
    'can_train_4_6_days', 'meal_prep_possible', 'sleep_7_8_hours', 'drink_enough_water', 'family_support', 'medical_restrictions',
  ];
  let favorable = 0;
  let answered = 0;
  for (const key of keys) {
    const v = answers[key];
    if (typeof v !== 'boolean') continue;
    answered++;
    const isFavorable = key === 'medical_restrictions' ? v === false : v === true;
    if (isFavorable) favorable++;
  }
  if (answered === 0) return null;
  return Math.round((favorable / keys.length) * 100);
}

export function goalDirection(startingWeight: number | null, targetWeight: number | null): GoalDirection | null {
  if (startingWeight == null || targetWeight == null) return null;
  if (targetWeight < startingWeight) return 'loss';
  if (targetWeight > startingWeight) return 'gain';
  return 'maintain';
}

export function calcRequiredWeeklyRate(startingWeight: number | null, targetWeight: number | null, daysRemaining: number | null): number | null {
  if (startingWeight == null || targetWeight == null || daysRemaining == null || daysRemaining <= 0) return null;
  const weeksRemaining = daysRemaining / 7;
  if (weeksRemaining <= 0) return null;
  return round((targetWeight - startingWeight) / weeksRemaining);
}

// Conservative, general Phase-1 benchmarks — not clinical guidance.
export function calcSafeWeeklyRate(startingWeight: number | null, direction: GoalDirection | null): number | null {
  if (direction === 'loss') {
    if (startingWeight == null) return null;
    return round(startingWeight * 0.0075);
  }
  if (direction === 'gain') {
    return round(0.35 / 4.33);
  }
  return null;
}

const DIFFICULTY_LEVELS: GoalDifficulty[] = ['Easy', 'Moderate', 'Hard', 'Very Hard'];
export function classifyGoalDifficulty(
  requiredRate: number | null, safeRate: number | null,
  lifestyleReadinessScore: number | null, motivationLevel: number | null, commitmentLevel: number | null,
): GoalDifficulty | null {
  if (requiredRate == null || safeRate == null || safeRate === 0) return null;
  const ratio = Math.abs(requiredRate) / safeRate;
  let level = ratio <= 0.6 ? 0 : ratio <= 1.0 ? 1 : ratio <= 1.5 ? 2 : 3;

  const lowSignal = (lifestyleReadinessScore != null && lifestyleReadinessScore < 40)
    || (motivationLevel != null && motivationLevel <= 3)
    || (commitmentLevel != null && commitmentLevel <= 3);
  const highSignal = (lifestyleReadinessScore != null && lifestyleReadinessScore >= 80)
    && (motivationLevel != null && motivationLevel >= 8)
    && (commitmentLevel != null && commitmentLevel >= 8);

  if (lowSignal) level += 1;
  else if (highSignal) level -= 1;

  level = Math.max(0, Math.min(DIFFICULTY_LEVELS.length - 1, level));
  return DIFFICULTY_LEVELS[level];
}

export function calcEstimatedDurationWeeks(startingWeight: number | null, targetWeight: number | null, safeWeeklyRate: number | null): number | null {
  if (startingWeight == null || targetWeight == null || !safeWeeklyRate) return null;
  const weeks = Math.abs(targetWeight - startingWeight) / safeWeeklyRate;
  return Math.max(1, Math.ceil(weeks));
}

export function recommendPtDurationMonths(estimatedWeeks: number | null): number | null {
  if (estimatedWeeks == null) return null;
  if (estimatedWeeks <= 4) return 1;
  if (estimatedWeeks <= 13) return 3;
  if (estimatedWeeks <= 26) return 6;
  return 12;
}

export interface RiskFactorInputs {
  requiredRate: number | null;
  safeRate: number | null;
  lifestyleReadinessScore: number | null;
  medicalRestrictions: boolean | null;
  daysRemaining: number | null;
  motivationLevel: number | null;
  commitmentLevel: number | null;
}

export function buildRiskFactors({ requiredRate, safeRate, lifestyleReadinessScore, medicalRestrictions, daysRemaining, motivationLevel, commitmentLevel }: RiskFactorInputs): string[] {
  const risks: string[] = [];
  const ratio = requiredRate != null && safeRate ? Math.abs(requiredRate) / safeRate : null;

  if (ratio != null && ratio > 1.5) {
    risks.push('Required weekly rate of change exceeds safe guidelines for this timeline.');
  }
  if (lifestyleReadinessScore != null && lifestyleReadinessScore < 40) {
    risks.push('Low lifestyle readiness — schedule, sleep, or support may limit consistency.');
  }
  if (medicalRestrictions === true) {
    risks.push('Medical restrictions flagged — recommend physician clearance before starting.');
  }
  if (daysRemaining != null && daysRemaining < 14 && ratio != null && ratio > 1) {
    risks.push('Very short timeline for the required change.');
  }
  if (motivationLevel != null && motivationLevel <= 3) {
    risks.push('Low motivation score — consider addressing mindset before an aggressive plan.');
  }
  if (commitmentLevel != null && commitmentLevel <= 3) {
    risks.push('Low commitment score — a lighter, more sustainable plan may fit better.');
  }
  return risks;
}

// ── Progress tracking (frontend-only; not mirrored server-side) ──
export function calcCompletionPct(starting: number | null, target: number | null, latest: number | null): number | null {
  if (starting == null || target == null || latest == null) return null;
  const totalGap = Math.abs(starting - target);
  if (totalGap === 0) return 100;
  const remainingGap = Math.abs(latest - target);
  const pct = ((totalGap - remainingGap) / totalGap) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export type AchievementStatus = 'not_started' | 'on_track' | 'behind' | 'achieved' | 'expired';
/**
 * `totalDays` is the goal's full window (created_at → target_date), used to
 * compute how far through the timeline the client should be. Rough
 * heuristic with a 15-point buffer — not stored, presentational only.
 */
export function calcAchievementStatus(completionPct: number | null, daysLeft: number | null, totalDays: number | null): AchievementStatus {
  if (completionPct != null && completionPct >= 100) return 'achieved';
  if (daysLeft != null && daysLeft < 0) return 'expired';
  if (completionPct == null || completionPct === 0) return 'not_started';
  if (!totalDays || daysLeft == null) return completionPct >= 40 ? 'on_track' : 'behind';
  const elapsedPct = Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100));
  return completionPct >= elapsedPct - 15 ? 'on_track' : 'behind';
}

export function daysRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const d = new Date(targetDate);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
