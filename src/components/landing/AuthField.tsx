'use client';

/**
 * The signed-out text field for screens that own their state directly.
 *
 * A thin composition of the public surface's design-system pair — SoftField
 * (label, message row, wiring) around SoftInput (the well) — so it carries the
 * same id / aria-describedby / aria-invalid contract as every other soft field
 * and the same look as password recovery, which binds SoftTextField to a form.
 *
 * Why not SoftTextField here: the sign-in and Start Free screens are not
 * useAppForm forms. Sign-in has a 2FA step that re-submits the same
 * credentials, a passkey ceremony and a double-submit guard that a generic
 * form hook would hide; both keep their own `touched` rules. This takes a plain
 * value and an error string instead of a bound field.
 */

import type { ReactNode, Ref } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { SoftField, SoftInput, type SoftInputProps } from './SoftField';
import { C } from './tokens';

export type AuthInputProps = Omit<SoftInputProps, 'icon' | 'trailing' | 'className'> & {
  label: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  /** Inside the trailing edge — a password reveal button. */
  trailing?: ReactNode;
  /** Right-aligned beside the label — a "Forgot password?" link. */
  labelAside?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
};

export default function AuthInput({
  label, icon: Icon, error, hint, trailing, labelAside, inputRef, className, disabled, ...rest
}: AuthInputProps) {
  return (
    <SoftField
      label={label}
      error={error || undefined}
      description={hint}
      labelAside={labelAside}
      disabled={disabled}
      className={className}
    >
      <SoftInput
        {...rest}
        ref={inputRef}
        disabled={disabled}
        icon={Icon ? <Icon size={18} /> : undefined}
        trailing={trailing ? <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span> : undefined}
      />
    </SoftField>
  );
}

/** The eye button that reveals a password field. */
export function RevealButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      aria-pressed={shown}
      className="grid h-10 w-10 place-items-center rounded-[10px] transition-colors hover:bg-[rgba(31,42,61,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,103,224,0.35)]"
      style={{ color: C.muted }}
    >
      {shown ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}
