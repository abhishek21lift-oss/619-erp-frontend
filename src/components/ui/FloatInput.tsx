'use client';

import { useState, useId, useRef, useEffect } from 'react';
import { cn } from './cn';

interface FloatInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  /** Multiline only: grows the textarea to fit content instead of a fixed row count. */
  autoGrow?: boolean;
  /** Multiline + autoGrow only: caps growth before it scrolls internally. */
  maxHeight?: number;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function FloatInput({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder = ' ',
  suffix,
  prefix,
  required,
  multiline,
  rows = 3,
  autoGrow = false,
  maxHeight = 280,
  error,
  disabled,
  className,
}: FloatInputProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!multiline || !autoGrow || !textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [multiline, autoGrow, maxHeight, value]);

  const baseInputClass = cn(
    'w-full bg-transparent pb-3 pt-7 text-[13.5px] font-medium outline-none',
    'text-[var(--text-primary)] caret-[var(--gold,#F59E0B)]',
    prefix ? 'pl-10 pr-4' : 'px-4',
    suffix ? 'pr-10' : '',
    'disabled:cursor-not-allowed',
  );

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-[var(--radius,14px)]',
          'transition-all duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
          focused
            ? 'bg-[var(--bg-card)] border-[var(--gold,#F59E0B)]/50 shadow-[0_0_0_3px_color-mix(in_srgb,var(--gold,#F59E0B)_10%,transparent)]'
            : error
            ? 'bg-[var(--bg-subtle)] border-[var(--danger)]/60 shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_8%,transparent)]'
            : 'bg-[var(--bg-subtle)] border-[var(--border-2)] shadow-none',
          'border',
          disabled && 'opacity-50',
        )}
      >
        {/* Floating label */}
        <label
          htmlFor={id}
          className={cn(
            'pointer-events-none absolute font-medium transition-all',
            'duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
            prefix ? 'left-10' : 'left-4',
            lifted
              ? 'top-2 text-[10px]'
              : 'top-[18px] text-[13px]',
            lifted
              ? focused
                ? 'text-[var(--gold,#F59E0B)]'
                : error
                ? 'text-[var(--danger-text)]'
                : 'text-[var(--text-muted)]'
              : 'text-[var(--text-muted)]',
          )}
        >
          {label}
          {required && (
            <span className="ml-0.5 text-[var(--gold,#F59E0B)]" aria-hidden>*</span>
          )}
        </label>

        {/* Prefix icon */}
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {prefix}
          </div>
        )}

        {/* Input or Textarea */}
        {multiline ? (
          <textarea
            id={id}
            ref={textareaRef}
            value={value}
            placeholder={lifted ? placeholder : ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onBlur?.(); }}
            disabled={disabled}
            rows={autoGrow ? 1 : rows}
            className={cn(baseInputClass, 'resize-none', autoGrow && 'overflow-y-auto')}
            style={autoGrow ? { maxHeight } : { minHeight: `${rows * 24 + 28}px` }}
          />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            placeholder={lifted ? placeholder : ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onBlur?.(); }}
            disabled={disabled}
            className={baseInputClass}
          />
        )}

        {/* Suffix icon */}
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {suffix}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-[11px] font-medium text-[var(--danger-text)]">
          {error}
        </p>
      )}
    </div>
  );
}

export default FloatInput;
