/**
 * A studio's UPI collection settings.
 *
 * Small screen, high stakes: the VPA here is where members' money arrives, and
 * the GST rate here appears on every receipt the studio issues afterwards.
 *
 * ── What the schema pins that the page's inline checks did not ──────────────
 *
 * The page already refused a blank GST rate and an out-of-range link validity —
 * those were fixed earlier, and the rules move here unchanged rather than being
 * rewritten. What is new:
 *
 *   · GSTIN was `maxLength={32}` and uppercase, and nothing else. The server
 *     stores it as free text (`safeText(32)`), so a mistyped GSTIN reached the
 *     receipt PDF and the member's accountant with no one having checked it.
 *   · the merchant name was capped by the element's `maxLength`, which
 *     truncates a paste silently — the name the member sees in their UPI app
 *     then differs from the one the studio thinks it set.
 *
 * ── Two legacy escapes, both deliberate ─────────────────────────────────────
 *
 * The GST rate and the GSTIN both accept whatever is currently stored, however
 * non-standard, and apply the strict rule only to a NEW value. A studio that
 * saved 14% or a malformed GSTIN through the old free-text fields would
 * otherwise be unable to change its UPI ID — an unrelated setting — without
 * first fixing a field it may need to look up. Locking someone out of a payment
 * setting to enforce a tax rule is the wrong trade.
 */

import { z } from 'zod';
import { textField, integerField, booleanField, percentField } from '../primitives';
import { GST_SLABS } from '../domain';

/** Mirrors the CHECK constraint in migration 112 and the DTO in the route. */
export const VPA_RE = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.]{1,63}$/;

/** 2-digit state, 5-letter PAN prefix, 4 digits, entity letter, Z, check. */
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export interface UpiSettingsContext {
  /** The rate already saved. Always acceptable, however non-standard. */
  storedGstPercent: number | null;
  /** The GSTIN already saved. Always acceptable, however malformed. */
  storedGstNumber: string | null;
}

export function upiSettingsSchema(ctx: UpiSettingsContext) {
  return z
    .object({
      upi_id: textField({
        label: 'UPI ID',
        required: true,
        maxLength: 128,
        pattern: { test: VPA_RE, message: 'UPI ID must look like name@bank — for example studio@okhdfcbank.' },
      }),
      merchant_name: textField({ label: 'Name shown to the member', required: true, maxLength: 120 }),
      gst_percent: percentField({ label: 'GST rate', required: true, min: 0, max: 100 }),
      gst_number: textField({ label: 'GSTIN', maxLength: 32 }),
      instructions: textField({ label: 'Note on the payment page', maxLength: 500 }),
      order_ttl_minutes: integerField({
        label: 'Link validity', required: true, min: 5, max: 1440, unit: 'minutes',
      }),
      is_enabled: booleanField(),
    })
    .superRefine((v, ctx2) => {
      if (
        v.gst_percent !== null &&
        v.gst_percent !== ctx.storedGstPercent &&
        !(GST_SLABS as readonly number[]).includes(v.gst_percent)
      ) {
        ctx2.addIssue({
          code: 'custom',
          path: ['gst_percent'],
          message: `GST rate must be one of ${GST_SLABS.join('%, ')}%.`,
        });
      }

      if (
        v.gst_number !== null &&
        v.gst_number !== ctx.storedGstNumber &&
        !GSTIN_RE.test(v.gst_number.toUpperCase())
      ) {
        ctx2.addIssue({
          code: 'custom',
          path: ['gst_number'],
          message: 'GSTIN must be 15 characters, like 22AAAAA0000A1Z5.',
        });
      }
    })
    .transform((v) => ({
      ...v,
      gst_number: v.gst_number === null ? null : v.gst_number.toUpperCase(),
    }));
}

export type UpiSettingsValues = z.output<ReturnType<typeof upiSettingsSchema>>;

/** The form's raw state — strings, plus the one switch. */
export type UpiSettingsState = {
  upi_id: string;
  merchant_name: string;
  gst_percent: string;
  gst_number: string;
  instructions: string;
  order_ttl_minutes: string;
  is_enabled: boolean;
};

/**
 * Rebuild the form's raw state from the stored settings (§11).
 *
 * `fallbackMerchantName` seeds a first-time setup with the studio's own name,
 * which is almost always what should appear in the member's UPI app. It applies
 * only when there is no stored record at all.
 */
