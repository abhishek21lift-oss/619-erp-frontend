/**
 * The offer form's schema.
 *
 * The first migrated form, chosen because it carried the clearest defect the
 * audit found: the discount value and the discount type could disagree, and
 * nothing on either side of the wire noticed.
 *
 * ── The pair rule ───────────────────────────────────────────────────────────
 *
 * The form hides the value input when the type is `free`. Hiding a control does
 * not clear the state behind it, so:
 *
 *     Percentage → 30 → switch to Free → Save
 *     ⇒ { discount_type: 'free', discount_value: 30 }
 *
 * Each field is individually valid. Only the combination is wrong, so the rule
 * has to live on the object rather than on either field — which is why `value`
 * is parsed loosely here and resolved in the transform below, against the type.
 *
 * Doing it in the schema rather than in the component matters: a component-level
 * "clear the value when the type changes" fixes the one path a developer thought
 * of. A schema that derives the value from the type makes the bad combination
 * unrepresentable in the parsed output, whatever the component does.
 */

import { z } from 'zod';
import {
  textField,
  codeField,
  enumField,
  integerField,
  dateField,
} from '../primitives';
import { percentField, moneyField } from '../primitives';
import { refineDateOrder } from '../domain';

/** The three shapes a studio offer can take. */
export const OFFER_TYPES = ['percent', 'flat', 'free'] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

export const OFFER_TYPE_OPTIONS = [
  { value: 'percent', label: 'Percentage %' },
  { value: 'flat', label: 'Flat ₹ Amount' },
  { value: 'free', label: 'Free / Complimentary' },
] as const;

const shape = z.object({
  name: textField({ label: 'Offer name', required: true, maxLength: 160 }),
  type: enumField(OFFER_TYPES, { label: 'Discount type', required: true }),
  /**
   * Deliberately unvalidated here.
   *
   * What counts as a valid value depends entirely on `type`: 0–100 for a
   * percentage, any positive amount for a flat discount, and *nothing at all*
   * for a free offer. A per-field rule would have to pick one of those and be
   * wrong for the other two.
   */
  value: z.unknown(),
  usageLimit: integerField({ label: 'Usage limit', min: 1, max: 1_000_000 }),
  code: codeField({ label: 'Coupon code' }),
  plan: textField({ label: 'Applicable plan', maxLength: 120 }),
  validFrom: dateField({ label: 'Valid from' }),
  validUntil: dateField({ label: 'Valid until' }),
});

export const offerFormSchema = shape
  .superRefine((v, ctx) => {
    refineDateOrder<typeof v>('validFrom', 'validUntil', {
      startLabel: 'Valid from',
      endLabel: 'Valid until',
    })(v, ctx);

    // `free` is not checked at all: whatever is behind the hidden input is
    // discarded by the transform below, so complaining about it would report an
    // error on a field the user cannot see and cannot fix.
    if (v.type === 'free') return;

    const field = v.type === 'percent'
      ? percentField({ label: 'Discount', required: true, min: 0.01 })
      : moneyField({ label: 'Amount', required: true, min: 0.01 });

    const parsed = field.safeParse(v.value);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: 'custom', path: ['value'], message: issue.message });
      }
    }
  })
  .transform((v) => {
    // The value is DERIVED from the type, never carried alongside it. This is
    // the line that makes `{ free, 30 }` unrepresentable.
    const value =
      v.type === 'free'
        ? 0
        : v.type === 'percent'
          ? (percentField({ label: 'Discount' }).parse(v.value) ?? 0)
          : (moneyField({ label: 'Amount' }).parse(v.value) ?? 0);

    return {
      name: v.name as string,
      type: v.type as OfferType,
      value,
      usageLimit: v.usageLimit,
      code: v.code,
      plan: v.plan,
      validFrom: v.validFrom,
      validUntil: v.validUntil,
    };
  });

export type OfferFormInput = z.input<typeof offerFormSchema>;
export type OfferFormValues = z.output<typeof offerFormSchema>;

/**
 * The form's raw state — one string per control.
 *
 * Named rather than inferred so `useAppForm` has a precise type to key its
 * field inference off, and so the two constructors below cannot drift apart:
 * if `blankOffer` gains a field that `offerToFormValues` does not, that is a
 * compile error rather than a field that silently keeps its previous value
 * when the form switches records.
 *
 * A type alias rather than an interface on purpose: an interface has no
 * implicit index signature, so it does not satisfy `Record<string, unknown>`
 * and could not be passed as the form's values.
 */
export type OfferFormState = {
  name: string;
  type: OfferType;
  value: string;
  usageLimit: string;
  code: string;
  plan: string;
  validFrom: string;
  validUntil: string;
};

/**
 * The form's blank state.
 *
 * Every value is a string because every control renders one, including the
 * numeric fields — see `NumberField`'s note on why its value is a string. A
 * function rather than a constant so no two openings of the form can share
 * (and mutate) one object.
 */
export function blankOffer(): OfferFormState {
  return {
    name: '',
    type: 'percent',
    value: '',
    usageLimit: '50',
    code: '',
    plan: '',
    validFrom: '',
    validUntil: '',
  };
}

/**
 * Rebuild the form's raw state from a stored offer (§11).
 *
 * Every field is written, including the ones the record has nothing for, so
 * opening B after A cannot leave any of A's values behind. `?? ''` rather than
 * a conditional spread for exactly that reason.
 */
export function offerToFormValues(offer: {
  name?: string | null;
  type?: string | null;
  value?: number | null;
  code?: string | null;
  plan?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  usageLimit?: number | null;
}): OfferFormState {
  const type = (OFFER_TYPES as readonly string[]).includes(offer.type ?? '')
    ? (offer.type as OfferType)
    : 'percent';

  return {
    name: offer.name ?? '',
    type,
    // A free offer shows an empty value box rather than the stored 0, because
    // the box is hidden for that type and a 0 left behind is what this whole
    // schema exists to prevent resurfacing.
    value: type === 'free' ? '' : offer.value == null ? '' : String(offer.value),
    usageLimit: offer.usageLimit == null ? '' : String(offer.usageLimit),
    code: offer.code ?? '',
    plan: offer.plan ?? '',
    validFrom: offer.validFrom ? String(offer.validFrom).slice(0, 10) : '',
    validUntil: offer.validUntil ? String(offer.validUntil).slice(0, 10) : '',
  };
}

/**
 * Server messages this endpoint produces, mapped to the field they belong to.
 *
 * `/api/offers` now sends a `field` key, so these are a fallback rather than
 * the primary route — kept because an older backend deployed against a newer
 * frontend would otherwise show every rule failure at form level.
 */
export const OFFER_FIELD_HINTS: Record<string, string> = {
  'discount_value must be greater than 0': 'value',
  'discount_value must be a number': 'value',
  'discount_value must be 100 or less for a percentage offer': 'value',
  'max_uses must be at least 1': 'usageLimit',
  'max_uses must be a whole number': 'usageLimit',
  'valid_until cannot be before valid_from': 'validUntil',
  'title is required': 'name',
  'code may use letters, numbers, hyphens and underscores only': 'code',
};

/** Map the form's own field names onto the API's column names. */
export function toOfferPayload(v: OfferFormValues) {
  return {
    title: v.name,
    discount_type: v.type,
    discount_value: v.value,
    code: v.code,
    audience: v.plan,
    max_uses: v.usageLimit,
    valid_from: v.validFrom,
    valid_until: v.validUntil,
  };
}
