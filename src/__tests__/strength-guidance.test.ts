import { describe, it, expect } from 'vitest';
import { strengthCategoryGap } from '@/components/pt-os/fitness-testing/strengthGuidance';

describe('strengthCategoryGap', () => {
  it('explains an unsupported lift on its own', () => {
    // This is the case the combined panel used to hide: Bench Press classified,
    // Squat not, because only Bench Press and Leg Press have K11 tables.
    expect(strengthCategoryGap('Squat', 150, null, 80, 'Male', 30))
      .toBe('No K11 percentile reference is supplied for Squat. Bench Press and Leg Press are the only supported tests.');
  });

  it('keeps the missing-table reason even when age is also unsupported', () => {
    expect(strengthCategoryGap('Deadlift', 150, null, 80, 'Male', 18)).toContain('No K11 percentile reference');
  });

  it('explains a supported lift with no age band', () => {
    expect(strengthCategoryGap('Bench Press', 100, null, 80, 'Male', 19)).toContain('age 20 or over');
    expect(strengthCategoryGap('Bench Press', 100, null, 80, 'Male', null)).toContain('no date of birth');
  });

  it('explains a supported lift with no supported sex', () => {
    expect(strengthCategoryGap('Bench Press', 100, null, 80, null, 30)).toContain('sex-specific');
    expect(strengthCategoryGap('Bench Press', 100, null, 80, 'Other', 30)).toContain('sex-specific');
  });

  it('says nothing when there is no 1RM, no body weight, or a category already', () => {
    expect(strengthCategoryGap('Squat', null, null, 80, 'Male', 30)).toBeNull();
    expect(strengthCategoryGap('Bench Press', 100, null, null, 'Male', 30)).toBeNull();
    expect(strengthCategoryGap('Bench Press', 100, 'Average', 80, 'Male', 30)).toBeNull();
  });

  it('still explains an unsupported lift before a body weight is entered', () => {
    expect(strengthCategoryGap('Squat', 150, null, null, 'Male', 30)).toContain('No K11 percentile reference');
  });
});
