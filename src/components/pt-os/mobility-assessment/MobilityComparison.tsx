'use client';

import AssessmentComparison, { comparisonNumber } from '@/components/pt-os/shared/AssessmentComparison';

interface MobilityComparisonProps {
  initial: Record<string, unknown>;
  latest: Record<string, unknown>;
}

const METRICS: { key: string; label: string }[] = [
  { key: 'mobility_score', label: 'Mobility Score' },
  { key: 'grip_strength_kg', label: 'Grip Strength (kg)' },
  { key: 'vertical_jump_cm', label: 'Vertical Jump (cm)' },
  { key: 'balance_test_seconds', label: 'Balance Test (s)' },
];

export function MobilityComparison({ initial, latest }: MobilityComparisonProps) {
  return (
    <AssessmentComparison
      initial={initial} latest={latest}
      rows={METRICS.map((m) => ({
        ...m,
        higherIsBetter: true,
        a: comparisonNumber(initial[m.key]),
        b: comparisonNumber(latest[m.key]),
      }))}
    />
  );
}

export default MobilityComparison;
