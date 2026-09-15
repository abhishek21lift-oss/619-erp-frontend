'use client';

/**
 * The submit contract (§10) and the reset contract (§11).
 *
 * A thin layer over TanStack Form. Thin is the point: TanStack already owns
 * field state, dirtiness, touched-ness and async validation, and re-implementing
 * those is exactly the duplicate system §17 forbids. What it does *not* own is
 * the three things every form in this app has been getting wrong, so those are
 * what this adds and all it adds.
 *
 * ── 1. Raw in, parsed out ───────────────────────────────────────────────────
 *
 * Form state holds what the user typed — strings, because that is what controls
 * produce. The schema parses at the boundary and the handler receives
 * `z.output<TSchema>`: real numbers, `null` for absent, narrowed unions.
 *
 * That split is what makes `Number('') === 0` structurally impossible rather
 * than merely discouraged. A handler cannot see a raw string, so it cannot
 * coerce one.
 *
 * ── 2. A submit guard that is not the disabled attribute ────────────────────
 *
 * §10 says the disabled state is not sufficient, and it is right for reasons
 * that are easy to underrate. `disabled` is applied by React *after* the
 * current event finishes, so two clicks dispatched in the same frame — a
 * double-tap, a stuck mouse, an over-eager screen reader — both see an enabled
 * button. It is also absent entirely when a form submits on Enter.
 *
 * So the guard is a ref holding the in-flight promise, checked synchronously at
 * the top of submit. A second attempt returns the first one's promise rather
 * than starting work.
 *
 * This is **defence in depth and not a guarantee**: it cannot survive a reload,
 * a second tab, or a retry from a flaky connection. Only the server can make a
 * write idempotent, which is where the real protection has to live, and §10
 * says so.
 *
 * ── 3. Reset means reconstruct, never "clear" ───────────────────────────────
 *
 * §11's failures — edit A, cancel, edit B and see A's data — all come from
 * forms that mutate a shared state object and then try to undo the mutation.
 * `resetTo(values)` takes the authoritative record and rebuilds from it, so
 * what the previous entity left behind cannot matter. `formKey` gives callers a
 * remount key for the strongest version of the same idea.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useForm, useStore } from '@tanstack/react-form';
import type { z } from 'zod';
import { mapApiError, noErrors, type FormErrors } from './errors';

/** §10's states, as one value a UI can switch on. */
export type SubmitState =
  | 'idle'
  | 'dirty'
  | 'validating'
  | 'submitting'
  | 'success'
  | 'failure';

/**
 * The schemas this hook accepts.
 *
 * Constrained so the schema's *input* is an object keyed by field name — which
 * is what form state is. A bare `z.ZodType` would also admit `z.string()`,
 * whose input is not a form, and the mismatch would only surface deep inside
 * TanStack's types with an error that does not name the real mistake.
 */
export type FormSchema = z.ZodType<unknown, Record<string, unknown>>;

export interface UseAppFormOptions<TSchema extends FormSchema> {
  /** The schema. Its output type is what `onSubmit` receives. */
  schema: TSchema;
  /**
   * Initial raw values. Keys must match the schema's, and values are what a
   * control renders — usually strings, so `''` rather than `null` for an empty
   * text box, and `0` only where zero is genuinely the starting value.
   */
  defaultValues: Record<string, unknown>;
  /**
   * The write. Receives fully parsed, typed, normalized data.
   *
   * Throw to fail: whatever is thrown goes through `mapApiError`, so an
   * `ApiError` becomes a field or form error automatically.
   */
  onSubmit: (values: z.output<TSchema>) => Promise<void>;
  /** Runs only after `onSubmit` resolves. Close the modal here, not before. */
  onSuccess?: (values: z.output<TSchema>) => void;
  /** Exact server messages → field names. See `errors.ts`. */
  fieldHints?: Record<string, string>;
  /**
   * Keep the form mounted and populated after a successful submit.
   *
   * Off by default: the common case is a modal that closes. On for forms that
   * stay open and are edited repeatedly, such as an inline settings panel.
   */
  keepValuesOnSuccess?: boolean;
}

export interface AppFormErrorsApi {
  errors: FormErrors;
  /** Clear one field's server error — call when that field changes. */
  clearFieldError: (field: string) => void;
  /** Clear everything. */
  clearErrors: () => void;
}

/**
 * Wire a schema, a submit and the state machine together.
 *
 * Returns TanStack's form API plus the pieces this app needs on top of it.
 */
