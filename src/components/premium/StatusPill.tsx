'use client';

import { cn } from '@/components/ui/cn';

export type Status = 'active' | 'pending' | 'expired' | 'suspended' | 'completed' | 'cancelled' | 'draft' | 'overdue' | 'paid' | 'partial' | 'at-risk' | 'high-value' | 'new' | 'inactive' | 'scheduled';

const STATUS_STYLES: Record<Status, { bg: string; dot: string; label: string }> = {
  scheduled: { bg: 'bg-blue-50/80 border-blue-200/60 text-blue-700', dot: 'bg-blue-500', label: 'Scheduled' },
  active:    { bg: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700', dot: 'bg-emerald-500', label: 'Active' },
  pending:   { bg: 'bg-amber-50/80 border-amber-200/60 text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
  expired:   { bg: 'bg-red-50/80 border-red-200/60 text-red-700', dot: 'bg-red-500', label: 'Expired' },
  suspended: { bg: 'bg-zinc-50/80 border-zinc-200/60 text-zinc-600', dot: 'bg-zinc-400', label: 'Suspended' },
  completed: { bg: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700', dot: 'bg-emerald-500', label: 'Completed' },
  cancelled: { bg: 'bg-zinc-50/80 border-zinc-200/60 text-zinc-600', dot: 'bg-zinc-400', label: 'Cancelled' },
  draft:     { bg: 'bg-sky-50/80 border-sky-200/60 text-sky-700', dot: 'bg-sky-500', label: 'Draft' },
  overdue:   { bg: 'bg-red-50/80 border-red-200/60 text-red-700', dot: 'bg-red-500', label: 'Overdue' },
  paid:      { bg: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700', dot: 'bg-emerald-500', label: 'Paid' },
  partial:   { bg: 'bg-amber-50/80 border-amber-200/60 text-amber-700', dot: 'bg-amber-500', label: 'Partial' },
  'at-risk': { bg: 'bg-red-50/80 border-red-200/60 text-red-700', dot: 'bg-red-500', label: 'At Risk' },
  'high-value': { bg: 'bg-violet-50/80 border-violet-200/60 text-violet-700', dot: 'bg-violet-500', label: 'High Value' },
  new:       { bg: 'bg-blue-50/80 border-blue-200/60 text-blue-700', dot: 'bg-blue-500', label: 'New' },
  inactive:  { bg: 'bg-zinc-50/80 border-zinc-200/60 text-zinc-500', dot: 'bg-zinc-300', label: 'Inactive' },
};

interface StatusPillProps {
  status: Status;
  className?: string;
  pulse?: boolean;
}

export function StatusPill({ status, className, pulse }: StatusPillProps) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', s.bg, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot, pulse && 'animate-pulse')} />
      {s.label}
    </span>
  );
}
