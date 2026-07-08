'use client';

import * as React from 'react';
import { cn } from './cn';

type Variant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'shimmer';

type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'relative overflow-hidden bg-[var(--brand)] text-white ' +
    'shadow-[0_8px_24px_var(--brand-glow)] ' +
    'hover:shadow-[0_12px_32px_var(--brand-glow-2)] hover:-translate-y-0.5 ' +
    'active:translate-y-0 active:shadow-none ' +
    'focus-visible:ring-[var(--brand)] ' +
    'before:absolute before:inset-0 before:-translate-x-full ' +
    'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent ' +
    'hover:before:translate-x-full before:transition-transform before:duration-700',
  secondary:
    'bg-[var(--bg-card)] text-[var(--text-primary)] ' +
    'ring-1 ring-[var(--border-2)] ' +
    'shadow-[0_2px_8px_var(--shadow-xs)] ' +
    'hover:bg-[var(--bg-hover)] hover:-translate-y-0.5 hover:shadow-[0_4px_14px_var(--shadow-sm)] ' +
    'active:translate-y-0 ' +
    'focus-visible:ring-[var(--brand)]',
  outline:
    'relative border border-[var(--border-2)] bg-transparent text-[var(--text-primary)] ' +
    'backdrop-blur-sm ' +
    'hover:border-[var(--brand)] hover:bg-[var(--brand)]/5 hover:-translate-y-0.5 ' +
    'active:translate-y-0 ' +
    'focus-visible:ring-[var(--brand)] focus-visible:border-[var(--brand)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] ' +
    'hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] ' +
    'active:bg-[var(--bg-subtle)] ' +
    'focus-visible:ring-[var(--brand)]',
  danger:
    'relative overflow-hidden bg-[var(--danger)] text-white ' +
    'shadow-[0_4px_14px_color-mix(in_srgb,var(--danger)_30%,transparent)] ' +
    'hover:brightness-105 hover:-translate-y-0.5 ' +
    'hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--danger)_35%,transparent)] ' +
    'active:translate-y-0 active:brightness-95 ' +
    'focus-visible:ring-[var(--danger)]',
  success:
    'relative overflow-hidden bg-[var(--success)] text-white ' +
    'shadow-[0_4px_14px_color-mix(in_srgb,var(--success)_30%,transparent)] ' +
    'hover:brightness-105 hover:-translate-y-0.5 ' +
    'active:translate-y-0 active:brightness-95 ' +
    'focus-visible:ring-[var(--success)]',
  // Full shimmer CTA — dark bg with animated white shimmer sweep
  shimmer:
    'relative overflow-hidden bg-[var(--text-primary)] text-[var(--bg-canvas)] ' +
    'shadow-[0_8px_24px_rgba(0,0,0,0.18)] ' +
    'hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 ' +
    'active:translate-y-0 ' +
    'focus-visible:ring-[var(--text-primary)] ' +
    'before:absolute before:inset-0 before:-translate-x-full ' +
    'before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent ' +
    'hover:before:translate-x-full before:transition-transform before:duration-700',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-[13px] gap-2 rounded-[10px]',
  lg: 'h-12 px-6 text-[14px] gap-2.5 rounded-[12px]',
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
          'inline-flex items-center justify-center whitespace-nowrap font-semibold',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'focus-visible:ring-offset-[var(--bg-base)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
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
        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
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
        strokeWidth="3.5"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
