import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DietPlanSummary from '@/components/ai/DietPlanSummary';

const calculation = {
  version: '1.0.0', bmr_kcal: 1780, tdee_kcal: 2136, calorie_target: 1709,
  activity_multiplier: 1.2, calorie_adjustment_pct: -20,
  macros: { protein_g: 160, carbs_g: 150, fat_g: 60 },
  fiber_g: 25, water_ml: 2750,
  target: { weight_kg: 72, body_fat_pct: null, delta_kg: 8, direction: 'loss' as const,
    weekly_rate_kg: 0.6, timeline_weeks: 14, target_date: null, aggressive: false },
  warnings: [{ code: 'meal_frequency_clamped', message: 'Meals a day was adjusted from 1 to 3.' }],
};
const schedule = [
  { slot: 'pre_workout', label: 'Pre-workout', time: '05:30', day_offset: 0 as const, calorie_share: 0.1, calories: 171, protein_g: 16, carbs_g: 15, fat_g: 6, fiber_g: 2 },
  { slot: 'post_workout', label: 'Post-workout', time: '00:00', day_offset: 1 as const, calorie_share: 0.15, calories: 256, protein_g: 24, carbs_g: 23, fat_g: 9, fiber_g: 4 },
];

describe('DietPlanSummary', () => {
  it('shows the server calculation and never a recalculated one', () => {
    render(<DietPlanSummary calculation={calculation} schedule={schedule}
      validation={{ ok: false, blockers: ['Dairy allergy: Paneer'], warnings: ['Fiber is 70% of target'], checks: [] }} />);
    expect(screen.getByText('1709 kcal')).toBeTruthy();
    expect(screen.getByText('160 g')).toBeTruthy();
    expect(screen.getByText(/engine v1.0.0/)).toBeTruthy();
    expect(screen.getByText(/Pre-workout · 05:30/)).toBeTruthy();
    expect(screen.getByText(/Post-workout · 00:00 \(next day\)/)).toBeTruthy();
    expect(screen.getByText(/Meals a day was adjusted/)).toBeTruthy();
    expect(screen.getByLabelText('Validation blockers').textContent).toContain('Dairy allergy');
    expect(screen.getByLabelText('Validation warnings').textContent).toContain('Fiber');
  });

  it('says it passed when there are no blockers', () => {
    render(<DietPlanSummary calculation={calculation} schedule={schedule}
      validation={{ ok: true, blockers: [], warnings: [], checks: [] }} />);
    expect(screen.getByText('Passed every check')).toBeTruthy();
  });
});
