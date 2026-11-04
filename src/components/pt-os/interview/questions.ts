// The Client Interview, as four sections a trainer can walk through.
//
// ── Who owns what ──────────────────────────────────────────────────────────
//
// The Interview owns all ten questions: work, training background, barriers
// and readiness, and the trainer's summary. A small set of earlier answers
// (meal regularity, training days, availability, and the client's own words
// in their own words) are no longer asked; where one survives, it is read-only
// history under "Earlier interview answers", never a control.
//
// ── Values are canonical, labels are for people ────────────────────────────
//
// Every option's `value` is what the server stores and the DB's CHECK
// constraints accept (migrations 228a/249/254). Numbers stay numbers on the
// wire: sitting bands are stored as their midpoint, because that is the only
// honest number a band contains.
//
//   sitting hours   <2 → 1 · 2–4 → 3 · 4–6 → 5 · 6–8 → 7 · 8+ → 9
//
// ── Progress is what is on the screen ──────────────────────────────────────
//
// A conditional field (occupation detail, challenge detail) counts only while
// it is visible; a field with `counted: false` (occupation detail, challenge
// detail, trainer's summary) never counts. A progress bar that promises a
// field the trainer cannot see is lying about how much is left.

import type { LucideIcon } from 'lucide-react';
import { Briefcase, Dumbbell, Flag, NotebookPen } from 'lucide-react';

/** The fields the form edits. Everything is a string except the chip list. */
export const TEXT_FIELDS = [
  'occupation_type',
  'job_details',
  'occupation_other_details',
  'lifestyle_sitting_hours',
  'lifestyle_meal_regularity',
  'previous_workout_experience',
  'sports_participation',
  'training_history',
  'lifestyle_training_days',
  'availability',
  'challenge_other',
  'important_client_statements',
  'motivation',
  'preferences',
  'programme_readiness',
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
  /** Defaults to counted. A formatting/detail field set false never counts. */
  counted?: boolean;
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

const OCCUPATION: readonly InterviewOption[] = [
  { value: 'desk_job', label: 'Desk Job' },
  { value: 'active_job', label: 'Active Job' },
  { value: 'physical_labor', label: 'Physical Labor' },
  { value: 'student', label: 'Student' },
  { value: 'homemaker', label: 'Homemaker' },
  { value: 'driver', label: 'Driver' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'police', label: 'Police' },
  { value: 'fitness_professional', label: 'Fitness Professional' },
  { value: 'retired', label: 'Retired' },
  { value: 'other', label: 'Other' },
];

const SPORTS: readonly InterviewOption[] = [
  { value: 'never', label: 'Never' },
  { value: 'previously', label: 'Yes, previously' },
  { value: 'currently', label: 'Yes, currently' },
];

const READINESS: readonly InterviewOption[] = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

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
    label: 'Work',
    prompt: 'What do they do all day?',
    icon: Briefcase,
    controls: [
      {
        key: 'occupation_type',
        kind: 'select',
        label: 'What is your occupation?',
        hint: 'Pick the closest one.',
        options: OCCUPATION,
      },
      {
        key: 'job_details',
        kind: 'text',
        label: 'What type of work do you do?',
        hint: 'Their role, shift pattern, and how many hours they are on their feet.',
        placeholder: 'e.g. Warehouse team lead, rotating shifts, on feet most of the day',
        rows: 3,
        maxLength: 2000,
      },
      {
        key: 'lifestyle_sitting_hours',
        kind: 'select',
        label: 'How many hours do you spend sitting at work?',
        hint: 'A work-day average is close enough.',
        options: SITTING,
      },
      {
        key: 'occupation_other_details',
        kind: 'text',
        label: 'Describe their occupation',
        hint: 'In a few words, what do they do.',
        placeholder: 'What do they do?',
        rows: 2,
        maxLength: 500,
        showWhen: 'occupationOther',
        counted: false,
      },
    ],
  },
  {
    id: 'training',
    label: 'Training background',
    prompt: 'What are they bringing with them?',
    icon: Dumbbell,
    controls: [
      {
        key: 'previous_workout_experience',
        kind: 'select',
        label: 'What is your previous workout experience?',
        hint: 'Their history at intake — not their current programme level.',
        options: EXPERIENCE,
      },
      {
        key: 'sports_participation',
        kind: 'select',
        label: 'Have you participated in any sports?',
        hint: 'Any sport, at any level.',
        options: SPORTS,
      },
      {
        key: 'training_history',
        kind: 'text',
        label: 'What type of physical activities have you performed previously?',
        hint: 'What they have done, for how long, and how it went.',
        placeholder: 'e.g. Two years of home workouts, then a long break',
        rows: 3,
        maxLength: 2000,
      },
      {
        key: 'preferences',
        kind: 'text',
        label: 'What are your exercise preferences?',
        hint: 'Exercises, styles, and anything they will not do.',
        placeholder: 'e.g. Likes free weights, hates running',
        rows: 2,
        maxLength: 1000,
      },
    ],
  },
  {
    id: 'barriers',
    label: 'Motivation & barriers',
    prompt: 'What gets in the way, and what pulls them forward?',
    icon: Flag,
    controls: [
      {
        key: 'training_challenges',
        kind: 'chips',
        label: 'What are your biggest barriers to exercise?',
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
        counted: false,
      },
      {
        key: 'motivation',
        kind: 'text',
        label: 'What motivates you to start training?',
        hint: 'What brought them in today.',
        placeholder: 'e.g. Wedding in six months, doctor advised exercise',
        rows: 2,
        maxLength: 2000,
      },
      {
        key: 'programme_readiness',
        kind: 'select',
        label: 'How ready are you to start a fitness programme? (1–10)',
        hint: 'Their own number, in their words.',
        options: READINESS,
      },
    ],
  },
  {
    id: 'summary',
    label: 'Trainer summary',
    prompt: 'What should the team remember?',
    icon: NotebookPen,
    controls: [
      {
        key: 'notes',
        kind: 'text',
        label: 'Trainer summary',
        hint: 'Your observations, not the client’s answers. This is the only part written by you.',
        placeholder: 'What the next trainer needs to know.',
        rows: 4,
        maxLength: 2000,
        counted: false,
      },
    ],
  },
] as const;

