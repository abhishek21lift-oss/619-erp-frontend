'use client';

import { clsx } from 'clsx';

type PremiumButtonProps = {
  tone?: 'primary' | 'secondary' | 'success' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  glow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

export function PremiumButton({
  tone = 'primary',
  size = 'md',
  icon,
  glow,
  loading,
  disabled,
  onClick,
  className,
  children,
  style,
}: PremiumButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition-all duration-200 focus:outline-none';

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-[11px]',
    md: 'px-4 py-2 text-[12.5px]',
    lg: 'px-5 py-2.5 text-[14px]',
  };

  const tones: Record<string, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(base, sizes[size], tones[tone], glow && 'shadow-lg shadow-indigo-500/25', loading && 'opacity-70 cursor-wait', disabled && 'opacity-50 cursor-not-allowed', className)}
      style={style}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
