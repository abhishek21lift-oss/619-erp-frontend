'use client';

/**
 * Shared pieces for the manual-UTR payment flow.
 *
 * Kept in one file because they are small, always used together, and share the
 * status vocabulary below — splitting them across four files would mean four
 * imports of the same STATUS_META map at every call site.
 *
 * ── On formatting money ─────────────────────────────────────────────────────
 * Every amount crossing the API is a STRING, because Postgres NUMERIC is not
 * safely representable as a JS float. These helpers format the string and
 * never do arithmetic on it — the server owns the maths.
 */

import { m } from 'framer-motion';
import {
  Clock, ShieldCheck, CircleCheck, CircleX, Ban, TimerOff, Hourglass,
} from 'lucide-react';
import type { UpiOrderStatus, UpiRejectReason } from '@/lib/api';
import { cn } from '@/components/ui';

// ── Money ───────────────────────────────────────────────────────────────────

/** ₹ with Indian digit grouping: ₹1,20,000 rather than ₹120,000. */
export function fmtMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '₹0';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '₹0';
  return '₹' + n.toLocaleString('en-IN', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Always two decimals — for the receipt-style breakdown where columns align. */
export function fmtMoneyExact(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '₹0.00';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "in 42 minutes" / "expired" — the payment page's countdown. */
export function fmtCountdown(expiresAt: string): { label: string; expired: boolean } {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return { label: 'expired', expired: true };
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return { label: 'less than a minute left', expired: false };
  if (mins < 60) return { label: `${mins} minute${mins === 1 ? '' : 's'} left`, expired: false };
  const hrs = Math.floor(mins / 60);
  return { label: `${hrs} hour${hrs === 1 ? '' : 's'} left`, expired: false };
}

// ── Status vocabulary ───────────────────────────────────────────────────────
//
// One map, used by the badge, the timeline and the queue filters, so a status
// can never be spelled one way in the member's view and another in the admin's.

type StatusMeta = {
  label: string;
  /** Semantic token, so the colour follows the theme rather than being fixed. */
  tone: 'neutral' | 'info' | 'warn' | 'success' | 'danger';
  icon: typeof Clock;
  /** What the member should understand is happening. */
  hint: string;
};

export const STATUS_META: Record<UpiOrderStatus, StatusMeta> = {
  CREATED: {
    label: 'Not paid yet', tone: 'neutral', icon: Clock,
    hint: 'Scan the QR or open a UPI app to pay.',
  },
  PAYMENT_PENDING: {
    label: 'Awaiting your reference', tone: 'info', icon: Hourglass,
    hint: 'Paid already? Enter the UPI reference number below.',
  },
  VERIFICATION_PENDING: {
    label: 'Verification pending', tone: 'warn', icon: ShieldCheck,
    hint: 'The studio is checking your payment against its bank account.',
  },
  APPROVED: {
    label: 'Approved', tone: 'success', icon: CircleCheck,
    hint: 'Your membership is active.',
  },
  REJECTED: {
    label: 'Rejected', tone: 'danger', icon: CircleX,
    hint: 'The studio could not verify this payment.',
  },
  CANCELLED: {
    label: 'Cancelled', tone: 'neutral', icon: Ban,
    hint: 'This payment request was withdrawn.',
  },
  EXPIRED: {
    label: 'Expired', tone: 'neutral', icon: TimerOff,
    hint: 'This payment link timed out. Start a new one.',
  },
};

const TONE_STYLES: Record<StatusMeta['tone'], { bg: string; fg: string; ring: string }> = {
  neutral: {
    bg: 'color-mix(in srgb, var(--text-muted) 12%, transparent)',
    fg: 'var(--text-muted)',
    ring: 'color-mix(in srgb, var(--text-muted) 28%, transparent)',
  },
  info: {
    bg: 'color-mix(in srgb, var(--brand) 12%, transparent)',
    fg: 'var(--brand)',
    ring: 'color-mix(in srgb, var(--brand) 30%, transparent)',
  },
  warn: {
    bg: 'color-mix(in srgb, var(--warning) 14%, transparent)',
    fg: 'var(--warning)',
    ring: 'color-mix(in srgb, var(--warning) 32%, transparent)',
  },
  success: {
    bg: 'color-mix(in srgb, var(--success) 13%, transparent)',
    fg: 'var(--success)',
    ring: 'color-mix(in srgb, var(--success) 30%, transparent)',
  },
  danger: {
    bg: 'color-mix(in srgb, var(--danger) 13%, transparent)',
    fg: 'var(--danger)',
    ring: 'color-mix(in srgb, var(--danger) 30%, transparent)',
  },
};

/**
 * Status badge.
 *
 * VERIFICATION_PENDING pulses; nothing else does. Motion here is information,
 * not decoration — it is the one state where something is actively happening
 * somewhere else and the member is waiting on a human.
 */
export function UpiStatusBadge({
  status, size = 'md', className,
}: { status: UpiOrderStatus; size?: 'sm' | 'md'; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.CREATED;
  const tone = TONE_STYLES[meta.tone];
  const Icon = meta.icon;
  const pulsing = status === 'VERIFICATION_PENDING';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-[650] whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12.5px]',
        className,
      )}
      style={{ background: tone.bg, color: tone.fg, boxShadow: `inset 0 0 0 1px ${tone.ring}` }}
    >
      {pulsing ? (
        <m.span
          className="inline-flex"
          animate={{ opacity: [1, 0.45, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon size={size === 'sm' ? 12 : 14} />
        </m.span>
      ) : (
        <Icon size={size === 'sm' ? 12 : 14} />
      )}
      {meta.label}
    </span>
  );
}

// ── Rejection reasons ───────────────────────────────────────────────────────
//
// The API returns the member-facing copy for each reason, so this map is only
// the admin-facing short label used in the reject dialog's radio list. The two
// deliberately differ: an admin picks "Amount mismatch", the member reads "The
// amount received does not match the order total."
export const REJECT_REASON_LABELS: Record<UpiRejectReason, string> = {
  DUPLICATE_UTR: 'Duplicate UTR',
  WRONG_UTR: 'Wrong UTR',
  PAYMENT_NOT_RECEIVED: 'Payment not received',
  AMOUNT_MISMATCH: 'Amount mismatch',
  FAKE_SCREENSHOT: 'Screenshot looks altered',
  OTHER: 'Other',
};

export const REJECT_REASONS: UpiRejectReason[] = [
  'PAYMENT_NOT_RECEIVED', 'WRONG_UTR', 'AMOUNT_MISMATCH',
  'DUPLICATE_UTR', 'FAKE_SCREENSHOT', 'OTHER',
];

// ── Amount breakdown ────────────────────────────────────────────────────────

/**
 * Base / GST / total, as a receipt reads.
 *
 * A zero-GST line is omitted rather than shown as "GST (0%) ₹0.00" — printing
 * it makes members ask whether they are being charged something they are not.
 */
export function AmountBreakdown({
  baseAmount, gstPercent, gstAmount, totalAmount, className,
}: {
  baseAmount: string; gstPercent: string; gstAmount: string; totalAmount: string;
  className?: string;
}) {
  const hasGst = Number(gstAmount) > 0;
  return (
    <div className={cn('space-y-2', className)}>
      <Row label="Membership" value={fmtMoneyExact(baseAmount)} />
      {hasGst && <Row label={`GST (${Number(gstPercent)}%)`} value={fmtMoneyExact(gstAmount)} />}
      <div
        className="flex items-baseline justify-between border-t pt-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>Total</span>
        <span className="text-[20px] font-[820] tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {fmtMoneyExact(totalAmount)}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-[13.5px]">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="tabular-nums font-[600]" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
