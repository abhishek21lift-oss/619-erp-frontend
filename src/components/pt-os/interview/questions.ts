// The Client Interview's questions, in the order a trainer asks them.
//
// ── Three topics, three answers ─────────────────────────────────────────────
//
// The trainer picks; nothing is typed free-hand. Each topic carries one
// control. Occupation, screen time, sleep, smoking and alcohol are asked in
// the Lifestyle Assessment, which owns those columns — one answer, one owner.
//
// ── Values are canonical, labels are for people ─────────────────────────────
//
// Every option's `value` is what the server stores, and the DB's CHECK
// constraints (backend migration 228) accept exactly that vocabulary. The
// numeric topic is stored as a number, so a band ("2–4 hours") is stored as
// the band's midpoint (3), which is the only honest number a band contains:
// the correct long-run error of a midpoint is zero, and it keeps the column's
// NUMERIC type meaningful instead of overloading it with tokens like '2_4'.
//
//   sitting hours   <2 → 1 · 2–4 → 3 · 4–6 → 5 · 6–8 → 7 · 8+ → 9
//   meal regularity regular · irregular · inconsistent
//                   ("frequently skipped" is the plan-facing reading of a
//                    meal pattern the column calls inconsistent)
//   training days   1 · 2 · 3 · 4 · 5 · 6 · 7   (migration 240 widened 0–7)
//
// The seven free-text questions this page used to ask — training history, pain
// and injuries, lifestyle, motivation, availability, preferences, notes — are
// gone from the form. The columns are untouched: saved answers stay on the
// record and the save below never writes over them.

import type { LucideIcon } from 'lucide-react';
import { Armchair, CalendarClock, UtensilsCrossed } from 'lucide-react';

export type InterviewField =
  | 'lifestyle_sitting_hours' | 'lifestyle_meal_regularity' | 'lifestyle_training_days';

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
  /** The answer controls for this topic. */
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

export const INTERVIEW_QUESTIONS: readonly InterviewQuestion[] = [
  {
    id: 'sitting',
    label: 'Daily sitting',
    prompt: 'How long do they sit on a typical day?',
    icon: Armchair,
    controls: [{
      key: 'lifestyle_sitting_hours',
      label: 'Sitting hours',
      hint: 'A work-day average is close enough.',
      options: SITTING,
    }],
  },
  {
    id: 'meals',
    label: 'Meal pattern',
    prompt: 'How regular are their meals?',
    icon: UtensilsCrossed,
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
    id: 'training-days',
    label: 'Training days',
    prompt: 'How many days a week can they train?',
    icon: CalendarClock,
    controls: [{
      key: 'lifestyle_training_days',
      label: 'Days a week',
      hint: 'Realistic sessions, not best-case ones.',
      options: [
        { value: '1', label: '1 day a week' },
        { value: '2', label: '2 days a week' },
        { value: '3', label: '3 days a week' },
        { value: '4', label: '4 days a week' },
        { value: '5', label: '5 days a week' },
        { value: '6', label: '6 days a week' },
        { value: '7', label: '7 days a week' },
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
