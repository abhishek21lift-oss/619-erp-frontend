'use client';

/**
 * The universal field components — §3.
 *
 * These sit between TanStack's field state and the existing `FormField` +
 * control pair. They add nothing visual: `FormField` already owns the label,
 * description, error slot and every ARIA relationship between them, and
 * `controls.tsx` already owns the surface. Re-implementing either here is the
 * duplicate system §17 forbids, so neither is re-implemented.
 *
 * What they add is the wiring that was missing: a field's value, its blur, and
 * — the part every hand-rolled form in this app gets wrong — **when its error
 * is allowed to be visible**.
 *
 * ── The touched rule ────────────────────────────────────────────────────────
 *
 * An error shows only once the field has been blurred, or once a submit has
 * been attempted. Showing it earlier means a form that is red before the user
 * has typed anything, which trains people to ignore red.
 *
 * ── On `field` as a prop rather than `form` + `name` ────────────────────────
 *
 * Call sites render these inside TanStack's `<form.Field>` render prop:
 *
 *     <form.Field name="amount">
 *       {(field) => <NumberField field={field} label="Amount" mode="money" />}
 *     </form.Field>
 *
 * More verbose than passing `form` and a string name, and deliberately so: the
 * render prop is where TanStack's inference actually works, so `name` is
 * checked against the schema and `field.state.value` is typed. A `name: string`
 * prop would throw all of that away and turn a renamed field into a runtime
 * `undefined` instead of a compile error — which is §18's whole point.
 *
 * The `FieldLike` interface below is structural, so these components need none
 * of TanStack's deep generics and stay readable.
 */

import { FormField } from './FormField';
import { TextInput, TextArea, SelectInput } from './controls';

/**
 * The shape of a TanStack field, structurally.
 *
 * Matches `FieldApi` without importing it: the generic parameters are numerous
 * enough that naming them here would make every signature unreadable, and
 * nothing in this file needs more than these five members.
 */
export interface FieldLike<T> {
  name: string;
  state: {
    value: T;
    meta: {
      errors: ReadonlyArray<unknown>;
      isTouched: boolean;
      isBlurred?: boolean;
    };
  };
  handleChange: (value: T) => void;
  handleBlur: () => void;
}

/** Props every bound field accepts, mirroring the §2 contract. */
export interface BoundFieldProps {
  label: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  /**
   * A server-side error for this field, from `useAppForm`'s `errors.fieldErrors`.
   *
   * Takes precedence over client validation: it is the more authoritative of
   * the two, and it is the one the user has not seen yet.
   */
  serverError?: string;
  className?: string;
  /** Reserve the message row so an appearing error does not shift the layout. */
  reserveMessageSpace?: boolean;
}

/**
 * Reduce a field's validation issues to the one message to show.
 *
 * TanStack stores whatever the validator produced. With a Standard Schema that
 * is a `StandardSchemaV1.Issue` (`{ message }`); hand-written validators return
 * plain strings. Both are handled, and anything else is ignored rather than
 * stringified — `[object Object]` under a field is worse than no message.
 */
function firstMessage(errors: ReadonlyArray<unknown>): string | undefined {
  for (const e of errors) {
    if (typeof e === 'string' && e.trim() !== '') return e;
    if (e && typeof e === 'object' && 'message' in e) {
      const m = (e as { message: unknown }).message;
      if (typeof m === 'string' && m.trim() !== '') return m;
    }
  }
  return undefined;
}

/**
 * The error to display, or undefined.
 *
 * Server errors show immediately — the user has already submitted, so there is
 * nothing to wait for. Client errors wait for blur, per the touched rule above.
 */
