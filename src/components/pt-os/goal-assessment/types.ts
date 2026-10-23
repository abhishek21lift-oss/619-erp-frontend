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
  { id: 2, key: 'smartGoal', label: 'SMART Goal' },
  { id: 3, key: 'measureTarget', label: 'Measure & Target' },
  { id: 4, key: 'deadline', label: 'Deadline' },
  { id: 5, key: 'priority', label: 'Priority & Agreement' },
  { id: 6, key: 'motivation', label: 'Motivation & Confidence' },
  { id: 7, key: 'challenges', label: 'Challenges & Barriers' },
  { id: 8, key: 'lifestyle', label: 'Lifestyle & Routine' },
  { id: 9, key: 'schedule', label: 'Training Availability' },
  { id: 10, key: 'milestones', label: 'Time Horizons' },
  { id: 11, key: 'assessmentReview', label: 'Assessment & Review' },
] as const;

export const LAST_STEP = STEPS[STEPS.length - 1].id;
export type StepId = typeof STEPS[number]['id'];

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
