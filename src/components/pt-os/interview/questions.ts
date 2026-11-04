// The Client Interview, as four sections a trainer can walk through.
//
// ── Who owns what ──────────────────────────────────────────────────────────
//
// Occupation type, screen time and activity level belong to the Lifestyle
// Assessment (docs/specs/CLIENT-ASSESSMENT-TARGET-ARCHITECTURE.md). This screen
// shows them read-only with a link back; it never writes a second copy.
//
// The Interview owns the conversation: work detail, training history,
// training challenges, availability, motivation, preferences, the client's own
// words, and the trainer's summary. Sitting hours, meal regularity and
// training days stay here as the three quick screens the target architecture
// assigns to this step.
//
// ── Values are canonical, labels are for people ────────────────────────────
//
// Every option's `value` is what the server stores and the DB's CHECK
// constraints accept (migrations 228a/249/254). Numbers stay numbers on the
// wire: sitting bands are stored as their midpoint, because that is the only
// honest number a band contains.
//
//   sitting hours   <2 → 1 · 2–4 → 3 · 4–6 → 5 · 6–8 → 7 · 8+ → 9
//   training days   0 · 1 · 2 · 3 · 4 · 5 · 6 · 7
//
// ── Progress is what is on the screen ──────────────────────────────────────
//
// A conditional field (occupation detail, challenge detail) counts only while
// it is visible. A progress bar that promises a field the trainer cannot see
// is lying about how much is left.

import type { LucideIcon } from 'lucide-react';
import { Briefcase, Dumbbell, Flag, NotebookPen } from 'lucide-react';

/** The fields the form edits. Everything is a string except the chip list. */
export const TEXT_FIELDS = [
  'job_details',
  'occupation_other_details',
  'lifestyle_sitting_hours',
  'lifestyle_meal_regularity',
  'previous_workout_experience',
  'training_history',
  'lifestyle_training_days',
  'availability',
  'challenge_other',
  'important_client_statements',
  'motivation',
  'preferences',
  'notes',
] as const;

export type TextField = typeof TEXT_FIELDS[number];
export type InterviewField = TextField | 'training_challenges';

export type Answers = Record<TextField, string> & { training_challenges: string[] };

export interface InterviewOption {
  /** Stored as-is. */
  value: string;
  /** Read by a person. */
  label: string;
}

/** A field only shown while the thing it describes is true. */
export type InterviewCondition = 'occupationOther' | 'challengeOther';

interface ControlBase {
  key: InterviewField;
  /** The control's own accessible name. */
  label: string;
  hint: string;
  showWhen?: InterviewCondition;
}

export type InterviewControl =
  | (ControlBase & { kind: 'text'; rows?: number; maxLength?: number; placeholder?: string })
  | (ControlBase & { kind: 'select'; options: readonly InterviewOption[] })
  | (ControlBase & { kind: 'chips'; options: readonly InterviewOption[] });

export interface InterviewSection {
  /** Anchor id — `#section-<id>`. */
  id: string;
  /** The section's short name, in the anchor nav. */
  label: string;
  /** The section as it is introduced on the page. */
  prompt: string;
  icon: LucideIcon;
  controls: readonly InterviewControl[];
}

/** Bands as midpoints — see the header. */
const SITTING: readonly InterviewOption[] = [
  { value: '1', label: 'Under 2 hours' },
  { value: '3', label: '2 – 4 hours' },
  { value: '5', label: '4 – 6 hours' },
  { value: '7', label: '6 – 8 hours' },
  { value: '9', label: '8+ hours' },
];

const TRAINING_DAYS: readonly InterviewOption[] = [
  { value: '0', label: 'None right now' },
  { value: '1', label: '1 day a week' },
  { value: '2', label: '2 days a week' },
  { value: '3', label: '3 days a week' },
  { value: '4', label: '4 days a week' },
  { value: '5', label: '5 days a week' },
  { value: '6', label: '6 days a week' },
  { value: '7', label: '7 days a week' },
];

