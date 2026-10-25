// The K11 program-design arithmetic: BMR/TDEE, calories, macros, split and
// Karvonen. Pure functions, display-only — nothing here is persisted.
import { describe, expect, it } from 'vitest';
import {
  activityFactor, basalMetabolicRate, calorieTarget, goalAdjustment, karvonen,
  macroTargets, mifflinStJeor, splitForDays, tdee, type ProgramDesignInput,
} from '@/lib/program-design';

const base: ProgramDesignInput = {
  sex: null, age: null, weightKg: null, heightCm: null, measuredBmr: null,
  restingHeartRate: null, trainingDays: null, goal: null,
};

describe('program design', () => {
  it('computes Mifflin-St Jeor and prefers a measured BMR', () => {
    expect(Math.round(mifflinStJeor({ ...base, sex: 'male', weightKg: 80, heightCm: 180, age: 30 })!)).toBe(1780);
    expect(Math.round(mifflinStJeor({ ...base, sex: 'female', weightKg: 60, heightCm: 165, age: 30 })!)).toBe(1320);
    expect(basalMetabolicRate({ ...base, measuredBmr: 1900 })).toBe(1900);
  });

  it('maps training days to an activity factor and computes TDEE', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(activityFactor)).toEqual([1.2, 1.2, 1.375, 1.375, 1.55, 1.55, 1.725]);
    expect(tdee(1800, 1.55)).toBe(2790);
  });

  it('applies the goal adjustment and never goes below the calorie floor', () => {
    expect(goalAdjustment('fat_loss')).toBe(-500);
    expect(goalAdjustment('muscle_gain')).toBe(300);
    expect(goalAdjustment('general_fitness')).toBe(0);
    expect(calorieTarget(1400, 'fat_loss', 'female')).toBe(1200);
    expect(calorieTarget(1400, 'fat_loss', 'male')).toBe(1500);
  });

  it('splits protein, fat and carbs from the calorie target', () => {
    // 144 g protein (576 kcal) + 56 g fat (504 kcal) leaves 920 kcal → 230 g carbs.
    expect(macroTargets(2000, 80)).toEqual({ protein_g: 144, fat_g: 56, carbs_g: 230 });
  });

  it('picks a split from available days', () => {
    expect(splitForDays(3)?.name).toBe('Full body');
    expect(splitForDays(4)?.name).toBe('Upper / lower');
    expect(splitForDays(5)?.name).toBe('Push / pull / legs');
    expect(splitForDays(null)).toBeNull();
  });

  it('computes Karvonen zones, and returns null without age or resting HR', () => {
    const out = karvonen(30, 60)!;
    expect(out.maxHr).toBe(190);
    expect(out.zones[0]).toEqual({ label: '50–60%', low: 125, high: 138 });
    expect(karvonen(null, 60)).toBeNull();
    expect(karvonen(30, null)).toBeNull();
  });

  it('returns nulls, never NaN, when the profile is incomplete', () => {
    expect(mifflinStJeor({ ...base, sex: null })).toBeNull();
    expect(macroTargets(null, 80)).toBeNull();
    expect(macroTargets(2000, null)).toBeNull();
  });
});
