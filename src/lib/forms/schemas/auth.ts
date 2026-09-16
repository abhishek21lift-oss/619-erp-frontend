/**
 * The signed-out forms: sign in, request a reset, set a new password.
 *
 * ── Why the password rules come from `password-policy.ts` ──────────────────
 *
 * They already live there, and `password-policy.ts` explains at length why
 * `checkNewPassword` and `checkInvitationPassword` are DELIBERATELY different
 * functions: the two are enforced by different endpoints, and tightening the
 * shared one would make the reset screen reject passwords its own endpoint
 * would accept — a rule that exists only in the UI and fails nothing.
 *
 * That reasoning is still right, so this module wraps those functions rather
 * than restating their rules in Zod. Restating them is how the fourth copy of
 * a validation rule gets written, and a schema that disagrees with the policy
 * module is worse than no schema at all.
 *
 * ── Why the confirmation error lands on the CONFIRM field ──────────────────
 *
 * "Passwords do not match" is a statement about the pair, and putting it on the
 * first box tells someone their new password is wrong when it is fine. The
 * field they need to edit is the second one, which is also the one they just
 * left, so that is where the message goes — the same reasoning `refineDateOrder`
 * uses to blame the END of a date range.
 */

import { z } from 'zod';
import { emailField, textField } from '../primitives';
import {
  MIN_LENGTH, checkNewPassword, checkInvitationPassword,
} from '../../password-policy';

/* ── Sign in ─────────────────────────────────────────────────────────────── */

export const signInSchema = z.object({
  /**
   * An email, checked against the server's own rule and not a stricter one.
   *
   * `lib/validation.js` types the login body's `email` as `z.string().email()`,
   * so a non-email identifier is refused server-side whatever this does. The
   * point of checking it here is only that "Enter a valid email address" beside
   * the box beats a round trip and a form-level rejection.
   *
   * The regex it replaces was the FIFTH inline copy of
   * `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` in this tree.
   */
  email: emailField({ label: 'Email', required: true }),
  /**
   * Present, and nothing else.
   *
   * No length or shape rule on purpose: a sign-in form that validates the
   * password's FORMAT publishes the policy to anyone who opens it, and tells a
   * user whose password predates the current rule that their correct password
   * is invalid. Only the server may judge a password at sign-in, and all it may
   * say is yes or no.
   */
  password: textField({ label: 'Password', required: true, maxLength: 512 }),
  remember: z.boolean(),
});

export type SignInValues = z.output<typeof signInSchema>;
export type SignInState = { email: string; password: string; remember: boolean };

export function blankSignIn(remember = true): SignInState {
  return { email: '', password: '', remember };
}

/* ── Forgot password ─────────────────────────────────────────────────────── */

export const forgotPasswordSchema = z.object({
  email: emailField({ label: 'Email', required: true }),
});

export type ForgotPasswordValues = z.output<typeof forgotPasswordSchema>;
export type ForgotPasswordState = { email: string };

export function blankForgotPassword(): ForgotPasswordState {
  return { email: '' };
}

/* ── New password ────────────────────────────────────────────────────────── */

export type NewPasswordState = { password: string; confirm: string };

export function blankNewPassword(): NewPasswordState {
  return { password: '', confirm: '' };
}

/**
 * Build a new-password schema around one of the two policies.
 *
 * @param strict when true, applies the five-rule invitation policy that
 *        `routes/invitations.js` enforces; otherwise the three-rule policy
 *        `auth.js` allows. The caller picks by which endpoint it is posting to,
 *        which is the only thing that makes either rule honest.
 */
export function newPasswordSchema(strict: boolean) {
  return z
    .object({
      password: z.string(),
      confirm: z.string(),
    })
    .superRefine((v, ctx) => {
      const message = strict
        ? checkInvitationPassword(v.password, v.confirm)
        : (checkNewPassword(v.password, v.confirm).error);

      if (!message) return;

      // The pair rule lands on `confirm`; everything else is about the password
      // itself and lands there.
      const onConfirm = message === 'Passwords do not match.';
      ctx.addIssue({
        code: 'custom',
        path: [onConfirm ? 'confirm' : 'password'],
        message:
          message === 'Please fill in both password fields.' && v.password === ''
            ? 'Password is required.'
            : message,
      });
    });
}

export type NewPasswordValues = z.output<ReturnType<typeof newPasswordSchema>>;

/** Re-exported so a call site needs one import for the field and its hint. */
export { MIN_LENGTH };

/**
 * Server messages these endpoints produce, mapped to the field they belong to.
 *
 * Sparse on purpose: the auth endpoints are enumeration-safe and answer with
 * deliberately vague sentences, so most of what they say belongs at form level.
 * Attributing a vague message to a field would point at a box that may be fine.
 */
export const NEW_PASSWORD_FIELD_HINTS: Record<string, string> = {
  'Password must be at least 8 characters': 'password',
  'Passwords do not match': 'confirm',
};
