'use client';

/**
 * The layer underneath the app's eighteen input components.
 *
 * FormField is not a control. It owns the id, the label, the description, the
 * error and the ARIA wiring between them, and it wraps whatever control the
 * caller provides — an input, a select, a date picker, a file button, a
 * third-party combobox. That is the whole reason it exists: the app already had
 * eighteen components that render a control, and seventeen of them skipped the
 * wiring. aria-describedby appeared in exactly one component in the codebase.
 * So did aria-invalid.
 *
 * The wiring reaches the control through context rather than through the caller
 * repeating it, which turns three recurring failures into impossibilities:
 *
 *   · a description that is rendered but never announced, because the call site
 *     forgot aria-describedby;
 *   · an aria-describedby pointing at an id that does not exist, because the
 *     two ends were written in different places;
 *   · a control with two accessible names, because someone added an aria-label
 *     to a field that already had a <label>.
 *
 * See FORM-SYSTEM.md for the audit this came out of, and for what it
 * deliberately does not do — it does not replace FloatInput, it does not own
 * validation, and it does not force checkboxes into a label-above-control
 * shape.
 */

import { createContext, useContext, useId } from 'react';
import { cn } from '../cn';

export interface FieldWiring {
  /** The control's id. The label's htmlFor points here. */
  id: string;
  /** Space-separated ids of the description and/or error, or undefined. */
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
}

const FieldContext = createContext<FieldWiring | null>(null);

/**
 * The wiring for the enclosing FormField.
 *
 * Returns null outside one, so a control can be used standalone — several
 * places need a bare input with its own label, and throwing there would make
 * the control less reusable than the raw element it wraps.
 */
export function useFieldWiring(): FieldWiring | null {
  return useContext(FieldContext);
}

export interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  /** Helper text under the control. Announced via aria-describedby. */
  description?: string;
  /** When set, the field is invalid: this is announced and replaces the description. */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /**
   * Keep the message row's height even when there is no message, so an error
   * appearing does not push everything below it down. Worth it on forms that
   * validate as you type; wasteful on forms that cannot error.
   */
  reserveMessageSpace?: boolean;
  /** Hides the label visually but keeps it for assistive tech. Search fields. */
  labelHidden?: boolean;
  /** Rendered at the right end of the label row — a character count, an optional marker. */
  labelAside?: React.ReactNode;
  className?: string;
  /** Escape hatch for a caller that must control the id (a deep-link anchor). */
  id?: string;
}

export function FormField({
  label,
  children,
  description,
  error,
  required = false,
  disabled = false,
  readOnly = false,
  reserveMessageSpace = false,
  labelHidden = false,
  labelAside,
  className,
  id: idOverride,
}: FormFieldProps) {
  const generated = useId();
  const id = idOverride ?? generated;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  // The error replaces the description rather than joining it. Both at once
  // means the screen reader reads the hint before the thing that went wrong,
  // which is the wrong order when something has gone wrong.
  const describedBy = error ? errorId : description ? descriptionId : undefined;

  const wiring: FieldWiring = {
    id, describedBy, invalid: !!error, required, disabled, readOnly,
  };

  return (
    <FieldContext.Provider value={wiring}>
      <div className={cn('min-w-0', className)}>
        <div className={cn(
          'flex items-baseline justify-between gap-2',
          labelHidden && 'sr-only',
        )}>
          {/* The asterisk is a SIBLING of the label, not a child of it.
              Inside, it becomes part of the label's text: the accname spec
              skips aria-hidden subtrees so a real screen reader still says
              "Trainer", but the visible name and the accessible name then
              differ, which is the thing WCAG 2.5.3 is about — and any tool
              that reads the label's text content (including this repo's tests)
              sees "Trainer *". Outside, the two are identical by
              construction. */}
          <span className="flex items-baseline gap-0.5">
            <label
              htmlFor={id}
              className="text-[11.5px] font-[650] leading-none"
              style={{ color: disabled ? 'var(--text-disabled)' : 'var(--text-secondary)' }}
            >
              {label}
            </label>
            {required && (
              // aria-hidden because `required` on the control already carries
              // this to assistive tech; announcing "star" as well is noise.
              <span aria-hidden className="text-[11.5px] font-[650] leading-none"
                style={{ color: 'var(--danger-text)' }}>*</span>
            )}
          </span>
          {labelAside}
        </div>

        <div className={labelHidden ? undefined : 'mt-1.5'}>{children}</div>

        {/* One row, one purpose. The error takes it when there is an error. */}
        {(error || description || reserveMessageSpace) && (
          <div className={cn('mt-1.5 text-[11.5px] leading-[1.35]', reserveMessageSpace && 'min-h-[16px]')}>
            {error ? (
              // Not role="alert": on a form that validates on blur, several of
              // these can appear at once and each would interrupt the previous
              // announcement. aria-describedby already reads the message when
              // focus reaches the field, and aria-invalid says that it is one.
              <p id={errorId} style={{ color: 'var(--danger-text)' }}>{error}</p>
            ) : description ? (
              <p id={descriptionId} style={{ color: 'var(--text-muted)' }}>{description}</p>
            ) : null}
          </div>
        )}
      </div>
    </FieldContext.Provider>
  );
}

/**
 * The props a native control needs to join the enclosing field.
 *
 * Spread onto the control. Returns nothing outside a FormField, so a control
 * carrying its own label is unaffected.
 */
export function fieldControlProps(w: FieldWiring | null) {
  if (!w) return {};
  return {
    id: w.id,
    'aria-describedby': w.describedBy,
    // Only when true. aria-invalid="false" is valid but noisy in the tree, and
    // it is the presence of the attribute that most tooling keys on.
    ...(w.invalid ? { 'aria-invalid': true as const } : {}),
    ...(w.required ? { required: true } : {}),
    ...(w.disabled ? { disabled: true } : {}),
    ...(w.readOnly ? { readOnly: true } : {}),
  };
}

export default FormField;
