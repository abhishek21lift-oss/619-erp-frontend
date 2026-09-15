/**
 * The schema layer — §4 layer 2.
 *
 * One Zod primitive per business field *kind*, each pairing a normalizer from
 * `normalize.ts` with the range and shape rules that kind always has. A form
 * composes these; it does not write `z.number().min(0)` itself, because the
 * moment two forms do that independently they disagree, and the disagreement
 * shows up as a value one screen accepts and another rejects.
 *
 * Every primitive follows the same three-step shape:
 *
 *   raw (whatever the DOM gave us) → normalize → validate → typed output
 *
 * and every one distinguishes three outcomes rather than two:
 *
 *   absent        → `null`, or "is required" if the field is required
 *   unparseable   → "Enter a valid …"      (the user typed something wrong)
 *   out of range  → "… must be between …"  (the user typed something impossible)
 *
 * Collapsing absent and unparseable is what produces the "Required" message on
 * a field the user *did* fill in, which is the most confusing error a form can
 * show. They are kept apart here so no form has to remember to.
 *
 * Messages are written to be read by a gym owner, not a developer: they name
 * the field, say what is wrong, and imply the fix. No "Invalid input".
 */

import { z } from 'zod';
import {
  toNumberOrNull,
  toTextOrNull,
  toEmailOrNull,
  toPhoneOrNull,
  toMoneyOrNull,
  toDateOrNull,
  toPercentOrNull,
  toIntegerOrNull,
  toCodeOrNull,
} from './normalize';

/** Options shared by every primitive. Mirrors the §2 field contract. */
export interface FieldOptions {
  /** Used verbatim in messages, so it must read as the visible label does. */
  label: string;
  required?: boolean;
}

export interface NumericFieldOptions extends FieldOptions {
  min?: number;
  max?: number;
  /** Appended to range messages — 'kg', '%', '₹'. */
  unit?: string;
}

type Normalizer = (raw: unknown) => number | null | typeof NaN;

/**
 * Shared engine for every numeric primitive.
 *
 * Kept private and parameterised rather than copied per kind: the absent /
 * unparseable / out-of-range decision is identical for money, percentages,
 * counts and measurements, and it is the part that is subtle enough to be worth
 * having exactly once.
 */
function numeric(normalizer: Normalizer, opts: NumericFieldOptions) {
  const { label, required = false, min, max, unit } = opts;
  const suffix = unit ? ` ${unit}` : '';

  return z.unknown().transform((raw, ctx): number | null => {
    const n = normalizer(raw);

    if (typeof n === 'number' && Number.isNaN(n)) {
      ctx.addIssue({ code: 'custom', message: `${label} must be a number.` });
      return z.NEVER;
    }

    if (n === null) {
      if (required) {
        ctx.addIssue({ code: 'custom', message: `${label} is required.` });
        return z.NEVER;
      }
      return null;
    }

    if (min !== undefined && n < min) {
      ctx.addIssue({
        code: 'custom',
        message:
          min === 0
            ? `${label} cannot be negative.`
            : `${label} must be at least ${min}${suffix}.`,
      });
      return z.NEVER;
    }

    if (max !== undefined && n > max) {
      ctx.addIssue({ code: 'custom', message: `${label} cannot be more than ${max}${suffix}.` });
      return z.NEVER;
    }

    return n;
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * Numbers
 * ────────────────────────────────────────────────────────────────────────── */

/** A plain decimal number with explicit bounds. */
export const decimalField = (opts: NumericFieldOptions) => numeric(toNumberOrNull, opts);

/** A whole number. Fractions are rejected, never rounded. */
export const integerField = (opts: NumericFieldOptions) =>
  z.unknown().transform((raw, ctx): number | null => {
    // Separated from `numeric` so "2.5 sessions" reports the *fraction* as the
    // problem rather than the generic "must be a number", which would send the
    // user looking for a typo that is not there.
    const asNumber = toNumberOrNull(raw);
    if (typeof asNumber === 'number' && !Number.isNaN(asNumber) && !Number.isInteger(asNumber)) {
      ctx.addIssue({ code: 'custom', message: `${opts.label} must be a whole number.` });
      return z.NEVER;
    }
    const result = numeric(toIntegerOrNull, opts).safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: 'custom', message: issue.message });
      }
      return z.NEVER;
    }
    return result.data;
  });

/**
 * Money in rupees.
 *
 * Non-negative by default. A field that genuinely represents an outflow — a
 * refund, an adjustment — passes `min` explicitly, so allowing a negative
 * amount is always a visible decision at the call site rather than an accident
 * of omission.
 *
 * The ₹10,00,00,000 ceiling is a typo guard, not a business limit: it is far
 * above any real package price and far below the point where a stray keypress
 * turns 5000 into 5000000000.
 */
export const moneyField = (opts: NumericFieldOptions) =>
  numeric(toMoneyOrNull, { min: 0, max: 100_000_000, unit: '₹', ...opts });

