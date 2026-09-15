/**
 * The signed-out forms.
 *
 * The property most worth pinning is the one `password-policy.ts` argues for
 * at length: the reset screen and the invitation screen enforce DIFFERENT
 * rules, because they post to different endpoints, and a schema that unified
 * them would make one screen reject passwords its own endpoint would accept.
 */

import { describe, it, expect } from 'vitest';
import {
  signInSchema, blankSignIn,
  forgotPasswordSchema,
  newPasswordSchema, blankNewPassword,
} from '../lib/forms/schemas/auth';

function issues(r: { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } }) {
  return r.success ? [] : r.error!.issues.map((i) => ({ path: String(i.path[0] ?? ''), message: i.message }));
}

describe('sign in', () => {
  it('accepts an email, lower-cased and trimmed as the server stores it', () => {
    const r = signInSchema.safeParse({ email: ' Owner@Studio.com ', password: 'hunter22', remember: true });
    expect(r.success).toBe(true);
    expect(r.data!.email).toBe('owner@studio.com');
  });

  it('refuses a non-email, matching the server’s own rule rather than exceeding it', () => {
    // lib/validation.js types the login body's email as z.string().email(), so
    // this is the same rule one round trip earlier — not a stricter one.
    expect(signInSchema.safeParse({ email: 'owner', password: 'x', remember: false }).success).toBe(false);
  });

  it('does not judge the password’s format', () => {
    // A sign-in form validating password SHAPE publishes the policy to anyone
    // who opens it, and tells a user whose password predates the current rule
    // that their correct password is invalid.
    expect(signInSchema.safeParse({ email: 'a@b.com', password: 'a', remember: false }).success).toBe(true);
  });

  it('refuses a blank email or a blank password', () => {
    expect(signInSchema.safeParse({ email: '', password: 'x', remember: false }).success).toBe(false);
    expect(signInSchema.safeParse({ email: 'a@b.com', password: '   ', remember: false }).success).toBe(false);
  });

  it('starts with remember on, and carries the caller’s preference', () => {
    expect(blankSignIn().remember).toBe(true);
    expect(blankSignIn(false).remember).toBe(false);
  });
});

describe('forgot password', () => {
  it('accepts a valid address and trims it', () => {
    const r = forgotPasswordSchema.safeParse({ email: '  Owner@Studio.com ' });
    expect(r.success).toBe(true);
    expect(r.data!.email).toBe('owner@studio.com');
  });

  it.each(['', '   ', 'owner', 'owner@', '@studio.com', 'owner @studio.com'])(
    'refuses %j', (bad) => {
      expect(forgotPasswordSchema.safeParse({ email: bad }).success).toBe(false);
    },
  );
});

describe('a new password, under the rule its own endpoint enforces', () => {
  const lenient = newPasswordSchema(false);
  const strict = newPasswordSchema(true);

  it('accepts eight characters with an upper and a digit under the reset rule', () => {
    expect(lenient.safeParse({ password: 'Hunter22', confirm: 'Hunter22' }).success).toBe(true);
  });

  it('refuses the same password under the invitation rule, which wants a symbol', () => {
    // NOT a contradiction, and the whole reason these are two functions:
    // auth.js checks length, routes/invitations.js checks all five. A single
    // shared rule would make one of the two screens lie about its endpoint.
    const r = strict.safeParse({ password: 'Hunter22', confirm: 'Hunter22' });
    expect(r.success).toBe(false);
    expect(issues(r)[0]!.message).toMatch(/special character/);
  });

  it('accepts a password that satisfies all five under the invitation rule', () => {
    expect(strict.safeParse({ password: 'Hunter22!', confirm: 'Hunter22!' }).success).toBe(true);
  });

  it('blames the CONFIRM field when the pair does not match', () => {
    // "Passwords do not match" on the first box tells someone their new
    // password is wrong when it is fine. The field to edit is the second one.
    for (const schema of [lenient, strict]) {
      const r = schema.safeParse({ password: 'Hunter22!', confirm: 'Hunter23!' });
      expect(r.success).toBe(false);
      expect(issues(r)[0]).toEqual({ path: 'confirm', message: 'Passwords do not match.' });
    }
  });

  it('blames the PASSWORD field for every rule about the password itself', () => {
    const r = lenient.safeParse({ password: 'short', confirm: 'short' });
    expect(issues(r)[0]!.path).toBe('password');
  });

  it('reports a blank password as required rather than as "fill in both"', () => {
    const r = lenient.safeParse({ password: '', confirm: '' });
    expect(r.success).toBe(false);
    expect(issues(r)[0]).toEqual({ path: 'password', message: 'Password is required.' });
  });

  it('reports only the FIRST failure, so one thing is fixed at a time', () => {
    const r = strict.safeParse({ password: 'a', confirm: 'b' });
    expect(issues(r)).toHaveLength(1);
  });

  it('starts blank', () => {
    expect(blankNewPassword()).toEqual({ password: '', confirm: '' });
  });
});