const EXPERIENCE: readonly InterviewOption[] = [
  { value: 'never', label: 'Never trained' },
  { value: 'beginner', label: 'Beginner — under 6 months' },
  { value: 'intermediate', label: 'Intermediate — 6 months to 2 years' },
  { value: 'advanced', label: 'Advanced — 2+ years' },
];

const CHALLENGES: readonly InterviewOption[] = [
  { value: 'time', label: 'Time' },
  { value: 'work_schedule', label: 'Work schedule' },
  { value: 'motivation', label: 'Motivation' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'pain_or_injury', label: 'Pain or injury' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'family', label: 'Family commitments' },
  { value: 'travel', label: 'Travel' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'gym_access', label: 'Gym access' },
  { value: 'cost', label: 'Cost' },
  { value: 'other', label: 'Other' },
];

export const INTERVIEW_SECTIONS: readonly InterviewSection[] = [
  {
    id: 'work',
    label: 'Work & lifestyle',
    prompt: 'How does their week look?',
    icon: Briefcase,
    controls: [
      {
        key: 'job_details',
        kind: 'text',
        label: 'Job details',
        hint: 'Role, shift pattern, hours on their feet.',
        placeholder: 'e.g. Warehouse team lead, rotating shifts, on feet most of the day',
        rows: 3,
        maxLength: 2000,
      },
      {
        key: 'occupation_other_details',
        kind: 'text',
        label: 'Describe their occupation',
        hint: 'The Lifestyle Assessment records their occupation as Other.',
        placeholder: 'What do they do?',
        rows: 2,
        maxLength: 500,
        showWhen: 'occupationOther',
      },
      {
        key: 'lifestyle_sitting_hours',
        kind: 'select',
        label: 'Sitting hours',
        hint: 'A work-day average is close enough.',
        options: SITTING,
      },
      {
        key: 'lifestyle_meal_regularity',
        kind: 'select',
        label: 'Meal regularity',
        hint: 'How often meals land at roughly the same time.',
        options: [
          { value: 'regular', label: 'Mostly regular' },
          { value: 'irregular', label: 'Irregular' },
          { value: 'inconsistent', label: 'Frequently skipped' },
        ],
      },
    ],
  },
  {
    id: 'training',
    label: 'Training background',
    prompt: 'What training are they bringing with them?',
    icon: Dumbbell,
    controls: [
      {
        key: 'previous_workout_experience',
        kind: 'select',
        label: 'Previous experience',
        hint: 'Their history at intake — not their current programme level.',
        options: EXPERIENCE,
      },
      {
        key: 'training_history',
        kind: 'text',
        label: 'Training history',
        hint: 'What they have done, for how long, and how it went.',
        placeholder: 'e.g. Two years of home workouts, then a long break',
        rows: 3,
        maxLength: 2000,
      },
      {
        key: 'lifestyle_training_days',
        kind: 'select',
        label: 'Days a week they can train',
        hint: 'Realistic sessions, not best-case ones.',
        options: TRAINING_DAYS,
      },
      {
        key: 'availability',
        kind: 'text',
        label: 'When they can train',
        hint: 'Days, times, or constraints worth knowing.',
        placeholder: 'e.g. Weekday mornings before 9, not Sundays',
        rows: 2,
        maxLength: 1000,
      },
      {
        key: 'preferences',
        kind: 'text',
        label: 'What they enjoy or avoid',
        hint: 'Exercises, styles, and anything they will not do.',
        placeholder: 'e.g. Likes free weights, hates running',
        rows: 2,
        maxLength: 1000,
      },
    ],
  },
  {
    id: 'challenges',
    label: 'Training challenges',
    prompt: 'What gets in the way?',
    icon: Flag,
    controls: [
      {
        key: 'training_challenges',
        kind: 'chips',
        label: 'Barriers they named',
        hint: 'Choose everything they mentioned. Missing is unknown, not none.',
        options: CHALLENGES,
      },
      {
        key: 'challenge_other',
        kind: 'text',
        label: 'What else gets in the way?',
        hint: 'The barrier they named that is not on the list.',
        placeholder: 'Describe it in their words',
        rows: 2,
        maxLength: 500,
        showWhen: 'challengeOther',
      },
    ],
  },
  {
    id: 'summary',
    label: 'Interview summary',
    prompt: 'What should the team remember?',
    icon: NotebookPen,
    controls: [
      {
        key: 'important_client_statements',
        kind: 'text',
        label: 'In their words',
        hint: 'Something they said that changes how you coach them. Quoted, not paraphrased.',
        placeholder: '"I want to keep up with my kids without getting winded."',
        rows: 2,
        maxLength: 2000,
      },
      {
        key: 'motivation',
        kind: 'text',
        label: 'Why now?',
        hint: 'What brought them in today.',
        placeholder: 'e.g. Wedding in six months, doctor advised exercise',
        rows: 2,
        maxLength: 2000,
      },
      {
        key: 'notes',
        kind: 'text',
        label: 'Trainer summary',
        hint: 'Your observations, not the client’s answers. This is the only part written by you.',
        placeholder: 'What the next trainer needs to know.',
        rows: 4,
        maxLength: 2000,
      },
    ],
  },
] as const;

