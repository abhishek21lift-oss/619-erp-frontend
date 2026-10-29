// frontend/src/components/ui/KpiCard.tsx
//
// A white surface with one tinted icon chip and a tinted delta. The colour is
// information, not decoration: the figure stays the loudest thing on the card.

'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from './cn';

type Accent =
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'cyan'
  | 'purple'
  | 'coral'
  | 'graphite'
  // backward-compat aliases
  | 'rose'
  | 'sky'
  | 'violet'
  | 'orange'
  | 'slate';

const ACCENTS: Record<Accent, { chip: string; ink: string }> = {
  blue:     { chip: 'var(--info-soft)', ink: 'var(--info-text)' },
  emerald:  { chip: 'var(--success-soft)', ink: 'var(--success-text)' },
  amber:    { chip: 'var(--warning-soft)', ink: 'var(--warning-text)' },
  cyan:     { chip: 'var(--success-accent-soft)', ink: 'var(--success-accent-text)' },
  purple:   { chip: 'var(--info-soft)', ink: 'var(--info-text)' },
  coral:    { chip: 'var(--danger-soft)', ink: 'var(--danger-text)' },
  graphite: { chip: 'var(--bg-subtle)', ink: 'var(--text-secondary)' },
  // backward-compat aliases
  rose:     { chip: 'var(--danger-soft)', ink: 'var(--danger-text)' },
  sky:      { chip: 'var(--info-soft)', ink: 'var(--info-text)' },
  violet:   { chip: 'var(--info-soft)', ink: 'var(--info-text)' },
  orange:   { chip: 'var(--accent-warm-soft)', ink: 'var(--accent-warm-text)' },
  slate:    { chip: 'var(--bg-subtle)', ink: 'var(--text-secondary)' },
};

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  /** Optional secondary line (e.g. "+₹12,400 vs last month"). */
  hint?: React.ReactNode;
  /** % delta vs previous period. Positive = up arrow, negative = down arrow. */
  delta?: number;
  /** When delta is positive, "good" means green up arrow. Set to "bad" to invert. */
  deltaIs?: 'good' | 'bad';
  icon?: React.ReactNode;
  accent?: Accent;
  /** When set, the whole card becomes a Link to that route. */
  href?: string;
  loading?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  delta,
  deltaIs = 'good',
  icon,
  accent = 'rose',
  href,
  loading,
  className,
}: KpiCardProps) {
  const tone = ACCENTS[accent];

  const inner = (
    <article
      className={cn(
        'group relative overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-card)] p-4',
        'shadow-[var(--shadow-card)] transition-all duration-200',
        href && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] focus-within:ring-2 focus-within:ring-[var(--action)]/40',
        className,
      )}
    >
      <div className="relative z-10">
        {/* Header: label + icon */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            {label}
          </p>
          {icon && (
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]"
              style={{ background: tone.chip, color: tone.ink }}
              aria-hidden
            >
              {icon}
            </span>
          )}
        </div>

        {/* Big value + delta */}
        <div className="mt-2.5 flex items-end justify-between gap-3">
          {/* Wraps rather than truncating. A clipped "₹1,23,4…" is worse than
              a wrapped one: the card exists to state the figure. clamp() keeps
              mobile cards legible without shrinking desktop ones. */}
          <p className="min-w-0 text-[clamp(1.45rem,4.6vw,1.85rem)] font-bold leading-tight tabular-nums tracking-tight text-[var(--text-primary)] [overflow-wrap:anywhere]">
            {loading ? (
              <span className="inline-block h-7 w-24 animate-pulse rounded bg-[var(--bg-subtle)]" />
            ) : (
              value
            )}
          </p>
          {typeof delta === 'number' && Number.isFinite(delta) && (
            <DeltaPill delta={delta} deltaIs={deltaIs} />
          )}
        </div>

        {/* Hint line */}
        {hint && (
          <p className="mt-1.5 truncate text-[11.5px] font-medium text-[var(--text-muted)]">
            {hint}
          </p>
        )}
      </div>
    </article>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="block focus:outline-none" aria-label={label}>
      {inner}
    </Link>
  );
}

function DeltaPill({ delta, deltaIs }: { delta: number; deltaIs: 'good' | 'bad' }) {
  const positive = delta >= 0;
  const isGreen = deltaIs === 'good' ? positive : !positive;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold',
        isGreen
          ? 'bg-[var(--success-accent-soft)] text-[var(--success-accent-text)]'
          : 'bg-[var(--danger-soft)] text-[var(--danger-text)]',
      )}
      aria-label={`Change ${positive ? 'up' : 'down'} ${Math.abs(delta).toFixed(1)} percent`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}
