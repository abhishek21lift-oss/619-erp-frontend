// Shared form shape for the Goal Assessment module — imported by the main
// page and every step component so they don't depend on each other.

import {
  Accessibility, Dumbbell, Flame, Footprints, Gem, Heart, Leaf, Moon,
  PersonStanding, Ruler, Salad, Scale, Stethoscope, Target, Trophy,
  TrendingDown, Weight, Wind, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BarrierPlan, GoalMeasureMetric, GoalMilestone, TimeOfDay } from '@/lib/goal-plan';

export type GoalType =
  | 'fat_loss' | 'muscle_gain' | 'body_recomposition' | 'strength_gain' | 'powerlifting'
  | 'endurance' | 'general_fitness' | 'mobility' | 'marathon_prep' | 'wedding_transformation'
  | 'medical_fitness' | 'senior_fitness' | 'athletic_performance' | 'custom';

export type PriorityGoal = 'fat_loss' | 'muscle_gain' | 'strength' | 'health' | 'performance' | 'lifestyle' | 'endurance' | 'posture' | 'nutrition' | 'recovery';

/**
 * A secondary fitness goal rides on the primary goal record.
 *
 * It is deliberately not a second pt_goals row: one goal per client is the
 * active one (is_active + deactivateOtherGoals), and member self-service goals
 * live in member_goals. Storing the list here keeps both rules intact.
 */
export interface SecondaryGoalDraft {
  id: string;
  title: string;
  goalType: GoalType | '';
  description: string;
  targetDate: string;
}

/** The wire shape stored in pt_goals.secondary_goals. */
export interface SecondaryGoalPayload {
  id: string;
  title: string;
  goal_type: GoalType | null;
  description: string | null;
  target_date: string | null;
}

export const MAX_SECONDARY_GOALS = 6;

let secondaryGoalSeq = 0;

export function emptySecondaryGoal(): SecondaryGoalDraft {
  secondaryGoalSeq += 1;
  return {
    // Only created from a click, never during render, so this cannot differ
    // between the server and client.
    id: `sg-${Date.now().toString(36)}-${secondaryGoalSeq}`,
    title: '',
    goalType: '',
    description: '',
    targetDate: '',
  };
}

/**
 * The six readiness questions feed `calcLifestyleReadinessScore` and its
 * backend twin — that key list is fixed, so the four daily-routine keys below
 * add context to the plan without silently changing a stored score.
 */
export interface LifestyleAnswers {
  can_train_4_6_days: boolean | null;
  meal_prep_possible: boolean | null;
  sleep_7_8_hours: boolean | null;
  drink_enough_water: boolean | null;
  family_support: boolean | null;
  medical_restrictions: boolean | null;
  // Daily routine — plan shaping only, not scored.
  consistent_schedule: boolean | null;
  regular_training_time: boolean | null;
  stress_managed: boolean | null;
  willing_to_track: boolean | null;
}

export interface GoalFormData {
  goalType: GoalType | '';
  goalName: string;
  goalDescription: string;

  // SMART statement + the metric the client will judge success by.
  successMetric: string;

  /**
   * K11 measurable target. Weight and body fat still use their first-class
   * columns/fields; the other three are stored in routine_blueprint.k11.
   */
  targetMetric: GoalMeasureMetric | '';
  targetExercise: string;
  targetStart: string;
  targetValue: string;
  targetUnit: string;
  customMetric: string;

  targetWeight: string;
  targetBodyFat: string;
  targetDate: string;

  priorityGoal: PriorityGoal | '';
  /** K11 Relevant: the client has seen and agreed to this goal. */
  clientAgreed: boolean;
  clientExpectation: string;

  motivationLevel: string;
  confidenceLevel: string;
  commitmentLevel: string;
  motivationReason: string;

  biggestChallenges: string[];
  challengeOther: string;
  /** One mitigation plan per selected challenge. */
  barrierPlans: BarrierPlan[];

  /** Optional extra fitness goals attached to this primary goal record. */
  secondaryGoals: SecondaryGoalDraft[];

  lifestyle: LifestyleAnswers;

  startingWeightManual: string;
  startingBodyFatManual: string;

  notes: string;

  // SMART scheduling / routine architecture
  trainingDays: string;
  /** Weekday names, e.g. ['Monday','Thursday'] — may be shorter than trainingDays. */
  preferredDays: string[];
  sessionMinutes: string;
  timeOfDay: TimeOfDay;
  experienceLevel: string;
  equipment: string;
  status: 'active' | 'paused' | 'completed' | 'archived';

  milestones: GoalMilestone[];
  shortTermWeeks: string;
  mediumTermWeeks: string;

  /** K11 check-in date; mirrored to pt_goals.review_date on save. */
  reviewDate: string;
}

/**
 * Lifestyle context already recorded by the Client Interview, Lifestyle,
 * Nutrition and PAR-Q modules. Read-only in the goal wizard — one owner per
 * record, so the goal cannot drift from the source.
 */
