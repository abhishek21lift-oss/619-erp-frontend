/**
 * Submitting a UPI reference against a subscription checkout.
 *
 * The studio has paid MY PT STUDIO over UPI and is telling us which transaction
 * it was. An operator then matches that reference against the platform bank
 * account by hand — see `components/platform/subscription-requests.tsx` — so
 * what is typed here is the only link between a bank line and an activation.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 * Nothing in the VALUES, and that is worth saying plainly: the UTR box already
 * stripped non-digits, capped at 16, and checked 12–16 before enabling the
 * button. What it lacked was everything around them:
 *
 *   · `if (!valid || busy) return` is not a submit guard. `busy` is state, read
 *     from the render closure, so two taps in one frame both see `false`;
 *   · two `err.message` sites put the server's raw sentence in front of a
 *     paying customer;
 *   · the error paragraph was associated with nothing and announced nothing;
 *   · `maxLength={500}` on the note truncated a paste silently.
 *
 * The 12–16 rule itself moves to `utrField`, where `routes/upi-payments.js` and
 * a CHECK constraint already state the same window — three copies is two too
 * many for a rule that decides whether money can be matched.
 */

import { z } from 'zod';
import { textField } from '../primitives';
import { utrField } from '../domain';

export const submitUtrSchema = z.object({
  utr: utrField({ label: 'UPI reference number', required: true }),
  note: textField({ label: 'Note', maxLength: 500 }),
});

export type SubmitUtrValues = z.output<typeof submitUtrSchema>;
export type SubmitUtrState = { utr: string; note: string };

export function blankSubmitUtr(): SubmitUtrState {
  return { utr: '', note: '' };
}

/**
 * Keep only what a UTR can contain, as it is typed.
 *
 * Pure and exported so the rule is testable. The cap is the schema's maximum,
 * so the box stops rather than accepting a 20-digit paste and then reporting it
 * — a length the user can see running out is better feedback than a refusal
 * afterwards.
 */
export function normalizeUtrInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 16);
}

/** Server messages this endpoint produces, mapped to the field they belong to. */
export const SUBMIT_UTR_FIELD_HINTS: Record<string, string> = {
  'UPI reference must be 12 to 16 digits': 'utr',
};
