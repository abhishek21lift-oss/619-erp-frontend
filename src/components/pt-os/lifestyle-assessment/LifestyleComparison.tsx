'use client';

import AssessmentComparison, { comparisonNumber } from '@/components/pt-os/shared/AssessmentComparison';

interface LifestyleComparisonProps {
  initial: Record<string, unknown>;
  latest: Record<string, unknown>;
}

const METRICS: { key: string; label: string; higherIsBetter: boolean }[] = [
  { key: 'sleep_score', label: 'Sleep Score', higherIsBetter: true },
  { key: 'stress_score', label: 'Stress Score', higherIsBetter: true },
  { key: 'hydration_score', label: 'Hydration Score', higherIsBetter: true },
  { key: 'activity_score', label: 'Activity Score', higherIsBetter: true },
  { key: 'nutrition_score', label: 'Nutrition Score', higherIsBetter: true },
  { key: 'recovery_score', label: 'Recovery Score', higherIsBetter: true },
  { key: 'habit_risk_score', label: 'Habit Risk Score', higherIsBetter: false },
  { key: 'lifestyle_score', label: 'Lifestyle Score', higherIsBetter: true },
];

export function LifestyleComparison({ initial, latest }: LifestyleComparisonProps) {
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

export default LifestyleComparison;