export interface ClientContext {
  occupation: string | null;
  sittingHours: number | null;
  screenTime: string | null;
  sleepHours: number | null;
  stressLevel: number | null;
  mealRegularity: string | null;
  dietPreferences: string[];
  foodAllergies: string[];
  smoking: string | null;
  alcohol: string | null;
  sedentaryRisk: string | null;
}

export interface RetestInfo {
  date: string | null;
  label: string;
  state: string;
  cadenceMonths: number | null;
}

export interface FormErrors {
  primaryGoal?: string;
  smartGoal?: string;
  measureTarget?: string;
  deadline?: string;
  priority?: string;
  motivation?: string;
  challenges?: string;
  lifestyle?: string;
  schedule?: string;
  milestones?: string;
  assessmentReview?: string;
  agreement?: string;
  review?: string;
}

/**
 * Goal and priority metadata.
 *
 * `icon` is a Lucide component, not an emoji string. It was 🏋️ / 💪 / ⚖️ and
 * so on, which renders as a different picture on every platform, ignores the
 * chip's selected-state colour because emoji carry their own, and cannot be
 * sized against the label. Storing the component rather than an element keeps
 * this file .ts — the call sites render `<meta.icon size={18} />`.
 */
export const GOAL_TYPE_META: { value: GoalType; label: string; icon: LucideIcon }[] = [
  { value: 'fat_loss',                 label: 'Fat Loss',                icon: TrendingDown },
  { value: 'muscle_gain',              label: 'Muscle Gain',             icon: Dumbbell },
  { value: 'body_recomposition',       label: 'Body Recomposition',      icon: Scale },
  { value: 'strength_gain',            label: 'Strength Gain',           icon: Flame },
  { value: 'powerlifting',             label: 'Powerlifting',            icon: Trophy },
  { value: 'endurance',                label: 'Improve Endurance',       icon: Wind },
  { value: 'general_fitness',          label: 'General Fitness',         icon: Heart },
  { value: 'mobility',                 label: 'Improve Mobility',        icon: PersonStanding },
  // 'endurance' and 'marathon_prep' were both 🏃 — two goals, one picture.
  { value: 'marathon_prep',            label: 'Marathon Preparation',    icon: Footprints },
  { value: 'wedding_transformation',   label: 'Wedding Transformation',  icon: Gem },
  { value: 'medical_fitness',          label: 'Medical Fitness',         icon: Stethoscope },
  { value: 'senior_fitness',           label: 'Senior Fitness',          icon: Accessibility },
  { value: 'athletic_performance',     label: 'Athletic Performance',    icon: Zap },
  { value: 'custom',                   label: 'Custom Goal',             icon: Target },
];

export const PRIORITY_META: { value: PriorityGoal; label: string; icon: LucideIcon }[] = [
  { value: 'fat_loss',    label: 'Fat Loss',    icon: Flame },
  { value: 'muscle_gain', label: 'Muscle Gain', icon: Dumbbell },
  { value: 'strength',    label: 'Strength',    icon: Weight },
  { value: 'health',      label: 'Health',      icon: Heart },
  { value: 'performance', label: 'Performance', icon: Zap },
  { value: 'lifestyle',   label: 'Lifestyle',   icon: Leaf },
  { value: 'endurance',   label: 'Endurance',   icon: Wind },
  { value: 'posture',     label: 'Posture',     icon: Ruler },
  { value: 'nutrition',   label: 'Nutrition',   icon: Salad },
  { value: 'recovery',    label: 'Recovery',    icon: Moon },
];

export const STEPS = [
  { id: 1, key: 'primaryGoal', label: 'Primary Goal' },
  { id: 2, key: 'smartGoal', label: 'SMART Goal Definition' },
  { id: 3, key: 'measureTarget', label: 'Measurement & Target' },
  { id: 4, key: 'deadline', label: 'Deadline' },
  { id: 5, key: 'milestones', label: 'Time Horizons' },
  { id: 6, key: 'priority', label: 'Goal Priority' },
  { id: 7, key: 'motivation', label: 'Motivation & Confidence' },
  { id: 8, key: 'challenges', label: 'Challenges & Barriers' },
  { id: 9, key: 'lifestyle', label: 'Lifestyle & Routine' },
  { id: 10, key: 'schedule', label: 'Training Availability' },
  { id: 11, key: 'review', label: 'Review & Client Sign-off' },
] as const;

export const LAST_STEP = STEPS[STEPS.length - 1].id;
export type StepId = typeof STEPS[number]['id'];

const GOAL_TYPE_VALUES = new Set<string>(GOAL_TYPE_META.map((g) => g.value));

/** Read `pt_goals.secondary_goals` into editable rows, dropping junk. */
export function secondaryGoalsFromRow(value: unknown): SecondaryGoalDraft[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return [];
    const row = raw as Record<string, unknown>;
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    if (!title) return [];
    const goalType: GoalType | '' = typeof row.goal_type === 'string' && GOAL_TYPE_VALUES.has(row.goal_type)
      ? row.goal_type as GoalType
      : '';
    return [{
      id: typeof row.id === 'string' && row.id ? row.id : `sg-row-${index}`,
      title,
      goalType,
      description: typeof row.description === 'string' ? row.description : '',
      targetDate: typeof row.target_date === 'string' ? row.target_date.slice(0, 10) : '',
    }];
  }).slice(0, MAX_SECONDARY_GOALS);
}

