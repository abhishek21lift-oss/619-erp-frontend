// The comparison panel reads the same stored column across two assessments.
// When the scoring formula changed those columns mean different things
// (70/100 cardio is not 70/20), so the values stay but the delta is withheld.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import ProgressComparison from '@/components/pt-os/fitness-testing/ProgressComparison';

const OLD = {
  assessment_date: '2026-01-01',
  scoring_formula_version: 1,
  weight: 70,
  bp_points: 7,
  anthropometric_points: 4.5,
  strength_score_computed: 60,
  cardio_score_computed: 50,
  endurance_score_computed: 55,
  mobility_score_computed: 60,
  overall_fitness_score: 55,
};

const NEW = {
  ...OLD,
  assessment_date: '2026-02-01',
  scoring_formula_version: 2,
  weight: 71,
  bp_points: 9,
  anthropometric_points: 7.5,
  strength_score_computed: 12,
  cardio_score_computed: 15,
  endurance_score_computed: 10,
  mobility_score_computed: 11,
  overall_fitness_score: 72,
};

describe('ProgressComparison', () => {
  it('withholds every score delta across formula versions, but keeps the readings', () => {
    const { container } = render(<ProgressComparison initial={OLD} latest={NEW} />);
    // Raw measurements have no formula, so they still compare.
    expect(screen.getByText('+1')).toBeTruthy();
    expect(container.textContent).toContain('70 kg → 71 kg');
    // Seven score rows, each saying why there is no delta.
    expect(screen.getAllByText('Not comparable')).toHaveLength(7);
    expect(container.textContent).toContain('7 / 10 → 9 / 10');
    expect(container.textContent).toMatch(/Overall Fitness Score55\s+→\s+72/);
  });

  it('compares normally when both assessments used the same formula', () => {
    render(<ProgressComparison initial={OLD} latest={{ ...NEW, scoring_formula_version: 1 }} />);
    expect(screen.queryByText('Not comparable')).toBeNull();
    expect(screen.getByText('+2')).toBeTruthy();
  });
});
