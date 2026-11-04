// The goal wizard used to write `beginner` and `full_gym` into every goal,
// even when Enrollment had recorded an advanced client with three sessions a
// week — and an edit then reset the saved blueprint's choices to those same
// hardcoded defaults. A new goal must start from the client record, and an
// edit must keep what the blueprint already says.

import { describe, expect, it } from 'vitest';
import {
  initGoalFormForClient, MAX_SECONDARY_GOALS, secondaryGoalsFromRow, secondaryGoalsPayload, validateSecondaryGoals,
} from '@/components/pt-os/goal-assessment/types';
import { formFromGoalRow, goalMeasureFromRow, k11MeasureFor } from '@/components/pt-os/goal-assessment/form-from-row';

describe('a new goal starts from the client record', () => {
  it('prefills experience and weekly training days', () => {
    const form = initGoalFormForClient({ workout_experience_level: 'advanced', sessions_per_week: 4 });
    expect(form.experienceLevel).toBe('advanced');
    expect(form.trainingDays).toBe('4');
  });

  it('accepts the numeric strings a database driver may return', () => {
    const form = initGoalFormForClient({ workout_experience_level: 'intermediate', sessions_per_week: '5' });
    expect(form.trainingDays).toBe('5');
  });

  it('falls back only when the client record has nothing usable', () => {
    const form = initGoalFormForClient({ workout_experience_level: null, sessions_per_week: null });
    expect(form.experienceLevel).toBe('beginner');
    expect(form.trainingDays).toBe('3');
  });

  it('does not put an out-of-range frequency into the 1-7 day picker', () => {
    expect(initGoalFormForClient({ sessions_per_week: 9 }).trainingDays).toBe('3');
    expect(initGoalFormForClient({ sessions_per_week: 0 }).trainingDays).toBe('3');
  });

  it('prefills barriers and motivation from the interview', () => {
    const form = initGoalFormForClient({
      interviewChallenges: ['Work schedule', 'Gym access'],
      interviewMotivation: 'Keep up with my kids.',
    });
    expect(form.biggestChallenges).toEqual(['Work schedule', 'Gym access']);
    expect(form.motivationReason).toBe('Keep up with my kids.');
  });

  it('falls back to the form defaults when the interview has no barriers or motivation', () => {
    const form = initGoalFormForClient({ interviewChallenges: [], interviewMotivation: '' });
    expect(form.biggestChallenges).toEqual([]);
    expect(form.motivationReason).toBe('');
  });

  it('drops non-string and whitespace interview entries', () => {
    const form = initGoalFormForClient({
      interviewChallenges: ['   ', 123 as unknown as string, 'Work schedule'],
      interviewMotivation: '   ',
    });
    expect(form.biggestChallenges).toEqual(['Work schedule']);
    expect(form.motivationReason).toBe('');
  });

  it('keeps labels an older goal saved outside the old chip vocabulary', () => {
    const form = formFromGoalRow({ biggest_challenges: ['Work schedule', 'A custom barrier'] });
    expect(form.biggestChallenges).toEqual(['Work schedule', 'A custom barrier']);
    expect(form.challengeOther).toBe('');
  });
});

describe('editing a goal keeps the saved blueprint choices', () => {
  const row = (blueprint: Record<string, unknown>) => ({
    routine_blueprint: blueprint,
  }) as Record<string, unknown>;

  it('reads experience and equipment from routine_blueprint', () => {
    const form = formFromGoalRow(row({ experience: 'advanced', equipment: 'bands' }));
    expect(form.experienceLevel).toBe('advanced');
    expect(form.equipment).toBe('bands');
  });

  it('keeps the fallback for a goal saved before the blueprint carried them', () => {
    const form = formFromGoalRow(row({}));
    expect(form.experienceLevel).toBe('beginner');
    expect(form.equipment).toBe('full_gym');
  });
});

describe('editing a goal saved before milestones had a description', () => {
  it('fills the missing text instead of handing undefined to the form', () => {
    const form = formFromGoalRow({
      milestones: [
        { label: 'Start', date: '2026-10-18', type: 'start' },
        { label: 'Week 8 checkpoint', date: '2026-12-13', type: 'short_term' },
      ],
    });
    expect(form.milestones).toEqual([
      { type: 'start', label: 'Start', date: '2026-10-18', description: '' },
      { type: 'short_term', label: 'Week 8 checkpoint', date: '2026-12-13', description: '' },
    ]);
  });
});

