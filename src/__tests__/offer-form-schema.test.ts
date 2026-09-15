/**
 * The offer form's schema — the first form on the universal platform.
 *
 * The tests that matter here are the ones that would have caught the shipped
 * defect: a complimentary offer carrying a discount value, and a percentage
 * with no ceiling. Both were reachable through the UI and storable by the API.
 */

import { describe, it, expect } from 'vitest';
import {
  offerFormSchema,
  blankOffer,
  offerToFormValues,
  toOfferPayload,
  OFFER_TYPES,
} from '../lib/forms/schemas/offer';

/**
 * Parse a full form state.
 *
 * Starts from blank plus a name, because `blankOffer()` is genuinely invalid —
 * the name is required and empty — and a helper that fails on every case for a
 * reason unrelated to what is under test proves nothing. The name requirement
 * is covered explicitly below.
 */
function parse(overrides: Record<string, unknown> = {}) {
  return offerFormSchema.safeParse({ ...blankOffer(), name: 'Test Offer', ...overrides });
}

function firstError(r: ReturnType<typeof parse>) {
  return r.success ? undefined : r.error.issues[0]!.message;
}

describe('the free/value pair', () => {
  it('discards a stale value when the type is free', () => {
    // The exact shipped sequence: pick Percentage, type 30, switch to Free.
    // The input is hidden but its state survives, so the old form submitted
    // { discount_type: 'free', discount_value: 30 }.
    const r = parse({ type: 'free', value: '30' });
    expect(r.success).toBe(true);
    expect(r.data!.value).toBe(0);
    expect(r.data!.type).toBe('free');
  });

  it('does not report an error on the hidden field', () => {
    // Complaining about a value the user cannot see and cannot reach would be
    // an unfixable form.
    expect(parse({ type: 'free', value: 'nonsense' }).success).toBe(true);
    expect(parse({ type: 'free', value: '' }).success).toBe(true);
  });

  it('carries the value through for the two paid types', () => {
    expect(parse({ type: 'percent', value: '30' }).data!.value).toBe(30);
    expect(parse({ type: 'flat', value: '500' }).data!.value).toBe(500);
  });

  it('makes the bad combination unrepresentable in the payload', () => {
    // Whatever the component does, the parsed output cannot pair free with a
    // non-zero value — the value is derived from the type, not carried.
    for (const value of ['30', '0', '', 'abc', '999999']) {
      const r = parse({ type: 'free', value });
      expect(r.success).toBe(true);
      expect(toOfferPayload(r.data!).discount_value).toBe(0);
    }
  });
});

describe('ranges the form never had', () => {
  it('caps a percentage at 100', () => {
    // The input was min={1} with no max, so 500 was submittable.
    expect(parse({ type: 'percent', value: '100' }).success).toBe(true);
    expect(parse({ type: 'percent', value: '101' }).success).toBe(false);
    expect(firstError(parse({ type: 'percent', value: '500' })))
      .toBe('Discount cannot be more than 100 %.');
  });

  it('requires a value for a paid offer', () => {
    expect(firstError(parse({ type: 'percent', value: '' }))).toBe('Discount is required.');
    expect(firstError(parse({ type: 'flat', value: '' }))).toBe('Amount is required.');
  });

  it('rejects zero and negative discounts', () => {
    for (const type of ['percent', 'flat']) {
      expect(parse({ type, value: '0' }).success).toBe(false);
      expect(parse({ type, value: '-5' }).success).toBe(false);
    }
  });

  it('rejects a non-numeric value rather than coercing it to zero', () => {
    // Number('abc') is NaN and Number('') is 0; the old handler used Number()
    // directly, so a cleared box became a real 0.
    expect(parse({ type: 'flat', value: 'abc' }).success).toBe(false);
    expect(parse({ type: 'flat', value: '1e999' }).success).toBe(false);
  });
});

describe('the rest of the form', () => {
  it('requires a name', () => {
    expect(firstError(parse({ name: '   ' }))).toBe('Offer name is required.');
    expect(parse({ name: 'Summer Splash', value: '30' }).success).toBe(true);
  });

  it('normalises a coupon code', () => {
    expect(parse({ value: '30', code: ' summer 30 ' }).data!.code).toBe('SUMMER30');
    expect(parse({ value: '30', code: '' }).data!.code).toBe(null);
  });

  it('rejects an end date before a start date, on the end field', () => {
    const r = parse({ value: '30', validFrom: '2026-03-10', validUntil: '2026-03-01' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.path).toEqual(['validUntil']);
  });

  it('allows a single-day offer', () => {
    expect(parse({ value: '30', validFrom: '2026-03-01', validUntil: '2026-03-01' }).success)
      .toBe(true);
  });

  it('treats an empty usage limit as unlimited rather than zero', () => {
    expect(parse({ value: '30', usageLimit: '' }).data!.usageLimit).toBe(null);
    expect(parse({ value: '30', usageLimit: '0' }).success).toBe(false);
  });

  it('rejects an unknown discount type', () => {
    expect(parse({ type: 'gift', value: '30' }).success).toBe(false);
  });
});

describe('the reset contract (§11)', () => {
  it('writes every field, so nothing from a previous record survives', () => {
    const a = offerToFormValues({
      name: 'Offer A', type: 'percent', value: 30, code: 'AAA',
      plan: 'Quarterly', validFrom: '2026-01-01', validUntil: '2026-02-01', usageLimit: 10,
    });
    const b = offerToFormValues({ name: 'Offer B', type: 'flat', value: 500 });

    // B declares no code, plan or dates. If the constructor spread
    // conditionally, these would be absent and A's values would persist through
    // a shared state object. Every key is present and empty instead.
    expect(b.code).toBe('');
    expect(b.plan).toBe('');
    expect(b.validFrom).toBe('');
    expect(b.validUntil).toBe('');
    expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort());
  });

  it('shows a free offer an empty value box, not the stored zero', () => {
    expect(offerToFormValues({ name: 'Comp', type: 'free', value: 0 }).value).toBe('');
  });

  it('falls back to percent for an unrecognised stored type', () => {
    expect(offerToFormValues({ name: 'X', type: 'legacy-type' }).type).toBe('percent');
    for (const t of OFFER_TYPES) {
      expect(offerToFormValues({ name: 'X', type: t }).type).toBe(t);
    }
  });

  it('round-trips a stored offer back through the schema unchanged', () => {
    const stored = {
      name: 'Summer', type: 'percent', value: 30, code: 'SUMMER30',
      plan: 'All', validFrom: '2026-03-01', validUntil: '2026-03-31', usageLimit: 50,
    };
    const r = offerFormSchema.safeParse(offerToFormValues(stored));
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({
      name: 'Summer', type: 'percent', value: 30, code: 'SUMMER30', usageLimit: 50,
    });
  });
});

describe('the payload', () => {
  it('maps form names onto API column names', () => {
    const r = parse({ name: 'Summer', value: '30', code: 'S30', plan: 'All', usageLimit: '25' });
    expect(toOfferPayload(r.data!)).toEqual({
      title: 'Summer',
      discount_type: 'percent',
      discount_value: 30,
      code: 'S30',
      audience: 'All',
      max_uses: 25,
      valid_from: null,
      valid_until: null,
    });
  });
});
