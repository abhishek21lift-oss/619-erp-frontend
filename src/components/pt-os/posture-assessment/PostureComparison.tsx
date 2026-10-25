'use client';

import AssessmentComparison, { comparisonNumber } from '@/components/pt-os/shared/AssessmentComparison';

interface PostureComparisonProps {
  initial: Record<string, unknown>;
  latest: Record<string, unknown>;
}

function issueCount(row: Record<string, unknown>): number {
  const front = Array.isArray(row.front_issues) ? row.front_issues as string[] : [];
  const side = Array.isArray(row.side_issues) ? row.side_issues as string[] : [];
  const back = Array.isArray(row.back_issues) ? row.back_issues as string[] : [];
  return new Set([...front, ...side, ...back]).size;
}

export function PostureComparison({ initial, latest }: PostureComparisonProps) {
  return (
    <AssessmentComparison
      title="Postural Improvement"
      initial={initial} latest={latest}
      rows={[
        {
          key: 'posture_risk_score',
          label: 'Posture Risk Score',
          a: comparisonNumber(initial.posture_risk_score),
          b: comparisonNumber(latest.posture_risk_score),
          higherIsBetter: true,
        },
        {
          key: 'distinct_issues',
          label: 'Distinct Issues Flagged',
          a: issueCount(initial),
          b: issueCount(latest),
          higherIsBetter: false,
        },
      ]}
    />
  );
}

export default PostureComparison;