/** Every field the save may write, in screen order. */
export const INTERVIEW_FIELDS: readonly InterviewField[] = INTERVIEW_SECTIONS
  .flatMap((section) => section.controls.map((control) => control.key));

/** The ten counted questions, in screen order. */
export const INTERVIEW_QUESTIONS: readonly InterviewControl[] = INTERVIEW_SECTIONS
  .flatMap((section) => section.controls)
  .filter((control) => control.counted !== false);

/** Older answers the form no longer asks, shown as history only. */
export const LEGACY_ANSWERS: readonly { key: TextField; label: string }[] = [
  { key: 'lifestyle_meal_regularity', label: 'Meal regularity' },
  { key: 'lifestyle_training_days', label: 'Days a week they could train' },
  { key: 'availability', label: 'When they could train' },
  { key: 'important_client_statements', label: "In the client's words" },
];


/** '' is "not answered" for text; [] is "not answered" for the chip list. */
export function controlAnswered(value: string | string[]): boolean {
  return Array.isArray(value) ? value.length > 0 : value.trim() !== '';
}

export function isControlVisible(
  control: InterviewControl,
  answers: Answers,
): boolean {
  if (control.showWhen === 'occupationOther') return answers.occupation_type === 'other';
  if (control.showWhen === 'challengeOther') return answers.training_challenges.includes('other');
  return true;
}

export function visibleControls(
  section: InterviewSection,
  answers: Answers,
): InterviewControl[] {
  return section.controls.filter((control) => isControlVisible(control, answers));
}

/** Answered controls out of the ones currently on screen. */
export function answeredCount(answers: Answers): { answered: number; total: number } {
  let answered = 0;
  let total = 0;
  for (const section of INTERVIEW_SECTIONS) {
    for (const control of visibleControls(section, answers)) {
      if (control.counted === false) continue;
      total += 1;
      if (controlAnswered(answers[control.key])) answered += 1;
    }
  }
  return { answered, total };
}

export function sectionAnswered(
  section: InterviewSection,
  answers: Answers,
): { answered: number; total: number } {
  const controls = visibleControls(section, answers)
    .filter((control) => control.counted !== false);
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
