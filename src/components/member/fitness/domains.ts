// The six domains the member portal shows, read from the stored assessment.
//
// The points were calculated by the trainer's scoring engine; this file only
// divides them by the framework's denominators and asks the shared
// `tierForScore` for a label. Nothing is re-scored here.

import { scoreNum, tierForScore, STEP_MAX, type FitnessTier } from '@/lib/fitness-calculations';
import type { MeFitnessAssessment, MeMobilityAssessment } from '@/lib/api';

export type DomainKey = 'body' | 'cardio' | 'strength' | 'endurance' | 'flexibility' | 'mobility';

export interface DomainScore {
  key: DomainKey;
  label: string;
  points: number | null;
  max: number;
  /** Points as a percentage of the domain's denominator; null = not measured. */
  pct: number | null;
  tier: FitnessTier | null;
}

function domain(
  key: DomainKey,
  label: string,
  points: number | null,
  max: number,
): DomainScore {
  const pct = points == null ? null : Math.round((points / max) * 1000) / 10;
  return { key, label, points, max, pct, tier: tierForScore(pct) };
}

/**
 * Mobility comes from its own screening table and is already a 0–100 score.
 * When the member has never had one, the domain is genuinely absent — not a
 * copy of the flexibility step, which measures something else.
 */
export function domainsFrom(
  assessment: MeFitnessAssessment,
  mobility: MeMobilityAssessment | null,
): DomainScore[] {
  return [
    domain('body', 'Body composition', scoreNum(assessment.body_composition_score), STEP_MAX.bodyComposition),
    domain('cardio', 'Cardio', scoreNum(assessment.cardio_score_computed), STEP_MAX.cardio),
    domain('strength', 'Strength', scoreNum(assessment.strength_score_computed), STEP_MAX.strength),
    domain('endurance', 'Endurance', scoreNum(assessment.endurance_score_computed), STEP_MAX.endurance),
    domain('flexibility', 'Flexibility', scoreNum(assessment.mobility_score_computed), STEP_MAX.flexibility),
    domain('mobility', 'Mobility', scoreNum(mobility?.mobility_score), 100),
  ];
}

/** "week_4" → "Week 4", "follow_up" → "Follow up". */
export function assessmentLabel(type: string | null): string {
  if (!type) return 'Assessment';
  const words = type.replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
