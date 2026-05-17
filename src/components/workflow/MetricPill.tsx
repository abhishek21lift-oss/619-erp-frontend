import { clsx } from 'clsx';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const variantMap: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger:  'bg-red-50 text-red-600',
  info:    'bg-indigo-50 text-indigo-700',
  muted:   'bg-slate-50 text-slate-500',
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
          variant === 'info'    ? 'bg-indigo-500' : 'bg-slate-400'
        )} />
      )}
      <span className="opacity-60">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
