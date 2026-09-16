/**
 * Platform discount coupons — the super-admin form that decides what a studio
 * actually pays at activation.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 * Four numeric boxes read `Number(raw)` behind a truthiness guard:
 *
 *     max_discount_inr: discountType === 'percent' && maxDiscount ? Number(maxDiscount) : null,
 *     max_redemptions:  maxRedemptions ? Number(maxRedemptions) : null,
 *     max_per_org:      maxPerOrg ? Number(maxPerOrg) : 1,
 *
 * The guard catches `''` and nothing else. A single space is truthy, so
 * `' '` → `Number(' ')` → **0**, and each zero means something specific and
 * silently wrong:
 *
 *     max_discount_inr = 0    a percentage coupon capped at ₹0 — it applies,
 *                             the studio sees "20% off", and the discount is
 *                             nothing.
 *     max_redemptions = 0     a coupon that is "Fully redeemed" the moment it
 *                             is created. The list literally renders that
 *                             badge, because `times_redeemed >= max_redemptions`.
 *     max_per_org = 0         same, per studio.
 *
 * A typed letter is worse: `Number('2o')` is NaN, `JSON.stringify(NaN)` is
 * `null`, so "2o uses" quietly becomes *unlimited*. The request succeeds and
 * nothing anywhere says the cap was dropped.
 *
 * ── The other three ─────────────────────────────────────────────────────────
 *
 *   · `valid_until` accepted a date in the past, creating a coupon that was
 *     expired on arrival — the list renders "Expired" immediately;
 *   · the code box had no length or character rule, so a code with a space in
 *     it was storable and then never matched at redemption, because the server
 *     compares against `upper(trim(code))` and the space survives trim;
 *   · failures put the server's raw `e.message` in a toast.
 *
 * ── What is deliberately NOT enforced here ──────────────────────────────────
 *
 * `min_amount_inr` exists on the endpoint and has never had a control. It is
 * left out rather than given a hidden default, because sending a field the form
 * does not show is how a value nobody chose ends up in the billing record.
 */

import { z } from 'zod';
import { codeField, enumField, integerField, moneyField, percentField, textField, dateField } from '../primitives';
import { todayISO } from '../domain';

export const COUPON_TYPES = ['percent', 'fixed'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COUPON_TYPE_OPTIONS = [
  { value: 'percent', label: 'Percentage off' },
  { value: 'fixed', label: 'Fixed rupees off' },
] as const;

const shape = z.object({
  code: codeField({ label: 'Code', required: true, minLength: 3, maxLength: 32 }),
  description: textField({ label: 'Description', maxLength: 200 }),
  discountType: enumField(COUPON_TYPES, { label: 'Type', required: true }),
  /**
   * Unvalidated at field level for the same reason the offer schema leaves its
   * value alone: 1–100 for a percentage and any positive rupee amount for a
   * fixed discount are different rules, and a single field rule would have to
   * pick one and be wrong for the other.
   */
  discountValue: z.unknown(),
  /**
   * `min: 1`, not `min: 0`. A ₹0 cap on a percentage coupon is indistinguishable
   * from "no cap" to everyone reading the list and is the opposite of it in the
   * billing maths — which is exactly what the old `Number(' ')` produced.
   */
  maxDiscount: moneyField({ label: 'Max discount', min: 1 }),
  maxRedemptions: integerField({ label: 'Total uses', min: 1, max: 1_000_000 }),
  maxPerOrg: integerField({ label: 'Uses per studio', required: true, min: 1, max: 1000 }),
  validUntil: dateField({ label: 'Valid until', min: todayISO() }),
  /** Chips, not a control — an empty list means "every plan". */
  appliesTo: z.array(z.string()),
});

export const couponFormSchema = shape
  .superRefine((v, ctx) => {
    const field =
      v.discountType === 'percent'
        ? percentField({ label: 'Percent', required: true, min: 1, max: 100 })
        : moneyField({ label: 'Rupees off', required: true, min: 1 });

    const parsed = field.safeParse(v.discountValue);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: 'custom', path: ['discountValue'], message: issue.message });
      }
    }
  })
  .transform((v) => {
    const discountValue =
      v.discountType === 'percent'
        ? (percentField({ label: 'Percent' }).parse(v.discountValue) ?? 0)
        : (moneyField({ label: 'Rupees off' }).parse(v.discountValue) ?? 0);

    return {
      code: v.code as string,
      description: v.description,
      discountType: v.discountType as CouponType,
      discountValue,
      // Derived from the type, not carried beside it: the cap box is hidden for
      // a fixed-rupee coupon, and a hidden box keeps its state. Switching
      // percent → ₹500 → Create would otherwise send a cap the operator set for
      // a discount shape that no longer exists.
      maxDiscount: v.discountType === 'percent' ? v.maxDiscount : null,
      maxRedemptions: v.maxRedemptions,
      maxPerOrg: v.maxPerOrg as number,
      validUntil: v.validUntil,
      appliesTo: v.appliesTo,
    };
  });

export type CouponFormValues = z.output<typeof couponFormSchema>;

/** The form's raw state — one string per control. */
export type CouponFormState = {
  code: string;
  description: string;
  discountType: CouponType;
  discountValue: string;
  maxDiscount: string;
  maxRedemptions: string;
  maxPerOrg: string;
  validUntil: string;
  appliesTo: string[];
};

/**
 * A blank coupon, optionally seeded from a quick-start template.
 *
 * Every key is written on every call, including the ones a template says
 * nothing about, so switching between templates cannot leave a previous one's
 * value behind (§11).
 */
export function blankCoupon(seed?: Partial<CouponFormState>): CouponFormState {
  return {
    code: '',
    description: '',
    discountType: 'percent',
    discountValue: '',
    maxDiscount: '',
    maxRedemptions: '',
    maxPerOrg: '1',
    validUntil: '',
    appliesTo: [],
    ...seed,
  };
}

/** Server messages this endpoint produces, mapped to the field they belong to. */
export const COUPON_FIELD_HINTS: Record<string, string> = {
  'code is required': 'code',
  "discount_type must be 'percent' or 'fixed'": 'discountType',
  'discount_value must be greater than 0': 'discountValue',
  'A percentage discount cannot exceed 100': 'discountValue',
};

/** Map the form's field names onto the API's column names. */
export function toCouponPayload(v: CouponFormValues) {
  return {
    code: v.code,
    description: v.description ?? undefined,
    discount_type: v.discountType,
    discount_value: v.discountValue,
    max_discount_inr: v.maxDiscount,
    max_redemptions: v.maxRedemptions,
    max_per_org: v.maxPerOrg,
    valid_until: v.validUntil,
    applies_to_plans: v.appliesTo.length ? v.appliesTo : null,
  };
}
