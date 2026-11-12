// Phase 1 — score coverage and missing-data transparency for the Fitness
// Dashboard. Coverage is derived from the seven framework steps; these tests
// pin the derived coverage display and that nulls are never rendered as zeros.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  scoreCoverage,
  formatCoverage,
  computeTotalScore,
} from '@/lib/fitness-calculations';
import {
  FitnessDashboard,
  type FitnessScores,
} from '@/components/pt-os/fitness-testing/FitnessDashboard';
import { bandBg, bandFill, bandInk, bandLabel } from '@/components/pt-os/fitness-testing/fitnessTheme';

const { radarSpy } = vi.hoisted(() => ({ radarSpy: vi.fn() }));
vi.mock('@/components/pt-os/FitnessRadarChart', () => ({
  default: (props: unknown) => {
    radarSpy(props);
    return <div data-testid="radar-mock" />;
  },
}));

const FULL: FitnessScores = {
  bpPoints: 7,
  anthropometricPoints: 10,
  bodyCompositionScore: 11,
  cardioScore: 20,
  strengthScore: 15,
  enduranceScore: 12,
  mobilityScore: 12,
  overallScore: 87,
  overallPoints: 87,
  overallMax: 100,
};

const PARTIAL: FitnessScores = {
  bpPoints: 7,
  anthropometricPoints: 6,
  bodyCompositionScore: 11,
  cardioScore: 16,
  strengthScore: null,
  enduranceScore: null,
  mobilityScore: null,
  overallScore: 73,
  overallPoints: 40,
  overallMax: 55,
};

const SINGLE_HIGH: FitnessScores = {
  bpPoints: null,
  anthropometricPoints: null,
  bodyCompositionScore: null,
  cardioScore: 20,
  strengthScore: null,
  enduranceScore: null,
  mobilityScore: null,
  overallScore: 100,
  overallPoints: 20,
  overallMax: 20,
};

const EMPTY: FitnessScores = {
  bpPoints: null,
  anthropometricPoints: null,
  bodyCompositionScore: null,
  cardioScore: null,
  strengthScore: null,
  enduranceScore: null,
  mobilityScore: null,
  overallScore: null,
  overallPoints: null,
  overallMax: null,
};

beforeEach(() => radarSpy.mockClear());

