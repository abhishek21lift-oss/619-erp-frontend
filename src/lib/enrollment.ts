/**
 * The bits of PT enrolment that are data rather than markup.
 *
 * They live here and not in the page because a Next.js app-router page may
 * only export the handful of names the framework knows about — a named export
 * beside the default is a type error, which is how this module came to exist.
 * It earns its keep anyway: these three are the parts worth testing, and
 * ageFrom is duplicated from the backend's ptEnrollmentPdf.js, so having one
 * obvious place for it makes the divergence visible if it ever happens.
 */

/** Must match PAYMENT_METHODS in the backend's pt-os.routes.js. The server
 *  rejects anything else with a 400, which is the right place for the rule to
 *  live — this list only decides what the UI offers. */
export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'UPI', label: 'UPI', icon: '📱' },
  { value: 'CARD', label: 'Card', icon: '💳' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
  { value: 'SPLIT', label: 'Split Payment', icon: '🧩' },
];

/** The wording the client agrees to. Stored alongside the signature, because
 *  this text will change and "they ticked a box" is worthless evidence if
 *  nobody can say which box. */
export const AGREEMENT_TEXT =
  'I confirm that the programme details, dates and fees shown above are correct and agreed. '
  + 'I understand that training carries inherent physical risk, that I have disclosed any medical '
  + 'condition relevant to exercise, and that fees already paid are non-refundable except at the '
  + "studio's discretion. I agree to the studio's cancellation and rescheduling policy.";

/** Whole years, or null when the date of birth is missing or implausible.
 *  Mirrors ageFrom() in the backend's ptEnrollmentPdf.js so the header and the
 *  printed form cannot disagree about somebody's age. */
export function ageFrom(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  // This clamp is doing two jobs: rejecting a mistyped year (1098 → "age 928"),
  // and catching an invalid date even without the isNaN guard above, since
  // NaN >= 0 is false. Removing it because "isNaN already handles that" would
  // lose the first job silently.
  return age >= 0 && age < 130 ? age : null;
}
