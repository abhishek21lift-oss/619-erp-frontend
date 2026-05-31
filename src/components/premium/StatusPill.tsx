'use client';

import { cn } from '@/components/ui/cn';

export type Status =
  | 'active' | 'pending' | 'expired' | 'suspended' | 'completed'
  | 'cancelled' | 'draft' | 'overdue' | 'paid' | 'partial'
  | 'at-risk' | 'high-value' | 'new' | 'inactive' | 'scheduled'
  // Difficulty aliases used by workout/plan components
  | 'beginner' | 'intermediate' | 'advanced';

const STATUS_STYLES: Record<Status, { bg: string; dot: string; label: string }> = {
  scheduled:    { bg: 'bg-blue-50/80 border-blue-200/60 text-blue-700 dark:bg-blue-500/15 dark:border-blue-500/30 dark:text-blue-400',         dot: 'bg-blue-500',    label: 'Scheduled'    },
  active:       { bg: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Active'       },
  pending:      { bg: 'bg-amber-50/80 border-amber-200/60 text-amber-700 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-400',       dot: 'bg-amber-500',   label: 'Pending'      },
  expired:      { bg: 'bg-red-50/80 border-red-200/60 text-red-700 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-400',             dot: 'bg-red-500',     label: 'Expired'      },
  suspended:    { bg: 'bg-zinc-50/80 border-zinc-200/60 text-zinc-600 dark:bg-white/10 dark:border-white/20 dark:text-white/60',          dot: 'bg-zinc-400',    label: 'Suspended'    },
  completed:    { bg: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Completed'    },
  cancelled:    { bg: 'bg-zinc-50/80 border-zinc-200/60 text-zinc-600 dark:bg-white/10 dark:border-white/20 dark:text-white/60',          dot: 'bg-zinc-400',    label: 'Cancelled'    },
  draft:        { bg: 'bg-sky-50/80 border-sky-200/60 text-sky-700 dark:bg-sky-500/15 dark:border-sky-500/30 dark:text-sky-400',             dot: 'bg-sky-500',     label: 'Draft'        },
  overdue:      { bg: 'bg-red-50/80 border-red-200/60 text-red-700 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-400',             dot: 'bg-red-500',     label: 'Overdue'      },
  paid:         { bg: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Paid'         },
  partial:      { bg: 'bg-amber-50/80 border-amber-200/60 text-amber-700 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-400',       dot: 'bg-amber-500',   label: 'Partial'      },
  'at-risk':    { bg: 'bg-red-50/80 border-red-200/60 text-red-700 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-400',             dot: 'bg-red-500',     label: 'At Risk'      },
  'high-value': { bg: 'bg-violet-50/80 border-violet-200/60 text-violet-700 dark:bg-violet-500/15 dark:border-violet-500/30 dark:text-violet-400',   dot: 'bg-violet-500',  label: 'High Value'   },
  new:          { bg: 'bg-blue-50/80 border-blue-200/60 text-blue-700 dark:bg-blue-500/15 dark:border-blue-500/30 dark:text-blue-400',          dot: 'bg-blue-500',    label: 'New'          },
  inactive:     { bg: 'bg-zinc-50/80 border-zinc-200/60 text-zinc-500 dark:bg-white/5 dark:border-white/10 dark:text-white/40',          dot: 'bg-zinc-300',    label: 'Inactive'     },
  // Difficulty
  beginner:     { bg: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Beginner'     },
  intermediate: { bg: 'bg-amber-50/80 border-amber-200/60 text-amber-700 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-400',       dot: 'bg-amber-500',   label: 'Intermediate' },
  advanced:     { bg: 'bg-red-50/80 border-red-200/60 text-red-700 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-400',             dot: 'bg-red-500',     label: 'Advanced'     },
};

/** Fallback style for any unknown/unrecognised status key. */
const FALLBACK_STYLE: { bg: string; dot: string; label: string } = {
  bg: 'bg-zinc-50/80 border-zinc-200/60 text-zinc-500 dark:bg-white/5 dark:border-white/10 dark:text-white/40',
  dot: 'bg-zinc-300',
  label: 'Unknown',
};

interface StatusPillProps {
  status: Status | string;   // accepts string so unknown values never throw
  className?: string;
  pulse?: boolean;
  label?: string;            // optional override label
}

export function StatusPill({ status, className, pulse, label }: StatusPillProps) {
  // Guard: fall back gracefully if status key is not in the map
  const s = (STATUS_STYLES as Record<string, typeof FALLBACK_STYLE>)[status] ?? FALLBACK_STYLE;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        s.bg,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot, pulse && 'animate-pulse')} />
      {label ?? s.label}
    </span>
  );
}
