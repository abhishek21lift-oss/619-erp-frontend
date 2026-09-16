/**
 * Renewing a client's PT package.
 *
 * Sets the term, the price and what has been paid toward it, and the server
 * derives the balance from those — so a wrong figure here is what the studio
 * chases the client for.
 */

import { describe, it, expect } from 'vitest';
import {
  renewPtSchema, blankRenewPt, toRenewPtPayload, ptEndDate, renewalBalance,
  type RenewPtState,
} from '../lib/forms/schemas/renewPt';

function renew(over: Partial<RenewPtState> = {}): RenewPtState {
  return {
    ...blankRenewPt(),
    finalAmount: '24000',
    startDate: '2026-03-01',
    durationMonths: '6',
    ...over,
  };
}

function messages(r: ReturnType<typeof renewPtSchema.safeParse>) {
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

describe('a blank price is not a free renewal', () => {
  it('refuses a blank final amount', () => {
    // `Number(form.finalAmount) || 0` renewed at ₹0, set the client's balance
    // to zero, and extended their term for free.
    const r = renewPtSchema.safeParse(renew({ finalAmount: '' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Final amount is required.');
  });

  it('refuses ₹0 outright — a free term is a discount, and belongs on record as one', () => {
    const r = renewPtSchema.safeParse(renew({ finalAmount: '0' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Final amount must be at least 1 ₹.');
  });

  it('ALLOWS a blank amount-paid — renewing without taking money is ordinary', () => {
    const r = renewPtSchema.safeParse(renew({ paidNow: '' }));
    expect(r.success).toBe(true);
    expect(r.data!.paidNow).toBeNull();
    expect(toRenewPtPayload(r.data!).paid_amount).toBe(0);
  });

  it('refuses taking more than the package is worth', () => {
    // The server clamps the balance at 0, so the excess simply disappears.
    const r = renewPtSchema.safeParse(renew({ finalAmount: '10000', paidNow: '15000' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('More than the package price. Reduce it, or raise the final amount.');
  });

  it('allows paying exactly the price', () => {
    expect(renewPtSchema.safeParse(renew({ finalAmount: '10000', paidNow: '10000' })).success).toBe(true);
  });
});

describe('the term', () => {
  it('requires a duration of at least a month', () => {
    expect(renewPtSchema.safeParse(renew({ durationMonths: '' })).success).toBe(false);
    expect(renewPtSchema.safeParse(renew({ durationMonths: '0' })).success).toBe(false);
  });

  it('refuses whitespace, which used to divide the price by zero', () => {
    // `Math.round(final / Number('  '))` is Infinity, which JSON writes as null.
    expect(renewPtSchema.safeParse(renew({ durationMonths: '  ' })).success).toBe(false);
  });

  it('refuses a fractional or absurd duration', () => {
    expect(renewPtSchema.safeParse(renew({ durationMonths: '6.5' })).success).toBe(false);
    expect(renewPtSchema.safeParse(renew({ durationMonths: '120' })).success).toBe(false);
  });

  it('requires a start date', () => {
    expect(renewPtSchema.safeParse(renew({ startDate: '' })).success).toBe(false);
  });
});

describe('ptEndDate reads the local calendar', () => {
  it('adds the months without a timezone round trip', () => {
    // `new Date(s).setMonth(+n).toISOString()` converts to UTC first, so east
    // of Greenwich it lands a day early — every Indian user saw an end date
    // one day before the real one.
    expect(ptEndDate('2026-03-01', 6)).toBe('2026-09-01');
    expect(ptEndDate('2026-01-15', 1)).toBe('2026-02-15');
    expect(ptEndDate('2026-12-31', 1)).toBe('2027-01-31');
  });

  it('handles a short month the way a gym says it', () => {
    // 31 January plus one month is 3 March, which is what "a month from the
    // 31st" means to everyone who is not a calendar library.
    expect(ptEndDate('2026-01-31', 1)).toBe('2026-03-03');
  });

  it('returns null for an incomplete term rather than a wrong date', () => {
    expect(ptEndDate('', 6)).toBeNull();
    expect(ptEndDate('2026-03-01', 0)).toBeNull();
    expect(ptEndDate('2026-03-01', 1.5)).toBeNull();
    expect(ptEndDate('not-a-date', 6)).toBeNull();
  });
});

describe('the payload', () => {
  it('never divides by zero for the monthly figure', () => {
    const r = renewPtSchema.safeParse(renew({ finalAmount: '24000', durationMonths: '6' }));
    expect(toRenewPtPayload(r.data!).monthly_pt_amount).toBe(4000);
  });

  it('rounds the monthly figure rather than sending a fraction', () => {
    const r = renewPtSchema.safeParse(renew({ finalAmount: '10000', durationMonths: '3' }));
    expect(toRenewPtPayload(r.data!).monthly_pt_amount).toBe(3333);
  });

  it('sends the parsed numbers and an undefined note when there is none', () => {
    const r = renewPtSchema.safeParse(renew({ paidNow: '5000' }));
    expect(toRenewPtPayload(r.data!)).toEqual({
      final_amount: 24000,
      paid_amount: 5000,
      monthly_pt_amount: 4000,
      pt_start_date: '2026-03-01',
      duration_months: 6,
      notes: undefined,
    });
  });
});

describe('the balance', () => {
  it('never goes below zero', () => {
    expect(renewalBalance(10000, 12000)).toBe(0);
    expect(renewalBalance(10000, 4000)).toBe(6000);
  });
});
