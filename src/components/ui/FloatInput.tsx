'use client';

import { useState, useId, useRef, useEffect } from 'react';
import { cn } from './cn';

interface FloatInputProps {
  label: string;
  /**
   * The control type.
   *
   * `'number'` is accepted and DELIBERATELY NOT PASSED THROUGH — see
   * `NUMERIC_TYPES` and the note on `numeric` below. Every other value reaches
   * the element unchanged.
   */
  type?: string;
  /**
   * Which on-screen keyboard mobile should open. `type="number"` alone gives
   * iOS a keypad without a decimal point, which makes 62.5kg unenterable —
   * the session logger needs `decimal` for weights and `numeric` for reps.
   *
   * Set explicitly to override what `numeric` infers.
   */
  inputMode?: React.ComponentProps<'input'>['inputMode'];
  /**
   * Declares the field numeric without `type="number"`.
   *
   * ── Why type="number" is never rendered ─────────────────────────────────
   *
   * A scroll wheel over a FOCUSED `type="number"` silently changes its value.
   * On the screens this component serves that is a body measurement nobody
   * typed — a waist circumference, a blood pressure, a 1RM that becomes a
   * "Novice / Intermediate / Advanced" label about a person. It is the same
   * class of defect as `Number('')` becoming `0`: a number that looks entered
   * and was not, indistinguishable afterwards from one that was.
   *
   * `type="number"` also accepts 'e' and '+' in Safari and reports
   * `valueAsNumber` as NaN for partial input, so it was never the guarantee it
   * appeared to be.
   *
   * What it did give for free was blocking letters, and that is replicated by
   * `clampNumericText` below rather than lost. The result is strictly safer
   * than what it replaces: no wheel, no 'e', and the same characters allowed.
   *
   * `'integer'` opens the plain numeric keypad; `'decimal'` opens one with a
   * point. A bare `type="number"` infers `'decimal'`, because a height or a
   * weight that cannot take 62.5 is worse than a rep count that shows a
   * pointless dot.
   */
  numeric?: 'integer' | 'decimal';
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

/** Types a caller may write that must never reach the DOM. See `numeric`. */
const NUMERIC_TYPES = new Set(['number']);

/**
 * Keep a numeric field's text numeric, as `type="number"` used to.
 *
 * Progressive rather than strict: the user must be able to pass THROUGH the
 * intermediate states on the way to a real number, so `''`, `'-'`, `'1'` and
 * `'1.'` are all allowed to exist while typing. Only characters that can never
 * appear in one are removed.
 *
 * Range and sign are deliberately NOT decided here — that is the schema's job,
 * and a filter that silently drops a minus sign would make "-5" unenterable
 * and therefore unreportable as invalid.
 */
export function clampNumericText(raw: string, mode: 'integer' | 'decimal'): string {
  const negative = raw.startsWith('-');
  let body = raw.replace(/[^0-9.]/g, '');
  if (mode === 'integer') {
    body = body.replace(/\./g, '');
  } else {
    // One point only; anything after the first is dropped rather than moved.
    const first = body.indexOf('.');
    if (first !== -1) {
      body = body.slice(0, first + 1) + body.slice(first + 1).replace(/\./g, '');
    }
  }
  return negative ? `-${body}` : body;
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
  numeric,
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
  const errorId = `${id}-error`;
  const [focused, setFocused] = useState(false);

  /*
   * A bare `type="number"` is read as a DECLARATION that the field is numeric,
   * not as an instruction to render one. Forty-three files use this component
   * and twenty-five of them wrote `type="number"`; reading it here is what
   * makes them all safe without touching a single call site.
   */
  const numericMode: 'integer' | 'decimal' | null =
    numeric ?? (NUMERIC_TYPES.has(type) ? 'decimal' : null);
  const renderedType = NUMERIC_TYPES.has(type) ? 'text' : type;
  const renderedInputMode =
    inputMode ?? (numericMode === 'integer' ? 'numeric' : numericMode === 'decimal' ? 'decimal' : undefined);

  /** Numeric fields keep their text numeric; everything else passes through. */
  const handleChange = (next: string) =>
    onChange(numericMode ? clampNumericText(next, numericMode) : next);
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
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onBlur?.(); }}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
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
            type={renderedType}
            inputMode={renderedInputMode}
            value={value}
            placeholder={lifted ? placeholder : ''}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onBlur?.(); }}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
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

      {/* Error message.
          It carries an id and the control points at it with
          `aria-describedby`. Before, this was a loose <p> next to the field:
          visible to anyone looking at it and announced to nobody. */}
      {error && (
        <p id={errorId} className="mt-1.5 text-[11px] font-medium text-[var(--danger-text)]">
          {error}
        </p>
      )}
    </div>
  );
}

export default FloatInput;
