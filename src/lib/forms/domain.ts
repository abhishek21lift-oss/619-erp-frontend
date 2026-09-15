/**
 * The domain layer — §4 layer 3.
 *
 * Layer 2 asks "is this a number in range?". This layer asks "is this a number
 * a human body, a rupee ledger or a calendar could actually produce?".
 *
 * ── Why this cannot be HTML `min`/`max` ──────────────────────────────────────
 *
 * §4 rules out relying on the attributes, and the reason is specific rather
 * than stylistic. `min`/`max` on `<input type="number">`:
 *
 *   · are enforced only by the browser's own submit validation, so any form
 *     that submits through an `onClick` handler — which is most of this app —
 *     never consults them at all;
 *   · are bypassed entirely by `setValue`, paste, autofill and devtools;
 *   · do not exist for `<select>`, and are advisory on mobile keyboards;
 *   · say nothing about *pairs* of fields, which is where the real errors are:
 *     an end date before a start date is two individually valid dates.
 *
 * ── On the ranges ───────────────────────────────────────────────────────────
 *
 * These are **plausibility** bounds, not clinical ones. The job is to stop a
 * keystroke slip — 700 kg for 70, a 1902 birth date — from reaching a scoring
 * algorithm that will faithfully compute a BMI of 214 and file it as a reading.
 * They are set wide enough that no real member is ever rejected: the cost of a
 * false rejection (a trainer who cannot record a real client) is much higher
 * than the cost of a false accept (a number a human will notice).
 *
 * They do **not** change any scoring algorithm, and cannot: the calculation
 * libraries take whatever they are given and never clamp. This layer sits in
 * front of them, which is what §6 asks for — impossible values stop before
 * scoring, and scoring itself is untouched.
 */

import { z } from 'zod';
import {
  decimalField,
  integerField,
  moneyField,
  percentField,
  dateField,
  textField,
  type FieldOptions,
  type NumericFieldOptions,
  type TextFieldOptions,
} from './primitives';

/* ──────────────────────────────────────────────────────────────────────────
 * Body measurements
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Body weight in kilograms.
 *
 * 20–350. The lower bound admits children, who appear in family memberships;
 * the upper is above the heaviest recorded human, so it can only ever catch a
 * typo. A trailing-zero slip (70 → 700) is the specific error this exists for,
 * and it is common enough on a phone keypad to be worth a rule.
 */
export const weightKgField = (opts: Partial<FieldOptions> = {}) =>
  decimalField({ label: 'Weight', min: 20, max: 350, unit: 'kg', ...opts } as NumericFieldOptions);

/** Height in centimetres. 50–250 — birth length to above the tallest human. */
export const heightCmField = (opts: Partial<FieldOptions> = {}) =>
  decimalField({ label: 'Height', min: 50, max: 250, unit: 'cm', ...opts } as NumericFieldOptions);

/**
 * Age in years. 5–120.
 *
 * Under-5s are not gym members, and the upper bound is a typo guard. Where a
 * date of birth is available prefer `dobField` and derive the age — a stored
 * age is wrong within a year of being written, and two records that disagree
 * about someone's age is the kind of contradiction the product should not
 * create for itself.
 */
export const ageField = (opts: Partial<FieldOptions> = {}) =>
  integerField({ label: 'Age', min: 5, max: 120, unit: 'years', ...opts } as NumericFieldOptions);

/** Body-fat percentage. 3–70 — below 3 is not survivable, above 70 unrecorded. */
export const bodyFatPctField = (opts: Partial<FieldOptions> = {}) =>
  decimalField({ label: 'Body fat', min: 3, max: 70, unit: '%', ...opts } as NumericFieldOptions);

/** A body-part circumference in centimetres. */
export const circumferenceCmField = (opts: Partial<FieldOptions> = {}) =>
  decimalField({ label: 'Measurement', min: 10, max: 300, unit: 'cm', ...opts } as NumericFieldOptions);

/* ──────────────────────────────────────────────────────────────────────────
 * Training
 * ────────────────────────────────────────────────────────────────────────── */

