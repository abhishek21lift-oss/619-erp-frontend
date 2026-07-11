// Shared form shape for the Goal Assessment module — imported by the main
// page and every step component so they don't depend on each other.

export type GoalType =
  | 'fat_loss' | 'muscle_gain' | 'body_recomposition' | 'strength_gain' | 'powerlifting'
  | 'endurance' | 'general_fitness' | 'mobility' | 'marathon_prep' | 'wedding_transformation'
  | 'medical_fitness' | 'senior_fitness' | 'athletic_performance' | 'custom';

export type PriorityGoal = 'fat_loss' | 'muscle_gain' | 'strength' | 'health' | 'performance' | 'lifestyle' | 'endurance' | 'posture' | 'nutrition' | 'recovery';

export interface LifestyleAnswers {
  can_train_4_6_days: boolean | null;
  meal_prep_possible: boolean | null;
  sleep_7_8_hours: boolean | null;
  drink_enough_water: boolean | null;
  family_support: boolean | null;
  medical_restrictions: boolean | null;
}

export interface GoalFormData {
  goalType: GoalType | '';
  goalName: string;
  goalDescription: string;

  targetWeight: string;
  targetBodyFat: string;
  targetDate: string;

  priorityGoal: PriorityGoal | '';

  motivationLevel: string;
  commitmentLevel: string;
  motivationReason: string;

  biggestChallenges: string[];
  challengeOther: string;

  lifestyle: LifestyleAnswers;

  startingWeightManual: string;
  startingBodyFatManual: string;

  notes: string;
}

export interface FormErrors {
  primaryGoal?: string;
  targetWeight?: string;
  targetBodyFat?: string;
  deadline?: string;
  priority?: string;
  motivation?: string;
  challenges?: string;
  lifestyle?: string;
}

export const GOAL_TYPE_META: { value: GoalType; label: string; icon: string }[] = [
  { value: 'fat_loss', label: 'Fat Loss', icon: '🏋️' },
  { value: 'muscle_gain', label: 'Muscle Gain', icon: '💪' },
  { value: 'body_recomposition', label: 'Body Recomposition', icon: '⚖️' },
  { value: 'strength_gain', label: 'Strength Gain', icon: '🔥' },
  { value: 'powerlifting', label: 'Powerlifting', icon: '🏆' },
  { value: 'endurance', label: 'Improve Endurance', icon: '🏃' },
  { value: 'general_fitness', label: 'General Fitness', icon: '❤️' },
  { value: 'mobility', label: 'Improve Mobility', icon: '🤸' },
  { value: 'marathon_prep', label: 'Marathon Preparation', icon: '🏃' },
  { value: 'wedding_transformation', label: 'Wedding Transformation', icon: '👰' },
  { value: 'medical_fitness', label: 'Medical Fitness', icon: '🩺' },
  { value: 'senior_fitness', label: 'Senior Fitness', icon: '👵' },
  { value: 'athletic_performance', label: 'Athletic Performance', icon: '⚡' },
  { value: 'custom', label: 'Custom Goal', icon: '🎯' },
];

export const PRIORITY_META: { value: PriorityGoal; label: string; icon: string }[] = [
  { value: 'fat_loss', label: 'Fat Loss', icon: '🔥' },
  { value: 'muscle_gain', label: 'Muscle Gain', icon: '💪' },
  { value: 'strength', label: 'Strength', icon: '🏋️' },
  { value: 'health', label: 'Health', icon: '❤️' },
  { value: 'performance', label: 'Performance', icon: '⚡' },
  { value: 'lifestyle', label: 'Lifestyle', icon: '😌' },
  { value: 'endurance', label: 'Endurance', icon: '🏃' },
  { value: 'posture', label: 'Posture', icon: '📏' },
  { value: 'nutrition', label: 'Nutrition', icon: '🥗' },
  { value: 'recovery', label: 'Recovery', icon: '😴' },
];

export const STEPS = [
  { id: 1, key: 'primaryGoal', label: 'Primary Goal' },
  { id: 2, key: 'targetWeight', label: 'Target Weight' },
  { id: 3, key: 'targetBodyFat', label: 'Target Body Fat' },
  { id: 4, key: 'deadline', label: 'Deadline' },
  { id: 5, key: 'priority', label: 'Priority' },
  { id: 6, key: 'motivation', label: 'Motivation' },
  { id: 7, key: 'challenges', label: 'Challenges' },
  { id: 8, key: 'lifestyle', label: 'Lifestyle' },
] as const;

export type StepId = typeof STEPS[number]['id'];

export function initGoalForm(): GoalFormData {
  return {
    goalType: '', goalName: '', goalDescription: '',
    targetWeight: '', targetBodyFat: '', targetDate: '',
    priorityGoal: '',
    motivationLevel: '7', commitmentLevel: '7', motivationReason: '',
    biggestChallenges: [], challengeOther: '',
    lifestyle: {
      can_train_4_6_days: null, meal_prep_possible: null, sleep_7_8_hours: null,
      drink_enough_water: null, family_support: null, medical_restrictions: null,
    },
    startingWeightManual: '', startingBodyFatManual: '',
    notes: '',
  };
}

export const n = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const f = parseFloat(t);
  return Number.isFinite(f) ? f : null;
};
