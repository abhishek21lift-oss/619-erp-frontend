/**
 * The platform's own seller identity — what is printed on every subscription
 * invoice MY PT STUDIO issues to a studio.
 *
 * This is a tax document's header. There is exactly one row of it
 * (`platform_billing_settings WHERE id = TRUE`), it is snapshotted onto each
 * invoice at issue time, and a mistake here is not visible until an invoice is
 * already in a studio's accounts.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 * 1. `patch.gst_percent = Number(rate)`.
 *
 *    `Number('') === 0`, and the server's own guard is `n < 0 || n > 100` —
 *    which 0 passes, because 0% is a legitimate rate for an unregistered
 *    seller. So clearing the rate box and pressing Save set the platform's GST
 *    to **zero percent**, and every invoice issued afterwards carried ₹0 of
 *    tax with a taxable value equal to the gross. Nothing reported it: the
 *    save succeeded, and `computeGstSplit` treats `Number(gstPercent) || 0` as
 *    a rate like any other.
 *
 *    This is the same defect already fixed on the studio side. It was still
 *    live on the platform side, one layer further up, where it applies to
 *    every studio at once.
 *
 * 2. `state_code` had no format rule, and it is not cosmetic: it is the only
 *    input to the interstate test in `computeGstSplit`, so it decides whether
 *    an invoice carries CGST+SGST or IGST. Absent or wrong, every invoice is
 *    treated as intrastate — the wrong tax heads for an out-of-state studio.
 *
 * 3. Neither GSTIN nor PAN was checked at all, and both are printed verbatim.
 *
 * ── The GST rate, and why not the slab field ────────────────────────────────
 *
 * `gstRateField` restricts to the Indian slabs (0/5/12/18/28), which is the
 * right rule for a NEW value. Applying it unconditionally would be wrong here:
 * if the stored rate is already off-slab, the operator could no longer save the
 * other thirteen fields without first changing the tax rate — a validation rule
 * that locks someone out of unrelated edits. So the schema is built around the
 * rate as it currently stands: the stored value is always acceptable, anything
 * else must be a slab. That fixes the defect with no blast radius.
 */

import { z } from 'zod';
import { booleanField, percentField, textField, emailField } from '../primitives';
import { GST_SLABS } from '../domain';

/** GSTIN: 2-digit state, 5-letter PAN prefix, 4 digits, entity letter, Z, check. */
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const STATE_CODE = /^[0-9]{2}$/;
const PIN = /^[1-9][0-9]{5}$/;
/** 10–15 digits, optionally +91 and separators. A seller may list a landline. */
const PHONE = /^\+?[0-9][0-9\s-]{8,17}$/;

/**
 * An identifier the server stores upper-cased and trimmed.
 *
 * It uppercases FIRST and matches the pattern second, because the server does
 * `String(x).trim().toUpperCase()` before storing — so rejecting a lowercase
 * `27aaacm1234a1z5` would refuse a value the backend would have accepted and
 * normalised, which is the frontend being stricter than the system it serves.
 * `keepCase` skips the case change for values where it means nothing (a PIN,
 * a phone number) while keeping the trim and the pattern.
 */
const identifier = (opts: {
  label: string;
  pattern: RegExp;
  message: string;
  maxLength: number;
  keepCase?: boolean;
}) =>
  z.unknown().transform((raw, ctx): string | null => {
    const base = textField({ label: opts.label, maxLength: opts.maxLength });
    const parsed = base.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: 'custom', message: issue.message });
      }
      return z.NEVER;
    }
    if (parsed.data === null) return null;

    const value = opts.keepCase ? parsed.data : parsed.data.toUpperCase();
    if (!opts.pattern.test(value)) {
      ctx.addIssue({ code: 'custom', message: opts.message });
      return z.NEVER;
    }
    return value;
  });

/**
 * Build the schema around the rate currently stored.
 *
 * @param storedRate the rate already saved, or null when it could not be read.
 *        It is always accepted, so an off-slab legacy value never blocks an
 *        unrelated edit.
 */
export function platformBillingSchema(storedRate: number | null) {
  return z
    .object({
      legal_name: textField({ label: 'Registered name', required: true, maxLength: 200 }),
      gstin: identifier({
        label: 'GSTIN', maxLength: 15, pattern: GSTIN,
        message: 'GSTIN must be 15 characters, like 27AAACM1234A1Z5.',
      }),
      pan: identifier({
        label: 'PAN', maxLength: 10, pattern: PAN,
        message: 'PAN must be 10 characters, like AAACM1234A.',
      }),
      address_line1: textField({ label: 'Address line 1', maxLength: 200 }),
      address_line2: textField({ label: 'Address line 2', maxLength: 200 }),
      city: textField({ label: 'City', maxLength: 100 }),
      state: textField({ label: 'State', maxLength: 100 }),
      state_code: identifier({
        label: 'GST state code', maxLength: 2, pattern: STATE_CODE,
        message: 'GST state code is the two digits that start your GSTIN, like 27.',
      }),
      postal_code: identifier({
        label: 'PIN', maxLength: 6, pattern: PIN,
        message: 'PIN must be six digits.', keepCase: true,
      }),
      email: emailField({ label: 'Billing email' }),
      phone: identifier({
        label: 'Phone', maxLength: 20, pattern: PHONE,
        message: 'Phone must be a 10–15 digit number.', keepCase: true,
      }),
      invoice_prefix: identifier({
        // Matches the server's own rule exactly, because it becomes part of a
        // UNIQUE invoice_number and a rejected save here is cheaper than a
        // rejected invoice later.
        label: 'Invoice prefix', maxLength: 10, pattern: /^[A-Z0-9]{1,10}$/,
        message: 'Invoice prefix must be 1–10 letters or digits.',
      }),
      invoice_notes: textField({ label: 'Invoice footer note', maxLength: 500 }),
      // Required, and that is the fix: absent must not become 0%.
      gst_percent: percentField({ label: 'GST rate', required: true, min: 0, max: 100 }),
      prices_include_gst: booleanField(),
    })
    .superRefine((v, ctx) => {
      if (
        v.gst_percent !== null &&
        v.gst_percent !== storedRate &&
        !(GST_SLABS as readonly number[]).includes(v.gst_percent)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['gst_percent'],
          message: `GST rate must be one of ${GST_SLABS.join('%, ')}%.`,
        });
      }

      // The first two digits of a GSTIN ARE the state code. When they disagree,
      // one of the two is wrong and both are printed — and the state code is
      // what decides CGST+SGST versus IGST, so the disagreement is a wrong tax
      // rather than a cosmetic one.
      if (v.gstin && v.state_code && v.gstin.slice(0, 2) !== v.state_code) {
        ctx.addIssue({
          code: 'custom',
          path: ['state_code'],
          message: `GSTIN ${v.gstin} is registered in state ${v.gstin.slice(0, 2)}, not ${v.state_code}.`,
        });
      }
    });
}

