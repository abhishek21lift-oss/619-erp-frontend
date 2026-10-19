// The Client Interview's questions, in the order a trainer asks them.
//
// ── Seven groups, eight answers ─────────────────────────────────────────────
//
// The trainer picks; nothing is typed free-hand. Six of the seven topics carry
// one control each, and "Smoking & alcohol" carries two — the two are captured
// independently because the record stores them in their own columns.
//
// ── Values are canonical, labels are for people ─────────────────────────────
//
// Every option's `value` is what the server stores, and the DB's CHECK
// constraints (backend migration 228) accept exactly that vocabulary. The two
// numeric topics are stored as numbers, so a band ("2–4 hours") is stored as
// the band's midpoint (3), which is the only honest number a band contains:
// the correct long-run error of a midpoint is zero, and it keeps the column's
// NUMERIC type meaningful instead of overloading it with tokens like '2_4'.
//
//   occupation      desk_job · active_job · physical_labor · … (migration 228's list)
//   sitting hours   <2 → 1 · 2–4 → 3 · 4–6 → 5 · 6–8 → 7 · 8+ → 9
//   screen time     <2 · 2_4 · 4_6 · 6_8 · 8_plus      (already canonical)
//   sleep hours     <5 → 4.5 · 5–6 → 5.5 · 6–7 → 6.5 · 7–8 → 7.5 · 8+ → 8.5
//   meal regularity regular · irregular · inconsistent
//                   ("frequently skipped" is the plan-facing reading of a
//                    meal pattern the column calls inconsistent)
//   smoking         never · occasionally · daily · former
//   alcohol         never · occasionally · weekly · frequently
//   training days   3 · 4 · 5 · 6
//
// The seven free-text questions this page used to ask — training history, pain
// and injuries, lifestyle, motivation, availability, preferences, notes — are
// gone from the form. The columns are untouched: saved answers stay on the
// record and the save below never writes over them.

import type { LucideIcon } from 'lucide-react';
import { Armchair, BedDouble, Briefcase, CalendarClock, Cigarette, Smartphone, UtensilsCrossed } from 'lucide-react';
import type { ToneName } from '@/components/profile/profileTheme';

export type InterviewField =
  | 'lifestyle_occupation' | 'lifestyle_sitting_hours' | 'lifestyle_screen_time'
  | 'lifestyle_sleep_hours' | 'lifestyle_meal_regularity' | 'lifestyle_smoking'
  | 'lifestyle_alcohol' | 'lifestyle_training_days';

export interface InterviewOption {
  /** Stored as-is. */
  value: string;
  /** Read by a person. */
  label: string;
}

export interface InterviewControl {
  key: InterviewField;
  /** The control's own accessible name. */
  label: string;
  hint: string;
  options: readonly InterviewOption[];
}

