/**
 * Recording a PT client's payment.
 *
 * A keypad-driven money form on a phone, in a studio, usually with the member
 * standing there. It is the screen where a studio owner's fingers move fastest
 * and the consequence of a slip is largest.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 * 1. The submit guard was `disabled={… || submitting}` and a `setSubmitting`
 *    flag. Both are applied by React AFTER the current event finishes, so two
 *    taps in the same frame — trivial on a touch target this size — both see
 *    `submitting === false` and both post. That is two payment rows and a
 *    double-credited balance. The backend serialises them (FOR UPDATE on the
 *    client row), which makes the two writes safe but does not make them one:
 *    it queues them, it does not deduplicate them.
 *
 * 2. The form state lived on the PAGE, and only the success path reset it.
 *    Typing ₹4,500, cancelling, and reopening showed ₹4,500 still there — and
 *    the keypad APPENDS, so the next tap made it ₹45,00X. §11's exact failure.
 *
 * 3. The date was free: a payment could be recorded with tomorrow's date, or
 *    2019's, and land in a month's takings it does not belong to.
 *
 * 4. `Number(form.amount)` on a keypad string. The keypad can produce `'0.'`
 *    (tap `.` first), and `Number('0.') === 0` — caught by the `<= 0` guard
 *    here, but the guard was the only thing between it and a ₹0 payment row,
 *    and the server's own `Number(amount) || 0` would have accepted one.
 *
 * ── On overpayment ──────────────────────────────────────────────────────────
 *
 * Paying more than the balance is NOT refused. It is legitimate — an advance,
 * a package top-up, a correction — and refusing it would block real work. What
 * changed is that it is no longer invisible: the summary used to clamp the new
 * balance with `Math.max(0, …)`, so ₹50,000 against a ₹5,000 balance rendered
 * "New balance ₹0" and looked exactly like paying it off exactly. The caller
 * gets `overpaymentInr` and shows it.
 */

import { z } from 'zod';
import { paymentAmountField, todayISO } from '../domain';
import { textField, enumField, dateField } from '../primitives';

export const PT_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'] as const;
export type PtPaymentMethod = (typeof PT_PAYMENT_METHODS)[number];

export const PT_PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank' },
] as const;

/**
 * The earliest date a payment may be recorded against.
 *
 * Two years back. Far enough that a genuinely late entry is never blocked, near
 * enough that a mistyped year (2025 → 2015 is one keystroke) is caught. Not
 * open-ended, because a payment dated 2015 silently leaves every report of the
 * period it belongs to.
 */
function earliestPaymentDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const ptPaymentSchema = z.object({
  // `paymentAmountField` is strictly positive by construction — a ₹0 payment
  // adds a ledger row, moves no balance, and inflates the payment count on
  // every report that counts rows. The rule lives in the domain layer rather
  // than here so every payment screen gets the same answer.
  amount: paymentAmountField({ label: 'Amount', required: true }),
  payment_method: enumField(PT_PAYMENT_METHODS, { label: 'Payment method', required: true }),
  payment_ref: textField({ label: 'Reference', maxLength: 64 }),
  date: dateField({ label: 'Date', required: true, min: earliestPaymentDate(), max: todayISO() }),
  notes: textField({ label: 'Notes', maxLength: 500 }),
});

export type PtPaymentValues = z.output<typeof ptPaymentSchema>;

/** The form's raw state — the keypad builds `amount` as a string. */
export type PtPaymentState = {
  amount: string;
  payment_method: PtPaymentMethod;
  payment_ref: string;
  date: string;
  notes: string;
};

/**
 * A blank payment, dated today and defaulting to cash.
 *
 * A function, not a constant, so two openings of the dialog cannot share one
 * object — and so "today" is the day the dialog opens rather than the day the
 * bundle was evaluated, which matters for a tab left open overnight.
 */
export function blankPtPayment(): PtPaymentState {
  return {
    amount: '',
    payment_method: 'CASH',
    payment_ref: '',
    date: todayISO(),
    notes: '',
  };
}

/**
 * Apply one keypad press to the raw amount string.
 *
 * Pure, and exported so the rule is testable without a DOM. The rules are the
 * ones the inline handler had, kept exactly: backspace, one decimal point, at
 * most two decimal places, and a leading zero replaced rather than appended to.
 *
 * The digit cap is new. Without it the keypad accepted an unbounded string, and
 * a stuck key or a pocket tap produced a number the schema then rejected with
 * "Amount cannot be more than 10000000 ₹" — a message about a value nobody
 * intended to type. Stopping at the boundary is better feedback than a refusal
 * after the fact.
 */
export function applyKeypad(current: string, key: string): string {
  if (key === '⌫') return current.slice(0, -1);
  if (key === '.') return current.includes('.') ? current : `${current || '0'}.`;

  const next = current === '' || current === '0' ? key : current + key;
  if (next.includes('.') && next.split('.')[1]!.length > 2) return current;
  // 8 integer digits is ₹99,999,999 — an order of magnitude above any real PT
  // payment and below the schema's ceiling, so the keypad simply stops.
  if (next.split('.')[0]!.length > 8) return current;
  return next;
}

/**
 * What this payment leaves outstanding, and by how much it overshoots.
 *
 * Returned together because the UI needs both and computing them apart is how
 * the old summary ended up clamping the balance to 0 while saying nothing
 * about the excess.
 */
export function balanceAfter(finalAmount: number, paidAmount: number, payingNow: number) {
  const remaining = finalAmount - paidAmount - payingNow;
  return {
    balanceInr: Math.max(0, remaining),
    overpaymentInr: remaining < 0 ? -remaining : 0,
  };
}

/** Server messages this endpoint produces, mapped to the field they belong to. */
export const PT_PAYMENT_FIELD_HINTS: Record<string, string> = {
  'amount must be greater than 0': 'amount',
};

export function toPtPaymentPayload(
  v: PtPaymentValues,
  ids: { clientId: string; trainerId: string | null },
) {
  return {
    client_id: ids.clientId,
    // Sent because the endpoint accepts it, and ignored by it unless it names a
    // live trainer — it re-resolves from the client's own record otherwise. The
    // client is never the authority on who gets the commission.
    trainer_id: ids.trainerId,
    amount: v.amount as number,
    incentive_amt: 0,
    payment_method: v.payment_method as PtPaymentMethod,
    payment_ref: v.payment_ref,
    date: v.date as string,
    notes: v.notes,
  };
}
