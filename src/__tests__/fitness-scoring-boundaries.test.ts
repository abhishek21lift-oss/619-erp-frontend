// Boundary / semantics tests for the Phase 2 fixes (F2a, F14, F15).
// Pure logic only — no DB, no components.
import { describe, it, expect } from 'vitest';
import {
  classifyFlexibilityScore,
  scoreBodyComposition,
  scoreHealthRisk,
  FITNESS_SCORING_VERSION,
} from '@/lib/fitness-calculations';

describe('classifyFlexibilityScore bounds (F2a)', () => {
  it('null / non-finite / out-of-range inputs never produce a category', () => {
    expect(classifyFlexibilityScore(null)).toBeNull();
    expect(classifyFlexibilityScore(NaN)).toBeNull();
    expect(classifyFlexibilityScore(Infinity)).toBeNull();
    expect(classifyFlexibilityScore(-1)).toBeNull();
    expect(classifyFlexibilityScore(-0.1)).toBeNull();
    expect(classifyFlexibilityScore(10.1)).toBeNull();
    expect(classifyFlexibilityScore(25)).toBeNull();
  });
  it('0 is a legitimate "very limited" score (Poor), not a missing one', () => {
    expect(classifyFlexibilityScore(0)).toBe('Poor');
  });
  it('10 is the top of the scale (Excellent)', () => {
    expect(classifyFlexibilityScore(10)).toBe('Excellent');
  });
  it('in-range values still classify normally', () => {
    expect(classifyFlexibilityScore(2)).toBe('Below Average');
    expect(classifyFlexibilityScore(5)).toBe('Average');
    expect(classifyFlexibilityScore(9)).toBe('Excellent');
  });
});

describe('scoreBodyComposition prerequisites (F14)', () => {
  it('returns null for missing or unsupported gender — no invented range', () => {
    expect(scoreBodyComposition(15, null)).toBeNull();
    expect(scoreBodyComposition(15, 'Other')).toBeNull();
  });
  it('still scores supported genders', () => {
    expect(scoreBodyComposition(15, 'Male')).toBe(100);
    expect(scoreBodyComposition(25, 'Female')).toBe(100);
  });
  it('returns null when body fat is missing', () => {
    expect(scoreBodyComposition(null, 'Male')).toBeNull();
  });
});

describe('scoreHealthRisk direction and bands (F15)', () => {
  it('higher score = better health; 100 is normal BP + healthy BMI', () => {
    expect(scoreHealthRisk('Normal', 22)).toBe(100);
  });
  it('BMI band discontinuity: 24.9 → 100, 25.0 → 80 (with normal BP)', () => {
    expect(scoreHealthRisk('Normal', 24.9)).toBe(100);
    expect(scoreHealthRisk('Normal', 25)).toBe(80);
  });
  it('BMI 30+ → 65 with normal BP (100+30)/2', () => {
    expect(scoreHealthRisk('Normal', 30)).toBe(65);
  });
  it('underweight (<18.5) is treated like overweight (60), no separate penalty', () => {
    expect(scoreHealthRisk('Normal', 17)).toBe(80);
  });
  it('BP-only input still scores (BMI missing)', () => {
    expect(scoreHealthRisk('Hypertension Stage 1', null)).toBe(55);
  });
  it('both missing → null, never 0', () => {
    expect(scoreHealthRisk(null, null)).toBeNull();
  });
  it('Hypertension Stage 2 is the worst BP band (20)', () => {
    expect(scoreHealthRisk('Hypertension Stage 2', 22)).toBe(60);
  });
});

describe('scoring formula version (F10)', () => {
  it('exposes a non-empty version identifier', () => {
    expect(typeof FITNESS_SCORING_VERSION).toBe('string');
    expect(FITNESS_SCORING_VERSION.length).toBeGreaterThan(0);
  });
});
