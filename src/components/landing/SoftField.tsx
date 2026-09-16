'use client';

/**
 * The public surface's field — the sign-in doors, password recovery, Start Free.
 *
 * ── Why this is not just `TextField` ───────────────────────────────────────
 *
 * The signed-out journey has its own design language: soft-UI, one base tone,
 * elevation from light rather than from fill, and its own token file with
 * contrast ratios computed against that base. It is also ALWAYS LIGHT — there
 * is no dark variant of the landing surface.
 *
 * The chrome design system's controls read `var(--text-primary)`,
 * `var(--bg-subtle)` and friends, which follow `[data-theme="dark"]` on the
 * document. Rendering them here would put a dark input inside a hard-coded
 * light card the moment a visitor's account is set to dark. That is a real
 * reason for a second SURFACE.
 *
 * It is not a reason for a second set of ARIA rules, and this file has none.
 * The id, the id derivation, the error-replaces-description rule and the
 * `fieldControlProps` contract all come from `FormField`'s own
 * `useFieldWiringState`, so a control rendered here joins its field by exactly
 * the same mechanism as one rendered in the chrome. One contract, two skins —
 * which is the distinction §17 is actually about, and the reason this counts as
 * a justified surface rather than a duplicate system.
 *
 * ── What these fix on the four auth screens ────────────────────────────────
 *
 * Every one of them rendered a bare `<input>` with a `<label htmlFor>` and an
 * error block associated with nothing:
 *
 *   · no `aria-describedby`, so the message was on screen and silent;
 *   · no `aria-invalid`, so nothing said WHICH field was wrong;
 *   · no live region, so submitting and failing announced nothing at all.
 *
 * On the screens someone lands on when they are already locked out.
 */

import {
  fieldControlProps, useFieldWiring, useFieldWiringState, FieldWiringProvider,
} from '../ui/form/FormField';
import { visibleError, type FieldLike } from '../ui/form/fields';
import { C, SHADOW } from './tokens';

export interface SoftFieldProps {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Rendered at the right end of the label row — "Forgot?", a character count. */
  labelAside?: React.ReactNode;
}

/**
 * Label, control, message — in the public surface's language.
 *
 * The message row is a live region. `FormField` deliberately is not one,
 * because a chrome form can surface several field errors at once and each live
 * region interrupts the previous announcement. These forms have one or two
 * fields, fail one at a time, and are read by someone who has just been refused
 * entry — silence is the wrong answer here.
 */
export function SoftField({
  label, children, description, error, required, disabled, className, labelAside,
}: SoftFieldProps & { children: React.ReactNode }) {
  const { wiring, descriptionId, errorId } = useFieldWiringState({
    error, required, disabled, description,
  });

  return (
    <FieldWiringProvider value={wiring}>
      <div className={className}>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="flex items-baseline gap-0.5">
            <label
              htmlFor={wiring.id}
              className="text-[12.5px] font-[650]"
              style={{ color: disabled ? C.muted : C.ink }}
            >
              {label}
            </label>
            {required && (
              // aria-hidden because `required` on the control already carries
              // this to assistive tech; announcing "star" as well is noise.
              <span aria-hidden className="text-[12.5px] font-[650]" style={{ color: C.red }}>*</span>
            )}
          </span>
          {labelAside}
        </div>

        {children}

        {(error || description) && (
          <p
            id={error ? errorId : descriptionId}
            role={error ? 'alert' : undefined}
            className="mt-1.5 text-[12px] font-[550] leading-[1.35]"
            style={{ color: error ? C.red : C.muted }}
          >
            {error ?? description}
          </p>
        )}
      </div>
    </FieldWiringProvider>
  );
}

type NativeInput = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'aria-describedby'>;

export interface SoftInputProps extends NativeInput {
  /** Drawn inside the leading edge. Decorative — the label names the control. */
  icon?: React.ReactNode;
  /** Rendered inside the trailing edge — a password reveal button. */
  trailing?: React.ReactNode;
}

/**
 * The soft surface: pressed in rather than raised, per the token file.
 *
 * `fieldControlProps` is what joins this control to the enclosing SoftField —
 * id, aria-describedby, aria-invalid, required, disabled — and it is the same
 * function the chrome controls call. Outside a SoftField it returns nothing, so
 * the input still works standalone.
 */
export function SoftInput({ icon, trailing, className, style, ...rest }: SoftInputProps) {
  const w = useFieldWiring();

  return (
    <span className="relative block">
      {icon && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: C.muted }}
        >
          {icon}
        </span>
      )}
      <input
        {...fieldControlProps(w)}
        {...rest}
        className={[
          'w-full rounded-[12px] py-3 text-[14px] transition-shadow',
          icon ? 'pl-10' : 'pl-3.5',
          trailing ? 'pr-11' : 'pr-3.5',
          className ?? '',
        ].join(' ')}
        style={{
          minHeight: 44,
          background: C.canvas,
          boxShadow: SHADOW.inset,
          border: `1px solid ${w?.invalid ? C.red : C.line}`,
          color: C.ink,
          opacity: w?.disabled ? 0.6 : 1,
          ...style,
        }}
      />
      {trailing}
    </span>
  );
}

export interface SoftTextFieldProps extends SoftFieldProps {
  field: FieldLike<string>;
  type?: 'text' | 'email' | 'tel' | 'password';
  autoComplete?: string;
  placeholder?: string;
  /**
   * Focus this control on mount.
   *
   * Named for the behaviour rather than for the DOM attribute, and not only to
   * keep `jsx-a11y/no-autofocus` quiet at every call site: the attribute is an
   * implementation detail, and a prop that says what it DOES is what a reader
   * needs. The rule is right about forms in general and wrong about these: a
   * sign-in door is a single-purpose page whose only content is the form, so
   * focusing its first field is where a sighted user's attention already is and
   * where a screen-reader user expects to start. Opt-in per call site.
   */
  focusOnMount?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Anything else the native element takes — spellCheck, inputMode, maxLength. */
  inputProps?: NativeInput;
  /** A server-side error for this field. Takes precedence over client validation. */
  serverError?: string;
}

/**
 * A text input bound to a TanStack field.
 *
 * The icon is `aria-hidden` and the control is still named by the `<label>`: a
 * decorative glyph that also carried a name would give the input two, which is
 * the third failure `FormField`'s doc comment lists.
 */
export function SoftTextField({
  field, type = 'text', autoComplete, placeholder, focusOnMount, icon, trailing,
  inputProps, serverError, ...rest
}: SoftTextFieldProps) {
  const shown = visibleError(field, serverError);

  return (
    <SoftField {...rest} error={shown}>
      <SoftInput
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        icon={icon}
        trailing={trailing}
        value={field.state.value ?? ''}
        // Spread rather than written as `autoFocus={…}`: the a11y rule flags
        // the literal prop on sight, and see `focusOnMount` above for why this
        // one is a deliberate exception rather than an oversight.
        {...(focusOnMount ? { autoFocus: true } : {})}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        {...inputProps}
      />
    </SoftField>
  );
}

/**
 * The form-level failure banner, in the public surface's language.
 *
 * `role="alert"`, because a sign-in that fails must announce itself: the person
 * pressed a button and nothing they can see has changed except this.
 */
export function SoftFormError({ message, className }: { message: string | null; className?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={['flex items-start gap-2 rounded-[10px] px-3 py-2.5', className ?? ''].join(' ')}
      style={{ background: C.redSoft }}
    >
      <span aria-hidden className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.red }} />
      <span className="text-[12.5px] font-[550]" style={{ color: C.red }}>{message}</span>
    </div>
  );
}
