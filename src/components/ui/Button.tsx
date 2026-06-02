'use client';

import * as React from 'react';
import { cn } from './cn';

type Variant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--brand)] text-white shadow-[0_12px_24px_var(--brand-glow)] hover:shadow-[0_18px_32px_var(--brand-glow-2)] hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-[var(--brand)]',
  secondary:
    'bg-white/88 text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80 hover:bg-white hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-slate-400 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10',
  outline:
    'border border-white/70 bg-white/80 text-slate-800 shadow-[0_8px_18px_rgba(15,23,42,0.04)] backdrop-blur-xl hover:bg-white hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400 dark:text-white/60 dark:hover:bg-white/10 dark:active:bg-white/15',
  danger:
    'bg-[var(--danger)] text-white shadow-sm hover:brightness-110 active:brightness-95 focus-visible:ring-[var(--danger)]',
  success:
    'bg-[var(--success)] text-white shadow-sm hover:brightness-110 active:brightness-95 focus-visible:ring-[var(--success)]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      iconLeft,
      iconRight,
      fullWidth,
      className,
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]',
          'disabled:cursor-not-allowed disabled:opacity-60',
          fullWidth && 'w-full',
          SIZES[size],
          VARIANTS[variant],
          className,
        )}
        {...rest}
      >
        {loading ? (
          <Spinner />
        ) : (
          iconLeft && <span className="shrink-0">{iconLeft}</span>
        )}
        {children}
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  },
);

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="4"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
