// The activation password rules.
//
// These exist in two places by necessity — routes/invitations.js on the server
// and password-policy.ts here — because the client check is a courtesy that a
// curl request skips entirely. When they drift, a user sees a form that passed
// locally and then failed on submit with a different message, which reads as
// the app being broken. So the point of these tests is that the two agree.

import { describe, it, expect } from 'vitest';
import {
  invitationPasswordRules,
  checkInvitationPassword,
  checkNewPassword,
  MIN_LENGTH,
} from '@/lib/password-policy';

const ok = (pw: string) => invitationPasswordRules(pw).every((r) => r.ok);

describe('invitationPasswordRules — mirrors the server', () => {
  it('lists all five rules, so the UI can show a checklist', () => {
    // A checklist is what tells someone what to type next; "strength: fair"
    // does not.
    expect(invitationPasswordRules('')).toHaveLength(5);
  });

  it.each([
    ['too short', 'Aa1!x'],
    ['no lowercase', 'PASSWORD1!'],
    ['no uppercase', 'password1!'],
    ['no number', 'Password!'],
    ['no special character', 'Password1'],
  ])('fails a password that is %s', (_l, pw) => {
    expect(ok(pw)).toBe(false);
  });

  it('passes one that meets every rule', () => {
    expect(ok('Str0ng!Pass')).toBe(true);
  });

  it('accepts a password of exactly the minimum length', () => {
    // Off-by-one here would reject a password the server accepts.
    const pw = `Aa1!${'x'.repeat(MIN_LENGTH - 4)}`;
    expect(pw).toHaveLength(MIN_LENGTH);
    expect(ok(pw)).toBe(true);
  });

  it('rejects one character below the minimum', () => {
    expect(ok(`Aa1!${'x'.repeat(MIN_LENGTH - 5)}`)).toBe(false);
  });
});

describe('checkInvitationPassword', () => {
  it('reports the first unmet rule rather than a wall of complaints', () => {
    expect(checkInvitationPassword('short', 'short')).toMatch(/at least/i);
  });

  it('catches a mismatch only once the password itself is valid', () => {
    // Complaining about the confirmation while the password is still being
    // typed is noise; the rule that actually blocks submission comes first.
    expect(checkInvitationPassword('Str0ng!Pass', 'Str0ng!Pas')).toMatch(/do not match/i);
  });

  it('returns empty when everything passes', () => {
    expect(checkInvitationPassword('Str0ng!Pass', 'Str0ng!Pass')).toBe('');
  });
});

describe('the two policies stay separate on purpose', () => {
  it('does not tighten the shared reset/change-password rule', () => {
    // auth.js enforces length alone on those flows. If the shared helper
    // adopted the invitation rules, those screens would start rejecting
    // passwords their own endpoint would happily accept — a rule that exists
    // only in the UI and fails nothing.
    const noSpecialChar = 'Password1';
    expect(checkNewPassword(noSpecialChar, noSpecialChar).ok).toBe(true);
    expect(checkInvitationPassword(noSpecialChar, noSpecialChar)).not.toBe('');
  });

  it('is strictly stronger — anything it accepts, the shared rule accepts too', () => {
    // The invitation flow must never be the LOOSER of the two, which would
    // let a new admin choose a password the rest of the app would reject.
    for (const pw of ['Str0ng!Pass', 'Aa1!aaaa', 'Zz9#zzzzzz']) {
      expect(checkInvitationPassword(pw, pw)).toBe('');
      expect(checkNewPassword(pw, pw).ok).toBe(true);
    }
  });
});
