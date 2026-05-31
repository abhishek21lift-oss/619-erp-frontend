import { clsx } from 'clsx';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const variantMap: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  danger:  'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  info:    'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  muted:   'bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-white/40',
};

interface MetricPillProps {
  label: string;
  value: string | number;
  variant?: Variant;
  dot?: boolean;
}

export function MetricPill({ label, value, variant = 'default', dot }: MetricPillProps) {
  return (
    <div className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium', variantMap[variant])}>
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full',
          variant === 'success' ? 'bg-emerald-500' :
          variant === 'warning' ? 'bg-amber-400' :
          variant === 'danger'  ? 'bg-red-500' :
          variant === 'info'    ? 'bg-red-600' : 'bg-slate-400 dark:bg-white/30'
        )} />
      )}
      <span className="opacity-60">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