/** The wire shape for the API; an empty list is stored as NULL. */
export function secondaryGoalsPayload(goals: SecondaryGoalDraft[]): SecondaryGoalPayload[] | null {
  const rows = goals
    .filter((g) => g.title.trim())
    .slice(0, MAX_SECONDARY_GOALS)
    .map((g) => ({
      id: g.id,
      title: g.title.trim(),
      goal_type: g.goalType || null,
      description: g.description.trim() || null,
      target_date: g.targetDate || null,
    }));
  return rows.length ? rows : null;
}

/** Secondary goals are optional, but a row that exists must be complete. */
export function validateSecondaryGoals(goals: SecondaryGoalDraft[], today: string): string | undefined {
  for (const g of goals) {
    if (!g.title.trim()) return 'Give every secondary goal a name, or remove the empty row.';
    if (g.targetDate && g.targetDate < today) {
      return `The target date for "${g.title.trim()}" must be today or later.`;
    }
  }
  return undefined;
}

/** The client columns Enrollment writes and a new goal should start from. */
export interface GoalClientDefaults {
  workout_experience_level?: string | null;
  sessions_per_week?: number | string | null;
  /** The Interview owns training availability; enrolment's copy is fallback. */
  lifestyle_training_days?: number | string | null;
  interviewChallenges?: string[] | null;
  interviewMotivation?: string | null;

  // Read-only client availability from Enrolment. Goal Step 10 shows this
  // beside the programmed schedule so availability and prescription cannot be
  // mistaken for each other.
  session_minutes?: number | string | null;
  preferred_training_days?: string[] | null;
  preferred_workout_time?: string | null;
}

/**
 * A new goal starts from what Enrollment already recorded. The defaults in
 * initGoalForm() remain the fallback for a client with no enrolment record,
 * but they must not overwrite a real answer.
 */
export function initGoalFormForClient(client?: GoalClientDefaults | null): GoalFormData {
  const form = initGoalForm();
  const rawExperience = typeof client?.workout_experience_level === 'string'
    ? client.workout_experience_level.trim().toLowerCase()
    : '';
  const experience = ['beginner', 'intermediate', 'advanced'].includes(rawExperience)
    ? rawExperience
    : form.experienceLevel;
  const rawInterviewDays = client?.lifestyle_training_days;
  const interviewDays = rawInterviewDays == null || rawInterviewDays === '' ? null : Number(rawInterviewDays);
  const rawSessions = client?.sessions_per_week;
  const sessions = rawSessions == null || rawSessions === '' ? null : Number(rawSessions);
  const days = Number.isInteger(interviewDays) && interviewDays! >= 1 && interviewDays! <= 7
    ? interviewDays
    : sessions;
  const trainingDays = Number.isInteger(days) && days! >= 1 && days! <= 7
    ? String(days)
    : form.trainingDays;
  const challenges = Array.isArray(client?.interviewChallenges)
    ? client.interviewChallenges.filter((c) => typeof c === 'string' && c.trim())
    : [];
  const motivationReason = typeof client?.interviewMotivation === 'string'
    ? client.interviewMotivation.trim()
    : '';
  return {
    ...form,
    experienceLevel: experience,
    trainingDays,
    biggestChallenges: challenges.length ? challenges : form.biggestChallenges,
    motivationReason: motivationReason || form.motivationReason,
  };
}

export function initGoalForm(): GoalFormData {
  return {
    goalType: '', goalName: '', goalDescription: '',
    successMetric: '',
    targetMetric: '', targetExercise: '', targetStart: '', targetValue: '', targetUnit: 'kg', customMetric: '',
    targetWeight: '', targetBodyFat: '', targetDate: '',
    priorityGoal: '',
    clientAgreed: false, clientExpectation: '',
    motivationLevel: '7', confidenceLevel: '7', commitmentLevel: '7', motivationReason: '',
    biggestChallenges: [], challengeOther: '', barrierPlans: [],
    secondaryGoals: [],
    lifestyle: {
      can_train_4_6_days: null, meal_prep_possible: null, sleep_7_8_hours: null,
      drink_enough_water: null, family_support: null, medical_restrictions: null,
      consistent_schedule: null, regular_training_time: null, stress_managed: null,
      willing_to_track: null,
    },
    startingWeightManual: '', startingBodyFatManual: '',
    notes: '',
    trainingDays: '3', preferredDays: [], sessionMinutes: '60', timeOfDay: 'flexible',
    experienceLevel: 'beginner', equipment: 'full_gym', status: 'active',
    milestones: [], shortTermWeeks: '8', mediumTermWeeks: '12',
    reviewDate: '',
  };
}

// One parser for every measurement in the app. See toMeasurementOrNull for
// what the five hand-rolled copies of this used to get wrong.
export { toMeasurementOrNull as n } from '@/lib/forms/normalize';
