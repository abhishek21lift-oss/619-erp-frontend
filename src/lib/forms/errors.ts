/**
 * The error contract — §12.
 *
 * One translation from "something went wrong" into something a studio owner can
 * act on, so that every form reports failure the same way and no form invents
 * its own vocabulary.
 *
 * ── The field-attribution ceiling, stated plainly ────────────────────────────
 *
 * §12 asks that server validation errors be mapped back to the field that
 * caused them "whenever possible". Right now that is *rarely* possible, and the
 * reason is in the backend rather than here: all 82 of its `VALIDATION`
 * responses have the shape
 *
 *     { error: { code: 'VALIDATION', message: 'discount_value must be …' } }
 *
 * — a human sentence and no machine-readable field name. There is nothing on
 * the wire to key on.
 *
 * So this module does three things, in order of how much it trusts them:
 *
 *   1. reads a `field` (or `path`) key if the response carries one. None do
 *      today; this is the path that works the moment one does, and it is why
 *      adding that key server-side is the single highest-value change for form
 *      error quality;
 *   2. consults a per-form `fieldHints` map — an explicit, reviewed list of
 *      "if the server says this, blame that field" for the specific messages a
 *      given endpoint is known to produce;
 *   3. failing both, reports it as a **form-level** error with the server's own
 *      sentence, which is always correct even when unattributed.
 *
 * What it never does is guess by fuzzy-matching a field name inside the
 * message. A wrong attribution is worse than none: it puts a red message under
 * a field that is fine, and the user "fixes" a correct value.
 *
 * ── On never swallowing ─────────────────────────────────────────────────────
 *
 * Every branch produces a message. There is no path through this module that
 * returns an empty error for a failed submit, because a form that fails
 * silently is indistinguishable from one that succeeded — the defect this
 * codebase has already been bitten by on two revenue screens.
 */

import { ApiError } from '../http';

/** The shape every form reports failure in. */
export interface FormErrors {
  /** Shown once, above the actions. Always present when a submit failed. */
  formError: string | null;
  /** Keyed by field name, shown under that field. */
  fieldErrors: Record<string, string>;
  /**
   * Whether trying again, unchanged, could plausibly work. Drives whether the
   * UI offers "Retry" or asks the user to change something first.
   */
  retryable: boolean;
  /** Machine-readable for tests and telemetry; never shown to a user. */
  kind: FormErrorKind;
}

export type FormErrorKind =
  | 'validation'
  | 'auth'
  | 'permission'
  | 'notFound'
  | 'conflict'
  | 'rateLimit'
  | 'network'
  | 'timeout'
  | 'server'
  | 'unknown';

export interface MapApiErrorOptions {
  /**
   * Exact server messages mapped to the field they belong to.
   *
   * Exact rather than fuzzy, and reviewed per form: `{ 'discount_value must be
   * greater than 0': 'value' }`. A message that changes server-side stops
   * matching and degrades to a form-level error — which is visibly imperfect
   * rather than silently wrong.
   */
  fieldHints?: Record<string, string>;
  /** Fallback when the error carries no usable message at all. */
  fallback?: string;
}

const EMPTY_FIELD_ERRORS: Record<string, string> = Object.freeze({});

function formOnly(message: string, kind: FormErrorKind, retryable: boolean): FormErrors {
  return { formError: message, fieldErrors: { ...EMPTY_FIELD_ERRORS }, retryable, kind };
}

/**
 * Pull a field name out of a response body, if the server bothered to say.
 *
 * Handles the three shapes worth supporting: a `field` beside the message, a
 * `path` array as Zod-style validators emit, and a `fieldErrors` object keyed
 * by name. Unknown shapes return nothing rather than a guess.
 */
