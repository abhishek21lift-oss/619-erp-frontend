'use client';

/**
 * The three native controls, wired to the enclosing FormField.
 *
 * Thin on purpose. Each is the native element plus the field's id and ARIA,
 * plus one shared set of surface styles so a text input, a select and a
 * textarea on the same form are the same object. Anything a native input can do
 * — inputMode, autoComplete, min/max, step, pattern — passes straight through,
 * because a wrapper that swallows those is worse than no wrapper.
 *
 * What they deliberately do NOT do:
 *
 *   · No outline: none. The app has a global :focus-visible ring, and an inline
 *     outline suppression is the one thing that beats it — 56 of them were
 *     removed last phase precisely so these could inherit it.
 *   · No aria-label. The FormField's <label> is the name; adding one here would
 *     give every control two.
 *   · No height below 44px. globals.css sets html{font-size:14px}, so padding
 *     alone lands under what a thumb needs — the height is explicit.
 */

import { forwardRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '../cn';
import {
  FormField, fieldControlProps, useFieldWiring,
  type FormFieldProps, type FieldWiring,
} from './FormField';

/** The one surface every control in the system shares. */
export function controlClassName(w: FieldWiring | null, extra?: string) {
  return cn(
    'w-full rounded-[var(--radius-sm)] px-3.5 text-[13px] font-[500]',
    'transition-[border-color,background-color] duration-150',
    'motion-reduce:transition-none',
    'placeholder:text-[var(--text-disabled)]',
    w?.disabled && 'cursor-not-allowed opacity-55',
    extra,
  );
}

export function controlStyle(w: FieldWiring | null): React.CSSProperties {
  return {
    minHeight: 44,
    background: w?.disabled || w?.readOnly ? 'var(--bg-base)' : 'var(--bg-subtle)',
    border: `1px solid ${w?.invalid ? 'var(--danger-border)' : 'var(--border-2)'}`,
    color: 'var(--text-primary)',
  };
}

type NativeInput = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'aria-describedby'>;
type NativeArea = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'aria-describedby'>;
type NativeSelect = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'aria-describedby'>;

export const TextInput = forwardRef<HTMLInputElement, NativeInput>(
  function TextInput({ className, style, ...rest }, ref) {
    const w = useFieldWiring();
    return (
      <input
        ref={ref}
        {...fieldControlProps(w)}
        {...rest}
        className={controlClassName(w, className)}
        style={{ ...controlStyle(w), ...style }}
      />
    );
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, NativeArea>(
  function TextArea({ className, style, rows = 3, ...rest }, ref) {
    const w = useFieldWiring();
    return (
      <textarea
        ref={ref}
        rows={rows}
        {...fieldControlProps(w)}
        {...rest}
        className={controlClassName(w, cn('resize-y py-2.5 leading-[1.5]', className))}
        style={{ ...controlStyle(w), ...style }}
      />
    );
  },
);

export const SelectInput = forwardRef<HTMLSelectElement, NativeSelect>(
  function SelectInput({ className, style, children, ...rest }, ref) {
    const w = useFieldWiring();
    return (
      // The chevron is a sibling, not a background-image, so it takes its
      // colour from the same token as the text and follows the theme.
      <span className="relative block">
        <select
          ref={ref}
          {...fieldControlProps(w)}
          {...rest}
          className={controlClassName(w, cn('appearance-none pr-9', className))}
          style={{ ...controlStyle(w), ...style }}
        >
          {children}
        </select>
        <ChevronDown
          size={14} aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: w?.disabled ? 'var(--text-disabled)' : 'var(--text-muted)' }}
        />
      </span>
    );
  },
);

export interface SearchFieldProps extends NativeInput {
  /** The accessible name. Visually hidden — the placeholder is the visible cue. */
  label: string;
  /** Defaults to the label, so the common case needs one string. */
  placeholder?: string;
  className?: string;
  fieldClassName?: string;
}

/**
 * Search, filter and command inputs.
 *
 * 45 of the app's 105 placeholder-only fields are these, and they were right to
 * look the way they do: a magnifier beside a box reading "Search clients…" is
 * the conventional presentation, and stacking a visible "Search" caption above
 * 45 of them would be a regression for no gain. What was wrong is only that the
 * name vanished the moment you typed. So the label is real and associated, and
 * visually hidden.
 *
 * type="search" so mobile keyboards offer a search key and the control gets the
 * right role.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField({ label, placeholder, className, fieldClassName, style, ...rest }, ref) {
    return (
      <FormField label={label} labelHidden className={fieldClassName}>
        <SearchControl
          ref={ref}
          placeholder={placeholder ?? label}
          className={className}
          style={style}
          {...rest}
        />
      </FormField>
    );
  },
);

const SearchControl = forwardRef<HTMLInputElement, NativeInput>(
  function SearchControl({ className, style, ...rest }, ref) {
    const w = useFieldWiring();
    return (
      <span className="relative block">
        <Search
          size={14} aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          ref={ref}
          type="search"
          {...fieldControlProps(w)}
          {...rest}
          className={controlClassName(w, cn('pl-9', className))}
          style={{ ...controlStyle(w), ...style }}
        />
      </span>
    );
  },
);

/** FormField + TextInput, for the common case of a plain labelled text field. */
export function TextFieldRow({
  label, description, error, required, disabled, readOnly,
  reserveMessageSpace, labelAside, className, ...input
}: Pick<FormFieldProps,
  'label' | 'description' | 'error' | 'required' | 'disabled' | 'readOnly'
  | 'reserveMessageSpace' | 'labelAside' | 'className'> & NativeInput) {
  return (
    <FormField
      label={label} description={description} error={error} required={required}
      disabled={disabled} readOnly={readOnly} reserveMessageSpace={reserveMessageSpace}
      labelAside={labelAside} className={className}
    >
      <TextInput {...input} />
    </FormField>
  );
}
