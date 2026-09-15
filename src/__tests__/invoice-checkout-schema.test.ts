/**
 * Creating an invoice, and submitting a UPI reference against a checkout.
 *
 * The invoice case is the one worth reading: `parseFloat` parses a PREFIX, and
 * neither side of the wire caught what that let through.
 */

import { describe, it, expect } from 'vitest';
import {
  createInvoiceSchema, blankInvoice, toCreateInvoicePayload, DUE_DATE_BOUNDS,
  INVOICE_PAYMENT_METHODS, type CreateInvoiceState,
} from '../lib/forms/schemas/invoice';
import {
  submitUtrSchema, blankSubmitUtr, normalizeUtrInput,
} from '../lib/forms/schemas/subscriptionCheckout';
import { todayISO } from '../lib/forms/domain';

function invoice(over: Partial<CreateInvoiceState> = {}): CreateInvoiceState {
  return { ...blankInvoice(), memberName: 'Rahul Sharma', amount: '5000', ...over };
}

function messages(r: { success: boolean; error?: { issues: { message: string }[] } }) {
  return r.success ? [] : r.error!.issues.map((i) => i.message);
}

describe('the invoice amount, where parseFloat was the defect', () => {
  it('reads a figure typed with the separator a studio owner actually uses', () => {
    // `parseFloat('1,500')` is 1. This made a ₹1 invoice and created it
    // successfully.
    const r = createInvoiceSchema.safeParse(invoice({ amount: '1,500' }));
    expect(r.success).toBe(true);
    expect(r.data!.amount).toBe(1500);
  });

  it('reads a figure pasted with a rupee sign', () => {
    expect(createInvoiceSchema.safeParse(invoice({ amount: '₹2,499.50' })).data!.amount).toBe(2499.5);
  });

  it('refuses a prefix-parseable string rather than banking the prefix', () => {
    // `parseFloat('12abc')` is 12.
    const r = createInvoiceSchema.safeParse(invoice({ amount: '12abc' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Amount must be a number.');
  });

  it('refuses a value that would reach the server as NaN', () => {
    // NaN serialises to null, and routes/invoices.js does
    // `parseFloat(d.amount) || 0` — so this became a ₹0 invoice.
    expect(createInvoiceSchema.safeParse(invoice({ amount: 'abc' })).success).toBe(false);
  });

  it('refuses a blank amount and a zero one', () => {
    expect(createInvoiceSchema.safeParse(invoice({ amount: '' })).success).toBe(false);
    expect(createInvoiceSchema.safeParse(invoice({ amount: '0' })).success).toBe(false);
  });
});

describe('the due date is bounded in both directions', () => {
  it('defaults to today', () => {
    expect(blankInvoice().dueDate).toBe(todayISO());
  });

  it('allows backdating, which is real work', () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-10`;
    expect(createInvoiceSchema.safeParse(invoice({ dueDate: iso })).success).toBe(true);
  });

  it('refuses a mistyped year in either direction', () => {
    // Permanently overdue, or never chased. Neither announces itself.
    expect(createInvoiceSchema.safeParse(invoice({ dueDate: '1999-06-01' })).success).toBe(false);
    expect(createInvoiceSchema.safeParse(invoice({ dueDate: '2099-06-01' })).success).toBe(false);
  });

  it('exposes the bounds so the control can carry the same ones', () => {
    expect(DUE_DATE_BOUNDS.min < todayISO()).toBe(true);
    expect(DUE_DATE_BOUNDS.max > todayISO()).toBe(true);
  });

  it('refuses a blank due date', () => {
    expect(createInvoiceSchema.safeParse(invoice({ dueDate: '' })).success).toBe(false);
  });
});

describe('the rest of the invoice', () => {
  it('requires a member name', () => {
    const r = createInvoiceSchema.safeParse(invoice({ memberName: '   ' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Member name is required.');
  });

  it('reports an over-long description instead of truncating the line item', () => {
    const r = createInvoiceSchema.safeParse(invoice({ description: 'x'.repeat(501) }));
    expect(r.success).toBe(false);
    expect(messages(r)[0]).toMatch(/currently 501/);
  });

  it.each(INVOICE_PAYMENT_METHODS)('accepts the %s method', (m) => {
    expect(createInvoiceSchema.safeParse(invoice({ paymentMethod: m })).success).toBe(true);
  });

  it('refuses a method outside the set', () => {
    expect(createInvoiceSchema.safeParse(invoice({ paymentMethod: 'barter' as never })).success).toBe(false);
  });

  it('builds the payload the endpoint expects', () => {
    const r = createInvoiceSchema.safeParse(invoice({ description: '  Monthly membership  ' }));
    expect(toCreateInvoicePayload(r.data!)).toEqual({
      member_name: 'Rahul Sharma',
      amount: 5000,
      due_date: todayISO(),
      description: 'Monthly membership',
      payment_method: 'upi',
    });
  });

  it('sends null for an absent description rather than an empty line item', () => {
    const r = createInvoiceSchema.safeParse(invoice({ description: '   ' }));
    expect(toCreateInvoicePayload(r.data!).description).toBeNull();
  });
});

describe('the UPI reference', () => {
  it('accepts 12 to 16 digits', () => {
    for (const n of [12, 14, 16]) {
      const utr = '1'.repeat(n);
      expect(submitUtrSchema.safeParse({ utr, note: '' }).success).toBe(true);
    }
  });

  it('keeps a leading zero, because a UTR is a digit string', () => {
    const r = submitUtrSchema.safeParse({ utr: '012345678901', note: '' });
    expect(r.success).toBe(true);
    expect(r.data!.utr).toBe('012345678901');
  });

  it.each(['', '12345678901', '12345678901234567', 'ABCDEFGHIJKL'])('refuses %j', (bad) => {
    expect(submitUtrSchema.safeParse({ utr: bad, note: '' }).success).toBe(false);
  });

  it('strips what a UTR cannot contain, as it is typed', () => {
    expect(normalizeUtrInput('1234-5678 9012')).toBe('123456789012');
    expect(normalizeUtrInput('abc123')).toBe('123');
  });

  it('stops at the schema maximum rather than accepting an over-long paste', () => {
    expect(normalizeUtrInput('9'.repeat(30))).toBe('9'.repeat(16));
  });

  it('starts blank', () => {
    expect(blankSubmitUtr()).toEqual({ utr: '', note: '' });
  });

  it('reports an over-long note instead of truncating it', () => {
    const r = submitUtrSchema.safeParse({ utr: '1'.repeat(12), note: 'x'.repeat(501) });
    expect(r.success).toBe(false);
  });
});