function fieldErrorsFromPayload(payload: unknown): Record<string, string> | null {
  if (!payload || typeof payload !== 'object') return null;

  const root = payload as Record<string, unknown>;
  const err = (root.error && typeof root.error === 'object' ? root.error : root) as Record<
    string,
    unknown
  >;

  const bag = err.fieldErrors ?? root.fieldErrors;
  if (bag && typeof bag === 'object' && !Array.isArray(bag)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(bag as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim() !== '') out[k] = v;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  const message = typeof err.message === 'string' ? err.message : null;
  if (!message) return null;

  if (typeof err.field === 'string' && err.field !== '') {
    return { [err.field]: message };
  }

  if (Array.isArray(err.path) && err.path.length > 0) {
    const last = err.path[err.path.length - 1];
    if (typeof last === 'string' && last !== '') return { [last]: message };
  }

  return null;
}

/**
 * Translate any thrown value into the form error contract.
 *
 * Takes `unknown` rather than `Error` because that is what a `catch` binding
 * actually is, and forcing every call site to narrow first is how a non-Error
 * rejection ends up rendered as "[object Object]".
 */
export function mapApiError(error: unknown, opts: MapApiErrorOptions = {}): FormErrors {
  const fallback = opts.fallback ?? 'Something went wrong. Please try again.';

  // ── Not an ApiError: network, abort, or a genuine bug ────────────────────
  if (!(error instanceof ApiError)) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return formOnly('The request was cancelled.', 'timeout', true);
    }
    if (error instanceof TypeError) {
      // fetch() rejects with TypeError when the request never reached a server.
      return formOnly(
        'Could not reach the server. Check your connection and try again.',
        'network',
        true,
      );
    }
    const message = error instanceof Error && error.message ? error.message : fallback;
    return formOnly(message, 'unknown', true);
  }

  const { status, code, payload } = error;
  const serverMessage = error.message && !/^HTTP \d+$/.test(error.message) ? error.message : null;

  // ── 400 / 422: the server rejected the content ───────────────────────────
  if (status === 400 || status === 422) {
    const fromPayload = fieldErrorsFromPayload(payload);
    if (fromPayload) {
      return {
        formError: null,
        fieldErrors: fromPayload,
        retryable: false,
        kind: 'validation',
      };
    }

    if (serverMessage && opts.fieldHints) {
      const hinted = opts.fieldHints[serverMessage];
      if (hinted) {
        return {
          formError: null,
          fieldErrors: { [hinted]: serverMessage },
          retryable: false,
          kind: 'validation',
        };
      }
    }

    return formOnly(serverMessage ?? 'Some of the details are not valid.', 'validation', false);
  }

  if (status === 401) {
    return formOnly('Your session has expired. Sign in again to continue.', 'auth', false);
  }

  if (status === 403) {
    return formOnly(
      serverMessage ?? 'You do not have permission to do this.',
      'permission',
      false,
    );
  }

  if (status === 404) {
    return formOnly(
      serverMessage ?? 'That record no longer exists. It may have been deleted.',
      'notFound',
      false,
    );
  }

  // ── 409: someone else changed it first ───────────────────────────────────
  if (status === 409 || code === 'CONCURRENT_UPDATE') {
    return formOnly(
      serverMessage ??
        'Someone else changed this while you were editing. Reload to see the current version.',
      'conflict',
      false,
    );
  }

  if (status === 429) {
    return formOnly('Too many attempts. Wait a moment and try again.', 'rateLimit', true);
  }

  if (status === 408 || status === 504) {
    return formOnly('The server took too long to respond. Try again.', 'timeout', true);
  }

  if (status >= 500) {
    // Deliberately not the server's message: a 5xx body can carry a stack or a
    // SQL error, and §14 forbids putting either in front of a user.
    return formOnly('The server had a problem saving this. Try again in a moment.', 'server', true);
  }

  return formOnly(serverMessage ?? fallback, 'unknown', true);
}

/** No errors. The state a form resets to. */
export function noErrors(): FormErrors {
  return { formError: null, fieldErrors: {}, retryable: false, kind: 'unknown' };
}

/** Whether anything is wrong — used to gate submit and to render the banner. */
export function hasErrors(e: FormErrors): boolean {
  return e.formError !== null || Object.keys(e.fieldErrors).length > 0;
}

/**
 * The one thing most call sites actually want: a sentence to put in a toast.
 *
 * Screens that report failure in a banner or a toast have nowhere to hang a
 * field error, so they need `FormErrors` collapsed to a single string. Written
 * out by hand that is
 *
 *     mapApiError(err, { fallback: MSG }).formError ?? MSG
 *
 * which repeated at two dozen sites, and which is subtly wrong: `formError` is
 * null exactly when the mapper managed to ATTRIBUTE the failure to a field, so
 * the hand-written version throws away the server's specific sentence in the
 * one case where it is most specific, and shows the generic fallback instead.
 *
 * This prefers, in order: the form-level message, the first field message, the
 * caller's fallback. It can never return an empty string, because a failed
 * submit that renders nothing is indistinguishable from one that worked.
 */
export function errorMessage(error: unknown, fallback: string): string {
  const mapped = mapApiError(error, { fallback });
  if (mapped.formError) return mapped.formError;
  const first = Object.values(mapped.fieldErrors)[0];
  return first ?? fallback;
}

/**
 * A sign-in failure.
 *
 * Separate from `mapApiError` because the generic mapper's 401 message —
 * "Your session has expired. Sign in again to continue." — is correct
 * everywhere EXCEPT the screen you sign in on, where it tells someone whose
 * password was wrong to do the thing they are already doing.
 *
 * On a login attempt a 401 or 403 means the credentials did not check out, and
 * that is all it may mean: the message never distinguishes "no such account"
 * from "wrong password", because that difference is an account-enumeration
 * oracle. Everything else falls through to the shared mapper, so a 5xx still
 * cannot put a stack in front of anyone.
 */
export function mapSignInError(error: unknown, fallback: string): string {
  const mapped = mapApiError(error, { fallback });
  if (mapped.kind === 'auth' || mapped.kind === 'permission') return fallback;
  return mapped.formError ?? fallback;
}
