// Pure, framework-free calculation/classification functions for the
// Posture Assessment module. Backend twin:
// 619-erp-backend/src/modules/progress/posture-scoring.js (same formulas,
// duplicated deliberately since there's no shared package between the two
// apps). These are used client-side for live preview only — the backend
// recomputes and stores the authoritative values.

export type PostureRiskLevel = 'Low' | 'Moderate' | 'High';

function round(n: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// Scoliosis is weighted higher — it's the one deviation on this list that's
// a genuine referral flag rather than just a coaching cue.
const ISSUE_WEIGHT: Record<string, number> = { Scoliosis: 15 };
const DEFAULT_ISSUE_WEIGHT = 8;

export function calcPostureRiskScore(frontIssues: string[] | null, sideIssues: string[] | null, backIssues: string[] | null): number {
  const distinct = new Set([...(frontIssues || []), ...(sideIssues || []), ...(backIssues || [])]);
  let deduction = 0;
  for (const issue of distinct) {
    deduction += ISSUE_WEIGHT[issue] ?? DEFAULT_ISSUE_WEIGHT;
  }
  return clamp(round(100 - deduction), 0, 100);
}

// Same Low/Moderate/High thresholds used identically in Lifestyle/Nutrition
// scoring (score>=70 Low, score>=40 Moderate, else High).
export function classifyRisk(score: number | null): PostureRiskLevel | null {
  if (score == null) return null;
  return score >= 70 ? 'Low' : score >= 40 ? 'Moderate' : 'High';
}