export function visibleError<T>(field: FieldLike<T>, serverError?: string): string | undefined {
  if (serverError) return serverError;
  const touched = field.state.meta.isTouched;
  if (!touched) return undefined;
  return firstMessage(field.state.meta.errors);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Text
 * ────────────────────────────────────────────────────────────────────────── */

export interface TextFieldProps extends BoundFieldProps {
  field: FieldLike<string>;
  type?: 'text' | 'email' | 'tel' | 'url' | 'password';
  autoComplete?: string;
  maxLength?: number;
  /** Show a live character count in the label row. Pairs with `maxLength`. */
  showCount?: boolean;
}

export function TextField({
  field,
  label,
  description,
  required,
  disabled,
  readOnly,
  placeholder,
  serverError,
  className,
  reserveMessageSpace,
  type = 'text',
  autoComplete,
  maxLength,
  showCount,
}: TextFieldProps) {
  const error = visibleError(field, serverError);
  const value = field.state.value ?? '';

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      reserveMessageSpace={reserveMessageSpace}
      labelAside={
        showCount && maxLength ? (
          <span
            className="text-[10.5px] tabular-nums"
            style={{
              color:
                value.length > maxLength ? 'var(--danger-text)' : 'var(--text-muted)',
            }}
          >
            {value.length}/{maxLength}
          </span>
        ) : undefined
      }
    >
      <TextInput
        name={field.name}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        // No `maxLength` on the element even when one is declared: a hard cap
        // silently truncates a paste, so the user loses text with no message.
        // The schema reports the overshoot and the count above shows it.
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
    </FormField>
  );
}

export interface TextAreaFieldProps extends BoundFieldProps {
  field: FieldLike<string>;
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
}

