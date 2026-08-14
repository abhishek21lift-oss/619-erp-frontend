'use client';

import { useState, useId, useRef, useEffect } from 'react';
import { cn } from './cn';

interface FloatInputProps {
  label: string;
  type?: string;
  /**
   * Which on-screen keyboard mobile should open. `type="number"` alone gives
   * iOS a keypad without a decimal point, which makes 62.5kg unenterable —
   * the session logger needs `decimal` for weights and `numeric` for reps.
   */
  inputMode?: React.ComponentProps<'input'>['inputMode'];
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
  /**
   * Which accent the field focuses to.
   *
   * 'gold' is the PT-OS assessment language — 39 files use it, and the Slider
   * on those same screens is `accent-[#F59E0B]`. 'brand' is the Settings
   * language, and existed only because Settings had its own copy of this
   * component rather than because anyone chose a second component.
   */
  tone?: 'gold' | 'brand';
  /**
   * Renders the lifted caption in small caps. The Settings profile screen does
   * this; the Settings account screen does not, and both are being preserved
   * exactly rather than reconciled here.
   */
  upperLifted?: boolean;
}

/** The two accent bundles. Everything else about the field is shared. */
const TONES = {
  gold: {
    accent: 'var(--gold, #F59E0B)',
    focusBorder: 'color-mix(in srgb, var(--gold, #F59E0B) 50%, transparent)',
    focusRing: '0 0 0 3px color-mix(in srgb, var(--gold, #F59E0B) 10%, transparent)',
    restShadow: 'none',
    restBorder: 'var(--border-2)',
    borderWidth: '1px',
  },
  brand: {
    accent: '#0067e0',
    focusBorder: 'rgba(0,103,224,0.45)',
    focusRing: '0 0 0 3px rgba(0,103,224,0.12), 0 2px 8px rgba(0,103,224,0.08)',
    restShadow: '0 1px 2px rgba(15,23,42,0.04)',
    restBorder: 'var(--border-2)',
    borderWidth: '1.5px',
  },
} as const;

export function FloatInput({
  label,
  type = 'text',
  inputMode,
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
  tone = 'gold',
  upperLifted = false,
}: FloatInputProps) {
  const t = TONES[tone];
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
    'text-[var(--text-primary)]',
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
          'motion-reduce:transition-none',
          disabled && 'opacity-50',
        )}
        style={{
          background: focused ? 'var(--bg-card)' : 'var(--bg-subtle)',
          border: `${t.borderWidth} solid ${
            focused ? t.focusBorder
              : error ? 'color-mix(in srgb, var(--danger) 60%, transparent)'
                : t.restBorder}`,
          boxShadow: focused ? t.focusRing
            : error ? '0 0 0 3px color-mix(in srgb, var(--danger) 8%, transparent)'
              : t.restShadow,
        }}
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
            lifted && upperLifted && 'uppercase tracking-[0.03em]',
            !lifted || (!focused && !error) ? 'text-[var(--text-muted)]' : '',
            lifted && error && !focused ? 'text-[var(--danger-text)]' : '',
          )}
          style={lifted && focused && !error ? { color: t.accent } : undefined}
        >
          {label}
          {required && (
            <span className="ml-0.5" style={{ color: t.accent }} aria-hidden>*</span>
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
            style={{
              caretColor: t.accent,
              ...(autoGrow ? { maxHeight } : { minHeight: `${rows * 24 + 28}px` }),
            }}
          />
        ) : (
          <input
            id={id}
            type={type}
            inputMode={inputMode}
            value={value}
            placeholder={lifted ? placeholder : ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onBlur?.(); }}
            disabled={disabled}
            className={baseInputClass}
            style={{ caretColor: t.accent }}
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
