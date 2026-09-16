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

import { cn } from '../cn';
import { FormField, type FormFieldProps } from './FormField';
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
  /**
   * Hide the label visually, keeping it for assistive tech.
   *
   * For the case where a section heading immediately above the field already
   * names it and a second visible caption would read as a duplicate. `FormField`
   * has always supported this; the bound fields simply did not pass it through,
   * so call sites in that position dropped back to a raw control with a
   * `<span>` caption — which names nothing.
   */
  labelHidden?: boolean;
  /**
   * `compact` renders the tiny uppercase caption used inside dense list rows.
   * See `FormFieldProps.density` — it is a label style, not a kind of field.
   */
  density?: FormFieldProps['density'];
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
  /**
   * Rendered inside the control's trailing edge — a password reveal toggle.
   *
   * Positioned by this component rather than by the caller, so the control
   * gets the padding that keeps the text clear of it. A caller that absolutely
   * positions its own button over the input has to guess that padding, and the
   * two go out of step the moment the control's height changes.
   *
   * It must be interactive and it must carry its own accessible name: it is a
   * sibling of the input, not part of it, so the field's `<label>` does not
   * name it.
   */
  trailing?: React.ReactNode;
  /** Rendered at the right end of the label row — an "Optional" marker, a link. */
  labelAside?: React.ReactNode;
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
  labelHidden,
  density,
  type = 'text',
  autoComplete,
  maxLength,
  showCount,
  trailing,
  labelAside,
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
      labelHidden={labelHidden}
      density={density}
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
        ) : (
          labelAside
        )
      }
    >
      <span className="relative block">
        <TextInput
          name={field.name}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={trailing ? 'pr-11' : undefined}
          // No `maxLength` on the element even when one is declared: a hard cap
          // silently truncates a paste, so the user loses text with no message.
          // The schema reports the overshoot and the count above shows it.
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
        />
        {trailing && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</span>
        )}
      </span>
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
  labelHidden,
  density,
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
      labelHidden={labelHidden}
      density={density}
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
  labelHidden,
  density,
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
      labelHidden={labelHidden}
      density={density}
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
  labelHidden,
  density,
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
      labelHidden={labelHidden}
      density={density}
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
  labelHidden,
  density,
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
      labelHidden={labelHidden}
      density={density}
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

/* ──────────────────────────────────────────────────────────────────────────
 * Radio group
 * ────────────────────────────────────────────────────────────────────────── */

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  /** Secondary line under the option. */
  description?: string;
  disabled?: boolean;
}

export interface RadioFieldProps<T extends string = string> {
  field: FieldLike<T>;
  legend: string;
  options: ReadonlyArray<RadioOption<T>>;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  serverError?: string;
  className?: string;
  /** Lay the options out in a row. Only sensible for two or three short ones. */
  inline?: boolean;
}

/**
 * A radio group.
 *
 * Built on `<fieldset>` and `<legend>` rather than on `FormField`, and that is
 * not a stylistic preference. `FormField` renders `<label htmlFor={id}>`, and a
 * label points at exactly one control — there is no valid `htmlFor` for a group
 * of five radios. Wrapping the group in one anyway produces a label that either
 * names the first radio or names nothing, which is worse than no group name
 * because it reads as correct.
 *
 * `<legend>` is the element that names a group of controls, and screen readers
 * announce it before each option ("Reject reason, Wrong amount, radio 1 of 5").
 * That is the behaviour this needs and nothing else provides it.
 *
 * Keyboard behaviour comes free from the native input: arrow keys move within
 * the group and Tab leaves it, because the options share a `name`. That shared
 * name is load-bearing — without it every radio is its own group and arrow keys
 * do nothing.
 */
