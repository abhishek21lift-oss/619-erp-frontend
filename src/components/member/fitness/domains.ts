// The seven scored categories the member portal shows, read from the stored
// assessment.
//
// The points were calculated by the trainer's scoring engine; this file maps
// the saved row with the same `scoresFromAssessmentRow` the trainer dashboard
// uses, then divides each step by the framework's denominator and asks the
// shared `tierForScore` for a label. Nothing is re-scored here.

import {
  scoresFromAssessmentRow, tierForScore, STEP_MAX, type FitnessTier,
} from '@/lib/fitness-calculations';
import type { MeFitnessAssessment } from '@/lib/api';

export type DomainKey =
  | 'bp' | 'anthropometric' | 'body' | 'cardio'
  | 'strength' | 'endurance' | 'flexibility';

export interface DomainScore {
  key: DomainKey;
  label: string;
  points: number | null;
  max: number;
  /** Points as a percentage of the category's denominator; null = not measured. */
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

/** The seven framework steps, in assessment order. */
export function domainsFrom(assessment: MeFitnessAssessment): DomainScore[] {
  const s = scoresFromAssessmentRow(assessment as unknown as Record<string, unknown>);
  return [
    domain('bp', 'Blood Pressure', s.bpPoints, STEP_MAX.bp),
    domain('anthropometric', 'Anthropometric Data', s.anthropometricPoints, STEP_MAX.anthropometric),
    domain('body', 'Body Composition', s.bodyCompositionScore, STEP_MAX.bodyComposition),
    domain('cardio', 'Cardiorespiratory Endurance', s.cardioScore, STEP_MAX.cardio),
    domain('strength', 'Muscular Strength', s.strengthScore, STEP_MAX.strength),
    domain('endurance', 'Muscular Endurance', s.enduranceScore, STEP_MAX.endurance),
    domain('flexibility', 'Flexibility', s.mobilityScore, STEP_MAX.flexibility),
  ];
}

/** "week_4" → "Week 4", "follow_up" → "Follow up". */
export function assessmentLabel(type: string | null): string {
  if (!type) return 'Assessment';
  const words = type.replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
