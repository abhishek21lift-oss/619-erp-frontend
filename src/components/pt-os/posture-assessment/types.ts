// Shared form shape for the Posture Assessment module — imported by the
// main page and every step component so they don't depend on each other.

import { todayISO } from '@/lib/forms/domain';

export const POSTURE_ISSUE_OPTIONS = [
  'Rounded Shoulders', 'Forward Head', 'Anterior Pelvic Tilt', 'Posterior Pelvic Tilt',
  'Kyphosis', 'Lordosis', 'Scoliosis', 'Knee Valgus', 'Flat Feet',
];

/**
 * What each view can actually show. One list served all three, so "Flat
 * Feet" could be picked from behind and "Kyphosis" from the front. Scoring
 * reads the names (Scoliosis is the one weighted higher and referred), so
 * the shared names are kept as they were.
 */
export const POSTURE_ISSUES_BY_VIEW: Record<'frontIssues' | 'sideIssues' | 'backIssues', string[]> = {
  frontIssues: ['Head Tilt', 'Uneven Shoulders', 'Knee Valgus', 'Feet Turned Out', 'Flat Feet'],
  sideIssues: ['Forward Head', 'Rounded Shoulders', 'Kyphosis', 'Lordosis', 'Anterior Pelvic Tilt', 'Posterior Pelvic Tilt', 'Knee Hyperextension'],
  backIssues: ['Scoliosis', 'Uneven Shoulders', 'Winged Scapula', 'Knee Valgus', 'Flat Feet'],
};

export interface CoachNotes {
  initial_observations: string;
  corrective_strategy: string;
  training_focus: string;
  nutrition_focus: string;
  recovery_focus: string;
  special_instructions: string;
}

export interface PostureFormData {
  assessmentDate: string;

  // Step 1 — Posture Observations
  frontIssues: string[];
  sideIssues: string[];
  backIssues: string[];
  otherIssueNotes: string;

  // Step 2 — Coach Notes
  coachNotes: CoachNotes;
}

export const STEPS = [
  { id: 1, key: 'observations', label: 'Posture Observations' },
  { id: 2, key: 'coachNotes', label: 'Coach Notes' },
] as const;

export type StepId = typeof STEPS[number]['id'];

export function initPostureForm(): PostureFormData {
  return {
    assessmentDate: todayISO(),
    frontIssues: [], sideIssues: [], backIssues: [], otherIssueNotes: '',
    coachNotes: {
      initial_observations: '', corrective_strategy: '', training_focus: '',
      nutrition_focus: '', recovery_focus: '', special_instructions: '',
    },
  };
}

/** The Coach Notes areas for this assessment, beside the type they key into.
 *  Passed to the shared CoachNotesPanel — see components/pt-os/shared. */
export const COACH_NOTE_FIELDS: { key: keyof CoachNotes & string; label: string }[] = [
  { key: 'initial_observations', label: 'Initial Observations' },
  { key: 'corrective_strategy', label: 'Corrective Strategy' },
  { key: 'training_focus', label: 'Training Focus' },
  { key: 'nutrition_focus', label: 'Nutrition Focus' },
  { key: 'recovery_focus', label: 'Recovery Focus' },
  { key: 'special_instructions', label: 'Special Instructions' },
];
