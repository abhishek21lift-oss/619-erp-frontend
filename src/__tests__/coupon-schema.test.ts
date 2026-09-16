/**
 * Platform discount coupons.
 *
 * The old form guarded every numeric box with truthiness — `maxRedemptions ?
 * Number(maxRedemptions) : null` — which catches `''` and nothing else. These
 * pin the values that got through it, each of which reached the billing record
 * as a number nobody chose.
 */

import { describe, it, expect } from 'vitest';
import {
  couponFormSchema,
  blankCoupon,
  toCouponPayload,
  type CouponFormState,
} from '../lib/forms/schemas/coupon';
import { todayISO } from '../lib/forms/domain';

/** A valid coupon, so each case below fails for the reason it is testing. */
function base(over: Partial<CouponFormState> = {}): CouponFormState {
  return blankCoupon({ code: 'LAUNCH20', discountValue: '20', ...over });
}

function messages(r: ReturnType<typeof couponFormSchema.safeParse>): string[] {
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

function pathsOf(r: ReturnType<typeof couponFormSchema.safeParse>): string[] {
  return r.success ? [] : r.error.issues.map((i) => String(i.path[0] ?? ''));
}

describe('a blank numeric box is absent, never zero', () => {
  it('leaves an empty usage cap unlimited rather than making it zero', () => {
    const r = couponFormSchema.safeParse(base({ maxRedemptions: '' }));
    expect(r.success).toBe(true);
    expect(r.data!.maxRedemptions).toBeNull();
  });

  it.each([' ', '   ', '\t'])('treats whitespace (%j) as absent, not as 0', (blank) => {
    // This is the case the old truthiness guard missed. `' '` is truthy, so
    // `Number(' ')` ran and produced 0 — a coupon the list immediately badges
    // "Fully redeemed", because times_redeemed >= max_redemptions.
    const r = couponFormSchema.safeParse(base({ maxRedemptions: blank }));
    expect(r.success).toBe(true);
    expect(r.data!.maxRedemptions).toBeNull();
  });

  it('refuses a usage cap of 0 outright', () => {
    const r = couponFormSchema.safeParse(base({ maxRedemptions: '0' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Total uses must be at least 1.');
  });

  it('refuses a per-studio cap of 0, and requires one', () => {
    expect(couponFormSchema.safeParse(base({ maxPerOrg: '0' })).success).toBe(false);
    const blank = couponFormSchema.safeParse(base({ maxPerOrg: '' }));
    expect(blank.success).toBe(false);
    expect(messages(blank)).toContain('Uses per studio is required.');
  });

  it('refuses a ₹0 cap on a percentage coupon', () => {
    // `max_discount_inr: 0` is not "no cap" — it caps a 20%-off coupon at ₹0,
    // so the studio is shown a discount and charged full price.
    const r = couponFormSchema.safeParse(base({ maxDiscount: '0' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Max discount must be at least 1 ₹.');
  });

  it('refuses a letter in a numeric box instead of sending null', () => {
    // `Number('2o')` is NaN and `JSON.stringify(NaN)` is `null`, so the old
    // form turned "2o uses" into *unlimited* and reported success.
    const r = couponFormSchema.safeParse(base({ maxRedemptions: '2o' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Total uses must be a number.');
  });

  it('refuses a fractional usage cap rather than rounding it', () => {
    const r = couponFormSchema.safeParse(base({ maxRedemptions: '2.5' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Total uses must be a whole number.');
  });
});

describe('the discount value is judged against its type', () => {
  it('accepts 1–100 for a percentage', () => {
    const r = couponFormSchema.safeParse(base({ discountValue: '100' }));
    expect(r.success).toBe(true);
    expect(r.data!.discountValue).toBe(100);
  });

  it('refuses a percentage above 100, as the server does', () => {
    const r = couponFormSchema.safeParse(base({ discountValue: '120' }));
    expect(r.success).toBe(false);
    expect(pathsOf(r)).toContain('discountValue');
  });

  it('refuses a zero or blank discount of either type', () => {
    expect(couponFormSchema.safeParse(base({ discountValue: '0' })).success).toBe(false);
    expect(couponFormSchema.safeParse(base({ discountValue: '' })).success).toBe(false);
    expect(couponFormSchema.safeParse(
      base({ discountType: 'fixed', discountValue: '' }),
    ).success).toBe(false);
  });

  it('allows a fixed discount well above 100', () => {
    const r = couponFormSchema.safeParse(base({ discountType: 'fixed', discountValue: '2500' }));
    expect(r.success).toBe(true);
    expect(r.data!.discountValue).toBe(2500);
  });
});

describe('the ₹ cap cannot outlive the type that gave it meaning', () => {
  it('drops a cap left behind by a switch from percent to fixed', () => {
    // The cap input is hidden for a fixed-rupee coupon. Hiding a control does
    // not clear the state behind it, so without this the operator's "max ₹2000"
    // would ride along with a flat ₹500 discount and mean nothing.
    const r = couponFormSchema.safeParse(
      base({ discountType: 'fixed', discountValue: '500', maxDiscount: '2000' }),
    );
    expect(r.success).toBe(true);
    expect(r.data!.maxDiscount).toBeNull();
  });

  it('keeps the cap for a percentage coupon', () => {
    const r = couponFormSchema.safeParse(base({ maxDiscount: '2000' }));
    expect(r.success).toBe(true);
    expect(r.data!.maxDiscount).toBe(2000);
  });
});

describe('the code has to survive the round trip', () => {
  it('uppercases and strips spaces, matching upper(trim(code)) server-side', () => {
    const r = couponFormSchema.safeParse(base({ code: ' launch20 ' }));
    expect(r.success).toBe(true);
    expect(r.data!.code).toBe('LAUNCH20');
  });

  it('closes an inner space rather than storing a code that never matches', () => {
    // `trim()` removes the ends and not the middle, so 'LAUNCH 20' was
    // storable and then never matched at redemption. Normalising is the right
    // answer rather than rejecting: the operator meant one token, and a space
    // in the middle of a coupon code is a typo in every case, not a choice.
    const r = couponFormSchema.safeParse(base({ code: 'LAUNCH 20' }));
    expect(r.success).toBe(true);
    expect(r.data!.code).toBe('LAUNCH20');
  });

  it('refuses a code that is too short, and a blank one', () => {
    expect(couponFormSchema.safeParse(base({ code: 'AB' })).success).toBe(false);
    const blank = couponFormSchema.safeParse(base({ code: '' }));
    expect(blank.success).toBe(false);
    expect(messages(blank)).toContain('Code is required.');
  });

  it('refuses punctuation the redemption lookup would not match', () => {
    expect(couponFormSchema.safeParse(base({ code: 'LAUNCH@20' })).success).toBe(false);
  });
});

describe('an expiry in the past is refused', () => {
  it('refuses a coupon that would be created already expired', () => {
    const r = couponFormSchema.safeParse(base({ validUntil: '2020-01-01' }));
    expect(r.success).toBe(false);
    expect(pathsOf(r)).toContain('validUntil');
  });

  it('accepts today, and accepts no expiry at all', () => {
    expect(couponFormSchema.safeParse(base({ validUntil: todayISO() })).success).toBe(true);
    const none = couponFormSchema.safeParse(base({ validUntil: '' }));
    expect(none.success).toBe(true);
    expect(none.data!.validUntil).toBeNull();
  });

  it('refuses a date that does not exist rather than rolling it forward', () => {
    // `new Date('2099-02-31')` rolls to 3 March. The user never chose that.
    expect(couponFormSchema.safeParse(base({ validUntil: '2099-02-31' })).success).toBe(false);
  });
});

describe('the payload matches what the endpoint accepts', () => {
  it('sends null rather than 0 for every absent cap', () => {
    const r = couponFormSchema.safeParse(base());
    expect(r.success).toBe(true);
    const payload = toCouponPayload(r.data!);
    expect(payload).toEqual({
      code: 'LAUNCH20',
      description: undefined,
      discount_type: 'percent',
      discount_value: 20,
      max_discount_inr: null,
      max_redemptions: null,
      max_per_org: 1,
      valid_until: null,
      applies_to_plans: null,
    });
  });

  it('sends the selected plans, and null when none are selected', () => {
    const some = couponFormSchema.safeParse(base({ appliesTo: ['pro', 'elite'] }));
    expect(toCouponPayload(some.data!).applies_to_plans).toEqual(['pro', 'elite']);
    const none = couponFormSchema.safeParse(base({ appliesTo: [] }));
    expect(toCouponPayload(none.data!).applies_to_plans).toBeNull();
  });

  it('never emits NaN, which JSON would turn into null', () => {
    const r = couponFormSchema.safeParse(base({ maxRedemptions: '20', maxPerOrg: '2' }));
    const payload = toCouponPayload(r.data!);
    for (const v of Object.values(payload)) {
      expect(typeof v === 'number' && Number.isNaN(v)).toBe(false);
    }
  });
});

describe('blankCoupon rebuilds every key (§11)', () => {
  it('writes every field even when the template mentions none of them', () => {
    const seeded = blankCoupon({ description: 'Referral reward', discountValue: '500' });
    const blank = blankCoupon();
    expect(Object.keys(seeded).sort()).toEqual(Object.keys(blank).sort());
    // A template that sets nothing about the cap must not inherit the previous
    // template's cap — which is only true because every key is written.
    expect(seeded.maxDiscount).toBe('');
    expect(seeded.maxRedemptions).toBe('');
    expect(seeded.appliesTo).toEqual([]);
  });

  it('gives each call its own arrays, so one form cannot mutate another', () => {
    const a = blankCoupon();
    const b = blankCoupon();
    a.appliesTo.push('pro');
    expect(b.appliesTo).toEqual([]);
  });
});