/** Every field the save may write, in screen order. */
export const INTERVIEW_FIELDS: readonly InterviewField[] = INTERVIEW_SECTIONS
  .flatMap((section) => section.controls.map((control) => control.key));


/** '' is "not answered" for text; [] is "not answered" for the chip list. */
export function controlAnswered(value: string | string[]): boolean {
  return Array.isArray(value) ? value.length > 0 : value.trim() !== '';
}

export function isControlVisible(
  control: InterviewControl,
  answers: Answers,
  occupationType: string,
): boolean {
  if (control.showWhen === 'occupationOther') return occupationType === 'other';
  if (control.showWhen === 'challengeOther') return answers.training_challenges.includes('other');
  return true;
}

export function visibleControls(
  section: InterviewSection,
  answers: Answers,
  occupationType: string,
): InterviewControl[] {
  return section.controls.filter((control) => isControlVisible(control, answers, occupationType));
}

/** Answered controls out of the ones currently on screen. */
export function answeredCount(answers: Answers, occupationType = ''): { answered: number; total: number } {
  let answered = 0;
  let total = 0;
  for (const section of INTERVIEW_SECTIONS) {
    for (const control of visibleControls(section, answers, occupationType)) {
      total += 1;
      if (controlAnswered(answers[control.key])) answered += 1;
    }
  }
  return { answered, total };
}

export function sectionAnswered(
  section: InterviewSection,
  answers: Answers,
  occupationType = '',
): { answered: number; total: number } {
  const controls = visibleControls(section, answers, occupationType);
  return {
    answered: controls.filter((c) => controlAnswered(answers[c.key])).length,
    total: controls.length,
  };
}

const EMPTY_TEXT = Object.fromEntries(TEXT_FIELDS.map((key) => [key, ''])) as Record<TextField, string>;

export const EMPTY_ANSWERS: Answers = { ...EMPTY_TEXT, training_challenges: [] };

/**
 * The saved record as the strings the controls hold. Postgres returns NUMERIC
 * values with a scale — NUMERIC(4,1) reads '7.0' for the 7 that was stored —
 * and a select matches its option's value exactly, so trailing zeros are
 * trimmed. Without that, a client who sits seven hours a day would show
 * "Under 2 hours".
 */
export function answersFrom(row: Record<string, unknown> | null): Answers {
  const base: Answers = {
    ...EMPTY_ANSWERS,
    training_challenges: [],
  };
  if (!row) return base;
  for (const key of TEXT_FIELDS) {
    const raw = row[key];
    base[key] = raw == null ? '' : String(raw).replace(/\.0+$/, '');
  }
  base.training_challenges = Array.isArray(row.training_challenges)
    ? row.training_challenges.filter((v): v is string => typeof v === 'string')
    : [];
  return base;
}

/** The labels for a chip list, for the read-only summary. */
export function challengeLabels(values: readonly string[]): string[] {
  const byValue = new Map(CHALLENGES.map((option) => [option.value, option.label]));
  return values.map((value) => byValue.get(value) ?? value);
}
