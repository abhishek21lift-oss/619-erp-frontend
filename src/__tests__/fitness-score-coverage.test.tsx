// Phase 1 — score coverage and missing-data transparency for the Fitness
// Dashboard. The stored scoring formula is untouched; these tests pin the
// derived coverage display and that nulls are never rendered as zeros.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  scoreCoverage,
  formatCoverage,
  computeOverallScore,
} from '@/lib/fitness-calculations';
import {
  FitnessDashboard,
  type FitnessScores,
} from '@/components/pt-os/fitness-testing/FitnessDashboard';

const { radarSpy } = vi.hoisted(() => ({ radarSpy: vi.fn() }));
vi.mock('@/components/pt-os/FitnessRadarChart', () => ({
  default: (props: unknown) => {
    radarSpy(props);
    return <div data-testid="radar-mock" />;
  },
}));

const FULL: FitnessScores = {
  cardioScore: 80,
  strengthScore: 60,
  enduranceScore: 95,
  mobilityScore: 40,
  bodyCompositionScore: 100,
  healthRiskScore: 80,
  overallScore: 76,
};

const PARTIAL: FitnessScores = {
  cardioScore: 80,
  strengthScore: null,
  enduranceScore: null,
  mobilityScore: null,
  bodyCompositionScore: 100,
  healthRiskScore: 80,
  overallScore: 87,
};

const SINGLE_HIGH: FitnessScores = {
  cardioScore: null,
  strengthScore: null,
  enduranceScore: 95,
  mobilityScore: null,
  bodyCompositionScore: null,
  healthRiskScore: null,
  overallScore: 95,
};

const EMPTY: FitnessScores = {
  cardioScore: null,
  strengthScore: null,
  enduranceScore: null,
  mobilityScore: null,
  bodyCompositionScore: null,
  healthRiskScore: null,
  overallScore: null,
};

beforeEach(() => radarSpy.mockClear());

describe('scoreCoverage', () => {
  it('all six scores available → 6/6 and complete', () => {
    expect(scoreCoverage(FULL)).toEqual({ available: 6, total: 6, isComplete: true });
    expect(formatCoverage(scoreCoverage(FULL))).toBe('6 of 6 categories scored');
  });

  it('three scores available → 3/6 and partial', () => {
    const c = scoreCoverage(PARTIAL);
    expect(c).toEqual({ available: 3, total: 6, isComplete: false });
    expect(formatCoverage(c)).toBe('3 of 6 categories scored');
  });

  it('one high score available → 1/6 and partial', () => {
    const c = scoreCoverage(SINGLE_HIGH);
    expect(c).toEqual({ available: 1, total: 6, isComplete: false });
    expect(formatCoverage(c)).toBe('1 of 6 categories scored');
  });

  it('no scores available → 0/6', () => {
    const c = scoreCoverage(EMPTY);
    expect(c).toEqual({ available: 0, total: 6, isComplete: false });
    expect(formatCoverage(c)).toBe('0 of 6 categories scored');
  });

  it('a legitimate score of zero counts as available', () => {
    const c = scoreCoverage({ ...EMPTY, cardioScore: 0 });
    expect(c.available).toBe(1);
    expect(c.isComplete).toBe(false);
  });

  it('null and undefined remain missing and are not converted to zero', () => {
    const c = scoreCoverage({ cardioScore: null, strengthScore: undefined });
    expect(c.available).toBe(0);
  });
});

describe('computeOverallScore (stored formula unchanged)', () => {
  it('a single available 95 still averages to 95', () => {
    expect(
      computeOverallScore({
        bodyComposition: null,
        endurance: 95,
        mobility: null,
        cardio: null,
        healthRisk: null,
        strength: null,
      }),
    ).toBe(95);
  });

  it('no scores still yields null, not zero', () => {
    expect(
      computeOverallScore({
        bodyComposition: null,
        endurance: null,
        mobility: null,
        cardio: null,
        healthRisk: null,
        strength: null,
      }),
    ).toBeNull();
  });
});

describe('FitnessDashboard', () => {
  it('complete assessment keeps working: scores visible, complete label, full radar', () => {
    render(<FitnessDashboard scores={FULL} />);
    expect(screen.getByText('Complete · 6 of 6 categories scored')).toBeTruthy();
    expect(screen.getByText('Overall performance across all 6 categories.')).toBeTruthy();
    expect(screen.getByText('76')).toBeTruthy();
    const data = radarSpy.mock.calls[0][0].data as { category: string; score: number | null }[];
    expect(data.map((d) => d.category)).toEqual([
      'Cardio',
      'Strength',
      'Endurance',
      'Mobility',
      'Body Comp.',
      'Health Risk',
    ]);
    expect(data.every((d) => typeof d.score === 'number')).toBe(true);
  });

  it('partial assessment: tiles keep scores and — indicators, coverage shown, radar has nulls not zeros', () => {
    render(<FitnessDashboard scores={PARTIAL} />);
    expect(screen.getByText('Partial · 3 of 6 categories scored')).toBeTruthy();
    expect(screen.getByText('Partial assessment — 3 of 6 categories scored.')).toBeTruthy();
    expect(
      screen.getByText('Overall score based on 3 of 6 categories scored.'),
    ).toBeTruthy();
    // Valid scores stay visible; the three missing tiles keep the — indicator.
    expect(screen.getAllByText('80').length).toBe(2); // Cardio + Health Risk tiles
    expect(screen.getByText('87')).toBeTruthy(); // overall center value
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
    const data = radarSpy.mock.calls[0][0].data as { category: string; score: number | null }[];
    expect(data.filter((d) => d.score === 0)).toEqual([]);
    expect(data.filter((d) => d.score == null).length).toBe(3);
  });

  it('single high score is flagged partial, never presented as a full result', () => {
    render(<FitnessDashboard scores={SINGLE_HIGH} />);
    expect(screen.getByText('Partial · 1 of 6 categories scored')).toBeTruthy();
    expect(screen.queryByText('Overall performance across all 6 categories.')).toBeNull();
  });

  it('no scores: no meaningful overall, missing-data explanation shown', () => {
    render(<FitnessDashboard scores={EMPTY} />);
    expect(screen.getByText('Partial · 0 of 6 categories scored')).toBeTruthy();
    expect(
      screen.getByText('No categories scored yet — no overall score.'),
    ).toBeTruthy();
    const data = radarSpy.mock.calls[0][0].data as { category: string; score: number | null }[];
    expect(data.every((d) => d.score == null)).toBe(true);
  });
});
