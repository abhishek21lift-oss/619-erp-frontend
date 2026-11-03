// One home per fact.
//
// Sleep, smoking, alcohol, occupation and screen time are scored by the
// Lifestyle assessment; meal regularity by the Interview, with Nutrition's
// meal-timing detail as the fallback. Training frequency is the Interview's
// answer, with enrolment's sessions_per_week as the fallback. The goal wizard
// used to fall back to the Interview's lifestyle answers (and read
// smoking/alcohol only from the Interview), so the two records could disagree
// and the wizard showed whichever one it happened to read.
//
// Pinned as source text, as the other page-level contracts are: mounting the
// goal wizard means mocking eight API reads plus draft autosave, which is out
// of proportion to a two-line data-source rule. initGoalFormForClient is a
// pure function and is tested directly.

import { describe, expect, it } from 'vitest';
import { readApp } from '@/__tests__/helpers/app-routes';
import { initGoalFormForClient } from '@/components/pt-os/goal-assessment/types';

const goals = readApp('pt-os', 'goals', 'page.tsx');
const programDesign = readApp('pt-os', 'program-design', 'page.tsx');

describe('lifestyle facts come from the Lifestyle assessment', () => {
  it('reads sleep from the assessment only', () => {
    expect(goals).toContain('const sleep = numberOrNull(lifestyleRow.sleep_duration_hours);');
    expect(goals).not.toContain('interview?.lifestyle_sleep_hours');
  });

  it('reads smoking and alcohol from the assessment columns', () => {
    expect(goals).toContain('smoking: stringOrNull(lifestyleRow.smoking_status)');
    expect(goals).toContain('alcohol: stringOrNull(lifestyleRow.alcohol_status)');
    expect(goals).not.toContain('interview?.lifestyle_smoking');
    expect(goals).not.toContain('interview?.lifestyle_alcohol');
  });

  it('reads occupation and screen time from the assessment only', () => {
    expect(goals).toContain('occupation: stringOrNull(lifestyleRow.occupation_type)');
    expect(goals).toContain('screenTime: stringOrNull(lifestyleRow.screen_time_bracket)');
    expect(goals).not.toContain('interview?.lifestyle_occupation');
    expect(goals).not.toContain('interview?.lifestyle_screen_time');
  });
});

describe('meal regularity is owned by the Interview, detail by Nutrition', () => {
  it('reads the Interview first and Nutrition only as the fallback', () => {
    expect(goals).toContain(
      'mealRegularity: stringOrNull(interview?.lifestyle_meal_regularity) ?? stringOrNull(nutritionRow.meal_timing_consistency)',
    );
  });
});

describe('training frequency is owned by the Interview', () => {
  it('prefers the Interview over the enrolment copy in program design', () => {
    expect(programDesign).toContain(
      'const trainingDays = num(interview?.lifestyle_training_days) ?? num(c.sessions_per_week);',
    );
  });

  it('prefers the Interview over the enrolment copy in a new goal', () => {
    expect(initGoalFormForClient({ lifestyle_training_days: 5, sessions_per_week: 2 }).trainingDays).toBe('5');
    expect(initGoalFormForClient({ sessions_per_week: 2 }).trainingDays).toBe('2');
    expect(initGoalFormForClient({}).trainingDays).toBe('3');
  });
});
