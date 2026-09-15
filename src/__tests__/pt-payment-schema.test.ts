/**
 * Recording a PT client's payment — a keypad on a phone, member standing
 * there, and the fastest-moving form in the product.
 */

import { describe, it, expect } from 'vitest';
import {
  ptPaymentSchema, blankPtPayment, applyKeypad, balanceAfter, toPtPaymentPayload,
  PT_PAYMENT_METHODS, type PtPaymentState,
} from '../lib/forms/schemas/ptPayment';
import { todayISO } from '../lib/forms/domain';

function base(over: Partial<PtPaymentState> = {}): PtPaymentState {
  return { ...blankPtPayment(), amount: '5000', ...over };
}

function messages(r: ReturnType<typeof ptPaymentSchema.safeParse>) {
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

describe('the amount', () => {
  it('accepts a real payment', () => {
    const r = ptPaymentSchema.safeParse(base());
    expect(r.success).toBe(true);
    expect(r.data!.amount).toBe(5000);
  });

  it('refuses a blank rather than recording ₹0', () => {
    // The server does `Number(amount) || 0` and inserts, so nothing behind the
    // form would have caught it either.
    const r = ptPaymentSchema.safeParse(base({ amount: '' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Amount is required.');
  });

  it("refuses '0.', which the keypad can produce by tapping the point first", () => {
    const r = ptPaymentSchema.safeParse(base({ amount: '0.' }));
    expect(r.success).toBe(false);
  });

  it('refuses zero — a waiver is not a payment', () => {
    expect(ptPaymentSchema.safeParse(base({ amount: '0' })).success).toBe(false);
  });

  it('keeps paise', () => {
    const r = ptPaymentSchema.safeParse(base({ amount: '1500.50' }));
    expect(r.data!.amount).toBe(1500.5);
  });
});

describe('the keypad rules, as a pure function', () => {
  it('appends digits and replaces a lone leading zero', () => {
    expect(applyKeypad('', '5')).toBe('5');
    expect(applyKeypad('0', '5')).toBe('5');
    expect(applyKeypad('5', '0')).toBe('50');
  });

  it('backspaces', () => {
    expect(applyKeypad('500', '⌫')).toBe('50');
    expect(applyKeypad('', '⌫')).toBe('');
  });

  it('allows exactly one decimal point, and seeds a zero before it', () => {
    expect(applyKeypad('', '.')).toBe('0.');
    expect(applyKeypad('50', '.')).toBe('50.');
    expect(applyKeypad('50.', '.')).toBe('50.');
    expect(applyKeypad('50.5', '.')).toBe('50.5');
  });

  it('stops at two decimal places rather than accepting paise that do not exist', () => {
    expect(applyKeypad('50.55', '5')).toBe('50.55');
    expect(applyKeypad('50.5', '5')).toBe('50.55');
  });

  it('stops at eight integer digits', () => {
    // Without this a stuck key produced a number the schema then rejected with
    // a message about a value nobody intended to type.
    expect(applyKeypad('99999999', '9')).toBe('99999999');
    expect(applyKeypad('9999999', '9')).toBe('99999999');
    // The cap counts integer digits only, so paise still work at the ceiling.
    expect(applyKeypad('99999999', '.')).toBe('99999999.');
  });
});

describe('the date', () => {
  it('defaults to today', () => {
    expect(blankPtPayment().date).toBe(todayISO());
  });

  it('refuses a future date — it would land in a month that has not happened', () => {
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    const iso = `${next.getFullYear()}-01-15`;
    const r = ptPaymentSchema.safeParse(base({ date: iso }));
    expect(r.success).toBe(false);
    expect(messages(r)[0]).toMatch(/^Date cannot be after /);
  });

  it('refuses a date more than two years back — 2025 → 2015 is one keystroke', () => {
    expect(ptPaymentSchema.safeParse(base({ date: '2015-06-01' })).success).toBe(false);
  });

  it('accepts a genuinely late entry from last month', () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`;
    expect(ptPaymentSchema.safeParse(base({ date: iso })).success).toBe(true);
  });

  it('refuses a blank date rather than letting the server default it', () => {
    expect(ptPaymentSchema.safeParse(base({ date: '' })).success).toBe(false);
  });
});

describe('the payment method is a closed set', () => {
  it.each(PT_PAYMENT_METHODS)('accepts %s', (method) => {
    const r = ptPaymentSchema.safeParse(base({ payment_method: method }));
    expect(r.success).toBe(true);
    expect(r.data!.payment_method).toBe(method);
  });

  it('refuses anything outside it', () => {
    const r = ptPaymentSchema.safeParse(
      base({ payment_method: 'CHEQUE' as never }),
    );
    expect(r.success).toBe(false);
  });
});

describe('overpayment is allowed, and never invisible', () => {
  it('reports the excess instead of clamping the balance to zero', () => {
    // ₹50,000 against a ₹5,000 balance used to render "New balance ₹0" —
    // indistinguishable from paying it off exactly.
    const { balanceInr, overpaymentInr } = balanceAfter(20000, 15000, 50000);
    expect(balanceInr).toBe(0);
    expect(overpaymentInr).toBe(45000);
  });

  it('reports a plain remaining balance with no excess', () => {
    expect(balanceAfter(20000, 15000, 2000)).toEqual({ balanceInr: 3000, overpaymentInr: 0 });
  });

  it('reports exact settlement as neither', () => {
    expect(balanceAfter(20000, 15000, 5000)).toEqual({ balanceInr: 0, overpaymentInr: 0 });
  });
});

describe('the payload', () => {
  it('sends parsed values and never the client as the authority on the trainer', () => {
    const r = ptPaymentSchema.safeParse(base({ payment_ref: ' UTR123 ', notes: '' }));
    const payload = toPtPaymentPayload(r.data!, { clientId: 'c1', trainerId: 't1' });
    expect(payload).toEqual({
      client_id: 'c1',
      trainer_id: 't1',
      amount: 5000,
      incentive_amt: 0,
      payment_method: 'CASH',
      payment_ref: 'UTR123',
      date: todayISO(),
      notes: null,
    });
  });
});

describe('a fresh form every time (§11)', () => {
  it('starts blank, on cash, dated today', () => {
    const a = blankPtPayment();
    expect(a.amount).toBe('');
    expect(a.payment_method).toBe('CASH');
    expect(a.payment_ref).toBe('');
    expect(a.notes).toBe('');
  });

  it('gives each call its own object', () => {
    const a = blankPtPayment();
    const b = blankPtPayment();
    a.amount = '999';
    expect(b.amount).toBe('');
  });
});
