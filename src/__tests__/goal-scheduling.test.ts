import { describe, expect, it } from 'vitest';
import { recommendTrainingSplit, buildRoutineBlueprint } from '@/lib/goal-scheduling';

describe('goal scheduling', () => {
  it('3 days -> full body', () => {
    const s = recommendTrainingSplit(3, { goal: 'fat_loss', experience: 'beginner' });
    expect(s.split).toBe('full_body');
    expect(s.calendar.filter((d) => d.type === 'training')).toHaveLength(3);
  });
  it('4 days -> upper/lower', () => {
    const s = recommendTrainingSplit(4, {});
    expect(s.split).toBe('upper_lower');
    expect(s.calendar.filter((d) => d.type === 'training')).toHaveLength(4);
  });
  it('6 days -> ppl twice', () => {
    const s = recommendTrainingSplit(6, {});
    expect(s.split).toBe('ppl_twice');
    expect(s.calendar.filter((d) => d.type === 'training')).toHaveLength(6);
  });
  it('1 day -> minimal', () => {
    const s = recommendTrainingSplit(1, {});
    expect(s.split).toBe('full_body_minimal');
  });
  it('never exceeds availability', () => {
    for (const d of [1,2,3,4,5,6,7]) {
      const s = recommendTrainingSplit(d, {});
      expect(s.calendar.filter((x) => x.type === 'training')).toHaveLength(d);
    }
  });
  it('routine blueprint has main lifts', () => {
    const b = buildRoutineBlueprint({ goal: 'strength_gain', experience: 'intermediate', equipment: 'full_gym', trainingDays: 4, split: 'upper_lower' });
    expect(b.sessionTemplate.mainLifts.sets).toBeGreaterThan(0);
    expect(b.progressionRules.length).toBeGreaterThan(0);
  });
});
