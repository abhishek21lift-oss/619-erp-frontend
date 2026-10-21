/**
 * The approve / reject / request-correction dialog on the payment-verification
 * queue.
 *
 * The reason enum mirrors the backend route
 * (`src/routes/upi-payments.js` → `schemas.reject.body.reason`) and the
 * `UpiRejectReason` type. Approval carries neither field: it is a separate
 * action, not a rejection with an empty reason. The note is trimmed and a
 * whitespace-only note is absent, matching both the old
 * `note.trim() || undefined` payload and the server's `safeText(500)`.
 */
import { z } from 'zod';
import type { UpiRejectReason } from '@/lib/api';
import { enumField, textField } from '../primitives';

export const PAYMENT_REVIEW_ACTIONS = ['approve', 'reject', 'correct'] as const;

/** Mirrors the backend's rejection reasons, in the same order. */
export const PAYMENT_REVIEW_REASONS = [
  'DUPLICATE_UTR', 'WRONG_UTR', 'PAYMENT_NOT_RECEIVED',
  'AMOUNT_MISMATCH', 'FAKE_SCREENSHOT', 'OTHER',
] as const satisfies readonly UpiRejectReason[];

export type PaymentReviewKind = (typeof PAYMENT_REVIEW_ACTIONS)[number];
export type PaymentReviewReason = (typeof PAYMENT_REVIEW_REASONS)[number];

const reason = enumField(PAYMENT_REVIEW_REASONS, { label: 'Reason', required: true })
  .transform((value) => value as PaymentReviewReason);
const note = textField({ label: 'Note to the member', maxLength: 500 });

const rejectionFields = { reason, note };

export const paymentReviewSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('approve') }),
  z.object({ kind: z.literal('reject'), ...rejectionFields }),
  z.object({ kind: z.literal('correct'), ...rejectionFields }),
]);

export type PaymentReviewValues = z.output<typeof paymentReviewSchema>;