export type PlatformBillingValues = z.output<ReturnType<typeof platformBillingSchema>>;

/** The form's raw state — one string per control, plus the one checkbox. */
export type PlatformBillingState = {
  legal_name: string;
  gstin: string;
  pan: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  state_code: string;
  postal_code: string;
  email: string;
  phone: string;
  invoice_prefix: string;
  invoice_notes: string;
  gst_percent: string;
  prices_include_gst: boolean;
};

/**
 * The text fields, in the order they are laid out.
 *
 * One list rather than thirteen JSX blocks, and exported so the panel and this
 * schema cannot drift: a key added here without a matching schema entry is a
 * compile error at the `keyof` below.
 */
export const BILLING_TEXT_FIELDS: ReadonlyArray<{
  key: keyof Omit<PlatformBillingState, 'gst_percent' | 'prices_include_gst'>;
  label: string;
  placeholder?: string;
  description?: string;
  wide?: boolean;
}> = [
  { key: 'legal_name', label: 'Registered name', placeholder: 'MY PT STUDIO PRIVATE LIMITED', wide: true },
  { key: 'gstin', label: 'GSTIN', placeholder: '27AAACM1234A1Z5' },
  { key: 'pan', label: 'PAN', placeholder: 'AAACM1234A' },
  { key: 'address_line1', label: 'Address line 1', wide: true },
  { key: 'address_line2', label: 'Address line 2', wide: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  {
    key: 'state_code', label: 'GST state code', placeholder: '27',
    description: 'Decides CGST+SGST vs IGST',
  },
  { key: 'postal_code', label: 'PIN' },
  { key: 'email', label: 'Billing email' },
  { key: 'phone', label: 'Phone' },
  { key: 'invoice_prefix', label: 'Invoice prefix', placeholder: 'MPT' },
  { key: 'invoice_notes', label: 'Invoice footer note', wide: true },
];

/**
 * Rebuild the form's raw state from the stored settings (§11).
 *
 * Every key is written, including the ones the record has nothing for, so a
 * reopened panel cannot show a value the server no longer holds. `gst_percent`
 * arrives as `number | string` because pg hands back NUMERIC as a string.
 */
export function billingToFormValues(
  s: Partial<Record<keyof PlatformBillingState, unknown>>,
): PlatformBillingState {
  const text = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  return {
    legal_name: text(s.legal_name),
    gstin: text(s.gstin),
    pan: text(s.pan),
    address_line1: text(s.address_line1),
    address_line2: text(s.address_line2),
    city: text(s.city),
    state: text(s.state),
    state_code: text(s.state_code),
    postal_code: text(s.postal_code),
    email: text(s.email),
    phone: text(s.phone),
    invoice_prefix: text(s.invoice_prefix),
    invoice_notes: text(s.invoice_notes),
    gst_percent: text(s.gst_percent),
    prices_include_gst: s.prices_include_gst !== false,
  };
}

/** Server messages this endpoint produces, mapped to the field they belong to. */
export const BILLING_FIELD_HINTS: Record<string, string> = {
  'gst_percent must be between 0 and 100': 'gst_percent',
  'invoice_prefix must be 1–10 letters or digits': 'invoice_prefix',
};

/**
 * The PUT payload.
 *
 * Sends every field, which is what the panel has always done — the endpoint
 * patches only the keys present, so omitting a cleared field would silently
 * leave the old value in place and the panel would lie about what is stored.
 * `null` for an empty optional is the server's own representation of absent.
 */
export function toBillingPayload(v: PlatformBillingValues) {
  return {
    legal_name: v.legal_name,
    gstin: v.gstin,
    pan: v.pan,
    address_line1: v.address_line1,
    address_line2: v.address_line2,
    city: v.city,
    state: v.state,
    state_code: v.state_code,
    postal_code: v.postal_code,
    email: v.email,
    phone: v.phone,
    invoice_prefix: v.invoice_prefix as string,
    invoice_notes: v.invoice_notes,
    gst_percent: v.gst_percent as number,
    prices_include_gst: v.prices_include_gst as boolean,
  };
}