/** A percentage. 0–100 unless a caller narrows it further. */
export const percentField = (opts: NumericFieldOptions) =>
  numeric(toPercentOrNull, { min: 0, max: 100, unit: '%', ...opts });

/* ──────────────────────────────────────────────────────────────────────────
 * Text
 * ────────────────────────────────────────────────────────────────────────── */

export interface TextFieldOptions extends FieldOptions {
  minLength?: number;
  maxLength?: number;
  /** Rejects when the pattern does NOT match. */
  pattern?: { test: RegExp; message: string };
}

export const textField = (opts: TextFieldOptions) => {
  const { label, required = false, minLength, maxLength, pattern } = opts;

  return z.unknown().transform((raw, ctx): string | null => {
    const s = toTextOrNull(raw);

    if (s === null) {
      if (required) {
        ctx.addIssue({ code: 'custom', message: `${label} is required.` });
        return z.NEVER;
      }
      return null;
    }

    if (minLength !== undefined && s.length < minLength) {
      ctx.addIssue({
        code: 'custom',
        message: `${label} must be at least ${minLength} characters.`,
      });
      return z.NEVER;
    }

    if (maxLength !== undefined && s.length > maxLength) {
      // Reports the overshoot, because "cannot be more than 500 characters" on
      // a box the user cannot count is not actionable on its own.
      ctx.addIssue({
        code: 'custom',
        message: `${label} cannot be more than ${maxLength} characters (currently ${s.length}).`,
      });
      return z.NEVER;
    }

    if (pattern && !pattern.test.test(s)) {
      ctx.addIssue({ code: 'custom', message: pattern.message });
      return z.NEVER;
    }

    return s;
  });
};

/**
 * An email address.
 *
 * Deliberately permissive: one `@`, a dot-bearing domain, no whitespace. The
 * RFC 5322 grammar accepts addresses no provider issues and rejecting a real
 * address is far more damaging than accepting a fake one — the confirmation
 * mail is what actually proves an address, and that happens server-side.
 */
export const emailField = (opts: FieldOptions) => {
  const { label, required = false } = opts;

  return z.unknown().transform((raw, ctx): string | null => {
    const s = toEmailOrNull(raw);

    if (s === null) {
      if (required) {
        ctx.addIssue({ code: 'custom', message: `${label} is required.` });
        return z.NEVER;
      }
      return null;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) {
      ctx.addIssue({ code: 'custom', message: `${label} must be a valid email address.` });
      return z.NEVER;
    }

    return s;
  });
};

/**
 * An Indian mobile number.
 *
 * Ten digits starting 6–9, which is the whole of the allocated mobile range.
 * Landlines are not accepted because every consumer of this field — WhatsApp,
 * OTP, the member app — is mobile-only, and storing a landline means a member
 * who can never be reached and no indication of why.
 */
export const phoneField = (opts: FieldOptions) => {
  const { label, required = false } = opts;

  return z.unknown().transform((raw, ctx): string | null => {
    const s = toPhoneOrNull(raw);

    if (s === null) {
      if (required) {
        ctx.addIssue({ code: 'custom', message: `${label} is required.` });
        return z.NEVER;
      }
      return null;
    }

    if (!/^[6-9]\d{9}$/.test(s)) {
      ctx.addIssue({
        code: 'custom',
        message: `${label} must be a 10-digit Indian mobile number.`,
      });
      return z.NEVER;
    }

    return s;
  });
};

/** A coupon/offer code: uppercase alphanumerics, no spaces. */
export const codeField = (opts: TextFieldOptions) => {
  const { label, required = false, minLength = 3, maxLength = 32 } = opts;

  return z.unknown().transform((raw, ctx): string | null => {
    const s = toCodeOrNull(raw);

    if (s === null) {
      if (required) {
        ctx.addIssue({ code: 'custom', message: `${label} is required.` });
        return z.NEVER;
      }
      return null;
    }

    if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(s)) {
      ctx.addIssue({
        code: 'custom',
        message: `${label} may use letters, numbers, hyphens and underscores only.`,
      });
      return z.NEVER;
    }

    if (s.length < minLength || s.length > maxLength) {
      ctx.addIssue({
        code: 'custom',
        message: `${label} must be ${minLength}–${maxLength} characters.`,
      });
      return z.NEVER;
    }

    return s;
  });
};

/* ──────────────────────────────────────────────────────────────────────────
 * Dates
 * ────────────────────────────────────────────────────────────────────────── */

export interface DateFieldOptions extends FieldOptions {
  /** Inclusive `YYYY-MM-DD` bounds. */
  min?: string;
  max?: string;
}

/**
 * A calendar date as `YYYY-MM-DD`.
 *
 * Validated by reconstruction rather than by `new Date(s)`: the Date
 * constructor accepts 2026-02-31 and silently rolls it to 3 March, so a date
 * that does not exist would pass and then mean something the user never chose.
 * Comparisons stay on the string because ISO dates sort lexicographically,
 * which sidesteps timezones entirely.
 */
