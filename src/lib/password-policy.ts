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
