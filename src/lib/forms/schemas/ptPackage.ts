/**
 * A PT package in the studio's catalogue.
 *
 * Its price is what every enrolment against it charges, and its session count
 * is what the client is entitled to — so a wrong figure here is not one wrong
 * row, it is every client sold that package afterwards.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 *     price: parseFloat(form.price),
 *     session_count: parseInt(form.session_count),
 *     duration_days: parseInt(form.duration_days),
 *
 * Bare, with only a truthiness guard in front of them. `parseFloat` and
 * `parseInt` parse a PREFIX and stop, so **"8,000" typed into Price creates an
 * ₹8 package** — and 8,000 with the separator is exactly how a studio owner
 * writes a price. `parseInt('12 sessions')` is 12, which happens to be right;
 * `parseFloat('8,000')` is 8, which is not, and neither is reported.
 *
 * A whitespace-only box passed the truthiness guard too, and `parseFloat('  ')`
 * is NaN, which JSON writes as `null`.
 *
 * ── Why price may be zero and the others may not ────────────────────────────
 *
 * A ₹0 package is a real product — an induction, a trial week, a comp for a
 * referral — so 0 is allowed and blank is not. A package with zero sessions or
 * zero days is not a product in any reading.
 */

import { z } from 'zod';
import { textField, integerField } from '../primitives';
import { priceField } from '../domain';

export const PACKAGE_GOAL_TYPES = [
  'fat_loss', 'muscle_gain', 'strength', 'powerlifting',
  'endurance', 'general_fitness', 'recovery',
] as const;
export type PackageGoalType = (typeof PACKAGE_GOAL_TYPES)[number];

export const PACKAGE_GOAL_OPTIONS = [
  { value: '', label: '— Select goal type —' },
  { value: 'fat_loss', label: 'Fat Loss' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'strength', label: 'Strength' },
  { value: 'powerlifting', label: 'Powerlifting' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'recovery', label: 'Recovery' },
] as const;

export const ptPackageSchema = z.object({
  name: textField({ label: 'Package name', required: true, maxLength: 120 }),
  session_count: integerField({ label: 'Sessions', required: true, min: 1, max: 500 }),
  duration_days: integerField({ label: 'Duration', required: true, min: 1, max: 1095, unit: 'days' }),
  // `priceField` is non-negative and allows 0: a comp or an induction is a real
  // product, and refusing it would push it into being recorded as something
  // else. Blank is still refused, because blank is not zero.
  price: priceField({ label: 'Price', required: true }),
  // Optional, and '' is a legitimate "not categorised" rather than an invalid
  // enum member — so it is parsed as text and narrowed below.
  goal_type: z.string(),
  description: textField({ label: 'Description', maxLength: 1000 }),
});

export type PtPackageValues = z.output<typeof ptPackageSchema>;

export type PtPackageState = {
  name: string;
  session_count: string;
  duration_days: string;
  price: string;
  goal_type: string;
  description: string;
};

export function blankPtPackage(): PtPackageState {
  return {
    name: '', session_count: '', duration_days: '', price: '',
    goal_type: '', description: '',
  };
}

/** Rebuild the form from a stored package (§11). Every key is written. */
export function ptPackageToFormValues(pkg: {
  name?: string | null;
  session_count?: number | string | null;
  duration_days?: number | string | null;
  price?: number | string | null;
  goal_type?: string | null;
  description?: string | null;
}): PtPackageState {
  const text = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  return {
    name: text(pkg.name),
    session_count: text(pkg.session_count),
    duration_days: text(pkg.duration_days),
    price: text(pkg.price),
    goal_type: text(pkg.goal_type),
    description: text(pkg.description),
  };
}

export function toPtPackagePayload(v: PtPackageValues) {
  const goal = (PACKAGE_GOAL_TYPES as readonly string[]).includes(v.goal_type)
    ? (v.goal_type as PackageGoalType)
    : null;
  return {
    name: v.name as string,
    session_count: v.session_count as number,
    duration_days: v.duration_days as number,
    price: v.price as number,
    goal_type: goal,
    description: v.description,
  };
}
