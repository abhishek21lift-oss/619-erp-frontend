'use client';

import AssessmentComparison, { comparisonNumber } from '@/components/pt-os/shared/AssessmentComparison';

interface NutritionComparisonProps {
  initial: Record<string, unknown>;
  latest: Record<string, unknown>;
}

const METRICS: { key: string; label: string; higherIsBetter: boolean }[] = [
  { key: 'diet_quality_score', label: 'Diet Quality Score', higherIsBetter: true },
  { key: 'protein_score', label: 'Protein Score', higherIsBetter: true },
  { key: 'hydration_score', label: 'Hydration Score', higherIsBetter: true },
  { key: 'digestive_health_score', label: 'Digestive Health Score', higherIsBetter: true },
  { key: 'supplement_score', label: 'Supplement Score', higherIsBetter: true },
  { key: 'nutrition_risk_score', label: 'Nutrition Risk Score', higherIsBetter: false },
  { key: 'nutrition_score', label: 'Nutrition Score', higherIsBetter: true },
];

export function NutritionComparison({ initial, latest }: NutritionComparisonProps) {
  return (
    <AssessmentComparison
      initial={initial} latest={latest}
      rows={METRICS.map((m) => ({
        ...m,
        a: comparisonNumber(initial[m.key]),
        b: comparisonNumber(latest[m.key]),
      }))}
    />
  );
}

export default NutritionComparison;
