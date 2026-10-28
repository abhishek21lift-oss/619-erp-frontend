// One home per fact.
//
// Sleep, smoking, alcohol, occupation and screen time are scored by the
// Lifestyle assessment; meal timing by Nutrition. The goal wizard used to fall
// back to the Interview's lifestyle answers (and read smoking/alcohol only
// from the Interview), so the two records could disagree and the wizard showed
// whichever one it happened to read. Training frequency has the same shape:
// enrolment writes pt_clients.sessions_per_week, and the Interview's
// training-days answer is only a legacy fallback.
//
// Pinned as source text, as the other page-level contracts are: mounting the
// goal wizard means mocking eight API reads plus draft autosave, which is out
// of proportion to a two-line data-source rule.

import { describe, expect, it } from 'vitest';
import { readApp } from '@/__tests__/helpers/app-routes';

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

describe('meal timing comes from the Nutrition assessment', () => {
  it('reads meal regularity from the nutrition column only', () => {
    expect(goals).toContain('mealRegularity: stringOrNull(nutritionRow.meal_timing_consistency)');
    expect(goals).not.toContain('interview?.lifestyle_meal_regularity');
  });
});

describe('training frequency comes from enrolment', () => {
  it('prefers sessions_per_week over the Interview fallback', () => {
    expect(programDesign).toContain(
      'const trainingDays = num(c.sessions_per_week) ?? num(interview?.lifestyle_training_days);',
    );
  });
});
