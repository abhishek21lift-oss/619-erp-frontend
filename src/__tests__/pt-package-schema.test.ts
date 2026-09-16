/**
 * A PT package in the studio's catalogue.
 *
 * Its price is what every enrolment against it charges, so a wrong figure is
 * not one wrong row — it is every client sold that package afterwards.
 */

import { describe, it, expect } from 'vitest';
import {
  ptPackageSchema, blankPtPackage, ptPackageToFormValues, toPtPackagePayload,
  PACKAGE_GOAL_TYPES, type PtPackageState,
} from '../lib/forms/schemas/ptPackage';

function pkg(over: Partial<PtPackageState> = {}): PtPackageState {
  return {
    ...blankPtPackage(),
    name: 'Fat Loss Starter',
    session_count: '12',
    duration_days: '30',
    price: '8000',
    ...over,
  };
}

function messages(r: ReturnType<typeof ptPackageSchema.safeParse>) {
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

describe('parseFloat parsed a prefix, and that priced a package at ₹8', () => {
  it('reads "8,000" as eight thousand', () => {
    // `parseFloat('8,000')` is 8. Writing a price with the separator is how a
    // studio owner writes a price.
    const r = ptPackageSchema.safeParse(pkg({ price: '8,000' }));
    expect(r.success).toBe(true);
    expect(r.data!.price).toBe(8000);
  });

  it('reads "₹8,000" the same way', () => {
    expect(ptPackageSchema.safeParse(pkg({ price: '₹8,000' })).data!.price).toBe(8000);
  });

  it('refuses a price that is not a number rather than banking its prefix', () => {
    const r = ptPackageSchema.safeParse(pkg({ price: '8000 rupees' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Price must be a number.');
  });

  it('refuses a whitespace price, which the truthiness guard let through as NaN', () => {
    const r = ptPackageSchema.safeParse(pkg({ price: '   ' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Price is required.');
  });

  it('ALLOWS ₹0 — an induction or a comp is a real product', () => {
    const r = ptPackageSchema.safeParse(pkg({ price: '0' }));
    expect(r.success).toBe(true);
    expect(r.data!.price).toBe(0);
  });

  it('refuses a negative price', () => {
    expect(ptPackageSchema.safeParse(pkg({ price: '-500' })).success).toBe(false);
  });
});

describe('sessions and days are counts, and a package of zero is not a product', () => {
  it('refuses zero or blank sessions', () => {
    expect(ptPackageSchema.safeParse(pkg({ session_count: '0' })).success).toBe(false);
    expect(ptPackageSchema.safeParse(pkg({ session_count: '' })).success).toBe(false);
  });

  it('refuses zero or blank days', () => {
    expect(ptPackageSchema.safeParse(pkg({ duration_days: '0' })).success).toBe(false);
    expect(ptPackageSchema.safeParse(pkg({ duration_days: '  ' })).success).toBe(false);
  });

  it('refuses fractional counts rather than truncating them as parseInt did', () => {
    // `parseInt('12.9')` is 12, silently.
    expect(ptPackageSchema.safeParse(pkg({ session_count: '12.9' })).success).toBe(false);
  });

  it('accepts a three-year package and refuses a longer one', () => {
    expect(ptPackageSchema.safeParse(pkg({ duration_days: '1095' })).success).toBe(true);
    expect(ptPackageSchema.safeParse(pkg({ duration_days: '4000' })).success).toBe(false);
  });
});

describe('the goal type', () => {
  it.each(PACKAGE_GOAL_TYPES)('sends %s through', (g) => {
    expect(toPtPackagePayload(ptPackageSchema.safeParse(pkg({ goal_type: g })).data!).goal_type).toBe(g);
  });

  it('sends null for "not categorised" rather than an empty string', () => {
    expect(toPtPackagePayload(ptPackageSchema.safeParse(pkg()).data!).goal_type).toBeNull();
  });

  it('sends null for a value outside the set rather than passing it on', () => {
    expect(toPtPackagePayload(ptPackageSchema.safeParse(pkg({ goal_type: 'wizardry' })).data!).goal_type).toBeNull();
  });
});

describe('rebuilding from a stored package (§11)', () => {
  it('writes every key, including the ones the record has nothing for', () => {
    const state = ptPackageToFormValues({ name: 'Trial', session_count: 4, duration_days: 7, price: 0 });
    expect(Object.keys(state).sort()).toEqual(Object.keys(blankPtPackage()).sort());
    expect(state.price).toBe('0');
    expect(state.goal_type).toBe('');
    expect(state.description).toBe('');
  });

  it('seeds a stored zero as "0", not as blank', () => {
    // `|| ''` would have turned a ₹0 package into a blank price box, and
    // saving it again would then be refused for a value that was already there.
    expect(ptPackageToFormValues({ price: 0 }).price).toBe('0');
  });
});

describe('the payload', () => {
  it('sends parsed numbers and a null description when there is none', () => {
    const r = ptPackageSchema.safeParse(pkg());
    expect(toPtPackagePayload(r.data!)).toEqual({
      name: 'Fat Loss Starter',
      session_count: 12,
      duration_days: 30,
      price: 8000,
      goal_type: null,
      description: null,
    });
  });
});