export interface InterviewQuestion {
  /** Anchor id and pill target — `#q-<id>`. */
  id: string;
  /** The topic, as the pill and the "topics covered" list name it. */
  label: string;
  /** The question as it is asked out loud. */
  prompt: string;
  icon: LucideIcon;
  tone: ToneName;
  /** One control, or two where the topic has two independent answers. */
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

const SLEEP: readonly InterviewOption[] = [
  { value: '4.5', label: 'Under 5 hours' },
  { value: '5.5', label: '5 – 6 hours' },
  { value: '6.5', label: '6 – 7 hours' },
  { value: '7.5', label: '7 – 8 hours' },
  { value: '8.5', label: '8+ hours' },
];

export const INTERVIEW_QUESTIONS: readonly InterviewQuestion[] = [
  {
    id: 'occupation',
    label: 'Occupation',
    prompt: 'What kind of work does the client do?',
    icon: Briefcase,
    tone: 'indigo',
    controls: [{
      key: 'lifestyle_occupation',
      label: 'Type of work',
      hint: 'Changes recovery and which hours a plan has to fit.',
      options: [
        { value: 'desk_job', label: 'Desk job' },
        { value: 'active_job', label: 'Active job — on their feet' },
        { value: 'physical_labor', label: 'Physical labour' },
        { value: 'driver', label: 'Driver' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'police', label: 'Police / security' },
        { value: 'fitness_professional', label: 'Fitness professional' },
        { value: 'student', label: 'Student' },
        { value: 'homemaker', label: 'Homemaker' },
        { value: 'retired', label: 'Retired' },
        { value: 'other', label: 'Other' },
      ],
    }],
  },
  {
    id: 'sitting',
    label: 'Daily sitting',
    prompt: 'How long do they sit on a typical day?',
    icon: Armchair,
    tone: 'mint',
    controls: [{
      key: 'lifestyle_sitting_hours',
      label: 'Sitting hours',
      hint: 'A work-day average is close enough.',
      options: SITTING,
    }],
  },
  {
    id: 'screen-time',
    label: 'Screen time',
    prompt: 'How much screen time do they get?',
    icon: Smartphone,
    tone: 'rose',
    controls: [{
      key: 'lifestyle_screen_time',
      label: 'Screen time',
      hint: 'Work and leisure together.',
      options: [
        { value: '<2', label: 'Under 2 hours' },
        { value: '2_4', label: '2 – 4 hours' },
        { value: '4_6', label: '4 – 6 hours' },
        { value: '6_8', label: '6 – 8 hours' },
        { value: '8_plus', label: '8+ hours' },
      ],
    }],
  },
  {
    id: 'sleep',
    label: 'Sleep',
    prompt: 'How much do they sleep?',
    icon: BedDouble,
    tone: 'gold',
    controls: [{
      key: 'lifestyle_sleep_hours',
      label: 'Sleep per night',
      hint: 'Over the last two to four weeks.',
      options: SLEEP,
    }],
  },
  {
    id: 'meals',
    label: 'Meal pattern',
    prompt: 'How regular are their meals?',
    icon: UtensilsCrossed,
    tone: 'berry',
    controls: [{
      key: 'lifestyle_meal_regularity',
      label: 'Meal regularity',
      hint: 'How often meals land at roughly the same time.',
      options: [
        { value: 'regular', label: 'Mostly regular' },
        { value: 'irregular', label: 'Irregular' },
        { value: 'inconsistent', label: 'Frequently skipped' },
      ],
    }],
  },
  {
    id: 'substances',
    label: 'Smoking & alcohol',
    prompt: 'Any smoking or drinking?',
    icon: Cigarette,
    tone: 'violet',
    // Two columns, two answers — never one combined score.
    controls: [
      {
        key: 'lifestyle_smoking',
        label: 'Smoking',
        hint: 'Never, occasionally, daily, or stopped.',
        options: [
          { value: 'never', label: 'Never' },
          { value: 'occasionally', label: 'Occasionally' },
          { value: 'daily', label: 'Daily' },
          { value: 'former', label: 'Formerly' },
        ],
      },
      {
        key: 'lifestyle_alcohol',
        label: 'Alcohol',
        hint: 'How often they drink.',
        options: [
          { value: 'never', label: 'Never' },
          { value: 'occasionally', label: 'Occasionally' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'frequently', label: 'Frequently' },
        ],
      },
    ],
  },
  {
    id: 'training-days',
    label: 'Training days',
    prompt: 'How many days a week can they train?',
    icon: CalendarClock,
    tone: 'sky',
    controls: [{
      key: 'lifestyle_training_days',
      label: 'Days a week',
      hint: 'Realistic sessions, not best-case ones.',
      options: [
        { value: '3', label: '3 days a week' },
        { value: '4', label: '4 days a week' },
        { value: '5', label: '5 days a week' },
        { value: '6', label: '6 days a week' },
      ],
    }],
  },
] as const;

/** Every answered field, in the order it appears. One per control. */
export const INTERVIEW_FIELDS: readonly InterviewField[] =
  INTERVIEW_QUESTIONS.flatMap((q) => q.controls.map((c) => c.key));

/** '' is "not answered" — the selects render a "Not provided" placeholder. */
export type Answers = Record<InterviewField, string>;

export const EMPTY_ANSWERS: Answers = Object.fromEntries(
  INTERVIEW_FIELDS.map((k) => [k, '']),
) as Answers;

/** Has this topic got at least one of its answers? Used by the covered list. */
export function topicAnswered(question: InterviewQuestion, answers: Answers): boolean {
  return question.controls.some((c) => (answers[c.key] ?? '').trim() !== '');
}

/** All of this topic's answers — what the card's "Answered" mark means. */
export function topicComplete(question: InterviewQuestion, answers: Answers): boolean {
  return question.controls.every((c) => (answers[c.key] ?? '').trim() !== '');
}

export function answeredCount(answers: Answers): number {
  return INTERVIEW_FIELDS.filter((k) => (answers[k] ?? '').trim() !== '').length;
}
