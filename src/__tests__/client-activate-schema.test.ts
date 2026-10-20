import { describe, it, expect } from 'vitest';
import { clientActivateSchema, blankClientActivate } from '../lib/forms/schemas/client';

function activate(over: Record<string, unknown> = {}) {
  return { ...blankClientActivate(), ...over };
}

describe('clientActivateSchema', () => {
  it('accepts a strong password with a matching confirmation', () => {
    expect(
      clientActivateSchema.safeParse(
        activate({ password: 'Str0ng!Pass', confirm: 'Str0ng!Pass' }),
      ).success,
    ).toBe(true);
  });

  it('refuses a missing or empty password', () => {
    expect(clientActivateSchema.safeParse(activate({ password: '' })).success).toBe(false);
    expect(clientActivateSchema.safeParse(activate({ password: '   ' })).success).toBe(false);
  });

  it('refuses a password shorter than 8 characters', () => {
    expect(clientActivateSchema.safeParse(activate({ password: 'Ab1!', confirm: 'Ab1!' })).success).toBe(false);
  });

  it('refuses a password missing each character class', () => {
    expect(clientActivateSchema.safeParse(activate({ password: 'STRONGPASS', confirm: 'STRONGPASS' })).success).toBe(false); // no lowercase, no number, no special
    expect(clientActivateSchema.safeParse(activate({ password: 'StrongPass', confirm: 'StrongPass' })).success).toBe(false); // no number, no special
    expect(clientActivateSchema.safeParse(activate({ password: 'strongpass1', confirm: 'strongpass1' })).success).toBe(false); // no uppercase, no special
    expect(clientActivateSchema.safeParse(activate({ password: 'StrongPass1', confirm: 'StrongPass1' })).success).toBe(false); // no special character
  });

  it('accepts each character class present', () => {
    expect(
      clientActivateSchema.safeParse(activate({ password: 'Str0ng!Pass', confirm: 'Str0ng!Pass' })).success,
    ).toBe(true);
  });

  it('refuses a mismatched confirmation', () => {
    expect(
      clientActivateSchema.safeParse(activate({ password: 'Str0ng!Pass', confirm: 'Str0ng!Pass2' })).success,
    ).toBe(false);
  });

  it('refuses an empty confirmation when the password is set', () => {
    expect(clientActivateSchema.safeParse(activate({ password: 'Str0ng!Pass', confirm: '' })).success).toBe(false);
  });

  it('maps each issue to its field path', () => {
    const r = clientActivateSchema.safeParse(activate({ password: 'short', confirm: 'short' }));
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => String(i.path[0]));
      expect(paths).toContain('password');
    }
  });
});
