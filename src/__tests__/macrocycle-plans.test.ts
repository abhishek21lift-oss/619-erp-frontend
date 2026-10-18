import { describe, it, expect } from 'vitest';
import { MACRO_GOALS, macroPhasePlans } from '@/lib/macro-programming';

describe('macroPhasePlans', () => {
  it('turns every phase into a programme whose weeks add up to the block', () => {
    const plans = macroPhasePlans({
      goal: 'general_fitness', totalWeeks: 12, daysPerWeek: 4, includeDeload: true,
    });

    expect(plans).toHaveLength(3);
    expect(plans.reduce((n, p) => n + p.duration_weeks, 0)).toBe(12);
    expect(plans.map((p) => p.duration_weeks)).toEqual([7, 3, 2]);
    expect(plans[0]).toMatchObject({
      goal: 'general_fitness',
      sessions_per_week: 4,
    });
    expect(plans[0].name).toContain('Weeks 1–7');
    expect(plans[0].description).toContain('Day 4');
  });

  it('maps the macro goal onto a goal workout_plans accepts', () => {
    const goalOf = (goal: 'hypertrophy' | 'fat_loss' | 'powerlifting') =>
      macroPhasePlans({ goal, totalWeeks: 8, daysPerWeek: 3 })[0].goal;

    expect(goalOf('hypertrophy')).toBe('muscle_gain');
    expect(goalOf('fat_loss')).toBe('weight_loss');
    expect(goalOf('powerlifting')).toBe('strength');
  });

  it('keeps a four-week block as one programme', () => {
    const plans = macroPhasePlans({ goal: 'strength', totalWeeks: 4, daysPerWeek: 3 });

    expect(plans).toHaveLength(1);
    expect(plans[0].duration_weeks).toBe(4);
    expect(plans[0].name).toContain('Accumulation');
  });

  it('labels every goal the engine accepts', () => {
    expect(MACRO_GOALS.map((g) => g.value)).toEqual([
      'strength', 'hypertrophy', 'endurance', 'fat_loss', 'general_fitness', 'powerlifting',
    ]);
  });
});
