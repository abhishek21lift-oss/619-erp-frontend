import { describe, it, expect } from 'vitest';
import { memberHabitSchema, blankMemberHabit } from '../lib/forms/schemas/memberHabit';

function habit(over: Record<string, string> = {}) {
  return { ...blankMemberHabit(null, '2026-10-19'), ...over };
}

describe('memberHabitSchema', () => {
  it('refuses a day with no measurements and no note', () => {
    expect(memberHabitSchema.safeParse(habit()).success).toBe(false);
  });

  it('accepts a notes-only day and a single measurement', () => {
    expect(memberHabitSchema.safeParse(habit({ notes: 'Travel day, no readings.' })).success).toBe(true);
    expect(memberHabitSchema.safeParse(habit({ sleepHours: '7.5' })).success).toBe(true);
  });

  it('still enforces ranges on optional fields', () => {
    expect(memberHabitSchema.safeParse(habit({ sleepHours: '25' })).success).toBe(false);
    expect(memberHabitSchema.safeParse(habit({ steps: '-1' })).success).toBe(false);
    expect(memberHabitSchema.safeParse(habit({ recoveryLevel: '6' })).success).toBe(false);
  });
});