/** Sessions per week. 1–14 allows two-a-days without admitting 70. */
export const trainingFrequencyField = (opts: Partial<FieldOptions> = {}) =>
  integerField({
    label: 'Training days per week',
    min: 1,
    max: 14,
    ...opts,
  } as NumericFieldOptions);

/** Programme duration in weeks. 1–104. */
export const programmeWeeksField = (opts: Partial<FieldOptions> = {}) =>
  integerField({ label: 'Duration', min: 1, max: 104, unit: 'weeks', ...opts } as NumericFieldOptions);

/** Repetitions in a set. 1–100. */
export const repsField = (opts: Partial<FieldOptions> = {}) =>
  integerField({ label: 'Reps', min: 1, max: 100, ...opts } as NumericFieldOptions);

/** Sets in an exercise. 1–20. */
export const setsField = (opts: Partial<FieldOptions> = {}) =>
  integerField({ label: 'Sets', min: 1, max: 20, ...opts } as NumericFieldOptions);

/**
 * A lifted load in kilograms. 0–500.
 *
 * Zero is allowed and meaningful: bodyweight and assisted movements are logged
 * with no external load, and rejecting 0 would push trainers to type 1 —
 * turning a true reading into a false one to satisfy a validator.
 */
export const loadKgField = (opts: Partial<FieldOptions> = {}) =>
  decimalField({ label: 'Weight', min: 0, max: 500, unit: 'kg', ...opts } as NumericFieldOptions);

/** Daily calorie target. 500–10000. */
export const caloriesField = (opts: Partial<FieldOptions> = {}) =>
  integerField({ label: 'Calories', min: 500, max: 10_000, unit: 'kcal', ...opts } as NumericFieldOptions);

/** A macronutrient in grams. 0–2000. */
export const macroGramsField = (opts: Partial<FieldOptions> = {}) =>
  decimalField({ label: 'Amount', min: 0, max: 2000, unit: 'g', ...opts } as NumericFieldOptions);

/**
 * An assessment score, 0–100.
 *
 * Every scoring library in the app emits on this scale, so a stored score
 * outside it did not come from scoring and must not be compared against one
 * that did.
 */
export const assessmentScoreField = (opts: Partial<FieldOptions> = {}) =>
  decimalField({ label: 'Score', min: 0, max: 100, ...opts } as NumericFieldOptions);

/* ──────────────────────────────────────────────────────────────────────────
 * Money
 * ────────────────────────────────────────────────────────────────────────── */

/** A package or plan price. Non-negative; free plans are a real product. */
export const priceField = (opts: Partial<FieldOptions> = {}) =>
  moneyField({ label: 'Price', min: 0, ...opts } as NumericFieldOptions);

/**
 * An amount actually paid. Strictly positive.
 *
 * A ₹0 payment is not a payment, and recording one corrupts every collection
 * total that counts rows. A waiver belongs in the discount/offer path, which is
 * where it can be reported as a waiver.
 */
export const paymentAmountField = (opts: Partial<FieldOptions> = {}) =>
  moneyField({ label: 'Amount', min: 0.01, ...opts } as NumericFieldOptions);

/**
 * GST rate.
 *
 * Constrained to the statutory slabs rather than 0–100, because GST is not a
 * free percentage — a "14%" invoice is not a slightly wrong tax, it is an
 * invalid tax document. Listed as numbers so the message can name them.
 */
export const GST_SLABS = [0, 5, 12, 18, 28] as const;

export const gstRateField = (opts: Partial<FieldOptions> = {}) => {
  const label = opts.label ?? 'GST rate';
  const required = opts.required ?? false;

  return percentField({ label, required }).superRefine((value, ctx) => {
    if (value === null) return;
    if (!(GST_SLABS as readonly number[]).includes(value)) {
      ctx.addIssue({
        code: 'custom',
        message: `${label} must be one of ${GST_SLABS.join('%, ')}%.`,
      });
    }
  });
};

