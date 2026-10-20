import { describe, it, expect } from 'vitest';
import { clientCreateSchema, blankClientCreate } from '../lib/forms/schemas/client';

function client(over: Partial<Parameters<typeof clientCreateSchema.safeParse>[0]> = {}) {
  return {
    ...blankClientCreate(),
    name: 'Meera Rao',
    gender: 'Female',
    dob: '1990-01-01',
    mobile: '9876543210',
    ...over,
  };
}

describe('clientCreateSchema', () => {
  it('accepts a complete valid client', () => {
    expect(
      clientCreateSchema.safeParse(
        client({
          name: 'Meera Rao',
          gender: 'Female',
          dob: '1990-05-20',
          mobile: '9876543210',
          email: 'meera@example.com',
          emergencyContact: 'Ravi Rao',
          emergencyPhone: '9123456789',
          emergencyRelationship: 'Spouse',
        }),
      ).success,
    ).toBe(true);
  });

  it('refuses a blank name', () => {
    expect(clientCreateSchema.safeParse(client({ name: '' })).success).toBe(false);
    expect(clientCreateSchema.safeParse(client({ name: '  ' })).success).toBe(false);
  });

  it('refuses a name shorter than 3 characters', () => {
    expect(clientCreateSchema.safeParse(client({ name: 'Al' })).success).toBe(false);
  });

  it('requires a gender', () => {
    expect(clientCreateSchema.safeParse(client({ gender: '' })).success).toBe(false);
    expect(clientCreateSchema.safeParse(client({ gender: 'Female' })).success).toBe(true);
  });

  it('requires a mobile number and accepts only a 10-digit Indian mobile', () => {
    expect(clientCreateSchema.safeParse(client({ mobile: '' })).success).toBe(false);
    expect(clientCreateSchema.safeParse(client({ mobile: '123' })).success).toBe(false);
    expect(clientCreateSchema.safeParse(client({ mobile: '9876543210' })).success).toBe(true);
  });

  it('accepts an optional valid WhatsApp number', () => {
    expect(clientCreateSchema.safeParse(client({ whatsapp: '' })).success).toBe(true);
    expect(clientCreateSchema.safeParse(client({ whatsapp: '9123456789' })).success).toBe(true);
    expect(clientCreateSchema.safeParse(client({ whatsapp: '123' })).success).toBe(false);
  });

  it('accepts an optional valid email', () => {
    expect(clientCreateSchema.safeParse(client({ email: '' })).success).toBe(true);
    expect(clientCreateSchema.safeParse(client({ email: 'meera@example.com' })).success).toBe(true);
    expect(clientCreateSchema.safeParse(client({ email: 'not-an-email' })).success).toBe(false);
  });

  it('rejects a future date of birth', () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const iso = nextYear.toISOString().slice(0, 10);
    expect(clientCreateSchema.safeParse(client({ dob: iso })).success).toBe(false);
  });

  it('rejects an age outside 10-100', () => {
    expect(clientCreateSchema.safeParse(client({ dob: '2020-01-01' })).success).toBe(false); // ~6 years old
    expect(clientCreateSchema.safeParse(client({ dob: '1900-01-01' })).success).toBe(false); // >100 years old
    expect(clientCreateSchema.safeParse(client({ dob: '1990-01-01' })).success).toBe(true);
  });

  it('requires the emergency relationship once an emergency contact exists', () => {
    expect(
      clientCreateSchema.safeParse(
        client({ emergencyContact: 'Ravi Rao', emergencyRelationship: '' }),
      ).success,
    ).toBe(false);
    expect(
      clientCreateSchema.safeParse(
        client({ emergencyContact: 'Ravi Rao', emergencyRelationship: 'Spouse' }),
      ).success,
    ).toBe(true);
    // No emergency contact -> relationship optional.
    expect(
      clientCreateSchema.safeParse(
        client({ emergencyContact: '', emergencyRelationship: '' }),
      ).success,
    ).toBe(true);
  });

  it('maps each issue to its field path', () => {
    const r = clientCreateSchema.safeParse(client({ name: '', mobile: '' }));
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => String(i.path[0]));
      expect(paths).toContain('name');
      expect(paths).toContain('mobile');
    }
  });
});
