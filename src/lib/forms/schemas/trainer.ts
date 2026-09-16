/**
 * A trainer's record — the numeric and identity fields on the add wizard and
 * the edit screen.
 *
 * ── What the add wizard was doing ───────────────────────────────────────────
 *
 *     salary:         salary ? parseFloat(salary) : null,
 *     session_rate:   sessionRate ? parseFloat(sessionRate) : null,
 *     incentive_rate: incentiveRate ? parseFloat(incentiveRate) : null,
 *     experience_years: experience ? parseInt(experience, 10) : null,
 *
 * `parseFloat` parses a PREFIX and stops. A salary typed the way a studio
 * owner writes one — "50,000" — was sent as **50**, and the truthiness guard
 * in front of it caught `''` and nothing else, so a whitespace box went
 * through as NaN, which `JSON.stringify` writes as `null` and which silently
 * CLEARS a stored salary.
 *
 * The edit screen was corrected for salary in an earlier round; this is the
 * same correction for every other figure on both screens, in one place both
 * can share.
 *
 * ── Why the bounds, and why they are wide ───────────────────────────────────
 *
 * `max_sessions_per_day` and `max_clients` are capacity figures a roster reads
 * back. Nothing on either side bounded them, so a mistyped 999 reads as a
 * trainer who can take 999 sessions a day. The ceilings below exclude the
 * impossible, not the ambitious.
 */

import { z } from 'zod';
import { moneyField, integerField, emailField, phoneField, textField } from '../primitives';
import { commissionPctField } from '../domain';

/** A day's work has a ceiling; past it the number is a typo, not a target. */
export const TRAINER_LIMITS = {
  maxSessionsPerDay: 24,
  maxClients: 500,
  experienceYears: 60,
  monthlyClientTarget: 500,
} as const;

/**
 * The identity fields, shared by both screens.
 *
 * `emailField` and `phoneField` replace the fifth and sixth hand-written
 * copies of the same two regexes — `/^[6-9]\d{9}$/` and
 * `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` — which had drifted into six files.
 */
export const trainerIdentitySchema = z.object({
  firstName: textField({ label: 'First name', required: true, maxLength: 120 }),
  lastName: textField({ label: 'Last name', maxLength: 120 }),
  email: emailField({ label: 'Email address', required: true }),
  mobile: phoneField({ label: 'Phone number', required: true }),
});

/**
 * Every figure either screen sends.
 *
 * All optional: a trainer may be added before their pay is agreed, and an edit
 * that does not touch a figure must not be forced to restate it.
 */
export const trainerNumbersSchema = z.object({
  salary: moneyField({ label: 'Base salary', min: 0 }),
  sessionRate: moneyField({ label: 'Per-session rate', min: 0 }),
  incentiveRate: commissionPctField({ label: 'Revenue share' }),
  experienceYears: integerField({
    label: 'Years of experience', min: 0, max: TRAINER_LIMITS.experienceYears, unit: 'years',
  }),
  maxSessionsPerDay: integerField({
    label: 'Max sessions a day', min: 0, max: TRAINER_LIMITS.maxSessionsPerDay,
  }),
  maxClients: integerField({
    label: 'Max clients', min: 0, max: TRAINER_LIMITS.maxClients,
  }),
  monthlyClientTarget: integerField({
    label: 'Monthly client target', min: 0, max: TRAINER_LIMITS.monthlyClientTarget,
  }),
  monthlyRevenueTarget: moneyField({ label: 'Monthly revenue target', min: 0 }),
});

export type TrainerNumbers = z.output<typeof trainerNumbersSchema>;
export type TrainerIdentity = z.output<typeof trainerIdentitySchema>;

/** The raw strings the wizard holds, in the order its steps present them. */
export type TrainerNumbersState = {
  salary: string;
  sessionRate: string;
  incentiveRate: string;
  experienceYears: string;
  maxSessionsPerDay: string;
  maxClients: string;
  monthlyClientTarget: string;
  monthlyRevenueTarget: string;
};

/**
 * Which wizard step owns each field, so a failure can open the step that holds
 * it rather than reporting a problem the user cannot see.
 */
export const TRAINER_FIELD_STEP: Record<string, number> = {
  firstName: 1,
  lastName: 1,
  email: 2,
  mobile: 2,
  experienceYears: 3,
  salary: 4,
  sessionRate: 4,
  incentiveRate: 4,
  maxSessionsPerDay: 5,
  maxClients: 5,
  monthlyClientTarget: 6,
  monthlyRevenueTarget: 6,
};

/** A number for the wire, or `undefined` to leave the field out entirely. */
export function sent(value: number | null): number | undefined {
  return value === null ? undefined : value;
}
