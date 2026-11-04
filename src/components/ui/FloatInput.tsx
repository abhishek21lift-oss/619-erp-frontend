'use client';

/**
 * The assessment/settings field, rendered through the one field system.
 *
 * This component used to draw its own floating-label box: 14px radius, caption
 * inside the control, ~52px tall. The rest of the app had moved to a 44px
 * label-above field, so the same product showed two form languages depending
 * on which screen you were on.
 *
 * The external props are unchanged — the ~40 assessment screens still pass
 * `value`/`onChange` rather than a schema field — but the markup underneath is
 * now `FormField` + `TextInput`/`TextArea`. One anatomy, one error row, one set
 * of ARIA wiring.
 */

import { useEffect, useRef } from 'react';
import { cn } from './cn';
import { FormField } from './form/FormField';
import { TextArea, TextInput } from './form/controls';

interface FloatInputProps {
  label: string;
  /**
   * The accessible name, for the call sites that pass `label=""`.
   *
   * Four of them do, and every one has a visible heading in a SIBLING element
   * — "Final / Selling Price", "Amount Paid" — which names the field to a
   * sighted person and names nothing to a screen reader. An empty <label> is
   * not "no label": it is a label of zero characters, so the control has no
   * accessible name at all and is announced as "edit text, blank".
   *
   * Applied only when `label` is empty, so a field can never carry two
   * competing names. Enforced by the guardrail in
   * form-system-guardrails.test.tsx.
   */
  ariaLabel?: string;
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
   * language. The anatomy is now shared; only the ring colour differs.
   */
  tone?: 'gold' | 'brand';
  /**
   * Small-caps the label. The Settings profile screen had this on its floating
   * caption; preserved as a label style rather than a second field.
   */
  upperLifted?: boolean;
  /**
   * The server's limit for this text. Stops typing at the limit and shows a
   * count as it gets close — a long note used to be refused only by the
   * final Save, after the whole wizard had been filled in.
   */
  maxLength?: number;
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

/** Focus accents. The field's anatomy is shared; only the ring colour differs. */
const ACCENTS = {
  gold: {
    accent: 'var(--gold, #F59E0B)',
    soft: 'color-mix(in srgb, var(--gold, #F59E0B) 14%, transparent)',
  },
  brand: {
    accent: 'var(--action)',
    soft: 'color-mix(in srgb, var(--action) 12%, transparent)',
  },
} as const;

export function FloatInput({
  label,
  ariaLabel,
  type = 'text',
  inputMode,
  numeric,
  value,
  onChange,
  onBlur,
  placeholder,
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
  maxLength,
}: FloatInputProps) {
  const t = ACCENTS[tone];

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!multiline || !autoGrow || !textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [multiline, autoGrow, maxHeight, value]);

  const nearLimit = maxLength != null && value.length >= maxLength * 0.8;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(numericMode ? clampNumericText(e.target.value, numericMode) : e.target.value);

  // The old floating box had room for an icon inside it; the standard control
  // pads for one instead, so a prefix/suffix still cannot sit on the text.
  const controlClass = cn(
    prefix && 'pl-10',
    suffix && 'pr-10',
    autoGrow && 'resize-none overflow-y-auto',
  );

  return (
    <div style={{ '--brand': t.accent, '--brand-soft': t.soft } as React.CSSProperties}>
      <FormField
        label={label || ariaLabel || ''}
        labelHidden={!label}
        labelClassName={upperLifted ? 'uppercase tracking-[0.03em] text-[10px]' : undefined}
        error={error}
        required={required}
        disabled={disabled}
        className={className}
      >
        <span className="relative block">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {prefix}
            </span>
          )}

          {multiline ? (
            <TextArea
              ref={textareaRef}
              rows={autoGrow ? 1 : rows}
              value={value}
              placeholder={placeholder}
              onChange={handleChange}
              onBlur={onBlur}
              disabled={disabled}
              required={required}
              maxLength={maxLength}
              className={controlClass}
              style={autoGrow ? { maxHeight } : undefined}
            />
          ) : (
            <TextInput
              type={renderedType}
              inputMode={renderedInputMode}
              value={value}
              placeholder={placeholder}
              onChange={handleChange}
              onBlur={onBlur}
              disabled={disabled}
              required={required}
              maxLength={maxLength}
              className={controlClass}
            />
          )}

          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-[600] text-[var(--text-muted)]">
              {suffix}
            </span>
          )}
        </span>
      </FormField>

      {nearLimit && (
        <p className="mt-1 text-right text-[11px] font-medium tabular-nums text-[var(--text-muted)]" aria-live="polite">
          {value.length} / {maxLength}
        </p>
      )}
    </div>
  );
}

export default FloatInput;