/**
 * A UPI transaction reference (UTR).
 *
 * 12 to 16 digits. NPCI issues 12; several PSP apps surface a longer internal
 * reference, so the window is deliberately wider than the spec's minimum rather
 * than rejecting references a member can genuinely see on their screen. The
 * same window is written out in `routes/upi-payments.js` and in a CHECK
 * constraint, and this is the third place it is stated — kept here rather than
 * inline at each call site so the three cannot drift apart silently.
 *
 * A STRING, never a number: a UTR can begin with a zero, and parsing one as a
 * number loses it.
 */
export const utrField = (opts: Partial<TextFieldOptions> = {}) =>
  textField({
    label: 'UPI reference',
    minLength: 12,
    maxLength: 16,
    pattern: {
      test: /^[0-9]{12,16}$/,
      message: `${opts.label ?? 'UPI reference'} must be 12 to 16 digits.`,
    },
    ...opts,
  } as TextFieldOptions);

/** A trainer commission percentage. 0–100. */
export const commissionPctField = (opts: Partial<FieldOptions> = {}) =>
  percentField({ label: 'Commission', min: 0, max: 100, ...opts } as NumericFieldOptions);

/** Bonus days granted on a membership. 0–365. */
export const bonusDaysField = (opts: Partial<FieldOptions> = {}) =>
  integerField({ label: 'Bonus days', min: 0, max: 365, unit: 'days', ...opts } as NumericFieldOptions);

/* ──────────────────────────────────────────────────────────────────────────
 * Dates
 * ────────────────────────────────────────────────────────────────────────── */

/** Today as `YYYY-MM-DD` in the viewer's own calendar. */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** A date of birth: a real past date within 120 years. */
export const dobField = (opts: Partial<FieldOptions> = {}) => {
  const today = new Date();
  const floor = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
  return dateField({
    label: 'Date of birth',
    min: `${floor.getFullYear()}-${String(floor.getMonth() + 1).padStart(2, '0')}-${String(floor.getDate()).padStart(2, '0')}`,
    max: todayISO(),
    ...opts,
  });
};

/**
 * A cross-field rule: `end` must not precede `start`.
 *
 * Attached with `.superRefine` on the whole object rather than on either field,
 * because neither field is wrong on its own — the pair is. The issue is
 * reported on the **end** field: that is the one the user chose second and the
 * one they will change, and an error on the start date sends them to edit a
 * value that is very likely correct.
 *
 * `allowSameDay` is on by default: a single-day leave, a one-day offer and a
 * same-day membership are all real, and forbidding them is a rule nobody asked
 * for.
 */
