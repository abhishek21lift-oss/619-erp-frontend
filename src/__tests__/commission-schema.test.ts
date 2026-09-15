/**
 * Trainer commission and payout rows.
 *
 * This is the screen that decides what a trainer is paid, and it had four
 * `Number(e.target.value)` reads. These pin the cases that produced money.
 */

import { describe, it, expect } from 'vitest';
import {
  commissionRowSchema,
  commissionToDraft,
  payoutRowSchema,
  payoutToDraft,
  PAYOUT_STATUSES,
} from '../lib/forms/schemas/commission';

function firstError(r: { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } }) {
  return r.success ? undefined : r.error!.issues[0]!.message;
}

describe('commission — a cleared box is not zero', () => {
  it('refuses a blank percentage rather than saving 0%', () => {
    // `Number('')` is 0, so clearing this box previously set the trainer's
    // commission to zero percent and reported success.
    const r = commissionRowSchema.safeParse({
      commission_pct: '', commission_amount: '5000', incentives: '0',
    });
    expect(r.success).toBe(false);
    expect(firstError(r)).toBe('Commission is required.');
  });

  it('refuses a blank amount and blank incentives', () => {
    expect(commissionRowSchema.safeParse({
      commission_pct: '10', commission_amount: '', incentives: '0',
    }).success).toBe(false);
    expect(commissionRowSchema.safeParse({
      commission_pct: '10', commission_amount: '5000', incentives: '',
    }).success).toBe(false);
  });

  it('keeps a deliberate zero, which is a real arrangement', () => {
    // A trainer on a flat salary has a 0% commission and no incentives. That
    // is a decision someone made; blank is not.
    const r = commissionRowSchema.safeParse({
      commission_pct: '0', commission_amount: '0', incentives: '0',
    });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ commission_pct: 0, commission_amount: 0, incentives: 0 });
  });

  it('bounds the percentage at 100', () => {
    expect(commissionRowSchema.safeParse({
      commission_pct: '101', commission_amount: '1', incentives: '0',
    }).success).toBe(false);
    expect(commissionRowSchema.safeParse({
      commission_pct: '100', commission_amount: '1', incentives: '0',
    }).success).toBe(true);
  });

  it('refuses negatives and non-numbers', () => {
    for (const pct of ['-1', 'abc', '1e999']) {
      expect(commissionRowSchema.safeParse({
        commission_pct: pct, commission_amount: '1', incentives: '0',
      }).success, `pct=${pct}`).toBe(false);
    }
  });

  it('seeds an empty box from a missing value, not a zero', () => {
    // `?? 0` would show 0% for a trainer whose percentage was never recorded,
    // which reads as a decision rather than an absence.
    expect(commissionToDraft({})).toEqual({
      commission_pct: '', commission_amount: '', incentives: '',
    });
    expect(commissionToDraft({ commission_pct: 12.5, monthly_commission: '5000' }))
      .toEqual({ commission_pct: '12.5', commission_amount: '5000', incentives: '' });
  });
});

describe('payout — paid and the amount are a pair', () => {
  it('refuses "paid" with no amount', () => {
    // A payout marked paid that cannot say how much is worse than an unmarked
    // one: a report counts it as settled.
    const r = payoutRowSchema.safeParse({ payout_status: 'paid', paid_amount: '' });
    expect(r.success).toBe(false);
    expect(firstError(r)).toBe('Enter the amount paid before marking this payout as paid.');
  });

  it('refuses "paid" for ₹0 — the shape the old coercion produced', () => {
    const r = payoutRowSchema.safeParse({ payout_status: 'paid', paid_amount: '0' });
    expect(r.success).toBe(false);
    expect(firstError(r)).toContain('cannot be ₹0');
  });

  it('blames the amount, not the status', () => {
    // The status is what the user chose on purpose; the amount is what is
    // missing. An error on the status would ask them to undo the right thing.
    const r = payoutRowSchema.safeParse({ payout_status: 'paid', paid_amount: '' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.path).toEqual(['paid_amount']);
  });

  it('allows pending with no amount', () => {
    const r = payoutRowSchema.safeParse({ payout_status: 'pending', paid_amount: '' });
    expect(r.success).toBe(true);
    expect(r.data!.paid_amount).toBe(null);
  });

  it('accepts a real paid amount', () => {
    const r = payoutRowSchema.safeParse({ payout_status: 'paid', paid_amount: '12500.50' });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ payout_status: 'paid', paid_amount: 12500.5 });
  });

  it('rejects a status outside the set', () => {
    expect(payoutRowSchema.safeParse({ payout_status: 'settled', paid_amount: '1' }).success)
      .toBe(false);
    for (const s of PAYOUT_STATUSES) {
      expect(payoutRowSchema.safeParse({ payout_status: s, paid_amount: '100' }).success).toBe(true);
    }
  });

  it('suggests the earned commission but leaves a truly empty row empty', () => {
    // Studios usually pay exactly what was earned, so pre-filling is useful.
    expect(payoutToDraft({ total_commission: 8000 }).paid_amount).toBe('8000');
    // An explicit paid_amount wins over the suggestion.
    expect(payoutToDraft({ paid_amount: 7500, total_commission: 8000 }).paid_amount).toBe('7500');
    // Nothing recorded stays blank rather than becoming '0'.
    expect(payoutToDraft({}).paid_amount).toBe('');
  });

  it('normalises an unknown stored status to pending', () => {
    expect(payoutToDraft({ payout_status: 'legacy' }).payout_status).toBe('pending');
    expect(payoutToDraft({ payout_status: 'paid' }).payout_status).toBe('paid');
  });
});
