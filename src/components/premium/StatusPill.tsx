'use client';

import { clsx } from 'clsx';

type StatusPillProps = {
  status: string;
  pulse?: boolean;
  className?: string;
};

const GREEN = /^(active|approved|paid|ready|online|published|confirmed|achieved|completed|success)$/i;
const AMBER = /^(pending|draft|scheduled|queued|requested|hold)$/i;
const RED = /^(rejected|failed|overdue|critical|damaged|offline|cancelled|expired)$/i;

export function StatusPill({ status, pulse, className }: StatusPillProps) {
  let colorClass: string;
  if (GREEN.test(status)) colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  else if (AMBER.test(status)) colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
  else if (RED.test(status)) colorClass = 'bg-red-50 text-red-700 border-red-200';
  else colorClass = 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-[700] uppercase tracking-[0.04em]',
        colorClass,
        className,
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {status}
    </span>
  );
}
