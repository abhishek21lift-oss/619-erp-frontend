'use client';

/**
 * The form-level error surface — §12.
 *
 * One banner, one place, one shape. It exists so that "the submit failed" can
 * never be reported by a `toast` that has already faded, by a `console.error`
 * nobody reads, or — the case this codebase has actually shipped — by nothing
 * at all.
 *
 * ── Why `role="alert"` here and not on a field error ────────────────────────
 *
 * `FormField` deliberately does not use `role="alert"` on its message: several
 * field errors can appear at once on submit, and each live region would
 * interrupt the previous announcement, so a screen-reader user hears the last
 * one and misses the rest. `aria-describedby` reads the message when focus
 * reaches the field, which is when it is useful.
 *
 * This banner is the opposite case. It is exactly one message, it appears in
 * response to a deliberate action, and the user needs to know without moving
 * focus. So it is a live region, and it is the only one on the form.
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import type { FormErrors } from '../../../lib/forms/errors';

export interface FormErrorBannerProps {
  errors: FormErrors;
  /** Offered only when the error is retryable. */
  onRetry?: () => void;
  className?: string;
}

export function FormErrorBanner({ errors, onRetry, className }: FormErrorBannerProps) {
  const fieldCount = Object.keys(errors.fieldErrors).length;

  // Nothing to say. Rendering an empty banner would reserve space for a message
  // that is not there, and on a modal that is the difference between fitting
  // and scrolling.
  if (!errors.formError && fieldCount === 0) return null;

  // When the failure is per-field, the fields say it themselves and are where
  // the user must go. The banner only points there, rather than repeating each
  // message and making the same problem appear twice.
  const message =
    errors.formError ??
    (fieldCount === 1
      ? 'One field needs attention — see the message below it.'
      : `${fieldCount} fields need attention — see the messages below them.`);

  return (
    <div
      role="alert"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--danger-bg)',
        border: '1px solid var(--danger-border)',
      }}
    >
      <AlertCircle
        size={15}
        aria-hidden
        style={{ color: 'var(--danger-text)', flexShrink: 0, marginTop: 1 }}
      />
      <p
        style={{
          flex: 1,
          margin: 0,
          fontSize: 12.5,
          lineHeight: 1.4,
          fontWeight: 550,
          color: 'var(--danger-text)',
        }}
      >
        {message}
      </p>
      {errors.retryable && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
            padding: '4px 10px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--danger-border)',
            background: 'transparent',
            color: 'var(--danger-text)',
            fontSize: 11.5,
            fontWeight: 650,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={11} aria-hidden />
          Retry
        </button>
      )}
    </div>
  );
}

export interface SubmitStatusProps {
  /** Announced politely so it does not interrupt anything in progress. */
  isSubmitting: boolean;
  submittingLabel?: string;
}

/**
 * A polite live region for submit progress.
 *
 * Visually hidden: the button already shows its own spinner, and a sighted user
 * does not need the same fact twice. A screen-reader user gets nothing from a
 * spinner, so this is how they learn the form is working rather than stuck.
 */
export function SubmitStatus({ isSubmitting, submittingLabel = 'Saving…' }: SubmitStatusProps) {
  return (
    <span aria-live="polite" className="sr-only">
      {isSubmitting ? submittingLabel : ''}
    </span>
  );
}
