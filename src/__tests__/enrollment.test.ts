// Enrolment: the payment-method contract, the agreement wording, and age.
//
// ageFrom exists twice — here and in the backend's ptEnrollmentPdf.js, because
// the header computes it in the browser and the PDF computes it on the server.
// Two implementations of one rule is a divergence waiting to happen, and the
// visible symptom would be a form saying "Age 29" printed from a page saying
// "Age 28". Both are tested against the same cases.

import { describe, expect, it } from 'vitest';
import { AGREEMENT_TEXT, PAYMENT_METHODS, ageFrom } from '@/lib/enrollment';

describe('payment methods', () => {
  // The values are the server's enum. Anything else comes back a 400 and
  // takes the whole enrolment save down with it, so this list is a contract
  // and not a UI preference.
  it('offers exactly the five the server accepts', () => {
    expect(PAYMENT_METHODS.map((m) => m.value))
      .toEqual(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'SPLIT']);
  });

  it('sends an enum-shaped value, not a display string', () => {
    // 'Bank Transfer' would be rejected by the server; 'BANK_TRANSFER' is the
    // column value.
    //
    // Two tempting invariants that are both FALSE here, and were both written
    // before being checked: value !== label (UPI is legitimately both), and
    // "a two-word label implies an underscore in the value" (Split Payment is
    // SPLIT). The label is a human name for the value, not a transform of it.
    // What is actually true is the shape.
    for (const m of PAYMENT_METHODS) {
      expect(m.value).toMatch(/^[A-Z][A-Z_]*$/);
    }
  });

  it('gives every option something to read and something to recognise', () => {
    for (const m of PAYMENT_METHODS) {
      expect(m.label.trim()).not.toBe('');
      expect(m.icon.trim()).not.toBe('');
    }
  });

  it('has no duplicates', () => {
    expect(new Set(PAYMENT_METHODS.map((m) => m.value)).size).toBe(PAYMENT_METHODS.length);
  });
});

describe('the agreement wording', () => {
  it('is substantive enough to be worth signing', () => {
    // It is stored verbatim next to the signature. An empty or placeholder
    // string would make the stored record meaningless while still looking
    // like a signed agreement.
    expect(AGREEMENT_TEXT.length).toBeGreaterThan(120);
    expect(AGREEMENT_TEXT).toMatch(/risk/i);
    expect(AGREEMENT_TEXT).toMatch(/refund|cancellation/i);
  });
});

describe('ageFrom', () => {
  /** A birthday `years` ago, offset by `days`, as YYYY-MM-DD. */
  const birthday = (years: number, days = 0) => {
    const n = new Date();
    return new Date(Date.UTC(n.getUTCFullYear() - years, n.getUTCMonth(), n.getUTCDate() + days))
      .toISOString().slice(0, 10);
  };

  it('counts whole years', () => {
    expect(ageFrom(birthday(30))).toBe(30);
    expect(ageFrom(birthday(1))).toBe(1);
  });

  it('does not round up before the birthday', () => {
    // Tomorrow, thirty years ago: still 29 today.
    expect(ageFrom(birthday(30, 1))).toBe(29);
  });

  it('counts the birthday itself', () => {
    expect(ageFrom(birthday(30, 0))).toBe(30);
  });

  it('returns null instead of a number for missing input', () => {
    expect(ageFrom(null)).toBeNull();
    expect(ageFrom('')).toBeNull();
  });

  it('returns null for junk rather than NaN', () => {
    // NaN would render as "Age NaN" in the header chip.
    expect(ageFrom('not-a-date')).toBeNull();
    expect(ageFrom('0000-00-00')).toBeNull();
  });

  it('refuses an implausible age instead of printing it', () => {
    // A mistyped year should read as "no age", not "Age 928".
    expect(ageFrom('1098-01-01')).toBeNull();
    expect(ageFrom('3025-01-01')).toBeNull();
  });
});
