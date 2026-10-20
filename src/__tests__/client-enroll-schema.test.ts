import { describe, it, expect } from 'vitest';
import { clientEnrollSchema, blankClientEnroll } from '../lib/forms/schemas/client';

function enroll(over: Record<string, unknown> = {}) {
  return {
    ...blankClientEnroll(),
    startDate: '2026-10-01',
    duration: '3',
    sessionsPerWeek: '3',
    finalAmount: '9000',
    amountPaid: '0',
    trainingDays: ['Mon'],
    ...over,
  };
}

describe('clientEnrollSchema', () => {
  it('accepts a complete valid enrolment', () => {
    expect(
      clientEnrollSchema.safeParse(
        enroll({
          trainingMode: 'Offline',
          workoutExperienceLevel: 'beginner',
          workoutTime: '09:00',
          trainingDays: ['Mon', 'Wed', 'Fri'],
          paymentMethod: 'UPI',
          mobile: '9876543210',
          email: 'meera@example.com',
          gender: 'Female',
          dob: '1990-01-01',
          address: 'Flat 4B, MG Road',
          emergency_contact: 'Ravi Rao',
          emergency_phone: '9123456789',
          emergency_contact_relationship: 'Spouse',
          client_source: 'Walk-in',
        }),
      ).success,
    ).toBe(true);
  });

  it('accepts optional fields omitted (required fields present)', () => {
    expect(
      clientEnrollSchema.safeParse(
        enroll({
          trainingMode: '',
          workoutExperienceLevel: '',
          workoutTime: '',
          paymentMethod: '',
          mobile: '',
          email: '',
          gender: '',
          dob: '',
          address: '',
          emergency_contact: '',
          emergency_phone: '',
          emergency_contact_relationship: '',
          client_source: '',
        }),
      ).success,
    ).toBe(true);
  });

  it('accepts the payload the enrolment page sends (optional keys absent)', () => {
    // The page's EnrollFormData carries only the fields it edits. Client
    // fields (mobile, gender, dob, …) are not keys at all, so the schema
    // must treat "absent" as "not supplied" rather than as invalid input.
    expect(
      clientEnrollSchema.safeParse({
        startDate: '2026-10-21',
        duration: '3',
        trainerId: '',
        trainerName: '',
        trainingMode: 'Offline',
        workoutExperienceLevel: '',
        previousTrainerExperience: false,
        workoutTime: '07:00',
        trainingDays: ['Mon', 'Wed', 'Fri'],
        sessionsPerWeek: '3',
        finalAmount: '18,000',
        amountPaid: '6,000',
        paymentMethod: '',
      }).success,
    ).toBe(true);
  });

  it('requires start date, duration, sessions per week, final amount and amount paid', () => {
    expect(clientEnrollSchema.safeParse(enroll({ startDate: '' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ duration: '' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ sessionsPerWeek: '' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ finalAmount: '' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ amountPaid: '' })).success).toBe(false);
  });

  it('requires at least one training day', () => {
    expect(clientEnrollSchema.safeParse(enroll({ trainingDays: [] })).success).toBe(false);
    expect(
      clientEnrollSchema.safeParse(enroll({ trainingDays: ['Mon'] })).success,
    ).toBe(true);
  });

  it('rejects invalid optional values newly entered', () => {
    expect(clientEnrollSchema.safeParse(enroll({ mobile: '123' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ email: 'not-an-email' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ gender: 'Alien' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ client_source: 'Twitter' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ emergency_phone: '123' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ trainingMode: 'InPerson' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ paymentMethod: 'Paytm' })).success).toBe(false);
  });

  it('rejects an amount paid exceeding the final amount', () => {
    expect(
      clientEnrollSchema.safeParse(
        enroll({ finalAmount: '5000', amountPaid: '9000' }),
      ).success,
    ).toBe(false);
    expect(
      clientEnrollSchema.safeParse(enroll({ finalAmount: '9000', amountPaid: '9000' })).success,
    ).toBe(true);
  });

  it('maps each issue to its field path', () => {
    // startDate empty → issue on startDate.
    const r1 = clientEnrollSchema.safeParse(enroll({ startDate: '' }));
    expect(r1.success).toBe(false);
    if (!r1.success) {
      const paths = r1.error.issues.map((i) => String(i.path[0]));
      expect(paths).toContain('startDate');
    }
  });

  it('requires the emergency relationship once an emergency contact exists', () => {
    expect(
      clientEnrollSchema.safeParse(
        enroll({ emergency_contact: 'Ravi Rao', emergency_contact_relationship: '' }),
      ).success,
    ).toBe(false);
    expect(
      clientEnrollSchema.safeParse(
        enroll({ emergency_contact: 'Ravi Rao', emergency_contact_relationship: 'Spouse' }),
      ).success,
    ).toBe(true);
  });

  it('refuses a zero final amount (an enrolment for nothing)', () => {
    const result = clientEnrollSchema.safeParse(enroll({ finalAmount: '0', amountPaid: '0' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        'Final Selling Price must be greater than zero.',
      );
    }
  });

  it('rejects negative amounts', () => {
    expect(clientEnrollSchema.safeParse(enroll({ finalAmount: '-100' })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ amountPaid: '-100' })).success).toBe(false);
  });

  it('rejects a future date of birth and an age outside 10-100', () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    expect(clientEnrollSchema.safeParse(enroll({ dob: nextYear.toISOString().slice(0, 10) })).success).toBe(false);
    expect(clientEnrollSchema.safeParse(enroll({ dob: '2020-01-01' })).success).toBe(false); // ~6 years old
    expect(clientEnrollSchema.safeParse(enroll({ dob: '1900-01-01' })).success).toBe(false); // >100 years old
    expect(clientEnrollSchema.safeParse(enroll({ dob: '1990-01-01' })).success).toBe(true);
  });

  it('maps each issue to its field path', () => {
    // startDate empty → issue on startDate.
    const r1 = clientEnrollSchema.safeParse(enroll({ startDate: '' }));
    expect(r1.success).toBe(false);
    if (!r1.success) {
      const paths = r1.error.issues.map((i) => String(i.path[0]));
      expect(paths).toContain('startDate');
    }
  });
});
