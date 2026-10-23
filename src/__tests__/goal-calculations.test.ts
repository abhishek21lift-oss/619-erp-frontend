// K11 measurable-target benchmarks. The frontend twin has to answer exactly
// what the backend will store, so each metric is pinned separately.
import { describe, expect, it } from 'vitest';
import {
  calcEstimatedDurationWeeks, calcSafeWeeklyRateForMetric, classifyGoalDifficulty,
} from '@/lib/goal-calculations';

describe('calcSafeWeeklyRateForMetric', () => {
  it('keeps the weight benchmark', () => {
    expect(calcSafeWeeklyRateForMetric('weight', 100, 'loss')).toBe(0.75);
    expect(calcSafeWeeklyRateForMetric('weight', 100, 'gain')).toBe(0.08);
  });

  it('uses percentage-point and lift benchmarks', () => {
    expect(calcSafeWeeklyRateForMetric('body_fat', 30, 'loss')).toBe(0.25);
    expect(calcSafeWeeklyRateForMetric('lift', 100, 'gain')).toBe(0.5);
    expect(calcSafeWeeklyRateForMetric('lift', 200, 'gain')).toBe(1);
  });

  it('has no rate for a weekly frequency or a custom metric', () => {
    expect(calcSafeWeeklyRateForMetric('sessions', 2, 'gain')).toBeNull();
    expect(calcSafeWeeklyRateForMetric('custom', 10, 'gain')).toBeNull();
  });

  it('does not rate an unchanged target', () => {
    expect(calcSafeWeeklyRateForMetric('weight', 80, 'maintain')).toBeNull();
  });
});

describe('lift goal difficulty', () => {
  it('classifies against the 0.5% benchmark', () => {
    // 100 kg -> 110 kg in 12 weeks is ~0.83 kg/week vs a 0.5 kg/week safe rate.
    const required = 10 / 12;
    const safe = calcSafeWeeklyRateForMetric('lift', 100, 'gain');
    expect(classifyGoalDifficulty(required, safe, null, null, null)).toBe('Very Hard');
    expect(calcEstimatedDurationWeeks(100, 110, safe)).toBe(20);
  });
});
