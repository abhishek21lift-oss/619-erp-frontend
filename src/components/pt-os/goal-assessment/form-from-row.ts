// Reading a saved goal back into the wizard's form shape.
//
// This lives outside the page because a Next.js page module may only export
// its route contract — exporting a helper from page.tsx fails the generated
// route types. It also keeps the mapping testable without mounting the wizard.

import { barrierPlansFor } from '@/lib/goal-plan';
import type { BarrierPlan, GoalMilestone } from '@/lib/goal-plan';
import { CHALLENGE_OPTIONS } from './StepChallenges';
import { initGoalForm } from './types';
import type { GoalFormData } from './types';

const CHALLENGE_VALUES = new Set(CHALLENGE_OPTIONS.map((c) => c.value));

/**
 * The coaching block rides on routine_blueprint, which is written and read by
 * the goal wizard alone. `preferred_training_days`, `short_term_weeks`,
 * `medium_term_weeks` and `milestones` are real columns, so only what has no
 * column lives here — see docs/goal-setting-coaching-fields.md in the backend
 * for the migration that would give these their own columns.
 */
export interface CoachingBlock {
  success_metric?: string;
  confidence_level?: number;
  session_minutes?: number;
  time_of_day?: string;
  barrier_plans?: BarrierPlan[];
}

/** K11 measurable target stored in routine_blueprint.k11 (no migration). */
export interface K11MeasureBlock {
  metric?: 'weight' | 'body_fat' | 'lift' | 'sessions' | 'custom';
  exercise?: string | null;
  label?: string | null;
  current?: number | null;
  target?: number | null;
  unit?: string | null;
}

export interface K11Block {
  measure?: K11MeasureBlock | null;
  client_agreement?: boolean;
  client_expectation?: string | null;
}

export interface RoutineBlueprint {
  experience?: string;
  equipment?: string;
  coaching?: CoachingBlock;
  k11?: K11Block;
}

export function formFromGoalRow(row: Record<string, unknown>): GoalFormData {
  const fresh = initGoalForm();
  const challenges = Array.isArray(row.biggest_challenges) ? (row.biggest_challenges as string[]) : [];
  const lifestyleRaw = (row.lifestyle_readiness as Record<string, boolean> | null) || {};
  const blueprint = (row.routine_blueprint as RoutineBlueprint | null) || {};
  const coaching = blueprint.coaching || {};
  const k11 = blueprint.k11 || {};
  const measure = k11.measure || {};
  // Goals saved before the K11 wizard stored {label, date, type} milestones
  // with no description; reading one untouched crashed step 10 on
  // `value.length` inside FloatInput, so every saved field is settled here.
  const milestones: GoalMilestone[] = Array.isArray(row.milestones)
    ? (row.milestones as (Partial<GoalMilestone> | null)[]).flatMap((m) =>
        m && typeof m === 'object'
          ? [{
              type: m.type ?? 'short_term',
              label: String(m.label ?? ''),
              date: m.date ? String(m.date).slice(0, 10) : '',
              description: String(m.description ?? ''),
            }]
          : [])
    : [];
  const preferred = Array.isArray(row.preferred_training_days) ? (row.preferred_training_days as string[]) : [];
  const metric = measure.metric || (row.target_weight != null ? 'weight' : row.target_body_fat != null ? 'body_fat' : '');
  return {
    ...fresh,
    goalType: (row.goal_type as GoalFormData['goalType']) || '',
    goalName: row.goal_type === 'custom' ? String(row.goal_other ?? '') : '',
    goalDescription: String(row.goal_description ?? ''),
    successMetric: String(coaching.success_metric ?? ''),
    targetMetric: metric,
    targetExercise: String(measure.exercise ?? ''),
    targetStart: measure.current != null ? String(measure.current) : '',
    targetValue: measure.target != null ? String(measure.target) : '',
    targetUnit: metric === 'sessions' ? 'sessions/week' : String(measure.unit ?? 'kg'),
    customMetric: String(measure.label ?? ''),
    targetWeight: row.target_weight != null ? String(row.target_weight) : '',
    targetBodyFat: row.target_body_fat != null ? String(row.target_body_fat) : '',
    targetDate: row.target_date ? String(row.target_date).slice(0, 10) : '',
    priorityGoal: (row.priority_goal as GoalFormData['priorityGoal']) || '',
    clientAgreed: k11.client_agreement === true,
    clientExpectation: String(k11.client_expectation ?? ''),
    motivationLevel: row.motivation_level != null ? String(row.motivation_level) : '7',
    confidenceLevel: coaching.confidence_level != null ? String(coaching.confidence_level) : '7',
    commitmentLevel: row.commitment_level != null ? String(row.commitment_level) : '7',
    motivationReason: String(row.motivation_reason ?? ''),
    biggestChallenges: challenges.filter((c) => CHALLENGE_VALUES.has(c)),
    challengeOther: challenges.find((c) => !CHALLENGE_VALUES.has(c)) || '',
    barrierPlans: barrierPlansFor(challenges, Array.isArray(coaching.barrier_plans) ? coaching.barrier_plans : []),
    lifestyle: { ...fresh.lifestyle, ...lifestyleRaw },
    startingWeightManual: row.starting_weight != null ? String(row.starting_weight) : '',
    startingBodyFatManual: row.starting_body_fat_pct != null ? String(row.starting_body_fat_pct) : '',
    notes: String(row.notes ?? ''),
    trainingDays: row.training_days_per_week != null ? String(row.training_days_per_week) : '3',
    preferredDays: preferred,
    sessionMinutes: coaching.session_minutes != null ? String(coaching.session_minutes) : '60',
    timeOfDay: (coaching.time_of_day as GoalFormData['timeOfDay']) || 'flexible',
    // The blueprint is what the plan was built with; resetting these to the
    // wizard defaults made an edit silently rewrite an advanced client's plan.
    experienceLevel: String(blueprint.experience || fresh.experienceLevel),
    equipment: String(blueprint.equipment || fresh.equipment),
    status: (row.status as GoalFormData['status']) || (row.is_active ? 'active' : 'archived'),
    milestones,
    shortTermWeeks: row.short_term_weeks != null ? String(row.short_term_weeks) : '8',
    mediumTermWeeks: row.medium_term_weeks != null ? String(row.medium_term_weeks) : '12',
    reviewDate: row.review_date ? String(row.review_date).slice(0, 10) : '',
  };
}
