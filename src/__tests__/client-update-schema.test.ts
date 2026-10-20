import { describe, it, expect } from 'vitest';
import { clientUpdateSchema, blankClientUpdate } from '../lib/forms/schemas/client';

function client(over: Record<string, unknown> = {}) {
  return {
    ...blankClientUpdate(),
    name: 'Meera Rao',
    ...over,
  };
}

describe('clientUpdateSchema', () => {
  it('accepts a valid update with only a name', () => {
    expect(clientUpdateSchema.safeParse(client({ name: 'Meera Rao' })).success).toBe(true);
  });

  it('refuses a missing, empty or whitespace-only name', () => {
    expect(clientUpdateSchema.safeParse(client({ name: '' })).success).toBe(false);
    expect(clientUpdateSchema.safeParse(client({ name: '  ' })).success).toBe(false);
  });

  it('refuses a name shorter than 3 characters', () => {
    expect(clientUpdateSchema.safeParse(client({ name: 'Al' })).success).toBe(false);
  });

  it('accepts optional fields omitted', () => {
    expect(
      clientUpdateSchema.safeParse(
        client({ mobile: '', email: '', gender: '', dob: '', address: '' }),
      ).success,
    ).toBe(true);
  });

  it('accepts optional fields intentionally blank', () => {
    // Whitespace-only optional → null → optional passes (project convention).
    expect(clientUpdateSchema.safeParse(client({ mobile: '   ', email: '   ' })).success).toBe(true);
  });

  it('accepts valid mobile, email, DOB and emergency phone', () => {
    expect(
      clientUpdateSchema.safeParse(
        client({
          mobile: '9876543210',
          email: 'Meera@Example.COM',
          dob: '1990-01-01',
          emergency_phone: '9123456789',
          emergency_contact_relationship: 'Spouse',
        }),
      ).success,
    ).toBe(true);
  });

  it('rejects invalid optional values newly entered', () => {
    expect(clientUpdateSchema.safeParse(client({ mobile: '123' })).success).toBe(false);
    expect(clientUpdateSchema.safeParse(client({ email: 'not-an-email' })).success).toBe(false);
    expect(clientUpdateSchema.safeParse(client({ gender: 'Alien' })).success).toBe(false);
    expect(clientUpdateSchema.safeParse(client({ client_source: 'Twitter' })).success).toBe(false);
    expect(clientUpdateSchema.safeParse(client({ emergency_phone: '123' })).success).toBe(false);
  });

  it('rejects a future DOB and an age outside 10-100', () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    expect(clientUpdateSchema.safeParse(client({ dob: nextYear.toISOString().slice(0, 10) })).success).toBe(false);
    expect(clientUpdateSchema.safeParse(client({ dob: '2020-01-01' })).success).toBe(false); // ~6 years old
    expect(clientUpdateSchema.safeParse(client({ dob: '1900-01-01' })).success).toBe(false); // >100 years old
    expect(clientUpdateSchema.safeParse(client({ dob: '1990-01-01' })).success).toBe(true);
  });

  it('requires the relationship once an emergency contact is present', () => {
    expect(
      clientUpdateSchema.safeParse(
        client({ emergency_contact: 'Ravi Rao', emergency_contact_relationship: '' }),
      ).success,
    ).toBe(false);
    expect(
      clientUpdateSchema.safeParse(
        client({ emergency_contact: 'Ravi Rao', emergency_contact_relationship: 'Spouse' }),
      ).success,
    ).toBe(true);
    // No emergency contact → relationship optional.
    expect(
      clientUpdateSchema.safeParse(
        client({ emergency_contact: '', emergency_contact_relationship: '' }),
      ).success,
    ).toBe(true);
  });

  it('maps each issue to its field path', () => {
    const r = clientUpdateSchema.safeParse(client({ name: '', mobile: '123' }));
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => String(i.path[0]));
      expect(paths).toContain('name');
      expect(paths).toContain('mobile');
    }
  });
});
