import { describe, it, expect } from 'vitest';
import { clientEnrollSchema, blankClientEnroll } from '../lib/forms/schemas/client';

/** The eight fields the enrolment form validates, all filled. */
function enroll(over: Record<string, unknown> = {}) {
  return {
    ...blankClientEnroll(),
    startDate: '2026-10-01',
    duration: '3',
    trainingMode: 'Offline',
    workoutTime: '09:00',
    trainingDays: ['Mon', 'Wed', 'Fri'],
    sessionsPerWeek: '3',
    finalAmount: '9000',
    amountPaid: '0',
    ...over,
  };
}

describe('clientEnrollSchema', () => {
  it('accepts a complete valid enrolment', () => {
    expect(clientEnrollSchema.safeParse(enroll()).success).toBe(true);
  });

  it('ignores the form fields the payload does not validate (legacy safety)', () => {
    // The page holds trainer/experience/payment fields too, and some legacy
    // records carry malformed values there. They are not part of the PATCH
    // this schema guards, so they must never block a valid enrolment.
    expect(
      clientEnrollSchema.safeParse(
        enroll({
          trainerId: 'not-a-uuid',
          trainerName: '',
          workoutExperienceLevel: 'legacy-value',
          previousTrainerExperience: false,
          paymentMethod: 'legacy-value',
        }),
      ).success,
    ).toBe(true);
  });

  it('normalises parsed values for the eight guarded fields', () => {
    const r = clientEnrollSchema.safeParse(
      enroll({ duration: '6', finalAmount: '8,000', amountPaid: '8000', workoutTime: '6:05' }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.duration).toBe(6);
      expect(r.data.finalAmount).toBe(8000);
      expect(r.data.amountPaid).toBe(8000);
      expect(r.data.workoutTime).toBe('06:05');
      expect(r.data.trainingDays).toEqual(['Mon', 'Wed', 'Fri']);
    }
  });

  it('requires every required field', () => {
    for (const blank of ['startDate', 'duration', 'trainingMode', 'workoutTime', 'sessionsPerWeek', 'finalAmount', 'amountPaid']) {
      expect(clientEnrollSchema.safeParse(enroll({ [blank]: '' })).success).toBe(false);
    }
  });

  it('requires at least one training day', () => {
    expect(clientEnrollSchema.safeParse(enroll({ trainingDays: [] })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ trainingDays: ['Mon'] })).success).toBe(true);
  });

  it('accepts a whole-number duration in the backend 1-60 range, including legacy >12', () => {
    expect(clientEnrollSchema.safeParse(enroll({ duration: '1' })).success).toBe(true);
    expect(clientEnrollSchema.safeParse(enroll({ duration: '13' })).success).toBe(true);
    expect(clientEnrollSchema.safeParse(enroll({ duration: '60' })).success).toBe(true);
    expect(clientEnrollSchema.safeParse(enroll({ duration: '0' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ duration: '61' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ duration: '2.5' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ duration: 'abc' })).success).toBe(false);
  });

  it('requires sessions per week in 1-7', () => {
    expect(clientEnrollSchema.safeParse(enroll({ sessionsPerWeek: '1' })).success).toBe(true);
    expect(clientEnrollSchema.safeParse(enroll({ sessionsPerWeek: '7' })).success).toBe(true);
    expect(clientEnrollSchema.safeParse(enroll({ sessionsPerWeek: '0' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ sessionsPerWeek: '8' })).success).toBe(false);
  });

  it('requires a final amount greater than zero', () => {
    expect(clientEnrollSchema.safeParse(enroll({ finalAmount: '0', amountPaid: '0' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ finalAmount: '-100', amountPaid: '0' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ finalAmount: '0.01', amountPaid: '0' })).success).toBe(true);
  });

  it('accepts Amount Paid from zero up to the Final Selling Price, never above', () => {
    expect(clientEnrollSchema.safeParse(enroll({ finalAmount: '9000', amountPaid: '0' })).success).toBe(true);
    expect(clientEnrollSchema.safeParse(enroll({ finalAmount: '9000', amountPaid: '9000' })).success).toBe(true);
    expect(clientEnrollSchema.safeParse(enroll({ finalAmount: '9000', amountPaid: '9001' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ finalAmount: '9000', amountPaid: '-1' })).success).toBe(false);
  });

  it('rejects an impossible calendar date', () => {
    expect(clientEnrollSchema.safeParse(enroll({ startDate: '2026-02-31' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ startDate: '2026-02-28' })).success).toBe(true);
  });

  it('rejects an impossible time', () => {
    expect(clientEnrollSchema.safeParse(enroll({ workoutTime: '25:00' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ workoutTime: '09:60' })).success).toBe(false);
  });

  it('maps each issue to its field path', () => {
    // One failing field per parse: a field-level transform failure stops Zod
    // from running the cross-field refinement, so combining them would only
    // ever surface the first.
    const cases: [Record<string, unknown>, string][] = [
      [{ startDate: '' }, 'startDate'],
      [{ finalAmount: '0' }, 'finalAmount'],
      [{ finalAmount: '9000', amountPaid: '9001' }, 'amountPaid'],
      [{ trainingDays: [] }, 'trainingDays'],
    ];
    for (const [over, field] of cases) {
      const r = clientEnrollSchema.safeParse(enroll(over));
      expect(r.success, field).toBe(false);
      if (!r.success) expect(r.error.issues.map((i) => String(i.path[0])), field).toContain(field);
    }
  });
});
