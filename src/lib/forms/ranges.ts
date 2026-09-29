/**
 * Plausible-range checks for the assessment wizards.
 *
 * Nothing on these forms was range-checked: a stress level of 55 on a 1-10
 * scale, -3 hours of sleep and a 9,999 kg grip were all saved and scored.
 * The API now refuses them too; these give the same answer on the step where
 * the number was typed, instead of at the final Save. Bounds match the API's
 * schemas in progress.routes.js.
 */
import { toMeasurementOrNull } from './normalize';

export type Range = readonly [label: string, raw: string, min: number, max: number, unit?: string];

/** The first out-of-range value, as a sentence; blank fields pass. */
export function rangeIssue(...checks: Range[]): string | undefined {
  for (const [label, raw, min, max, unit] of checks) {
    if (!raw || !raw.trim()) continue;
    const v = toMeasurementOrNull(raw);
    if (v == null) return `${label} is not a number.`;
    if (v < min || v > max) return `${label} must be between ${min} and ${max}${unit ? ` ${unit}` : ''}.`;
  }
  return undefined;
}
