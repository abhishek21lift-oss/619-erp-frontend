// Shared form shape for the Mobility & Performance Assessment module —
// imported by the main page and every step component so they don't depend
// on each other.

import type { BodyRegionScore, MobilityTestScore } from '@/lib/mobility-calculations';
import { todayISO } from '@/lib/forms/domain';

const BODY_REGIONS = ['Neck', 'Shoulders', 'Thoracic Spine', 'Hip', 'Hamstrings', 'Quadriceps', 'Ankles', 'Wrists'];

// Sit and Reach is measured in centimetres in Fitness Testing's flexibility
// step; scoring it again here on a 1-5 scale gave one test three records.
const MOBILITY_TESTS = ['Shoulder Reach', 'Overhead Squat', 'Deep Squat', 'Hip Internal Rotation', 'Ankle Dorsiflexion'];

export interface MobilityFormData {
  assessmentDate: string;

  // Step 1 — Body Regions
  bodyRegions: BodyRegionScore[];

  // Step 2 — Functional Tests
  mobilityTests: MobilityTestScore[];

  // Step 3 — Performance Metrics

  // Sit & Reach is no longer collected here (removed from the step's UI),
  // but the field stays so older submitted assessments keep displaying it.
  gripStrengthKg: string;
  verticalJumpCm: string;
  sitReachCm: string;
  balanceTestSeconds: string;
  reactionTimeMs: string;
  performanceNotes: string;
}

export const STEPS = [
  { id: 1, key: 'bodyRegions', label: 'Body Regions' },
  { id: 2, key: 'functionalTests', label: 'Functional Tests' },
  { id: 3, key: 'performanceMetrics', label: 'Performance Metrics' },
] as const;

export type StepId = typeof STEPS[number]['id'];

export function initMobilityForm(): MobilityFormData {
  return {
    assessmentDate: todayISO(),
    // Unscored, not a default 3: an untouched form used to average out to
    // 60/100 "Average" without anyone assessing the client.
    bodyRegions: BODY_REGIONS.map((region) => ({ region, score: null, pain: false, restriction: false })),
    mobilityTests: MOBILITY_TESTS.map((test) => ({ test, score: null, notes: '', pain: false, restriction: false })),
    gripStrengthKg: '', verticalJumpCm: '', sitReachCm: '', balanceTestSeconds: '', reactionTimeMs: '',
    performanceNotes: '',
  };
}

/** How many regions still have no score. The wizard refuses to advance while
 *  any remain: an unscored region is not a 3. */
export function unscoredBodyRegions(form: Pick<MobilityFormData, 'bodyRegions'>): number {
  return form.bodyRegions.filter((r) => r.score == null).length;
}

/** How many movement screens still have no score. */
export function unscoredMobilityTests(form: Pick<MobilityFormData, 'mobilityTests'>): number {
  return form.mobilityTests.filter((t) => t.score == null).length;
}

// One parser for every measurement in the app. See toMeasurementOrNull for
// what the five hand-rolled copies of this used to get wrong.
export { toMeasurementOrNull as n } from '@/lib/forms/normalize';
