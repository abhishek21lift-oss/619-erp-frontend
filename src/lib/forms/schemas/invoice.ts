/**
 * Creating a studio invoice by hand.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 * `amount: parseFloat(createForm.amount)`.
 *
 * `parseFloat` is looser than `Number` in exactly the direction that hurts
 * here: it parses a PREFIX. `parseFloat('12abc')` is 12, `parseFloat('1,500')`
 * is 1, and `parseFloat('abc')` is NaN — which `JSON.stringify` turns into
 * `null`. So "1,500" typed with the thousands separator a studio owner
 * naturally uses became a ₹1 invoice, and a slip of the hand became an invoice
 * for nothing.
 *
 * Nothing behind the form caught either. `routes/invoices.js` computes
 * `subtotal = parseFloat(d.amount) || 0`, so a null or NaN amount is stored as
 * **₹0** and the invoice is created successfully.
 *
 * The three others:
 *
 *   · the due date was unbounded, so a mistyped year produced an invoice due in
 *     1999 — permanently overdue — or in 2099, never chased;
 *   · the description had no cap, and it becomes an invoice line item;
 *   · the modal reset only on SUCCESS, so cancelling and reopening showed the
 *     previous attempt's values (§11).
 */

import { z } from 'zod';
import { moneyField, textField, enumField, dateField } from '../primitives';
import { todayISO } from '../domain';

export const INVOICE_PAYMENT_METHODS = [
  'upi', 'credit-card', 'cash', 'razorpay', 'stripe', 'bank-transfer',
] as const;
export type InvoicePaymentMethod = (typeof INVOICE_PAYMENT_METHODS)[number];

export const INVOICE_PAYMENT_METHOD_OPTIONS = [
  { value: 'upi', label: 'UPI' },
  { value: 'credit-card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
] as const;

/**
 * How far a due date may sit from today.
 *
 * Wide on purpose in both directions — backdating an invoice is real work, and
 * so is a twelve-month plan — but bounded, because an unbounded date field
 * turns one mistyped digit into an invoice that is either permanently overdue
 * or never chased, and neither announces itself.
 */
function dueDateBounds(): { min: string; max: string } {
  const shift = (years: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  return { min: shift(-2), max: shift(5) };
}

export const DUE_DATE_BOUNDS = dueDateBounds();

export const createInvoiceSchema = z.object({
  memberName: textField({ label: 'Member name', required: true, maxLength: 160 }),
  // `moneyField` parses the WHOLE string or refuses it, which is the difference
  // that matters: it reads '1,500' as 1500 and 'abc' as an error, where
  // parseFloat read them as 1 and NaN.
  amount: moneyField({ label: 'Amount', required: true, min: 1 }),
  dueDate: dateField({
    label: 'Due date', required: true,
    min: DUE_DATE_BOUNDS.min, max: DUE_DATE_BOUNDS.max,
  }),
  description: textField({ label: 'Description', maxLength: 500 }),
  paymentMethod: enumField(INVOICE_PAYMENT_METHODS, { label: 'Payment method', required: true }),
});

export type CreateInvoiceValues = z.output<typeof createInvoiceSchema>;

export type CreateInvoiceState = {
  memberName: string;
  amount: string;
  dueDate: string;
  description: string;
  paymentMethod: InvoicePaymentMethod;
};

/**
 * A blank invoice.
 *
 * A function, not a constant, so two openings of the modal cannot share one
 * object — and so the due date defaults to the day the modal opens rather than
 * the day the bundle was evaluated.
 */
export function blankInvoice(): CreateInvoiceState {
  return {
    memberName: '',
    amount: '',
    dueDate: todayISO(),
    description: '',
    paymentMethod: 'upi',
  };
}

export function toCreateInvoicePayload(v: CreateInvoiceValues) {
  return {
    member_name: v.memberName as string,
    amount: v.amount as number,
    due_date: v.dueDate as string,
    description: v.description,
    payment_method: v.paymentMethod as InvoicePaymentMethod,
  };
}
