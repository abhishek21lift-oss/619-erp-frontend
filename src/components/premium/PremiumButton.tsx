'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui/cn';

type Tone = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface PremiumButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  tone?: Tone;
  size?: Size;
  icon?: React.ReactNode;
  loading?: boolean;
  glow?: boolean;
}

const TONES: Record<Tone, { bg: string; hover: string; text: string; shadow: string }> = {
  primary: {
    bg: 'bg-[var(--brand)]',
    hover: 'hover:brightness-110',
    text: 'text-white',
    shadow: 'shadow-[0_8px_24px_var(--brand-glow)] hover:shadow-[0_12px_32px_var(--brand-glow-2)]',
  },
  secondary: {
    bg: 'bg-white/80 backdrop-blur-xl border border-white/60',
    hover: 'hover:bg-white hover:-translate-y-0.5',
    text: 'text-zinc-800',
    shadow: 'shadow-sm hover:shadow-md',
  },
  ghost: {
    bg: 'bg-transparent',
    hover: 'hover:bg-zinc-100/80 dark:hover:bg-white/10',
    text: 'text-zinc-600 dark:text-zinc-400',
    shadow: '',
  },
  danger: {
    bg: 'bg-[var(--danger)]',
    hover: 'hover:brightness-110',
    text: 'text-white',
    shadow: 'shadow-[0_8px_24px_var(--brand-glow)] hover:shadow-[0_12px_32px_var(--brand-glow-2)]',
  },
  success: {
    bg: 'bg-[var(--success)]',
    hover: 'hover:brightness-110',
    text: 'text-white',
    shadow: 'shadow-[0_8px_24px_var(--brand-glow)] hover:shadow-[0_12px_32px_var(--brand-glow-2)]',
  },
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-full',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-full',
  lg: 'px-6 py-3 text-base gap-2.5 rounded-full',
};

export function PremiumButton({
  children,
  className,
  tone = 'secondary',
  size = 'md',
  icon,
  loading,
  glow,
  disabled,
  ...props
}: PremiumButtonProps) {
  const t = TONES[tone];
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-300',
        'border border-transparent',
        t.bg,
        t.text,
        t.shadow,
        t.hover,
        SIZES[size],
        glow && 'animate-glow-pulse',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}
