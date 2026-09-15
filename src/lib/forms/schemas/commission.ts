/**
 * Trainer commission and payout rows.
 *
 * Not a form in the modal sense — this is inline editing inside a table, one
 * draft per trainer. The schema layer still applies, and applies hardest here:
 * this is the screen that decides what a trainer is paid.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 * Four numeric inputs read `Number(e.target.value)` straight into the draft:
 *
 *     commission_pct     a trainer's percentage
 *     commission_amount  what they earn this month
 *     incentives         bonuses on top
 *     paid_amount        what the studio recorded as actually paid
 *
 * `Number('') === 0`, so clearing any of those boxes and saving wrote a real
 * zero. Clearing the percentage set the trainer's commission to 0%. Clearing
 * the paid amount recorded that they were paid ₹0 — and the payout status sat
 * beside it, so the row could read "paid, ₹0".
 *
 * Nothing bounded the percentage either, so 500% was storable.
 *
 * ── Drafts are keyed by trainer, and the month is not in the key ────────────
 *
 * `payoutDraft[trainerId]` outlives a month change: the payouts list refetches
 * for the new month, the draft does not clear, and saving writes March's figure
 * against April. The page now clears drafts when the month changes, and these
 * types hold STRINGS so a half-typed value is never a number that looks
 * deliberate.
 */

import { z } from 'zod';
import { moneyField, percentField, enumField } from '../primitives';

/* ── Commission ──────────────────────────────────────────────────────────── */

/** One row's raw edit state. Strings, because every control produces one. */
export type CommissionDraft = {
  commission_pct: string;
  commission_amount: string;
  incentives: string;
};

export const commissionRowSchema = z.object({
  // 0 is legitimate and different from absent: a trainer on a flat salary has a
  // 0% commission, and that is a decision someone made. Blank is not.
  commission_pct: percentField({ label: 'Commission', required: true, min: 0, max: 100 }),
  commission_amount: moneyField({ label: 'Commission amount', required: true, min: 0 }),
  incentives: moneyField({ label: 'Incentives', required: true, min: 0 }),
});

export type CommissionValues = z.output<typeof commissionRowSchema>;

/**
 * Seed a draft from a stored row.
 *
 * `?? ''` rather than `?? 0`: a trainer with no percentage recorded should show
 * an empty box, not a 0% that nobody chose and that reads as deliberate.
 */
export function commissionToDraft(row: {
  commission_pct?: number | string | null;
  monthly_commission?: number | string | null;
  total_incentives?: number | string | null;
}): CommissionDraft {
  const s = (v: unknown) => (v === null || v === undefined || v === '' ? '' : String(v));
  return {
    commission_pct: s(row.commission_pct),
    commission_amount: s(row.monthly_commission),
    incentives: s(row.total_incentives),
  };
}

/* ── Payout ──────────────────────────────────────────────────────────────── */

export const PAYOUT_STATUSES = ['pending', 'paid'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
] as const;

export type PayoutDraft = {
  payout_status: PayoutStatus;
  paid_amount: string;
};

export const payoutRowSchema = z
  .object({
    payout_status: enumField(PAYOUT_STATUSES, { label: 'Status', required: true }),
    // Optional at field level; the pairing rule below decides when it is not.
    paid_amount: moneyField({ label: 'Paid amount', min: 0 }),
  })
  .superRefine((v, ctx) => {
    // The pair that matters. "Paid" with no amount is a payout record that
    // says money moved and cannot say how much — which is worse than an
    // unmarked payout, because a report will count it as settled.
    if (v.payout_status === 'paid' && v.paid_amount === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['paid_amount'],
        message: 'Enter the amount paid before marking this payout as paid.',
      });
    }
    // ₹0 marked paid is the shape the old Number('') coercion produced, and it
    // is not a payment. A waiver is a pending payout, not a zero one.
    if (v.payout_status === 'paid' && v.paid_amount === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['paid_amount'],
        message: 'A paid payout cannot be ₹0. Leave it pending if nothing was paid.',
      });
    }
  });

export type PayoutValues = z.output<typeof payoutRowSchema>;

export function payoutToDraft(row: {
  payout_status?: string | null;
  paid_amount?: number | string | null;
  total_commission?: number | string | null;
}): PayoutDraft {
  const status: PayoutStatus =
    row.payout_status === 'paid' ? 'paid' : 'pending';

  // Falls back to the computed commission as a suggestion, which is what the
  // previous code did and is genuinely useful — the studio usually pays exactly
  // what was earned. `?? ''` at the end so "nothing recorded" stays empty.
  const raw = row.paid_amount ?? row.total_commission;
  return {
    payout_status: status,
    paid_amount: raw === null || raw === undefined || raw === '' ? '' : String(raw),
  };
}

/** Server messages these endpoints produce, mapped to their field. */
export const COMMISSION_FIELD_HINTS: Record<string, string> = {
  'commission_pct must be between 0 and 100': 'commission_pct',
  'commission_amount must be greater than 0': 'commission_amount',
};

export const PAYOUT_FIELD_HINTS: Record<string, string> = {
  'paid_amount must be greater than 0': 'paid_amount',
};
