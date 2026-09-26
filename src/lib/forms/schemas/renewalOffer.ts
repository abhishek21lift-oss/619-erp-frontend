/**
 * A trainer's renewal offer to one client (POST /api/payments/upi/renewal-offers).
 *
 * Bounds mirror the server's (RENEWAL_LIMITS in lib/upiPayments.js) so a
 * value it would refuse is refused here, next to the field. What depends on
 * state — an offer the member has already paid — is the server's, and comes
 * back as a form error.
 */

import { z } from 'zod';
import { integerField, moneyField, textField } from '../primitives';
import type { RenewalOfferInput } from '@/lib/api';

export const OFFER_MONTHS = [1, 3, 6, 12] as const;
export const OFFER_VALID_DAYS = ['3', '7', '14', '30'] as const;

export const renewalOfferSchema = z
  .object({
    months: integerField({ label: 'Months', min: 1, max: 24 }),
    amount: moneyField({ label: 'Price', min: 1, max: 1_000_000 }),
    packageName: textField({ label: 'Package name', maxLength: 120 }),
    note: textField({ label: 'Note to the client', maxLength: 500 }),
    validDays: integerField({ label: 'Open for', min: 1, max: 30 }),
  })
  .superRefine((v, ctx) => {
    if (v.months === null) ctx.addIssue({ code: 'custom', path: ['months'], message: 'Choose how many months.' });
    if (v.amount === null) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Enter the price.' });
  });

export type RenewalOfferValues = z.output<typeof renewalOfferSchema>;

export type RenewalOfferState = { months: string; amount: string; packageName: string; note: string; validDays: string };

/** Prefilled from the client's current term, when there is one. */
export function blankRenewalOffer(current?: { duration_months?: number | null; final_amount?: number | string | null } | null): RenewalOfferState {
  const months = current?.duration_months && current.duration_months > 0 ? current.duration_months : 1;
  const price = Number(current?.final_amount);
  return {
    months: String(months),
    amount: Number.isFinite(price) && price > 0 ? String(price) : '',
    packageName: '',
    note: '',
    validDays: '7',
  };
}

export function toRenewalOfferPayload(clientId: string, v: RenewalOfferValues): RenewalOfferInput {
  const out: RenewalOfferInput = {
    client_id: clientId,
    duration_months: v.months as number,
    amount: v.amount as number,
    valid_days: v.validDays ?? 7,
  };
  if (v.packageName) out.package_name = v.packageName;
  if (v.note) out.note = v.note;
  return out;
}