describe('weight and body-fat targets stay in their columns', () => {
  it('does not copy them into routine_blueprint.k11', () => {
    expect(k11MeasureFor({ metric: 'weight', current: 90, target: 78, unit: 'kg' })).toBeUndefined();
    expect(k11MeasureFor({ metric: 'body_fat', current: 30, target: 22, unit: '%' })).toBeUndefined();
    expect(k11MeasureFor(null)).toBeUndefined();
  });

  it('keeps the metrics that have no column in the K11 block', () => {
    expect(k11MeasureFor({
      metric: 'lift', current: 100, target: 120, unit: 'kg', exercise: 'Squat',
    })).toEqual({
      metric: 'lift', exercise: 'Squat', label: null, current: 100, target: 120, unit: 'kg',
    });
  });
});

describe('reading a saved goal target', () => {
  it('uses K11 when present and the target columns otherwise', () => {
    expect(goalMeasureFromRow({
      routine_blueprint: { k11: { measure: { metric: 'lift', target: 120, unit: 'kg', exercise: 'Squat' } } },
    })).toMatchObject({ metric: 'lift', target: 120, exercise: 'Squat' });
    expect(goalMeasureFromRow({ target_weight: '78' }))
      .toEqual({ metric: 'weight', current: null, target: 78, unit: 'kg' });
    expect(goalMeasureFromRow({ target_body_fat: 22 }))
      .toEqual({ metric: 'body_fat', current: null, target: 22, unit: '%' });
    expect(goalMeasureFromRow({})).toBeNull();
  });
});

describe('secondary fitness goals ride on the primary goal', () => {
  it('reads saved rows and drops ones without a name', () => {
    const rows = secondaryGoalsFromRow([
      { id: 'a', title: ' Run 5k ', goal_type: 'endurance', description: 'Race day', target_date: '2027-01-01T00:00:00.000Z' },
      { id: 'b', title: '   ' },
      { title: 'Sleep 7 hours', goal_type: 'not-a-goal' },
    ]);
    expect(rows).toEqual([
      { id: 'a', title: 'Run 5k', goalType: 'endurance', description: 'Race day', targetDate: '2027-01-01' },
      { id: 'sg-row-2', title: 'Sleep 7 hours', goalType: '', description: '', targetDate: '' },
    ]);
  });

  it('caps the list so one record cannot grow without bound', () => {
    const rows = Array.from({ length: MAX_SECONDARY_GOALS + 3 }, (_, i) => ({ title: `Goal ${i}` }));
    expect(secondaryGoalsFromRow(rows)).toHaveLength(MAX_SECONDARY_GOALS);
  });

  it('sends the wire shape and stores an empty list as null', () => {
    expect(secondaryGoalsPayload([
      { id: 'a', title: ' Run 5k ', goalType: 'endurance', description: ' Race day ', targetDate: '2027-01-01' },
      { id: 'b', title: '   ', goalType: '', description: '', targetDate: '' },
    ])).toEqual([
      { id: 'a', title: 'Run 5k', goal_type: 'endurance', description: 'Race day', target_date: '2027-01-01' },
    ]);
    expect(secondaryGoalsPayload([])).toBeNull();
  });

  it('accepts an optional list but rejects an unnamed row or a past date', () => {
    const today = '2026-11-05';
    expect(validateSecondaryGoals([], today)).toBeUndefined();
    expect(validateSecondaryGoals([
      { id: 'a', title: 'Run 5k', goalType: 'endurance', description: '', targetDate: today },
    ], today)).toBeUndefined();
    expect(validateSecondaryGoals([
      { id: 'a', title: ' ', goalType: '', description: '', targetDate: '' },
    ], today)).toMatch(/name/i);
    expect(validateSecondaryGoals([
      { id: 'a', title: 'Run 5k', goalType: '', description: '', targetDate: '2026-11-04' },
    ], today)).toMatch(/today or later/i);
  });

  it('restores secondary goals when a saved goal is edited', () => {
    const form = formFromGoalRow({
      secondary_goals: [{ id: 'a', title: 'Run 5k', goal_type: 'endurance', target_date: '2027-01-01' }],
    });
    expect(form.secondaryGoals).toEqual([
      { id: 'a', title: 'Run 5k', goalType: 'endurance', description: '', targetDate: '2027-01-01' },
    ]);
    expect(formFromGoalRow({}).secondaryGoals).toEqual([]);
  });
});