export function upiSettingsToFormValues(
  saved: {
    upi_id?: string | null;
    merchant_name?: string | null;
    gst_percent?: number | string | null;
    gst_number?: string | null;
    instructions?: string | null;
    order_ttl_minutes?: number | string | null;
    is_enabled?: boolean | null;
  } | null,
  fallbackMerchantName = '',
): UpiSettingsState {
  if (!saved) {
    return {
      upi_id: '',
      merchant_name: fallbackMerchantName,
      gst_percent: '0',
      gst_number: '',
      instructions: '',
      order_ttl_minutes: '60',
      is_enabled: false,
    };
  }

  const text = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  return {
    upi_id: text(saved.upi_id),
    merchant_name: text(saved.merchant_name),
    // Through Number first so pg's NUMERIC '18.00' shows as '18' in the select,
    // which is what the option values are — otherwise the stored rate matches
    // no option and the control renders blank.
    gst_percent: saved.gst_percent == null ? '0' : String(Number(saved.gst_percent)),
    gst_number: text(saved.gst_number),
    instructions: text(saved.instructions),
    order_ttl_minutes: saved.order_ttl_minutes == null ? '60' : String(saved.order_ttl_minutes),
    is_enabled: saved.is_enabled === true,
  };
}

/**
 * The GST options to render, including the stored rate when it is not a slab.
 *
 * A stored 14% has to be selectable or the control shows nothing selected and
 * the first edit silently changes the rate.
 */
export function gstOptions(storedGstPercent: number | null) {
  const slabs = GST_SLABS.map((slab) => ({ value: String(slab), label: `${slab}%` }));
  if (storedGstPercent === null || (GST_SLABS as readonly number[]).includes(storedGstPercent)) {
    return slabs;
  }
  return [...slabs, { value: String(storedGstPercent), label: `${storedGstPercent}% — not a standard slab` }];
}

/** Server messages this endpoint produces, mapped to the field they belong to. */
export const UPI_FIELD_HINTS: Record<string, string> = {
  'UPI ID must look like name@bank': 'upi_id',
  'Merchant name is required': 'merchant_name',
};

export function toUpiSettingsPayload(v: UpiSettingsValues) {
  return {
    upi_id: v.upi_id as string,
    merchant_name: v.merchant_name as string,
    gst_percent: v.gst_percent as number,
    gst_number: v.gst_number,
    is_enabled: v.is_enabled as boolean,
    instructions: v.instructions,
    order_ttl_minutes: v.order_ttl_minutes as number,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * The PLATFORM's own payee details
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Where every studio's subscription money arrives.
 *
 * The highest-stakes VPA in the product: a studio's settings above send that
 * one studio's member payments somewhere, this one sends every studio's
 * subscription payment somewhere. It shares `VPA_RE` with the studio schema
 * rather than carrying its own copy — the pattern was written out three times
 * across the tree, and three copies of a rule is three places for it to drift
 * from the CHECK constraint it mirrors.
 */
export const platformUpiSchema = z.object({
  upi_id: textField({
    label: 'UPI ID',
    required: true,
    maxLength: 128,
    pattern: { test: VPA_RE, message: 'Must look like name@bank.' },
  }),
  merchant_name: textField({ label: 'Name studios will see', required: true, maxLength: 120 }),
  instructions: textField({ label: 'Note on the checkout page', maxLength: 500 }),
  is_enabled: booleanField(),
});

export type PlatformUpiValues = z.output<typeof platformUpiSchema>;

export type PlatformUpiState = {
  upi_id: string;
  merchant_name: string;
  instructions: string;
  is_enabled: boolean;
};

/**
 * Rebuild from the stored record (§11).
 *
 * The merchant name falls back to the product's own name for a first-time
 * setup, which is what the dialog seeded before and is right — but only when
 * there is no record, never as a default over a stored blank.
 */
export function platformUpiToFormValues(
  saved: {
    upi_id?: string | null;
    merchant_name?: string | null;
    instructions?: string | null;
    is_enabled?: boolean | null;
  } | null,
): PlatformUpiState {
  if (!saved) {
    return { upi_id: '', merchant_name: 'MY PT STUDIO', instructions: '', is_enabled: false };
  }
  return {
    upi_id: saved.upi_id ?? '',
    merchant_name: saved.merchant_name ?? '',
    instructions: saved.instructions ?? '',
    is_enabled: saved.is_enabled === true,
  };
}

export function toPlatformUpiPayload(v: PlatformUpiValues) {
  return {
    upi_id: v.upi_id as string,
    merchant_name: v.merchant_name as string,
    instructions: v.instructions,
    is_enabled: v.is_enabled as boolean,
  };
}
