// The goal wizard used to write `beginner` and `full_gym` into every goal,
// even when Enrollment had recorded an advanced client with three sessions a
// week — and an edit then reset the saved blueprint's choices to those same
// hardcoded defaults. A new goal must start from the client record, and an
// edit must keep what the blueprint already says.

import { describe, expect, it } from 'vitest';
import { initGoalFormForClient } from '@/components/pt-os/goal-assessment/types';
import { formFromGoalRow } from '@/components/pt-os/goal-assessment/form-from-row';

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
