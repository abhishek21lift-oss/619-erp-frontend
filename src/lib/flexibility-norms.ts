// Flexibility ROM norm-sheet benchmark engine.
//
// Norms are intentionally EMPTY. Values must come from a validated,
// peer-reviewed reference (e.g. ACSM / YMCA / published ROM norm tables)
// with documented population, units and age/sex bands. We never fabricate
// benchmark values: when no validated norm matches, the engine returns
// `null` and the UI renders "Norm data unavailable".
//
// To add a norm: append an entry to FLEXIBILITY_NORMS with source, units,
// population, age band, sex and the Excellent/Good/Average/Below Average
// thresholds. Keep the shape stable so tests and reports keep working.

export type FlexibilityCategory = 'Excellent' | 'Good' | 'Average' | 'Below Average';

export interface FlexibilityNorm {
  test: string;            // e.g. 'Sit and Reach'
  sex: 'Male' | 'Female';
  ageMin: number;
  ageMax: number;
  units: string;           // e.g. 'cm'
  population: string;      // e.g. 'Healthy adults 18-65'
  source: string;          // citation
  // thresholds: value must be >= threshold to qualify for that category
  excellent: number;
  good: number;
  average: number;
  belowAverage: number;
}

export const FLEXIBILITY_NORMS: FlexibilityNorm[] = [];

export interface NormResult {
  category: FlexibilityCategory | null;
  norm: FlexibilityNorm | null;
  message: string;
}

export function classifyFlexibilityROM(
  test: string,
  value: number | null,
  age: number | null,
  sex: string | null,
): NormResult {
  if (value == null || !Number.isFinite(value) || age == null || !sex) {
    return { category: null, norm: null, message: 'Norm data unavailable' };
  }
  const norm = FLEXIBILITY_NORMS.find(
    (n) => n.test === test && n.sex === (sex === 'Female' ? 'Female' : 'Male') && age >= n.ageMin && age <= n.ageMax,
  );
  if (!norm) {
    return { category: null, norm: null, message: 'Norm data unavailable' };
  }
  let category: FlexibilityCategory;
  if (value >= norm.excellent) category = 'Excellent';
  else if (value >= norm.good) category = 'Good';
  else if (value >= norm.average) category = 'Average';
  else category = 'Below Average';
  return { category, norm, message: category };
}

export default classifyFlexibilityROM;