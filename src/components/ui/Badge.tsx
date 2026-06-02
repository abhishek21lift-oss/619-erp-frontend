// frontend/src/components/ui/Badge.tsx
//
// Status pill. Pick a tone — neutral / success / warning / danger / info /
// brand. Use this for everything: subscription status, payment state,
// trainer specialization, etc. Don't roll your own.

import * as React from 'react';
import { cn } from './cn';

type Tone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'brand'
  | 'purple';

const TONES: Record<Tone, string> = {
  neutral: 'bg-[var(--bg-subtle)] text-[var(--text-muted)] ring-[var(--border)]',
  success: 'bg-[var(--success)]/10 text-[var(--success)] ring-[var(--success)]/20',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)] ring-[var(--warning)]/20',
  danger: 'bg-[var(--danger)]/10 text-[var(--danger)] ring-[var(--danger)]/20',
  info: 'bg-[var(--info)]/10 text-[var(--info)] ring-[var(--info)]/20',
  brand: 'bg-[var(--brand)]/10 text-[var(--brand)] ring-[var(--brand)]/20',
  purple: 'bg-[var(--accent)]/10 text-[var(--accent)] ring-[var(--accent)]/20',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Add a small leading dot, useful in dense tables. */
  dot?: boolean;
}

export function Badge({
  tone = 'neutral',
  dot,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/**
 * Map a domain-specific status string to the right tone so call sites don't
 * have to reimplement the mapping.
 */
export function statusTone(status?: string | null): Tone {
  if (!status) return 'neutral';
  const s = String(status).toLowerCase();
  if (s === 'active' || s === 'paid' || s === 'present') return 'success';
  if (s === 'expired' || s === 'lapsed' || s === 'absent' || s === 'failed')
    return 'danger';
  if (s === 'frozen' || s === 'pending' || s === 'late') return 'warning';
  if (s === 'lead' || s === 'trial') return 'info';
  if (s === 'vip' || s === 'pt') return 'brand';
  return 'neutral';
}