export function TextAreaField({
  field,
  label,
  description,
  required,
  disabled,
  readOnly,
  placeholder,
  serverError,
  className,
  reserveMessageSpace,
  rows = 3,
  maxLength,
  showCount,
}: TextAreaFieldProps) {
  const error = visibleError(field, serverError);
  const value = field.state.value ?? '';

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      reserveMessageSpace={reserveMessageSpace}
      labelAside={
        showCount && maxLength ? (
          <span
            className="text-[10.5px] tabular-nums"
            style={{
              color: value.length > maxLength ? 'var(--danger-text)' : 'var(--text-muted)',
            }}
          >
            {value.length}/{maxLength}
          </span>
        ) : undefined
      }
    >
      <TextArea
        name={field.name}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
    </FormField>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Numbers
 * ────────────────────────────────────────────────────────────────────────── */

export type NumberMode = 'integer' | 'decimal' | 'money' | 'percent';

export interface NumberFieldProps extends BoundFieldProps {
  /**
   * The value is a **string**, not a number.
   *
   * Deliberate, and the single most important decision in this file. A numeric
   * `value` forces the component to coerce on every keystroke, which means
   * deciding what `''`, `'-'` and `'1.'` mean while the user is still typing
   * them — and the usual answer, `Number(raw)`, turns a cleared field into a
   * real `0`. Keeping the raw string means the user's intermediate states stay
   * theirs and the schema does the one conversion, once, at submit.
   */
  field: FieldLike<string>;
  mode?: NumberMode;
  min?: number;
  max?: number;
  step?: number;
  /** Rendered inside the control's trailing edge — 'kg', '%', 'sessions'. */
  suffix?: string;
}

export function NumberField({
  field,
  label,
  description,
  required,
  disabled,
  readOnly,
  placeholder,
  serverError,
  className,
  reserveMessageSpace,
  mode = 'decimal',
  min,
  max,
  step,
  suffix,
}: NumberFieldProps) {
  const error = visibleError(field, serverError);

  // `inputMode` rather than `type="number"`. §19 wants the numeric keypad on
  // mobile, which inputMode delivers, without type=number's costs: a scroll
  // wheel over a focused field silently changes the value, `valueAsNumber`
  // reports NaN for partial input, and Safari accepts 'e' and '+'.
  const inputMode: 'numeric' | 'decimal' = mode === 'integer' ? 'numeric' : 'decimal';

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      reserveMessageSpace={reserveMessageSpace}
    >
      <span className="relative block">
        <TextInput
          name={field.name}
          type="text"
          inputMode={inputMode}
          value={field.state.value ?? ''}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className={suffix ? 'pr-10' : undefined}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
        />
        {suffix && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-[600]"
            style={{ color: 'var(--text-muted)' }}
          >
            {suffix}
          </span>
        )}
      </span>
    </FormField>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Choice
 * ────────────────────────────────────────────────────────────────────────── */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps<T extends string = string> extends BoundFieldProps {
  /**
   * Generic over the union, not widened to `string`.
   *
   * A form whose `type` field is `'percent' | 'flat' | 'free'` gives TanStack a
   * field of that union. Typing this `FieldLike<string>` would refuse it, and
   * widening the form state to `string` to compensate would throw away exactly
   * the narrowing §18 asks for — a mistyped branch in a `switch (values.type)`
   * would stop being a compile error.
   */
  field: FieldLike<T>;
  options: ReadonlyArray<SelectOption & { value: T }> | ReadonlyArray<SelectOption>;
  /** Shown as a disabled first option when the field has no value yet. */
  placeholderOption?: string;
}

export function SelectField<T extends string = string>({
  field,
  label,
  description,
  required,
  disabled,
  readOnly,
  serverError,
  className,
  reserveMessageSpace,
  options,
  placeholderOption,
}: SelectFieldProps<T>) {
  const error = visibleError(field, serverError);

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      reserveMessageSpace={reserveMessageSpace}
    >
      <SelectInput
        name={field.name}
        value={field.state.value ?? ''}
        // The DOM hands back `string`; the field's type is the union. The
        // assertion is confined to this line and is checked at parse time by
        // the schema's `enumField`, which rejects any value not in the set —
        // so a tampered `<option>` fails validation rather than flowing on as
        // a union member it is not.
        onChange={(e) => field.handleChange(e.target.value as T)}
        onBlur={field.handleBlur}
      >
        {placeholderOption && (
          <option value="" disabled>
            {placeholderOption}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </SelectInput>
    </FormField>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Dates
 * ────────────────────────────────────────────────────────────────────────── */

export interface DateFieldProps extends BoundFieldProps {
  field: FieldLike<string>;
  min?: string;
  max?: string;
}

export function DateFieldControl({
  field,
  label,
  description,
  required,
  disabled,
  readOnly,
  serverError,
  className,
  reserveMessageSpace,
  min,
  max,
}: DateFieldProps) {
  const error = visibleError(field, serverError);

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      reserveMessageSpace={reserveMessageSpace}
    >
      <TextInput
        name={field.name}
        type="date"
        value={field.state.value ?? ''}
        min={min}
        max={max}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
    </FormField>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Boolean
 * ────────────────────────────────────────────────────────────────────────── */

export interface CheckboxFieldProps {
  field: FieldLike<boolean>;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A checkbox.
 *
 * Not wrapped in `FormField`: that renders label-above-control, and a checkbox
 * reads as control-then-caption. Forcing it into the text-field shape is the
 * mistake FORM-SYSTEM.md §3 already called out, so the native pairing stays.
 */
export function CheckboxField({
  field,
  label,
  description,
  disabled,
  className,
}: CheckboxFieldProps) {
  const descriptionId = description ? `${field.name}-description` : undefined;

  return (
    <div className={className}>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          name={field.name}
          checked={field.state.value ?? false}
          disabled={disabled}
          aria-describedby={descriptionId}
          onChange={(e) => field.handleChange(e.target.checked)}
          onBlur={field.handleBlur}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--brand)]"
        />
        <span
          className="text-[12.5px] font-[550] leading-[1.35]"
          style={{ color: disabled ? 'var(--text-disabled)' : 'var(--text-primary)' }}
        >
          {label}
        </span>
      </label>
      {description && (
        <p
          id={descriptionId}
          className="ml-[26px] mt-1 text-[11.5px] leading-[1.35]"
          style={{ color: 'var(--text-muted)' }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
