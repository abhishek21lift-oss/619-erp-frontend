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
  neutral: 'bg-[#F1F5F9] text-[#4A4E57] ring-[#E2E8F0]',
  success: 'bg-[rgba(16,185,129,0.08)] text-[#10B981] ring-[rgba(16,185,129,0.20)]',
  warning: 'bg-[rgba(245,158,11,0.08)] text-[#F59E0B] ring-[rgba(245,158,11,0.20)]',
  danger: 'bg-[rgba(239,68,68,0.08)] text-[#EF4444] ring-[rgba(239,68,68,0.20)]',
  info: 'bg-[rgba(59,130,246,0.08)] text-[#3B82F6] ring-[rgba(59,130,246,0.20)]',
  brand: 'bg-[rgba(59,130,246,0.08)] text-[#3B82F6] ring-[rgba(59,130,246,0.20)]',
  purple: 'bg-[rgba(139,92,246,0.08)] text-[#8B5CF6] ring-[rgba(139,92,246,0.20)]',
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
