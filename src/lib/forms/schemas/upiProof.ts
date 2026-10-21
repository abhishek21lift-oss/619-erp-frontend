/**
 * The member's UPI payment proof — the reference and the note beside it.
 *
 * This is the member-facing counterpart to the platform checkout's
 * `submitUtrSchema`. Both tell a human which bank line to match against a
 * payment, so both use the same `utrField` (12–16 digits, held as a string so
 * a leading zero survives) and the same input normalizer.
 *
 * ── What is outside this schema, and why ────────────────────────────────────
 *
 * The screenshot. It is optional, and its validation is an ASYNC byte-signature
 * check in `files.ts` — `File.type` is derived from the extension and proves
 * nothing. Keeping it in local state lets a failed upload degrade to "submit
 * the reference without proof" rather than blocking a member who has genuinely
 * paid. The server repeats the byte check, which is where it counts.
 *
 * The note is trimmed and capped at 500; a blank note is `null`, matching the
 * old `notes.trim() || null` exactly. It is not hard-capped on the element, so
 * a paste over 500 is reported rather than silently truncated.
 */
import { z } from 'zod';
import type { UpiSubmitUtrInput } from '@/lib/api';
import { utrField } from '../domain';
import { textField } from '../primitives';

export const upiProofSchema = z.object({
  utr: utrField({ label: 'UPI reference number', required: true }),
  notes: textField({ label: 'Note for the studio', maxLength: 500 }),
});

export type UpiProofValues = z.output<typeof upiProofSchema>;
export type UpiProofState = { utr: string; notes: string };

export function blankUpiProof(): UpiProofState {
  return { utr: '', notes: '' };
}

/** The one server sentence this form can attribute to the UTR box. */
export const UPI_PROOF_FIELD_HINTS: Record<string, string> = {
  'UPI reference must be 12 to 16 digits': 'utr',
};

export type UpiProofScreenshot = { url: string; mime: string } | null;

/** The exact `UpiSubmitUtrInput` shape the endpoint has always received. */
export function toUpiProofPayload(
  values: UpiProofValues,
  screenshot: UpiProofScreenshot,
): UpiSubmitUtrInput {
  return {
    // Required by the schema; `string | null` is the primitive's output type.
    utr: values.utr as string,
    screenshot_url: screenshot?.url ?? null,
    screenshot_mime: screenshot?.mime ?? null,
    notes: values.notes,
  };
}
