// Missing data is not a good score. Mirrors the backend coverage test.

import { describe, expect, it } from 'vitest';
import * as lifestyle from '@/lib/lifestyle-calculations';
import * as nutrition from '@/lib/nutrition-calculations';

describe('lifestyle composite needs enough answers', () => {
  const six = (over: Partial<lifestyle.LifestyleSixScores> = {}): lifestyle.LifestyleSixScores => ({
    sleep: null, stress: null, hydration: null, activity: null, nutrition: null, recovery: null, ...over,
  });

  it('does not call sleep alone an Excellent lifestyle', () => {
    const score = lifestyle.calcLifestyleScore(six({ sleep: 100, recovery: 100 }), 0);
    expect(score).toBeNull();
    expect(lifestyle.classifyLifestyleReadiness(score)).toBe('Insufficient data');
  });

  it('scores four of six components', () => {
    const score = lifestyle.calcLifestyleScore(six({ sleep: 100, stress: 50, activity: 60, recovery: 80 }), 0);
    expect(score).toBe(73);
    expect(lifestyle.classifyLifestyleReadiness(score)).toBe('Good');
  });
});

describe('lifestyle meal pattern', () => {
  it('penalises one meal a day', () => {
    expect(lifestyle.calcNutritionScore(1, 'daily', false)).toBe(70);
  });
});

describe('nutrition components', () => {
  it('distinguishes an unanswered digestive step from a stated "no issues"', () => {
    expect(nutrition.calcDigestiveHealthScore(null)).toBeNull();
    expect(nutrition.calcDigestiveHealthScore([])).toBe(100);
  });

  it('scores no supplements and an empty list the same', () => {
    expect(nutrition.calcSupplementScore(null, [])).toBeNull();
    expect(nutrition.calcSupplementScore(false, [])).toBe(50);
    expect(nutrition.calcSupplementScore(true, [])).toBe(50);
    expect(nutrition.calcSupplementScore(true, [{ name: 'Whey Protein' }])).toBe(65);
  });

  it('does not call an empty favourite list Very Low protein', () => {
    expect(nutrition.assessProtein([], false, [])).toEqual({ assessment: null, score: null });
    expect(nutrition.assessProtein(['Chicken', 'Eggs', 'Dal'], false, [])).toEqual({ assessment: 'Adequate', score: 70 });
  });

  it('does not score a blank diet step', () => {
    expect(nutrition.calcDietQualityScore([], [], [], null, [], null, null)).toBeNull();
    expect(nutrition.calcDietQualityScore(['Sugar'], [], [], null, [], null, null)).toBe(64);
  });

  it('cannot score from water alone', () => {
    const score = nutrition.calcNutritionScore(
      { dietQuality: null, protein: null, hydration: 55, digestive: null, supplement: null }, 0,
    );
    expect(score).toBeNull();
    expect(nutrition.classifyNutritionReadiness(score)).toBe('Insufficient data');
  });
});
