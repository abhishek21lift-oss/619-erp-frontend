/**
 * Renewing a client's PT package.
 *
 * Sets the term, the price and what the client has paid toward it, and the
 * server derives `balance_amount` from those — so a wrong figure here is not a
 * display problem, it is what the studio chases the client for.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 *     const final   = Number(form.finalAmount) || 0;
 *     const paidNow = Number(form.paidNow)     || 0;
 *
 * and the only guard on the way out was `if (!form.startDate ||
 * !form.durationMonths)`. So a renewal with the Final Amount box empty — a box
 * the label marks with an asterisk — went through at **₹0**, the client's
 * balance was set to zero, and their term was extended for free.
 *
 * Two more followed from the same place:
 *
 *   · `monthly_pt_amount: Math.round(final / Number(form.durationMonths))`.
 *     `'  '` is truthy, `Number('  ')` is 0, and `final / 0` is Infinity —
 *     which `JSON.stringify` writes as `null`.
 *   · the end-date preview was `new Date(start).setMonth(+n).toISOString()`,
 *     which converts to UTC first. East of Greenwich that lands a day early,
 *     so every Indian user was shown an end date one day before the real one.
 *
 * ── Why paid-now may be zero and final may not ──────────────────────────────
 *
 * Renewing without taking money is ordinary: the client pays later and the
 * balance says so. Renewing for nothing is not — a free term is a discount,
 * and a discount that leaves no record of what the package was worth cannot be
 * reported on.
 */

import { z } from 'zod';
import { moneyField, integerField, dateField, textField } from '../primitives';

export const renewPtSchema = z
  .object({
    finalAmount: moneyField({ label: 'Final amount', required: true, min: 1 }),
    // 0 is legitimate and different from absent: renewing without taking money
    // today is ordinary, and the balance is what says so.
    paidNow: moneyField({ label: 'Amount paid now', min: 0 }),
    startDate: dateField({ label: 'Start date', required: true }),
    durationMonths: integerField({
      label: 'Duration', required: true, min: 1, max: 60, unit: 'months',
    }),
    notes: textField({ label: 'Notes', maxLength: 1000 }),
  })
  .superRefine((v, ctx) => {
    // Taking more than the package is worth is not a renewal, it is a data
    // entry error: the server clamps the balance at 0 and the excess simply
    // disappears from the record.
    if (v.finalAmount !== null && v.paidNow !== null && v.paidNow > v.finalAmount) {
      ctx.addIssue({
        code: 'custom',
        path: ['paidNow'],
        message: 'More than the package price. Reduce it, or raise the final amount.',
      });
    }
  });

export type RenewPtValues = z.output<typeof renewPtSchema>;

export type RenewPtState = {
  finalAmount: string;
  paidNow: string;
  startDate: string;
  durationMonths: string;
  notes: string;
};

export function blankRenewPt(finalAmount = ''): RenewPtState {
  return { finalAmount, paidNow: '', startDate: '', durationMonths: '', notes: '' };
}

/**
 * The term's end date, in the studio's own calendar.
 *
 * Built from local date parts rather than `toISOString()`, which converts to
 * UTC first — so a March start in IST came back as the last day of February.
 * `setMonth` handles the short-month case the way a person expects: 31 January
 * plus one month is 3 March in JavaScript, which is the same answer a gym
 * gives when it says "a month from the 31st".
 */
export function ptEndDate(startDate: string, durationMonths: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!m || !Number.isInteger(durationMonths) || durationMonths < 1) return null;

  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setMonth(d.getMonth() + durationMonths);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** What the client still owes after this renewal. */
export function renewalBalance(finalAmount: number, paidNow: number): number {
  return Math.max(finalAmount - paidNow, 0);
}

export function toRenewPtPayload(v: RenewPtValues) {
  const final = v.finalAmount as number;
  const months = v.durationMonths as number;
  return {
    final_amount: final,
    paid_amount: v.paidNow ?? 0,
    // Safe division: `durationMonths` is a required integer of 1 or more, so
    // this can no longer be `final / 0`.
    monthly_pt_amount: Math.round(final / months),
    pt_start_date: v.startDate as string,
    duration_months: months,
    notes: v.notes ?? undefined,
  };
}