export function useAppForm<TSchema extends FormSchema>(options: UseAppFormOptions<TSchema>) {
  const {
    schema,
    defaultValues,
    onSubmit,
    onSuccess,
    fieldHints,
    keepValuesOnSuccess = false,
  } = options;

  const [errors, setErrors] = useState<FormErrors>(noErrors);
  const [succeeded, setSucceeded] = useState(false);

  /**
   * The in-flight submission.
   *
   * A ref rather than state because it is read synchronously inside the submit
   * handler: a state update would not be visible to a second click in the same
   * tick, which is the exact case this exists to stop.
   */
  const inFlight = useRef<Promise<void> | null>(null);

  /** Latest callbacks, so the submit closure never goes stale. */
  const latest = useRef({ onSubmit, onSuccess, fieldHints });
  latest.current = { onSubmit, onSuccess, fieldHints };

  const form = useForm({
    defaultValues,
    validators: {
      // Validation on submit rather than on change. Validating a money field
      // while it is being typed reports "must be a number" at the moment the
      // user has typed "1." — which is a correct statement about an
      // intermediate value and useless as feedback. Fields report on blur via
      // the field-level validator instead.
      //
      // The async slot, although these schemas are synchronous: the sync slot
      // is typed `RejectPromiseValidator`, which a `ZodType` cannot satisfy
      // because its parse signature permits a promise. Nothing here awaits, so
      // this costs a microtask and no behaviour.
      onSubmitAsync: schema,
    },
    onSubmit: async ({ value }) => {
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        // Should be unreachable: TanStack runs the same schema above and blocks
        // submit. Kept because "unreachable" and "cannot happen" are different,
        // and a silent pass-through here would send unvalidated data.
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        setErrors({
          formError: Object.keys(fieldErrors).length ? null : 'Some details are not valid.',
          fieldErrors,
          retryable: false,
          kind: 'validation',
        });
        throw new Error('validation');
      }

      setErrors(noErrors());

      try {
        await latest.current.onSubmit(parsed.data as z.output<TSchema>);
        setSucceeded(true);
        latest.current.onSuccess?.(parsed.data as z.output<TSchema>);
        if (!keepValuesOnSuccess) {
          // Deliberately not resetting here. The caller decides, because a
          // modal that unmounts does not need it and a panel that stays open
          // usually wants the saved values to remain visible.
        }
      } catch (err) {
        setErrors(mapApiError(err, { fieldHints: latest.current.fieldHints }));
        // Rethrow so TanStack records the attempt as failed rather than
        // successful — `isSubmitSuccessful` is load-bearing for the state below.
        throw err;
      }
    },
  });

  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
  const isValidating = useStore(form.store, (s) => s.isValidating);
  const isDirty = useStore(form.store, (s) => s.isDirty);
  const canSubmit = useStore(form.store, (s) => s.canSubmit);

  /**
   * Submit, guarded.
   *
   * Returns the in-flight promise for a duplicate attempt, so a caller that
   * awaits it still resolves when the real submission does rather than
   * resolving instantly and acting on a write that has not happened.
   */
  const submit = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;

    setSucceeded(false);
    const run = form
      .handleSubmit()
      .catch(() => {
        // Already recorded in `errors` by the handler above. Swallowed here
        // only so a rejected promise does not surface as unhandled — the
        // failure is visible in the UI, which is what §12 requires.
      })
      .finally(() => {
        inFlight.current = null;
      });

    inFlight.current = run;
    return run;
  }, [form]);

  /**
   * Rebuild the form from an authoritative record (§11).
   *
   * Clears errors and the success flag too: a stale "Saved" tick or a red
   * message from the previous entity is the same class of leak as stale values.
   */
  const resetTo = useCallback(
    (values: Record<string, unknown>) => {
      form.reset(values);
      setErrors(noErrors());
      setSucceeded(false);
    },
    [form],
  );

  const state: SubmitState = isSubmitting
    ? 'submitting'
    : isValidating
      ? 'validating'
      : errors.formError !== null || Object.keys(errors.fieldErrors).length > 0
        ? 'failure'
        : succeeded
          ? 'success'
          : isDirty
            ? 'dirty'
            : 'idle';

  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev.fieldErrors[field]) return prev;
      const next = { ...prev.fieldErrors };
      delete next[field];
      return { ...prev, fieldErrors: next };
    });
  }, []);

  const clearErrors = useCallback(() => setErrors(noErrors()), []);

  return useMemo(
    () => ({
      form,
      submit,
      resetTo,
      state,
      errors,
      clearFieldError,
      clearErrors,
      /** True only while a write is actually in flight. */
      isSubmitting,
      isDirty,
      /**
       * Whether the submit control should be enabled.
       *
       * Not `canSubmit && isDirty`: a form the user has not touched must still
       * be submittable when its defaults are already valid, and forcing a
       * pointless edit to enable Save is a worse bug than an extra no-op write.
       */
      canSubmit: canSubmit && !isSubmitting,
    }),
    [
      form,
      submit,
      resetTo,
      state,
      errors,
      clearFieldError,
      clearErrors,
      isSubmitting,
      isDirty,
      canSubmit,
    ],
  );
}

export type AppForm<TSchema extends FormSchema> = ReturnType<typeof useAppForm<TSchema>>;
