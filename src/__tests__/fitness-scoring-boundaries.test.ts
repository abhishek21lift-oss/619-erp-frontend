// Boundary / semantics tests for the Phase 2 fixes (F2a, F14, F15).
// Pure logic only — no DB, no components.
import { describe, it, expect } from 'vitest';
import {
  classifyFlexibilityScore,
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

describe('scoring formula version (F10)', () => {
  it('exposes a non-empty version identifier', () => {
    expect(typeof FITNESS_SCORING_VERSION).toBe('string');
    expect(FITNESS_SCORING_VERSION.length).toBeGreaterThan(0);
  });
});
