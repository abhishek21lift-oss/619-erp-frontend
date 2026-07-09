'use client';

import { cn } from '@/components/ui/cn';

export type BadgeVariant = 'count' | 'dot' | 'new' | 'coming-soon';

interface NavBadgeProps {
  variant:   BadgeVariant;
  count?:    number;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  'count':       'min-w-[18px] h-[18px] px-1 rounded-full bg-purple-600 text-white text-[9px] font-bold tabular-nums flex items-center justify-center',
  'dot':         'w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0',
  'new':         'px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30',
  'coming-soon': 'px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-700/60 text-zinc-400 border border-zinc-600/40',
};

const VARIANT_TEXT: Record<BadgeVariant, string | null> = {
  'count':       null,
  'dot':         null,
  'new':         'New',
  'coming-soon': 'Soon',
};

export function NavBadge({ variant, count, className }: NavBadgeProps) {
  const text = variant === 'count' ? (count != null ? String(count) : null) : VARIANT_TEXT[variant];
  if (variant === 'dot') {
    return <span className={cn(VARIANT_STYLES[variant], className)} aria-hidden="true" />;
  }
  if (!text) return null;
  return (
    <span className={cn(VARIANT_STYLES[variant], className)}>
      {text}
    </span>
  );
}
