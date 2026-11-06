// Shared form shape and vocabulary for the Postural Assessment module.
//
// The UI works in camelCase; the API stores snake_case. The mapping lives in
// the page (formFromRow / toPayload), so every step component stays typed and
// free of transport details.

import { todayISO } from '@/lib/forms/domain';

export type PostureViewKey = 'front' | 'side' | 'back';

export interface PostureOption {
  value: string;
  /** A neutral / "no deviation" answer. It cannot coexist with a finding in
   *  the same category, but it is never implied by leaving the category empty. */
  neutral?: boolean;
}

export interface PostureCategory {
  name: string;
  options: PostureOption[];
}

const n = (value: string): PostureOption => ({ value, neutral: true });
const d = (value: string): PostureOption => ({ value });

/** The three views. An empty category means "not assessed", never "normal". */
export const POSTURE_VIEWS: Record<PostureViewKey, { label: string; short: string; categories: PostureCategory[] }> = {
  front: {
    label: 'Anterior View', short: 'Front',
    categories: [
      {
        name: 'Head & Neck',
        options: [n('Neutral'), d('Left Head Tilt'), d('Right Head Tilt'), d('Left Neck Rotation'), d('Right Neck Rotation')],
      },
      {
        name: 'Shoulders',
        options: [n('Symmetrical'), d('Right Shoulder Elevated'), d('Left Shoulder Elevated'), d('Rounded Shoulders'), d('Uneven Shoulders')],
      },
      {
        name: 'Chest & Ribcage',
        options: [n('Symmetrical'), d('Rib Flare'), d('Chest Asymmetry')],
      },
      {
        name: 'Pelvis / Hip Level',
        options: [n('Level'), d('Right Pelvic Elevation'), d('Left Pelvic Elevation'), d('Lateral Pelvic Tilt')],
      },
      {
        name: 'Knee Alignment',
        options: [n('Neutral'), d('Knock Knees (Genu Valgum)'), d('Bow Legs (Genu Varum)'), d('Right Knee Valgus'), d('Left Knee Valgus')],
      },
      {
        name: 'Feet & Ankles',
        options: [
          n('Neutral'), d('Bilateral Pronation'), d('Right Foot Pronation'), d('Left Foot Pronation'),
          d('Flat Feet'), d('Supination'), d('Feet Turned Out'), d('Feet Turned In'),
        ],
      },
    ],
  },
  side: {
    label: 'Lateral View', short: 'Side',
    categories: [
      {
        name: 'Head Position',
        options: [n('Neutral'), d('Forward Head Posture')],
      },
      {
        name: 'Shoulders',
        options: [n('Neutral'), d('Rounded Shoulders'), d('Protracted Shoulders')],
      },
      {
        name: 'Thoracic Spine',
        options: [n('Normal Curve'), d('Increased Kyphosis'), d('Flat Upper Back')],
      },
      {
        name: 'Lumbar Spine',
        options: [n('Normal Lordosis'), d('Hyper-Lordosis'), d('Flat Lumbar Spine')],
      },
      {
        name: 'Pelvic Tilt',
        options: [n('Neutral'), d('Anterior Pelvic Tilt'), d('Posterior Pelvic Tilt')],
      },
      {
        name: 'Knee Joint',
        options: [n('Neutral'), d('Hyperextended Knees (Genu Recurvatum)'), d('Slightly Flexed Knees')],
      },
    ],
  },
  back: {
    label: 'Posterior View', short: 'Back',
    categories: [
      {
        name: 'Spinal Column',
        options: [n('Straight'), d('Possible Scoliosis'), d('C-shaped Deviation'), d('S-shaped Deviation')],
      },
      {
        name: 'Scapular Alignment',
        options: [
          n('Symmetrical'), d('Winged Left Scapula'), d('Winged Right Scapula'), d('Bilateral Winged Scapula'),
          d('Protracted Scapula'), d('Elevated Scapula'), d('Uneven Scapula'),
        ],
      },
      {
        name: 'Gluteal Fold & Hip Symmetry',
        options: [n('Symmetrical'), d('Uneven Gluteal Fold'), d('Right Hip Elevated'), d('Left Hip Elevated')],
      },
      {
        name: 'Achilles Tendon / Heel',
        options: [n('Straight'), d('Right Valgus Heel'), d('Left Valgus Heel'), d('Bilateral Valgus Heel'), d('Varus Heel')],
      },
    ],
  },
};

