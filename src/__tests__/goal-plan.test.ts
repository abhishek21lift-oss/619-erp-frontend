// K11 Goal Setting planning helpers. These drive what the wizard claims to
// the trainer — a checklist tick, a weekly commitment figure, a milestone
// date — so each one is checked against its own edge case rather than only
// its happy path.
import { describe, expect, it } from 'vitest';
import {
  barrierPayload, barrierPlansFor, defaultMilestones, formatWeeklyCommitment,
  smartChecklist, trainingDaysFrom, validateMilestones, weeksFrom, weeklyCommitmentMinutes,
} from '@/lib/goal-plan';
import type { GoalMilestone } from '@/lib/goal-plan';

const TODAY = '2026-10-19';

describe('defaultMilestones', () => {
  it('produces short, medium and long tiers inside the goal window', () => {
    const out = defaultMilestones(TODAY, '2027-01-19', 8, 12);
    expect(out.map((m) => m.type)).toEqual(['short_term', 'medium_term', 'long_term']);
    expect(out[0].date).toBe('2026-12-14'); // today + 8 weeks
    expect(out[1].date).toBe('2027-01-11'); // today + 12 weeks
    expect(out[2].date).toBe('2027-01-19');
    expect(validateMilestones(out, TODAY, '2027-01-19')).toBeUndefined();
  });

  it('omits the long-term checkpoint when there is no target date', () => {
    const out = defaultMilestones(TODAY, null, 8, 12);
    expect(out.map((m) => m.type)).toEqual(['short_term', 'medium_term']);
  });

  it('drops a medium checkpoint that lands on the same day as the short one', () => {
    const out = defaultMilestones(TODAY, null, 8, 8);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('short_term');
  });
});

describe('validateMilestones', () => {
  const base: GoalMilestone = { type: 'short_term', label: 'Week 8', date: '2026-12-14', description: '' };

  it('accepts an empty list — milestones are an enhancement, not a gate', () => {
    expect(validateMilestones([], TODAY, '2027-01-19')).toBeUndefined();
  });

  it('rejects a milestone with no title or no date', () => {
    expect(validateMilestones([{ ...base, label: '  ' }], TODAY, null)).toMatch(/title/);
    expect(validateMilestones([{ ...base, date: '' }], TODAY, null)).toMatch(/date/);
  });

  it('rejects dates outside the goal window', () => {
    expect(validateMilestones([{ ...base, date: '2026-10-18' }], TODAY, null)).toMatch(/before today/);
    expect(validateMilestones([{ ...base, date: '2027-02-01' }], TODAY, '2027-01-19')).toMatch(/after the goal target/);
  });

  it('rejects tiers that run backwards in time', () => {
    const backwards: GoalMilestone[] = [
      { type: 'short_term', label: 'Late', date: '2027-01-01', description: '' },
      { type: 'medium_term', label: 'Early', date: '2026-12-01', description: '' },
    ];
    expect(validateMilestones(backwards, TODAY, '2027-01-19')).toMatch(/short term/);
  });
});

describe('weekly commitment', () => {
  it('multiplies days by session length', () => {
    expect(weeklyCommitmentMinutes(3, '60')).toBe(180);
    expect(weeklyCommitmentMinutes('4', 45)).toBe(180);
  });

  it('returns null for an unusable input instead of NaN', () => {
    expect(weeklyCommitmentMinutes(0, '60')).toBeNull();
    expect(weeklyCommitmentMinutes(3, '')).toBeNull();
    expect(weeklyCommitmentMinutes('many', '60')).toBeNull();
  });

  it('formats hours, minutes and the mixed case', () => {
    expect(formatWeeklyCommitment(180)).toBe('3 h/week');
    expect(formatWeeklyCommitment(45)).toBe('45 min/week');
    expect(formatWeeklyCommitment(210)).toBe('3 h 30 min/week');
    expect(formatWeeklyCommitment(null)).toBe('—');
  });
});

describe('smartChecklist', () => {
  const full = {
    goalType: 'fat_loss', goalName: '', statement: 'Lose 6 kg by December',
    successMetric: '78 kg', targetWeight: '78', targetBodyFat: '',
    targetDate: '2026-12-20',
  };

  it('ticks every letter when the form is complete', () => {
    const rows = smartChecklist(full, { priorityGoal: 'fat_loss', today: TODAY });
    expect(rows.map((r) => r.done)).toEqual([true, true, true, true, true]);
  });

  it('leaves Relevant for the priority step, not for a longer statement', () => {
    const rows = smartChecklist(full, { priorityGoal: '', today: TODAY });
    expect(rows.find((r) => r.key === 'R')?.done).toBe(false);
  });

  it('does not count a past deadline as time-bound', () => {
    const rows = smartChecklist({ ...full, targetDate: '2026-01-01' }, { priorityGoal: 'health', today: TODAY });
    expect(rows.find((r) => r.key === 'T')?.done).toBe(false);
    expect(rows.find((r) => r.key === 'A')?.done).toBe(false);
  });

  it('requires a name and a statement for a custom goal', () => {
    const custom = { ...full, goalType: 'custom', goalName: '' };
    expect(smartChecklist(custom, { priorityGoal: '', today: TODAY })[0].done).toBe(false);
    expect(smartChecklist({ ...custom, goalName: 'Stand-up paddle' }, { priorityGoal: '', today: TODAY })[0].done).toBe(true);
  });
});

describe('barrier plans', () => {
  it('keeps a plan already typed when the challenge stays selected', () => {
    const out = barrierPlansFor(['No Time', 'Poor Diet'], [{ challenge: 'No Time', plan: 'Two walks' }]);
    expect(out).toEqual([
      { challenge: 'No Time', plan: 'Two walks' },
      { challenge: 'Poor Diet', plan: '' },
    ]);
  });

  it('drops nothing but an empty plan from the payload', () => {
    expect(barrierPayload([
      { challenge: 'No Time', plan: '  Two walks  ' },
      { challenge: 'Poor Diet', plan: '   ' },
    ])).toEqual([{ challenge: 'No Time', plan: 'Two walks' }]);
  });
});

describe('bounded parse helpers', () => {
  it('trainingDaysFrom bounds to the 1–7 select range', () => {
    expect(trainingDaysFrom('5')).toBe(5);
    expect(trainingDaysFrom('0')).toBe(1);
    expect(trainingDaysFrom('9')).toBe(7);
    expect(trainingDaysFrom('')).toBe(3);
  });

  it('weeksFrom bounds to the 1–52 wizard range', () => {
    expect(weeksFrom('12', 8)).toBe(12);
    expect(weeksFrom('0', 8)).toBe(1);
    expect(weeksFrom('99', 8)).toBe(52);
    expect(weeksFrom('', 8)).toBe(8);
  });
});