export function refineDateOrder<T extends Record<string, unknown>>(
  startKey: keyof T & string,
  endKey: keyof T & string,
  opts: { startLabel: string; endLabel: string; allowSameDay?: boolean } = {
    startLabel: 'Start date',
    endLabel: 'End date',
  },
) {
  const { startLabel, endLabel, allowSameDay = true } = opts;

  return (value: T, ctx: z.RefinementCtx): void => {
    const start = value[startKey];
    const end = value[endKey];
    if (typeof start !== 'string' || typeof end !== 'string') return;

    const bad = allowSameDay ? end < start : end <= start;
    if (bad) {
      ctx.addIssue({
        code: 'custom',
        path: [endKey],
        message: allowSameDay
          ? `${endLabel} cannot be before ${startLabel.toLowerCase()}.`
          : `${endLabel} must be after ${startLabel.toLowerCase()}.`,
      });
    }
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * WhatsApp templates
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * The placeholders a studio may use in an automated message.
 *
 * Kept here rather than beside the template editor because the same list has to
 * bound the editor, the preview and the validator, and three copies of it drift
 * in exactly the way that ships `{{client_name}}` to a member as literal text.
 */
export const TEMPLATE_VARIABLES = [
  'client_name',
  'first_name',
  'studio_name',
  'trainer_name',
  'plan_name',
  'expiry_date',
  'due_amount',
  'session_date',
  'session_time',
  'invoice_number',
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export interface TemplateProblem {
  kind: 'unclosed' | 'unknown' | 'empty' | 'malformed';
  /** The offending token as the user typed it. */
  token: string;
  message: string;
}

/**
 * Parse a message template and report every problem in it.
 *
 * Returns problems rather than throwing on the first, because a studio owner
 * editing a template wants the whole list — fixing one brace at a time across
 * four save attempts is the experience §8 is trying to prevent.
 *
 * The unclosed-brace check runs on the text with well-formed placeholders
 * removed, so a valid `{{name}}` cannot be mistaken for a stray `{{`.
 */
export function inspectTemplate(raw: string): TemplateProblem[] {
  const problems: TemplateProblem[] = [];
  const seen = new Set<string>();

  const WELL_FORMED = /\{\{\s*([a-zA-Z0-9_]*)\s*\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = WELL_FORMED.exec(raw)) !== null) {
    const name = match[1] ?? '';
    const token = match[0];

    if (name === '') {
      if (!seen.has(token)) {
        seen.add(token);
        problems.push({
          kind: 'empty',
          token,
          message: 'Empty placeholder — put a variable name between the braces.',
        });
      }
      continue;
    }

    if (!(TEMPLATE_VARIABLES as readonly string[]).includes(name)) {
      if (!seen.has(token)) {
        seen.add(token);
        problems.push({
          kind: 'unknown',
          token,
          message: `Unknown variable “${name}”. Available: ${TEMPLATE_VARIABLES.join(', ')}.`,
        });
      }
    }
  }

  // Strip the well-formed placeholders, then anything brace-shaped left over is
  // a real defect: an unclosed `{{`, a lone `}}`, or a single-brace attempt.
  const residue = raw.replace(WELL_FORMED, '');

  for (const stray of residue.match(/\{\{[^}]*/g) ?? []) {
    problems.push({
      kind: 'unclosed',
      token: stray.slice(0, 40),
      message: `Unclosed placeholder near “${stray.slice(0, 20)}” — add the closing }}.`,
    });
  }

  for (const stray of residue.match(/\}\}/g) ?? []) {
    problems.push({
      kind: 'malformed',
      token: stray,
      message: 'Stray }} with no matching {{.',
    });
  }

  // A single brace around a known variable is the most common near-miss, and
  // silently sending "{client_name}" to a member is the failure §8 names.
  for (const stray of residue.match(/\{[^{}]+\}/g) ?? []) {
    const inner = stray.slice(1, -1).trim();
    if ((TEMPLATE_VARIABLES as readonly string[]).includes(inner)) {
      problems.push({
        kind: 'malformed',
        token: stray,
        message: `Use double braces: {{${inner}}} rather than ${stray}.`,
      });
    }
  }

  return problems;
}

/** WhatsApp's own hard ceiling on a text message body. */
export const TEMPLATE_MAX_LENGTH = 4096;

/**
 * A WhatsApp message template.
 *
 * Length is measured on the template text, not on the rendered message — the
 * rendered length depends on whose name is substituted and cannot be known at
 * edit time. The ceiling is therefore a guard, not a guarantee, and a template
 * near the limit can still render long. Stated plainly rather than papered over
 * with a tighter arbitrary bound.
 */
export const templateBodyField = (opts: Partial<FieldOptions> = {}) => {
  const label = opts.label ?? 'Message';
  const required = opts.required ?? true;

  return z.unknown().transform((raw, ctx): string | null => {
    const s = typeof raw === 'string' ? raw.trim() : raw == null ? '' : String(raw).trim();

    if (s === '') {
      if (required) {
        ctx.addIssue({ code: 'custom', message: `${label} is required.` });
        return z.NEVER;
      }
      return null;
    }

    if (s.length > TEMPLATE_MAX_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        message: `${label} cannot be more than ${TEMPLATE_MAX_LENGTH} characters (currently ${s.length}).`,
      });
      return z.NEVER;
    }

    const problems = inspectTemplate(s);
    if (problems.length > 0) {
      for (const p of problems) {
        ctx.addIssue({ code: 'custom', message: p.message });
      }
      return z.NEVER;
    }

    return s;
  });
};
