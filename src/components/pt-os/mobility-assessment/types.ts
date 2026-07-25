// Shared form shape for the Mobility & Performance Assessment module —
// imported by the main page and every step component so they don't depend
// on each other.

import type { BodyRegionScore, MobilityTestScore } from '@/lib/mobility-calculations';

const BODY_REGIONS = ['Neck', 'Shoulders', 'Thoracic Spine', 'Hip', 'Hamstrings', 'Quadriceps', 'Ankles', 'Wrists'];

const MOBILITY_TESTS = ['Sit and Reach', 'Shoulder Reach', 'Overhead Squat', 'Deep Squat', 'Hip Internal Rotation', 'Ankle Dorsiflexion'];

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
    assessmentDate: new Date().toISOString().slice(0, 10),
    bodyRegions: BODY_REGIONS.map((region) => ({ region, score: 3, pain: false, restriction: false })),
    mobilityTests: MOBILITY_TESTS.map((test) => ({ test, score: 3, notes: '', pain: false, restriction: false })),
    gripStrengthKg: '', verticalJumpCm: '', sitReachCm: '', balanceTestSeconds: '', reactionTimeMs: '',
    performanceNotes: '',
  };
}

export const n = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const f = parseFloat(t);
  return Number.isFinite(f) ? f : null;
};