describe('scoreCoverage', () => {
  it('all seven steps available → 7/7 and complete', () => {
    expect(scoreCoverage(FULL)).toEqual({ available: 7, total: 7, isComplete: true });
    expect(formatCoverage(scoreCoverage(FULL))).toBe('7 of 7 steps scored');
  });

  it('four steps available → 4/7 and partial', () => {
    const c = scoreCoverage(PARTIAL);
    expect(c).toEqual({ available: 4, total: 7, isComplete: false });
    expect(formatCoverage(c)).toBe('4 of 7 steps scored');
  });

  it('one high score available → 1/7 and partial', () => {
    const c = scoreCoverage(SINGLE_HIGH);
    expect(c).toEqual({ available: 1, total: 7, isComplete: false });
    expect(formatCoverage(c)).toBe('1 of 7 steps scored');
  });

  it('no steps available → 0/7', () => {
    const c = scoreCoverage(EMPTY);
    expect(c).toEqual({ available: 0, total: 7, isComplete: false });
    expect(formatCoverage(c)).toBe('0 of 7 steps scored');
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

describe('computeTotalScore', () => {
  it('a partial battery scales over the measured max, not 100', () => {
    expect(
      computeTotalScore({
        bp: { points: 7, max: 10 },
        anthropometric: { points: 6, max: 10 },
        bodyComposition: { points: 11, max: 15 },
        cardio: { points: 16, max: 20 },
      }),
    ).toEqual({ points: 40, max: 55, score: 73, tier: null });
  });

  it('no steps still yields no score, not zero', () => {
    expect(computeTotalScore({ cardio: { points: null, max: 0 } }))
      .toEqual({ points: 0, max: 0, score: null, tier: null });
  });
});

describe('band tokens', () => {
  it('maps a score onto the framework tiers at the 85/70/50 cutoffs', () => {
    expect([bandLabel(85), bandLabel(84), bandLabel(70), bandLabel(69), bandLabel(50), bandLabel(49)]).toEqual([
      'Optimal', 'Fit', 'Fit', 'Moderate', 'Moderate', 'Needs Attention',
    ]);
    // Fill, ink and tint must all come from the theme, never a hard-coded hex.
    expect(bandFill(90)).toBe('var(--success-text)');
    expect(bandInk(60)).toBe('var(--warning-text)');
    expect(bandBg(10)).toBe('var(--danger-bg)');
  });
});

describe('FitnessDashboard', () => {
  it('complete assessment keeps working: seven tiles, tier, complete label, full radar', () => {
    render(<FitnessDashboard scores={FULL} />);
    expect(screen.getByText('Complete · 7 of 7 steps scored')).toBeTruthy();
    expect(screen.getByText('Complete assessment — all 7 steps scored.')).toBeTruthy();
    expect(screen.getByText('87')).toBeTruthy();
    expect(screen.getAllByText('Optimal').length).toBeGreaterThan(0);
    const data = radarSpy.mock.calls[0][0].data as { category: string; score: number | null }[];
    expect(data.map((d) => d.category)).toEqual([
      'Blood Pressure', 'Anthropometrics', 'Body Comp.', 'Cardio',
      'Strength', 'Endurance', 'Flexibility',
    ]);
    expect(data.every((d) => typeof d.score === 'number')).toBe(true);
  });

  it('all seven steps scored but a reduced battery says so, without contradicting itself', () => {
    // Every step has points, but a one-test strength battery measures only 7.5
    // of the step's 15, so the denominator is 92.5. Tier would read incomplete.
    render(
      <FitnessDashboard
        scores={{
          bpPoints: 7, anthropometricPoints: 8, bodyCompositionScore: 11, cardioScore: 16,
          strengthScore: 7.5, enduranceScore: 12, mobilityScore: 12,
          overallScore: 79, overallPoints: 73.5, overallMax: 92.5,
        }}
      />,
    );
    expect(screen.getByText('All steps scored · measured on 92.5/100')).toBeTruthy();
    expect(screen.getByText('All 7 steps scored — this battery measured 92.5 of 100 points.')).toBeTruthy();
    expect(screen.queryByText('Partial · 7 of 7 steps scored')).toBeNull();
    expect(screen.getByText('7 of 7 steps · 73.5/92.5 pts')).toBeTruthy();
    expect(screen.getByText('7.5 / 15')).toBeTruthy();
    expect(screen.queryByText('Optimal')).toBeNull();
    expect(screen.getByText('79')).toBeTruthy();
  });

  it('divides a step by what it measured, so a perfect reduced battery is 100%', () => {
    render(
      <FitnessDashboard
        scores={{
          bpPoints: 10, anthropometricPoints: 10, bodyCompositionScore: 15, cardioScore: 20,
          strengthScore: 15, enduranceScore: 15, mobilityScore: 13,
          overallScore: 100, overallPoints: 98, overallMax: 98,
          stepMax: { bp: 10, anthropometric: 10, bodyComposition: 15, cardio: 20, strength: 15, endurance: 15, flexibility: 13 },
        }}
      />,
    );
    // 13 of 13 measured flexibility points, not 13 of the framework's 15.
    expect(screen.getByText('13 / 13')).toBeTruthy();
    expect(screen.queryByText('13 / 15')).toBeNull();
    expect(screen.getAllByText('Optimal').length).toBeGreaterThan(0);
  });

  it('names an unmeasured step instead of leaving a bare dash', () => {
    render(<FitnessDashboard scores={PARTIAL} />);
    expect(screen.getAllByText('Not measured').length).toBe(3);
  });

  it('partial assessment: points over fixed max, coverage shown, no overall tier, radar nulls not zeros', () => {
    render(<FitnessDashboard scores={PARTIAL} />);
    expect(screen.getByText('Partial · 4 of 7 steps scored')).toBeTruthy();
    expect(screen.getByText('Partial assessment — 4 of 7 steps scored.')).toBeTruthy();
    expect(screen.getByText('4 of 7 steps · 40/55 pts')).toBeTruthy();
    expect(screen.queryByText('Optimal')).toBeNull();
    // The points and the step denominator are visible; the three missing tiles
    // keep the — indicator rather than a zero.
    expect(screen.getByText('7 / 10')).toBeTruthy();
    expect(screen.getByText('16 / 20')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
    const data = radarSpy.mock.calls[0][0].data as { category: string; score: number | null }[];
    expect(data.filter((d) => d.score === 0)).toEqual([]);
    expect(data.filter((d) => d.score == null).length).toBe(3);
  });

  it('a single one-test strength score reads as 7.5 / 15, never 15 / 15', () => {
    render(
      <FitnessDashboard
        scores={{ ...EMPTY, strengthScore: 7.5, overallScore: 100, overallPoints: 7.5, overallMax: 7.5 }}
      />,
    );
    expect(screen.getByText('7.5 / 15')).toBeTruthy();
    expect(screen.queryByText('15 / 15')).toBeNull();
    expect(screen.getByText('Partial · 1 of 7 steps scored')).toBeTruthy();
  });

  it('single high step is flagged partial, never presented as a full result', () => {
    render(<FitnessDashboard scores={SINGLE_HIGH} />);
    expect(screen.getByText('Partial · 1 of 7 steps scored')).toBeTruthy();
    expect(screen.getByText('1 of 7 steps · 20/20 pts')).toBeTruthy();
  });

  it('no scores: no meaningful overall, missing-data explanation shown', () => {
    render(<FitnessDashboard scores={EMPTY} />);
    expect(screen.getByText('Partial · 0 of 7 steps scored')).toBeTruthy();
    expect(
      screen.getByText('No steps scored yet — no overall score.'),
    ).toBeTruthy();
    const data = radarSpy.mock.calls[0][0].data as { category: string; score: number | null }[];
    expect(data.every((d) => d.score == null)).toBe(true);
  });
});