export const dateField = (opts: DateFieldOptions) => {
  const { label, required = false, min, max } = opts;

  return z.unknown().transform((raw, ctx): string | null => {
    const s = toDateOrNull(raw);

    if (s === null) {
      if (required) {
        ctx.addIssue({ code: 'custom', message: `${label} is required.` });
        return z.NEVER;
      }
      return null;
    }

    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) {
      ctx.addIssue({ code: 'custom', message: `${label} must be a valid date.` });
      return z.NEVER;
    }

    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const probe = new Date(Date.UTC(y, mo - 1, d));
    const real =
      probe.getUTCFullYear() === y &&
      probe.getUTCMonth() === mo - 1 &&
      probe.getUTCDate() === d;

    if (!real) {
      ctx.addIssue({ code: 'custom', message: `${label} is not a real date.` });
      return z.NEVER;
    }

    if (min && s < min) {
      ctx.addIssue({ code: 'custom', message: `${label} cannot be before ${min}.` });
      return z.NEVER;
    }
    if (max && s > max) {
      ctx.addIssue({ code: 'custom', message: `${label} cannot be after ${max}.` });
      return z.NEVER;
    }

    return s;
  });
};

/* ──────────────────────────────────────────────────────────────────────────
 * Choice
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * A value from a fixed set.
 *
 * Takes the options as a readonly tuple so the output type is the union of
 * them, not `string` — which is what makes a mistyped branch in a
 * `switch (form.type)` a compile error instead of a runtime surprise.
 *
 * This is also the guard against the `as any` casts the audit found on select
 * handlers: `e.target.value as 'percent'|'flat'|'free'` asserts a fact about a
 * string the DOM does not guarantee, and a tampered `<option>` or a renamed
 * enum makes the assertion false with no error anywhere.
 */
export const enumField = <const T extends readonly [string, ...string[]]>(
  options: T,
  opts: FieldOptions,
) => {
  const { label, required = false } = opts;
  const allowed = new Set<string>(options);

  return z.unknown().transform((raw, ctx): T[number] | null => {
    const s = toTextOrNull(raw);

    if (s === null) {
      if (required) {
        ctx.addIssue({ code: 'custom', message: `${label} is required.` });
        return z.NEVER;
      }
      return null;
    }

    if (!allowed.has(s)) {
      ctx.addIssue({ code: 'custom', message: `${label} is not a valid choice.` });
      return z.NEVER;
    }

    return s as T[number];
  });
};

/** A checkbox or switch. Anything absent reads as `false`, never as invalid. */
export const booleanField = () =>
  z.unknown().transform((raw): boolean => {
    if (typeof raw === 'boolean') return raw;
    if (raw === 'true' || raw === 'on' || raw === 1 || raw === '1') return true;
    return false;
  });

/**
 * A calendar month as `YYYY-MM`.
 *
 * `<input type="month">` produces this, and the commissions screen is the only
 * place it appears — a payout run is for a month, not a day, and storing the
 * 1st of the month to represent it invites someone to compare it against a real
 * date and be wrong by up to 30 days.
 *
 * Validated by range rather than by reconstruction: unlike a date, every
 * `YYYY-MM` in 01–12 exists, so there is no equivalent of 31 February to catch.
 */
export interface MonthFieldOptions extends FieldOptions {
  /** Inclusive `YYYY-MM` bounds. */
  min?: string;
  max?: string;
}

export const monthField = (opts: MonthFieldOptions) => {
  const { label, required = false, min, max } = opts;

  return z.unknown().transform((raw, ctx): string | null => {
    const s = toTextOrNull(raw);

    if (s === null) {
      if (required) {
        ctx.addIssue({ code: 'custom', message: `${label} is required.` });
        return z.NEVER;
      }
      return null;
    }

    // Accept a full date too: an API that returns `2026-03-01` for a month is
    // describing the same month, and rejecting it would make the edit form
    // unable to load its own saved value.
    const m = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(s);
    if (!m) {
      ctx.addIssue({ code: 'custom', message: `${label} must be a month (YYYY-MM).` });
      return z.NEVER;
    }

    const month = Number(m[2]);
    if (month < 1 || month > 12) {
      ctx.addIssue({ code: 'custom', message: `${label} is not a real month.` });
      return z.NEVER;
    }

    const normalised = `${m[1]}-${m[2]}`;

    // ISO months compare correctly as strings, so no parsing and no timezone.
    if (min && normalised < min) {
      ctx.addIssue({ code: 'custom', message: `${label} cannot be before ${min}.` });
      return z.NEVER;
    }
    if (max && normalised > max) {
      ctx.addIssue({ code: 'custom', message: `${label} cannot be after ${max}.` });
      return z.NEVER;
    }

    return normalised;
  });
};
