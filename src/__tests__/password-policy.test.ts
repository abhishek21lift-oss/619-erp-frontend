import { checkNewPassword, passwordStrength, MIN_LENGTH } from '@/lib/password-policy';

describe('checkNewPassword', () => {
  it('accepts a password meeting every rule', () => {
    expect(checkNewPassword('Sunrise99', 'Sunrise99')).toEqual({ ok: true, error: '' });
  });

  it('rejects an empty field before anything else', () => {
    expect(checkNewPassword('', '').ok).toBe(false);
    expect(checkNewPassword('Sunrise99', '').ok).toBe(false);
  });

  it('enforces the same minimum length as the backend', () => {
    // auth.js rejects under 8. If these ever diverge the user gets a server
    // error after submitting instead of inline guidance before.
    expect(MIN_LENGTH).toBe(8);
    const short = 'Ab1' + 'x'.repeat(MIN_LENGTH - 4);
    expect(checkNewPassword(short, short).ok).toBe(false);
  });

  it('requires an uppercase letter and a digit', () => {
    expect(checkNewPassword('sunrise99', 'sunrise99').error).toMatch(/uppercase/i);
    expect(checkNewPassword('SunriseAA', 'SunriseAA').error).toMatch(/number/i);
  });

  it('catches a mismatch last, so the user fixes one thing at a time', () => {
    // A too-short mismatched pair should complain about length first —
    // reporting "passwords do not match" for a password that was never going
    // to be accepted sends the user down the wrong path.
    expect(checkNewPassword('Ab1', 'Zz9').error).toMatch(/at least/i);
    expect(checkNewPassword('Sunrise99', 'Sunrise98').error).toMatch(/do not match/i);
  });
});

describe('passwordStrength', () => {
  it('scores nothing for an empty password', () => {
    expect(passwordStrength('')).toBe(0);
  });

  it('rises with length and character variety', () => {
    expect(passwordStrength('Sunrise9')).toBeLessThan(passwordStrength('Sunrise99!longer'));
  });

  it('stays within the range the meter can render', () => {
    // The UI indexes STRENGTH_LABEL/STRENGTH_COLOR with this value; anything
    // above 4 would render `undefined`.
    for (const p of ['a', 'Sunrise9', 'Sunrise99!verylongindeed', 'A1!aaaaaaaaaaaaaaaaaaaa']) {
      const s = passwordStrength(p);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(4);
    }
  });
});
