import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AssessmentComparison from '@/components/pt-os/shared/AssessmentComparison';

describe('AssessmentComparison', () => {
  it('shows the delta in the direction each metric calls improvement', () => {
    render(
      <AssessmentComparison
        initial={{ assessment_date: '2026-01-01' }}
        latest={{ assessment_date: '2026-02-01' }}
        rows={[
          { key: 'sleep', label: 'Sleep Score', a: 4, b: 6, higherIsBetter: true },
          { key: 'risk', label: 'Risk Score', a: 3, b: 1, higherIsBetter: false },
          { key: 'missing', label: 'Never Recorded', a: null, b: null, higherIsBetter: true },
        ]}
      />,
    );

    expect(screen.getByText('Sleep Score')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy();
    expect(screen.getByText('-2')).toBeTruthy();
    // A metric with no values on either side is noise, not a row of dashes.
    expect(screen.queryByText('Never Recorded')).toBeNull();
  });
});
