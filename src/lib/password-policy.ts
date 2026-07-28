/**
 * The one place the password rules live.
 *
 * They were previously written out inline in the change-password form. With a
 * forgot/reset flow added there are now three places a new password can be
 * set, and three copies of a validation rule drift — you end up rejecting a
 * password on one screen that another screen would have accepted, which reads
 * to the user as the app being broken.
 *
 * MIN_LENGTH matches the backend (auth.js rejects anything under 8). The
 * uppercase and digit rules are frontend-only guidance: the backend does not
 * enforce them, so they must never be the *reason* something fails after
 * submission — they exist to stop weak passwords being chosen in the first
 * place, and are checked before the request goes out.
 */

export const MIN_LENGTH = 8;

export interface PasswordCheck {
  ok: boolean;
  /** User-facing reason, or '' when ok. */
  error: string;
}

/**
 * Validate a new password and its confirmation.
 * Returns the FIRST failure, so the user fixes one thing at a time rather than
 * being handed a wall of complaints.
 */
export function checkNewPassword(password: string, confirm: string): PasswordCheck {
  if (!password || !confirm) return { ok: false, error: 'Please fill in both password fields.' };
  if (password.length < MIN_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_LENGTH} characters long.` };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: 'Password must contain at least one number.' };
  }
  if (password !== confirm) {
    return { ok: false, error: 'Passwords do not match.' };
  }
  return { ok: true, error: '' };
}

/** 0–4, for a strength meter. Deliberately simple and honest about what it measures. */
export function passwordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= MIN_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

/* ── Invitation activation ─────────────────────────────────────────────── */

export interface Rule { label: string; ok: boolean }

/**
 * The rules for a brand-new admin activating their studio.
 *
 * Stricter than checkNewPassword above, and deliberately a SEPARATE function
 * rather than a tightening of it. The two are enforced by different backends:
 * auth.js checks only length, while routes/invitations.js checks all five. If
 * this tightened the shared helper, the reset and change-password screens
 * would start rejecting passwords their own endpoints would happily accept —
 * a rule that exists only in the UI and fails nothing is worse than no rule.
 *
 * These five mirror routes/invitations.js exactly. When they drift, the user
 * sees a form that passed locally and then failed on submit with a different
 * message, which reads as the app being broken.
 */
export function invitationPasswordRules(password: string): Rule[] {
  return [
    { label: `At least ${MIN_LENGTH} characters`, ok: password.length >= MIN_LENGTH },
    { label: 'A lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'An uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'A number', ok: /[0-9]/.test(password) },
    { label: 'A special character', ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

/** First failure, or '' when every rule passes and the confirmation matches. */
export function checkInvitationPassword(password: string, confirm: string): string {
  const failed = invitationPasswordRules(password).find((r) => !r.ok);
  if (failed) return `Password needs: ${failed.label.toLowerCase()}.`;
  if (password !== confirm) return 'Passwords do not match.';
  return '';
}