export function RadioField<T extends string = string>({
  field,
  legend,
  options,
  description,
  required,
  disabled,
  serverError,
  className,
  inline,
}: RadioFieldProps<T>) {
  const error = visibleError(field, serverError);

  // The error REPLACES the description rather than joining it, matching
  // FormField. Joining both ids would point aria-describedby at the description
  // element — which is not rendered when there is an error, so the reference
  // would dangle and an AT would announce nothing for that half. It is also the
  // wrong reading order: a hint before the thing that went wrong.
  const describedBy = error
    ? `${field.name}-error`
    : description
      ? `${field.name}-description`
      : undefined;

  return (
    <fieldset
      className={cn('min-w-0 border-0 p-0 m-0', className)}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      aria-required={required || undefined}
      disabled={disabled}
    >
      <legend
        className="flex items-baseline gap-0.5 text-[11.5px] font-[650] leading-none p-0 mb-1.5"
        style={{ color: disabled ? 'var(--text-disabled)' : 'var(--text-secondary)' }}
      >
        {legend}
        {required && (
          // aria-hidden, as in FormField: aria-required on the fieldset already
          // carries this, and announcing "star" as well is noise.
          <span aria-hidden style={{ color: 'var(--danger-text)' }}>*</span>
        )}
      </legend>

      <div className={cn('flex gap-2', inline ? 'flex-row flex-wrap' : 'flex-col')}>
        {options.map((o) => {
          const id = `${field.name}-${o.value}`;
          const selected = field.state.value === o.value;
          return (
            <label
              key={o.value}
              htmlFor={id}
              className={cn(
                'flex items-start gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5',
                'transition-colors duration-150 motion-reduce:transition-none',
                o.disabled || disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
              )}
              style={{
                // 44px minimum, as every control in the system has: padding
                // alone lands under it because globals.css sets 14px root font.
                minHeight: 44,
                background: selected ? 'var(--brand-soft)' : 'var(--bg-subtle)',
                border: `1px solid ${
                  error
                    ? 'var(--danger-border)'
                    : selected
                      ? 'var(--brand)'
                      : 'var(--border-2)'
                }`,
              }}
            >
              <input
                id={id}
                type="radio"
                // Shared name: this is what makes the group a group, and what
                // makes arrow-key navigation work.
                name={field.name}
                value={o.value}
                checked={selected}
                disabled={o.disabled || disabled}
                onChange={() => field.handleChange(o.value)}
                onBlur={field.handleBlur}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
                style={{ cursor: o.disabled || disabled ? 'not-allowed' : 'pointer' }}
              />
              <span className="min-w-0">
                <span
                  className="block text-[12.5px] font-[550] leading-[1.35]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {o.label}
                </span>
                {o.description && (
                  <span
                    className="mt-0.5 block text-[11.5px] leading-[1.35]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {o.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {(error || description) && (
        <div className="mt-1.5 text-[11.5px] leading-[1.35]">
          {error ? (
            <p id={`${field.name}-error`} style={{ color: 'var(--danger-text)' }}>{error}</p>
          ) : (
            <p id={`${field.name}-description`} style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Month
 * ────────────────────────────────────────────────────────────────────────── */

export interface MonthFieldProps extends BoundFieldProps {
  field: FieldLike<string>;
  /** Inclusive `YYYY-MM` bounds. */
  min?: string;
  max?: string;
}

/**
 * A calendar month.
 *
 * `<input type="month">` rather than two selects: it is what the commissions
 * screen already uses, it gives mobile a month picker, and a payout run is for
 * a month rather than a day — storing the 1st to represent one invites a
 * comparison against a real date that is wrong by up to 30 days.
 *
 * Firefox renders it as a plain text box. That degrades to typing `2026-03`,
 * which the schema accepts and reports on precisely, so the fallback is usable
 * rather than merely present.
 */
export function MonthFieldControl({
  field,
  label,
  description,
  required,
  disabled,
  readOnly,
  serverError,
  className,
  reserveMessageSpace,
  labelHidden,
  density,
  min,
  max,
}: MonthFieldProps) {
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
      labelHidden={labelHidden}
      density={density}
    >
      <TextInput
        name={field.name}
        type="month"
        value={field.state.value ?? ''}
        min={min}
        max={max}
        placeholder="YYYY-MM"
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
    </FormField>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Time
 * ────────────────────────────────────────────────────────────────────────── */

export interface TimeFieldProps extends BoundFieldProps {
  field: FieldLike<string>;
  /** Inclusive `HH:MM` bounds. */
  min?: string;
  max?: string;
}

/**
 * A time of day, as `HH:MM`.
 *
 * Native `<input type="time">` rather than a custom picker: it is already
 * localised — a 12-hour locale renders AM/PM over the same 24-hour value — it
 * is already keyboard-accessible, and on a phone it opens the OS wheel, which
 * beats anything hand-rolled inside a scrolling form.
 *
 * Pairs of these are how availability is expressed, and a pair wants to sit on
 * one line. `labelHidden` is the intended way to do that: the label is real
 * and `htmlFor`-bound, it is simply not painted, so "Tuesday start" reaches a
 * screen reader without a caption stack tripling the height of a seven-day
 * grid.
 */
export function TimeFieldControl({
  field,
  label,
  description,
  required,
  disabled,
  readOnly,
  serverError,
  className,
  reserveMessageSpace,
  labelHidden,
  density,
  min,
  max,
}: TimeFieldProps) {
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
      labelHidden={labelHidden}
      density={density}
    >
      <TextInput
        name={field.name}
        type="time"
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
 * Standalone fields
 * ────────────────────────────────────────────────────────────────────────── */

export interface StandaloneFieldOptions {
  /** The error to show, if the caller is computing one. */
  error?: string;
  /** Called on blur, after the value has settled. */
  onBlur?: () => void;
}

/**
 * A `FieldLike` for a control whose value and error the CALLER owns.
 *
 * Two shapes of screen need this, and neither is served by `useAppForm`:
 *
 *   1. Controls with no submit at all — per-set inputs in the workout logger,
 *      per-row editors in a table, a stepper beside a number. They save on
 *      blur, one field at a time; there is no payload, no submit to guard and
 *      no reset to perform.
 *
 *   2. One submit spread across a tree the form instance cannot reach — the
 *      profile page holds twenty pieces of state behind a single sticky Save,
 *      hands slices of it to five section components, and validates the whole
 *      draft with a schema at submit. The sections receive VALUES and ERRORS,
 *      not a form instance.
 *
 * Both want what `FieldLike` carries into the field components: a real label
 * with `htmlFor`, `aria-describedby`, `aria-invalid`, a 44px target, and — the
 * one that matters most on a numeric field — `inputMode` instead of
 * `type="number"`, so a scroll wheel over a focused input cannot silently
 * change a logged weight.
 *
 * ── The line this must not cross ────────────────────────────────────────────
 *
 * The hook renders an error; it never produces one. So it is legitimate
 * exactly when something real computes that error — a schema at submit, a
 * bounds check on blur — and it is metric-gaming under §23 when it is used to
 * dress a value that NOTHING validates, purely so a file stops being counted
 * as raw.
 *
 * It does not by itself make a screen "on the platform". The audit measures
 * schema coverage per file from the schema a file actually imports and calls,
 * which is the check that tells the two cases apart.
 */
export function useStandaloneField<T>(
  name: string,
  value: T,
  onChange: (next: T) => void,
  opts: StandaloneFieldOptions = {},
): FieldLike<T> {
  const { error, onBlur } = opts;
  return {
    name,
    state: {
      value,
      meta: {
        errors: error ? [error] : [],
        // Always touched: there is no submit to wait for, so an error the
        // caller has computed is one it wants shown now.
        isTouched: true,
      },
    },
    handleChange: onChange,
    handleBlur: onBlur ?? (() => {}),
  };
}
