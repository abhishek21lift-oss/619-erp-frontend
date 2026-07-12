// Pure, framework-free calculation/classification functions for the
// Mobility & Performance Assessment module. Backend twin:
// 619-erp-backend/src/modules/progress/mobility-scoring.js (same formulas,
// duplicated deliberately since there's no shared package between the two
// apps). These are used client-side for live preview only — the backend
// recomputes and stores the authoritative values.

export type MobilityCategory = 'Excellent' | 'Good' | 'Average' | 'Below Average' | 'Poor';

export interface BodyRegionScore {
  region: string;
  score: number | null;
  pain?: boolean | null;
  restriction?: boolean | null;
}

export interface MobilityTestScore {
  test: string;
  score: number | null;
  notes?: string | null;
  pain?: boolean | null;
  restriction?: boolean | null;
}

function round(n: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function calcMobilityScore(bodyRegions: BodyRegionScore[] | null, mobilityTests: MobilityTestScore[] | null): number | null {
  const all = [...(bodyRegions || []), ...(mobilityTests || [])];
  const scores = all.map((i) => i.score).filter((s): s is number => s != null);
  if (!scores.length) return null;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  let score = (mean / 5) * 100;

  const painCount = all.filter((i) => i.pain === true).length;
  const restrictionCount = all.filter((i) => i.restriction === true).length;
  score -= painCount * 5;
  score -= restrictionCount * 3;

  return clamp(round(score), 0, 100);
}

// Same 5-tier label set used app-wide (fitness-calculations.ts's
// FitnessCategory), thresholds set at the midpoints between its
// CATEGORY_SCORES anchors (Excellent 95, Good 80, Average 60, Below
// Average 40, Poor 20) for a consistent reverse mapping.
export function classifyMobility(score: number | null): MobilityCategory | null {
  if (score == null) return null;
  if (score >= 88) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Average';
  if (score >= 30) return 'Below Average';
  return 'Poor';
}