export const POSTURE_ISSUES_BY_VIEW: Record<'frontIssues' | 'sideIssues' | 'backIssues', string[]> = {
  frontIssues: POSTURE_VIEWS.front.categories.flatMap((c) => c.options.map((o) => o.value)),
  sideIssues: POSTURE_VIEWS.side.categories.flatMap((c) => c.options.map((o) => o.value)),
  backIssues: POSTURE_VIEWS.back.categories.flatMap((c) => c.options.map((o) => o.value)),
};

export const VIEW_FIELD: Record<PostureViewKey, 'frontIssues' | 'sideIssues' | 'backIssues'> = {
  front: 'frontIssues', side: 'sideIssues', back: 'backIssues',
};

export const ASSESSMENT_TYPES = [
  { value: 'initial', label: 'Initial assessment' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 're_assessment', label: 'Re-assessment' },
  { value: 'progress', label: 'Progress check' },
] as const;

export type AssessmentType = typeof ASSESSMENT_TYPES[number]['value'];

/**
 * A neutral answer is exclusive inside its category. A deviation clears the
 * category's neutral answer. Selecting two deviations is allowed: left and
 * right are separate findings, not a contradiction.
 */
export function togglePostureObservation(category: PostureCategory, current: string[], value: string): string[] {
  if (current.includes(value)) return current.filter((v) => v !== value);
  const option = category.options.find((o) => o.value === value);
  if (option?.neutral) return [value];
  const neutralValues = new Set(category.options.filter((o) => o.neutral).map((o) => o.value));
  return [...current.filter((v) => !neutralValues.has(v)), value];
}

export const TIGHT_MUSCLES = [
  'Upper Trapezius', 'Levator Scapulae', 'Pectoralis Major', 'Pectoralis Minor',
  'Latissimus Dorsi', 'Hip Flexors', 'Rectus Femoris', 'Tensor Fasciae Latae (TFL)',
  'Hamstrings', 'Gastrocnemius', 'Soleus', 'Adductors',
] as const;

export const WEAK_MUSCLES = [
  'Lower Trapezius', 'Middle Trapezius', 'Rhomboids', 'Serratus Anterior',
  'Deep Neck Flexors', 'Gluteus Maximus', 'Gluteus Medius', 'Core Stabilizers',
  'Vastus Medialis', 'Tibialis Anterior',
] as const;

export const ALL_MUSCLES = [...TIGHT_MUSCLES, ...WEAK_MUSCLES];

export type MuscleStatus = 'normal' | 'tight' | 'weak';
export type MuscleSide = 'left' | 'right' | 'bilateral';

export interface MuscleFinding {
  id: string;
  muscle: string;
  status: MuscleStatus;
  side: MuscleSide;
  notes: string;
}

export interface PlanExercise {
  id: string;
  exercise: string;
  targetMuscle: string;
  region: string;
  duration: string;
  sets: string;
  reps: string;
  hold: string;
  resistance: string;
  tempo: string;
  rest: string;
  frequency: string;
  instructions: string;
}

export type PlanSection = 'mobility' | 'activation' | 'strengthening';

export interface CorrectiveRecommendations {
  general: string;
  modifications: string;
  precautions: string;
  follow_up: string;
  additional: string;
}

export interface CorrectivePlan {
  mobility: PlanExercise[];
  activation: PlanExercise[];
  strengthening: PlanExercise[];
  recommendations: CorrectiveRecommendations;
}

export interface AssessmentSummary {
  primaryConcern: string;
  secondaryConcern: string;
  trainerAssessment: string;
  clientRecommendations: string;
}

/** Retained so an older record's six coach-note paragraphs survive an edit. */
export interface CoachNotes {
  initial_observations: string;
  corrective_strategy: string;
  training_focus: string;
  nutrition_focus: string;
  recovery_focus: string;
  special_instructions: string;
}

