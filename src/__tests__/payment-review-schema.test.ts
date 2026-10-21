/**
 * Approve / reject / request-correction on the payment-verification queue.
 *
 * The reason list is the backend's, not a new vocabulary; the note rules are
 * the ones the dialog and the server already used (trim, blank is absent,
 * 500 characters).
 */
import { describe, it, expect } from 'vitest';
import {
  paymentReviewSchema,
  PAYMENT_REVIEW_ACTIONS,
  PAYMENT_REVIEW_REASONS,
} from '../lib/forms/schemas/paymentReview';
import { REJECT_REASONS } from '../components/payments/upi-shared';

function reject(over: Record<string, unknown> = {}) {
  return paymentReviewSchema.safeParse({
    kind: 'reject', reason: 'WRONG_UTR', note: '', ...over,
  });
}

function correct(over: Record<string, unknown> = {}) {
  return paymentReviewSchema.safeParse({
    kind: 'correct', reason: 'WRONG_UTR', note: '', ...over,
  });
}

function messages(r: ReturnType<typeof paymentReviewSchema.safeParse>) {
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

function paths(r: ReturnType<typeof paymentReviewSchema.safeParse>) {
  return r.success ? [] : r.error.issues.map((i) => i.path[0]);
}

describe('the actions are the ones the dialog can perform', () => {
  it('has exactly approve, reject and correct', () => {
    expect(PAYMENT_REVIEW_ACTIONS).toEqual(['approve', 'reject', 'correct']);
  });

  it('refuses any other action kind', () => {
    const r = paymentReviewSchema.safeParse({ kind: 'delete' });
    expect(r.success).toBe(false);
    expect(paths(r)).toContain('kind');
  });

  it('accepts approval with no user-entered fields', () => {
    const r = paymentReviewSchema.safeParse({ kind: 'approve' });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ kind: 'approve' });
  });

  it('does not let an irrelevant stale reason or note block approval', () => {
    // Approve sends neither value. A leftover unsupported reason or a note
    // longer than the rejection limit must not turn a valid approval into a
    // validation failure.
    const r = paymentReviewSchema.safeParse({
      kind: 'approve', reason: 'NOT_A_REASON', note: 'x'.repeat(501),
    });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ kind: 'approve' });
  });
});

describe('the rejection reasons are the backend enum', () => {
  it('matches the options the dialog renders', () => {
    expect([...PAYMENT_REVIEW_REASONS].sort()).toEqual([...REJECT_REASONS].sort());
  });

  it.each(PAYMENT_REVIEW_REASONS)('accepts %s for rejection', (reason) => {
    expect(reject({ reason }).success).toBe(true);
  });

  it.each(PAYMENT_REVIEW_REASONS)('accepts %s for correction', (reason) => {
    expect(correct({ reason }).success).toBe(true);
  });

  it('trims a reason before matching it', () => {
    const r = reject({ reason: '  AMOUNT_MISMATCH  ' });
    expect(r.success).toBe(true);
    expect(r.data!.reason).toBe('AMOUNT_MISMATCH');
  });

  it.each([
    ['reject', reject],
    ['correct', correct],
  ] as const)('requires a reason for %s', (_name, parse) => {
    for (const reason of [undefined, '', '   ']) {
      const r = parse({ reason });
      expect(r.success).toBe(false);
      expect(messages(r)).toContain('Reason is required.');
      expect(paths(r)).toContain('reason');
    }
  });

  it.each([
    ['reject', reject],
    ['correct', correct],
  ] as const)('refuses an unsupported reason for %s', (_name, parse) => {
    const r = parse({ reason: 'CHARGEBACK' });
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Reason is not a valid choice.');
    expect(paths(r)).toContain('reason');
  });
});

describe('the note matches the textarea and the server', () => {
  it('accepts exactly 500 characters', () => {
    const note = 'x'.repeat(500);
    const r = reject({ note });
    expect(r.success).toBe(true);
    expect(r.data!.note).toBe(note);
  });

  it('refuses 501 characters instead of truncating silently', () => {
    const r = reject({ note: 'x'.repeat(501) });
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Note to the member cannot be more than 500 characters (currently 501).');
    expect(paths(r)).toContain('note');
  });

  it('trims a note and treats a blank one as absent', () => {
    const r = reject({ note: '  We received ₹9,000, not ₹10,620.  ' });
    expect(r.success).toBe(true);
    expect(r.data!.note).toBe('We received ₹9,000, not ₹10,620.');

    for (const note of ['', '   ', '\n\t']) {
      const blank = reject({ note });
      expect(blank.success).toBe(true);
      expect(blank.data!.note).toBeNull();
    }
  });

  it('allows an empty note for rejection and correction', () => {
    expect(reject({ note: '' }).success).toBe(true);
    expect(correct({ note: '' }).success).toBe(true);
  });
});

describe('the parsed value is the request body', () => {
  it('rejection carries only kind, reason and the trimmed note', () => {
    const r = reject({ reason: 'DUPLICATE_UTR', note: '  already submitted  ' });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({
      kind: 'reject', reason: 'DUPLICATE_UTR', note: 'already submitted',
    });
  });

  it('correction carries only kind, reason and the trimmed note', () => {
    const r = correct({ reason: 'AMOUNT_MISMATCH', note: '  please recheck  ' });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({
      kind: 'correct', reason: 'AMOUNT_MISMATCH', note: 'please recheck',
    });
  });

  it('approval carries no reason or note, even when one was typed', () => {
    const r = paymentReviewSchema.safeParse({
      kind: 'approve', reason: 'WRONG_UTR', note: '  stale  ',
    });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ kind: 'approve' });
  });
});
