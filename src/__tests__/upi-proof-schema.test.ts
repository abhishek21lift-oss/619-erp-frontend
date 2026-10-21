/**
 * The UTR and note a member submits as payment proof.
 *
 * The UTR is a digit STRING, not a number: a leading zero is real and must be
 * preserved. The note is optional and trimmed; blank is absent, not an empty
 * string. The screenshot is deliberately outside the schema (it is validated
 * by bytes in `files.ts`), so the payload helper is tested with and without it.
 */
import { describe, expect, it } from 'vitest';
import {
  blankUpiProof, toUpiProofPayload, upiProofSchema,
} from '../lib/forms/schemas/upiProof';
import { normalizeUtrInput } from '../lib/forms/domain';

function state(over: Partial<{ utr: string; notes: string }> = {}) {
  return { ...blankUpiProof(), ...over };
}

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? [] : result.error!.issues.map((issue) => issue.message);
}

describe('the UPI reference', () => {
  it('accepts 12, 14 and 16 digits', () => {
    for (const length of [12, 14, 16]) {
      expect(upiProofSchema.safeParse(state({ utr: '1'.repeat(length) })).success).toBe(true);
    }
  });

  it('keeps a leading zero, because a UTR is a string', () => {
    const result = upiProofSchema.safeParse(state({ utr: '012345678901' }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.utr).toBe('012345678901');
  });

  it('trims surrounding whitespace before checking the digits', () => {
    const result = upiProofSchema.safeParse(state({ utr: ' 012345678901 ' }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.utr).toBe('012345678901');
  });

  it('refuses blank, short and over-long references', () => {
    for (const utr of ['', '   ', '1'.repeat(11), '1'.repeat(17)]) {
      expect(upiProofSchema.safeParse(state({ utr })).success).toBe(false);
    }
  });

  it('refuses letters and separators', () => {
    for (const utr of ['12345678901a', '1234 5678 9012', '1234-5678-9012']) {
      expect(upiProofSchema.safeParse(state({ utr })).success).toBe(false);
    }
    expect(messages(upiProofSchema.safeParse(state({ utr: '12345678901a' }))))
      .toContain('UPI reference number must be 12 to 16 digits.');
  });

  it('strips what a UTR cannot contain as it is typed, and caps at 16', () => {
    expect(normalizeUtrInput('12ab34-5678 9012')).toBe('123456789012');
    expect(normalizeUtrInput('1'.repeat(20))).toBe('1'.repeat(16));
    expect(normalizeUtrInput('')).toBe('');
  });
});

describe('the note', () => {
  it('is optional and absent when blank', () => {
    for (const notes of ['', '   ']) {
      const result = upiProofSchema.safeParse(state({ utr: '1'.repeat(12), notes }));
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.notes).toBeNull();
    }
  });

  it('trims the note', () => {
    const result = upiProofSchema.safeParse(state({ utr: '1'.repeat(12), notes: '  paid from HDFC  ' }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBe('paid from HDFC');
  });

  it('accepts 500 characters and refuses 501', () => {
    expect(upiProofSchema.safeParse(state({ utr: '1'.repeat(12), notes: 'x'.repeat(500) })).success).toBe(true);
    const tooLong = upiProofSchema.safeParse(state({ utr: '1'.repeat(12), notes: 'x'.repeat(501) }));
    expect(tooLong.success).toBe(false);
    expect(messages(tooLong).join(' ')).toMatch(/500/);
  });
});

describe('the payload', () => {
  it('sends all four keys with nulls when no proof was attached', () => {
    const result = upiProofSchema.safeParse(state({
      utr: '012345678901',
      notes: '  paid  ',
    }));
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(toUpiProofPayload(result.data, null)).toEqual({
      utr: '012345678901',
      screenshot_url: null,
      screenshot_mime: null,
      notes: 'paid',
    });
  });

  it('passes through the uploaded proof URL and MIME unchanged', () => {
    const result = upiProofSchema.safeParse(state({ utr: '1'.repeat(12) }));
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(toUpiProofPayload(result.data, {
      url: 'https://cdn.example/proofs/abc.pdf',
      mime: 'application/pdf',
    })).toEqual({
      utr: '1'.repeat(12),
      screenshot_url: 'https://cdn.example/proofs/abc.pdf',
      screenshot_mime: 'application/pdf',
      notes: null,
    });
  });
});