export type PostureStatus = 'draft' | 'completed';

export interface PostureFormData {
  assessmentDate: string;
  assessmentType: AssessmentType;
  status: PostureStatus;

  frontIssues: string[];
  sideIssues: string[];
  backIssues: string[];
  viewNotes: Record<PostureViewKey, string>;
  otherIssueNotes: string;
  /** Explicit "assessed, nothing found". Leaving every view empty is not that. */
  noIssuesNoted: boolean;

  frontPhoto: string;
  sidePhoto: string;
  backPhoto: string;

  muscleImbalances: MuscleFinding[];
  correctivePlan: CorrectivePlan;
  summary: AssessmentSummary;
  resolvedFindings: string[];

  coachNotes: CoachNotes;
}

export const STEPS = [
  { id: 1, key: 'overview', label: 'Overview' },
  { id: 2, key: 'observations', label: 'Posture' },
  { id: 3, key: 'muscles', label: 'Muscles' },
  { id: 4, key: 'plan', label: 'Corrective Plan' },
  { id: 5, key: 'review', label: 'Review' },
] as const;

export type StepId = typeof STEPS[number]['id'];

export function emptyPlanExercise(): PlanExercise {
  return {
    id: `ex-${Math.random().toString(36).slice(2, 9)}`,
    exercise: '', targetMuscle: '', region: '', duration: '', sets: '', reps: '',
    hold: '', resistance: '', tempo: '', rest: '', frequency: '', instructions: '',
  };
}

export function initCorrectivePlan(): CorrectivePlan {
  return {
    mobility: [], activation: [], strengthening: [],
    recommendations: { general: '', modifications: '', precautions: '', follow_up: '', additional: '' },
  };
}

export function initPostureForm(): PostureFormData {
  return {
    assessmentDate: todayISO(),
    assessmentType: 'initial',
    status: 'draft',
    frontIssues: [], sideIssues: [], backIssues: [],
    viewNotes: { front: '', side: '', back: '' },
    otherIssueNotes: '', noIssuesNoted: false,
    frontPhoto: '', sidePhoto: '', backPhoto: '',
    muscleImbalances: [],
    correctivePlan: initCorrectivePlan(),
    summary: { primaryConcern: '', secondaryConcern: '', trainerAssessment: '', clientRecommendations: '' },
    resolvedFindings: [],
    coachNotes: {
      initial_observations: '', corrective_strategy: '', training_focus: '',
      nutrition_focus: '', recovery_focus: '', special_instructions: '',
    },
  };
}

/** Anything the trainer recorded, from any view, note or muscle finding. */
export function postureFindingCount(form: Pick<PostureFormData,
  'frontIssues' | 'sideIssues' | 'backIssues' | 'otherIssueNotes' | 'viewNotes' | 'muscleImbalances'>): number {
  const notes = form.viewNotes ? Object.values(form.viewNotes).filter((v) => v.trim()).length : 0;
  return form.frontIssues.length + form.sideIssues.length + form.backIssues.length
    + (form.otherIssueNotes.trim() ? 1 : 0) + notes + (form.muscleImbalances?.length ?? 0);
}

export function validatePostureFindings(form: PostureFormData): string | undefined {
  if (!postureFindingCount(form) && !form.noIssuesNoted) {
    return 'Record at least one posture finding, or confirm that no issues were noted.';
  }
  return undefined;
}

/** A view's completion state, used by its tab. */
export function viewStatus(form: PostureFormData, view: PostureViewKey): 'findings' | 'no_findings' | 'not_assessed' {
  const issues = form[VIEW_FIELD[view]];
  const notes = form.viewNotes[view].trim();
  if (issues.length || notes) return 'findings';
  return form.noIssuesNoted ? 'no_findings' : 'not_assessed';
}

/** Every selected finding across all three views, de-duplicated. */
export function allFindings(form: Pick<PostureFormData, 'frontIssues' | 'sideIssues' | 'backIssues'>): string[] {
  return [...new Set([...form.frontIssues, ...form.sideIssues, ...form.backIssues])];
}
