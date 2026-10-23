import type { FitnessCategory, Gender } from '@/lib/fitness-calculations';

/**
 * Why a strength test that produced a 1RM has no K11 category. Each test is
 * explained on its own, so pairing a supported lift with an unsupported one
 * cannot hide the reason the unsupported lift is unclassified.
 *
 * Returns null when there is nothing to explain (no 1RM, a category exists,
 * or the body weight needed for the ratio has not been entered).
 */
export function strengthCategoryGap(
  exercise: string | null,
  oneRM: number | null,
  category: FitnessCategory | null,
  bodyWeightKg: number | null,
  gender: Gender | null,
  age: number | null,
): string | null {
  if (oneRM == null || category) return null;
  if (exercise !== 'Bench Press' && exercise !== 'Leg Press') {
    return `No K11 percentile reference is supplied for ${exercise || 'this lift'}. Bench Press and Leg Press are the only supported tests.`;
  }
  // A body weight is needed for the ratio; until it is entered the panel's
  // "Enter weight" hint is the relevant message.
  if (bodyWeightKg == null) return null;
  if (age == null || age < 20) {
    return `K11 strength norms require age 20 or over${age == null ? ' — no date of birth is recorded for this client' : ''}.`;
  }
  if (!gender || gender === 'Other') {
    return 'K11 strength norms are sex-specific and need a recorded sex of Male or Female.';
  }
  return null;
}
