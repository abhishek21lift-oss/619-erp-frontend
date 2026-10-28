/**
 * Raising a UPI payment request from the verification queue.
 *
 * `plan_id` is deliberately not a field here. Picking a plan is a shortcut that
 * seeds the three fields below; the payload's `plan_id` is cleared the moment
 * the trainer types a package name, so a plan never silently prices a custom
 * order. The server re-reads a real plan's price anyway.
 */
import { z } from 'zod';
import { paymentAmountField } from '../domain';
import { integerField, textField } from '../primitives';

export const paymentRequestSchema = z.object({
  plan_name: textField({ label: 'Package name', required: true, maxLength: 160 }),
  duration_months: integerField({ label: 'Months', required: true, min: 1, max: 120 }),
  base_amount: paymentAmountField({ label: 'Amount before GST', required: true }),
});

export type PaymentRequestValues = z.output<typeof paymentRequestSchema>;

/** Raw form state: what the controls hold, as strings. */
export type PaymentRequestState = {
  plan_name: string;
  duration_months: string;
  base_amount: string;
};

export function blankPaymentRequest(): PaymentRequestState {
  return { plan_name: '', duration_months: '1', base_amount: '' };
}

/** The parsed form mapped to the create endpoint's body. */
export function toPaymentRequestPayload(v: PaymentRequestValues) {
  return {
    plan_name: v.plan_name as string,
    duration_months: v.duration_months as number,
    base_amount: v.base_amount as number,
  };
}
