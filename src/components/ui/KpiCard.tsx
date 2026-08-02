// frontend/src/components/ui/KpiCard.tsx
//
// PREMIUM KPI CARD — Colorful gradient backgrounds, glassmorphic icon,
// animated shimmer, deep glow shadow. Each accent has its own vibrant theme.
//
// Designed to look like premium SaaS dashboards (Linear, Stripe, Vercel).

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

const ACCENTS: Record<
  Accent,
  {
    bg: string;        // full gradient background
    glow: string;      // shadow glow color
    iconBg: string;    // glassmorphic icon background
    decorative: string; // decorative blob color
  }
> = {
  blue: {
    bg: 'bg-gradient-to-br from-[#0067E0] via-[#0067E0] to-[#0067E0]',
    glow: 'shadow-[0_8px_32px_-8px_rgba(59,130,246,0.45)]',
    iconBg: 'bg-white/25 backdrop-blur-md ring-1 ring-white/40',
    decorative: 'bg-blue-300/30',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857]',
    glow: 'shadow-[0_8px_32px_-8px_rgba(16,185,129,0.45)]',
    iconBg: 'bg-white/25 backdrop-blur-md ring-1 ring-white/40',
    decorative: 'bg-emerald-300/30',
  },
  amber: {
    bg: 'bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#B45309]',
    glow: 'shadow-[0_8px_32px_-8px_rgba(245,158,11,0.45)]',
    iconBg: 'bg-white/25 backdrop-blur-md ring-1 ring-white/40',
    decorative: 'bg-amber-300/30',
  },
  cyan: {
    bg: 'bg-gradient-to-br from-[#0067E0] via-[#0059CE] to-[#0059CE]',
    glow: 'shadow-[0_8px_32px_-8px_rgba(6,182,212,0.45)]',
    iconBg: 'bg-white/25 backdrop-blur-md ring-1 ring-white/40',
    decorative: 'bg-cyan-300/30',
  },
  purple: {
    bg: 'bg-gradient-to-br from-[#0067E0] via-[#0067E0] to-[#0067E0]',
    glow: 'shadow-[0_8px_32px_-8px_rgba(139,92,246,0.45)]',
    iconBg: 'bg-white/25 backdrop-blur-md ring-1 ring-white/40',
    decorative: 'bg-violet-300/30',
  },
  coral: {
    bg: 'bg-gradient-to-br from-[#EF4444] via-[#DC2626] to-[#B91C1C]',
    glow: 'shadow-[0_8px_32px_-8px_rgba(239,68,68,0.45)]',
    iconBg: 'bg-white/25 backdrop-blur-md ring-1 ring-white/40',
    decorative: 'bg-red-300/30',
  },
  graphite: {
    bg: 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]',
    glow: 'shadow-[0_8px_32px_-8px_rgba(42,45,53,0.5)]',
    iconBg: 'bg-white/15 backdrop-blur-md ring-1 ring-white/25',
    decorative: 'bg-slate-500/20',
  },
  // backward-compat aliases
  rose:   { bg: 'bg-gradient-to-br from-[#EF4444] via-[#DC2626] to-[#B91C1C]', glow: 'shadow-[0_8px_32px_-8px_rgba(244,63,94,0.45)]', iconBg: 'bg-white/25 backdrop-blur-md ring-1 ring-white/40', decorative: 'bg-rose-300/30' },
  sky:    { bg: 'bg-gradient-to-br from-[#0067E0] via-[#0059CE] to-[#0059CE]', glow: 'shadow-[0_8px_32px_-8px_rgba(6,182,212,0.45)]', iconBg: 'bg-white/25 backdrop-blur-md ring-1 ring-white/40', decorative: 'bg-cyan-300/30' },
  violet: { bg: 'bg-gradient-to-br from-[#0067E0] via-[#0067E0] to-[#0067E0]', glow: 'shadow-[0_8px_32px_-8px_rgba(139,92,246,0.45)]', iconBg: 'bg-white/25 backdrop-blur-md ring-1 ring-white/40', decorative: 'bg-violet-300/30' },
  orange: { bg: 'bg-gradient-to-br from-[#EF4444] via-[#DC2626] to-[#B91C1C]', glow: 'shadow-[0_8px_32px_-8px_rgba(239,68,68,0.45)]', iconBg: 'bg-white/25 backdrop-blur-md ring-1 ring-white/40', decorative: 'bg-red-300/30' },
  slate:  { bg: 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]', glow: 'shadow-[0_8px_32px_-8px_rgba(42,45,53,0.5)]', iconBg: 'bg-white/15 backdrop-blur-md ring-1 ring-white/25', decorative: 'bg-slate-500/20' },
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
        // Base
        'group relative overflow-hidden rounded-2xl p-5 text-white transition-all duration-300',
        // Vibrant gradient background
        tone.bg,
        // Glow shadow
        tone.glow,
        // Hover lift
        href && 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl focus-within:ring-2 focus-within:ring-white/50',
        className,
      )}
    >
      {/* Decorative top-right blob (large soft circle) */}
      <div
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl',
          tone.decorative,
        )}
        aria-hidden
      />
      {/* Decorative bottom-left blob */}
      <div
        className={cn(
          'pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full blur-3xl opacity-50',
          tone.decorative,
        )}
        aria-hidden
      />

      {/* Animated shimmer overlay (only on hover) */}
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header: label + icon */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/85">
            {label}
          </p>
          {icon && (
            <span
              className={cn(
                'grid h-10 w-10 place-items-center rounded-xl text-white shadow-inner',
                tone.iconBg,
              )}
              aria-hidden
            >
              {icon}
            </span>
          )}
        </div>

        {/* Big value + delta */}
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="truncate text-3xl font-bold tabular-nums tracking-tight text-white drop-shadow-sm sm:text-[2rem]">
            {loading ? (
              <span className="inline-block h-8 w-28 animate-pulse rounded bg-white/30" />
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
          <p className="mt-2 truncate text-xs font-medium text-white/80">
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
        'inline-flex flex-shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold backdrop-blur-md ring-1',
        isGreen
          ? 'bg-emerald-400/30 text-white ring-emerald-200/50'
          : 'bg-red-400/30 text-white ring-red-200/50',
      )}
      aria-label={`Change ${positive ? 'up' : 'down'} ${Math.abs(delta).toFixed(1)} percent`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}
