'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, Target, Plus,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageContainer, PageHero } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import {
  goalDirection, calcRequiredWeeklyRate, calcSafeWeeklyRateForMetric, classifyGoalDifficulty,
  calcEstimatedDurationWeeks, recommendPtDurationMonths, buildRiskFactors, calcLifestyleReadinessScore, daysRemaining,
} from '@/lib/goal-calculations';
import type { GoalMetric } from '@/lib/goal-calculations';
import {
  STEPS, LAST_STEP, GOAL_TYPE_META, PRIORITY_META, initGoalFormForClient, n,
} from '@/components/pt-os/goal-assessment/types';
import { formFromGoalRow } from '@/components/pt-os/goal-assessment/form-from-row';
import type { CoachingBlock, K11Block } from '@/components/pt-os/goal-assessment/form-from-row';
import type {
  GoalFormData, FormErrors, StepId, LifestyleAnswers, ClientContext, RetestInfo, GoalClientDefaults,
} from '@/components/pt-os/goal-assessment/types';
import StepPrimaryGoal from '@/components/pt-os/goal-assessment/StepPrimaryGoal';
import StepSmartGoal from '@/components/pt-os/goal-assessment/StepSmartGoal';
import StepMeasureTarget from '@/components/pt-os/goal-assessment/StepMeasureTarget';
import StepDeadline from '@/components/pt-os/goal-assessment/StepDeadline';
import StepPriority from '@/components/pt-os/goal-assessment/StepPriority';
import StepMotivationCommitment from '@/components/pt-os/goal-assessment/StepMotivationCommitment';
import StepChallenges, { selectedChallenges } from '@/components/pt-os/goal-assessment/StepChallenges';
import StepLifestyle from '@/components/pt-os/goal-assessment/StepLifestyle';
import StepSchedule from '@/components/pt-os/goal-assessment/StepSchedule';
import StepMilestones from '@/components/pt-os/goal-assessment/StepMilestones';
import StepAssessmentReview from '@/components/pt-os/goal-assessment/StepAssessmentReview';
import TrainingSchedulePreview from '@/components/pt-os/goal-assessment/TrainingSchedulePreview';
import MilestoneTracker from '@/components/pt-os/goal-assessment/MilestoneTracker';
import GoalAnalysisDashboard from '@/components/pt-os/goal-assessment/GoalAnalysisDashboard';
import GoalSummaryCard from '@/components/pt-os/goal-assessment/GoalSummaryCard';
import GoalTimeline from '@/components/pt-os/goal-assessment/GoalTimeline';
import GoalCard from '@/components/pt-os/goal-assessment/GoalCard';
import StepperTimeline from '@/components/pt-os/shared/StepperTimeline';
import BaselineScreeningCard, { parqBaselineState } from '@/components/pt-os/goal-assessment/BaselineScreeningCard';
import type { BaselineMetric, BaselineSource } from '@/components/pt-os/goal-assessment/BaselineScreeningCard';
import { errorMessage } from '@/lib/forms/errors';
import { todayISO } from '@/lib/forms/domain';
import { recommendTrainingSplit, buildRoutineBlueprint } from '@/lib/goal-scheduling';
import {
  barrierPlansFor, barrierPayload, formatWeeklyCommitment, TIME_OF_DAY_OPTIONS,
  validateMilestones, weeklyCommitmentMinutes,
} from '@/lib/goal-plan';
import type { GoalMeasure } from '@/lib/goal-plan';
import type { ParqForm } from '@/lib/api/types';
import type { ClientInterview } from '@/lib/journey';
import { rangeIssue } from '@/lib/forms/ranges';
import JourneyNextButton from '@/components/pt-os/client/JourneyNextButton';

const EASE = [0.16, 1, 0.3, 1] as const;

function labelFor<T extends { value: string; label: string }>(list: T[], value: string): string {
  return list.find((o) => o.value === value)?.label || '';
}

/** Whole weeks in the 1–52 range the backend accepts. */
function periodWeeks(value: string, fallback: number): number {
  const weeks = parseInt(value, 10);
  if (!Number.isFinite(weeks)) return fallback;
  return Math.max(1, Math.min(52, weeks));
}

function validateMeasure(form: GoalFormData, currentWeight: number | null, currentBodyFat: number | null): string | undefined {
  const metric = form.targetMetric;
  if (!metric) {
    if (!form.successMetric.trim()) return 'Choose what will be measured, or write a success metric in the SMART step.';
    return undefined;
  }
  if (metric === 'weight') {
    if (currentWeight == null && !form.startingWeightManual.trim()) return 'Enter a starting weight so the target can be checked.';
    if (!form.targetWeight.trim()) return 'Enter a target weight, or choose a different measure.';
    return rangeIssue(['Target weight', form.targetWeight, 25, 300, 'kg'], ['Starting weight', form.startingWeightManual, 25, 350, 'kg']);
  }
  if (metric === 'body_fat') {
    if (currentBodyFat == null && !form.startingBodyFatManual.trim()) return 'Enter a starting body fat so the target can be checked.';
    if (!form.targetBodyFat.trim()) return 'Enter a target body fat, or choose a different measure.';
    return rangeIssue(['Target body fat', form.targetBodyFat, 3, 60, '%'], ['Starting body fat', form.startingBodyFatManual, 2, 75, '%']);
  }
  if (metric === 'lift') {
    if (!form.targetExercise.trim()) return 'Name the exercise being measured.';
    if (!form.targetStart.trim()) return 'Enter the current lift — without a baseline the target cannot be checked.';
    if (!form.targetValue.trim()) return 'Enter the target lift.';
    return rangeIssue(['Current lift', form.targetStart, 1, 1000], ['Target lift', form.targetValue, 1, 1000]);
  }
  if (metric === 'sessions') {
    if (!form.targetValue.trim()) return 'Enter the target sessions per week.';
    return rangeIssue(['Current sessions', form.targetStart, 0, 14], ['Target sessions', form.targetValue, 1, 14]);
  }
  if (metric === 'custom') {
    if (!form.customMetric.trim()) return 'Name the custom measure.';
    if (!form.targetValue.trim()) return 'Enter the target value.';
    return rangeIssue(['Current value', form.targetStart, 0, 10000], ['Target value', form.targetValue, 1, 10000]);
  }
  return undefined;
}

function validateStep(id: StepId, form: GoalFormData, today: string, currentWeight: number | null, currentBodyFat: number | null): string | undefined {
  if (id === 1) {
    if (!form.goalType) return 'Please select a primary goal.';
    if (form.goalType === 'custom' && !form.goalName.trim()) return 'Please name the custom goal.';
  }
  // The statement used to be collected for custom goals only, so a standard
  // goal was stored with no description at all.
  if (id === 2 && !form.goalDescription.trim()) {
    return 'Write the goal in one sentence so it can be measured.';
  }
  if (id === 3) return validateMeasure(form, currentWeight, currentBodyFat);
  if (id === 4 && !form.targetDate) return 'Please choose a target date.';
  // A past target date used to be accepted, and the whole analysis then came
  // back blank without a word.
  if (id === 4 && form.targetDate < today) return 'The target date must be today or later.';
  if (id === 5 && !form.priorityGoal) return 'Please select a top priority.';
  if (id === 5 && !form.clientAgreed) return 'Confirm that the client has seen this goal and agrees with it.';
  if (id === 7) {
    const missing = selectedChallenges(form).find((c) => !form.barrierPlans.find((p) => p.challenge === c && p.plan.trim()));
    if (missing) return `Write a plan for "${missing}", or remove it from the challenges.`;
  }
  if (id === 9) {
    if (!form.trainingDays) return 'Please choose training days.';
    if (!form.sessionMinutes) return 'Please choose a session length.';
  }
  if (id === 10) {
    if (!form.milestones.length) return 'Add at least one milestone, or accept the suggested ones.';
    const horizons = [
      { type: 'short_term', label: 'short-term' },
      { type: 'medium_term', label: 'medium-term' },
      { type: 'long_term', label: 'long-term' },
    ] as const;
    const missing = horizons.find((h) => !form.milestones.some((m) => m.type === h.type));
    if (missing) return `Add a ${missing.label} milestone — K11 needs all three horizons.`;
    return validateMilestones(form.milestones, today, form.targetDate || null);
  }
  if (id === 11 && form.reviewDate && form.reviewDate < today) return 'The review date must be today or later.';
  return undefined;
}

function buildLifestylePayload(l: LifestyleAnswers): Record<string, boolean> | undefined {
  const entries = Object.entries(l).filter(([, v]) => v !== null) as [string, boolean][];
  return entries.length ? Object.fromEntries(entries) : undefined;
}

/** The form's measurable target in the shape the summary/card/analysis use. */
function measureForForm(form: GoalFormData, currentWeight: number | null, currentBodyFat: number | null): GoalMeasure | null {
  const metric = form.targetMetric;
  if (!metric) return null;
  if (metric === 'weight') return { metric, current: currentWeight, target: n(form.targetWeight), unit: 'kg' };
  if (metric === 'body_fat') return { metric, current: currentBodyFat, target: n(form.targetBodyFat), unit: '%' };
  if (metric === 'lift') {
    return {
      metric, current: n(form.targetStart), target: n(form.targetValue),
      unit: form.targetUnit.trim() || 'kg', exercise: form.targetExercise.trim() || null,
    };
  }
  if (metric === 'sessions') return { metric, current: n(form.targetStart), target: n(form.targetValue), unit: 'sessions/week' };
  return {
    metric, current: n(form.targetStart), target: n(form.targetValue),
    unit: form.targetUnit.trim(), label: form.customMetric.trim() || null,
  };
}

export default function PtGoalsPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>}>
        <GoalsContent />
      </Suspense>
    </Guard>
  );
}

function GoalsContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker title="Goal Setting" icon={<Target size={20} color="#fff" />} basePath="/pt-os/goals" />;
  return <GoalsHub key={clientId} clientId={clientId} router={router} toast={toast} />;
}

/* ─────────────────────────────────────────────────────── HUB (list + wizard) */
interface GoalsHubProps {
  clientId: string;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>['toast'];
}

/** What the plan is built on, read from the modules that own each record. */
interface BaselineInfo {
  assessment: {
    weight: number | null;
    bodyFat: number | null;
    bmi: number | null;
    bpSystolic: number | null;
    bpDiastolic: number | null;
    stepTest: string | null;
    cardioCategory: string | null;
    vo2Max: number | null;
    strengthScore: number | null;
    flexibilityCategory: string | null;
    flexibilityScore: number | null;
    date: string | null;
  };
  parq: { status: string | null; date: string | null; riskLevel: string | null };
  lifestyle: { sleepHours: number | null; stressLevel: number | null; date: string | null };
  nutrition: { waterLiters: number | null; mealRegularity: string | null; preferences: string[]; allergies: string[]; date: string | null };
  interview: { date: string | null; completed: boolean };
}

const EMPTY_BASELINE: BaselineInfo = {
  assessment: {
    weight: null, bodyFat: null, bmi: null, bpSystolic: null, bpDiastolic: null,
    stepTest: null, cardioCategory: null, vo2Max: null, strengthScore: null,
    flexibilityCategory: null, flexibilityScore: null, date: null,
  },
  parq: { status: null, date: null, riskLevel: null },
  lifestyle: { sleepHours: null, stressLevel: null, date: null },
  nutrition: { waterLiters: null, mealRegularity: null, preferences: [], allergies: [], date: null },
  interview: { date: null, completed: false },
};

const EMPTY_CONTEXT: ClientContext = {
  occupation: null, sittingHours: null, screenTime: null, sleepHours: null, stressLevel: null,
  mealRegularity: null, dietPreferences: [], foodAllergies: [], smoking: null, alcohol: null, sedentaryRisk: null,
};

const EMPTY_RETEST: RetestInfo = { date: null, label: '', state: '', cadenceMonths: null };

const isoDate = (v: unknown): string | null => (v ? String(v).slice(0, 10) : null);
const numberOrNull = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
};
const stringOrNull = (v: unknown): string | null => (v == null || v === '' ? null : String(v));
const stringList = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);

function GoalsHub({ clientId, toast }: GoalsHubProps) {
  const [clientName, setClientName] = useState('');
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [latestBodyFat, setLatestBodyFat] = useState<number | null>(null);
  // Sleep and water are asked in Lifestyle and Nutrition. A new goal's
  // readiness answers start from them rather than asking a second time.
  const [habits, setHabits] = useState<Partial<LifestyleAnswers>>({});
  const [baseline, setBaseline] = useState<BaselineInfo>(EMPTY_BASELINE);
  const [context, setContext] = useState<ClientContext>(EMPTY_CONTEXT);
  const [clientDefaults, setClientDefaults] = useState<GoalClientDefaults>({});
  const [retest, setRetest] = useState<RetestInfo>(EMPTY_RETEST);
  const [goals, setGoals] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, assessRes, goalsRes, lifestyleRes, nutritionRes, parqRes, interviewRes, retestRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.assessments.list({ client_id: clientId, limit: 1 }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.goals.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.lifestyleAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.nutritionAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.parqForms.list({ client_id: clientId }) as Promise<{ data?: ParqForm[] }>,
        // Both are optional context: a client without an interview or a
        // re-test schedule must still be able to set a goal.
        api.pt.interviews.list(clientId).catch(() => ({ data: [] as ClientInterview[] })),
        api.progress.retest.get(clientId).catch(() => null),
      ]);
      const lifestyleRow = (lifestyleRes?.data ?? [])[0] ?? {};
      const nutritionRow = (nutritionRes?.data ?? [])[0] ?? {};
      const parqRow = (parqRes?.data ?? [])[0] ?? {};
      const parqHistory = parqRow.past_history ?? {};
      const interviews = Array.isArray(interviewRes?.data) ? interviewRes.data : [];
      const interview = (interviews.find((i) => i.status === 'completed') ?? interviews[0]) as ClientInterview | undefined;
      // Sleep, smoking and alcohol belong to the Lifestyle assessment; the
      // Interview is qualitative history and must not be a second source.
      const sleep = numberOrNull(lifestyleRow.sleep_duration_hours);
      const water = numberOrNull(nutritionRow.water_intake_liters);
      setHabits({
        ...(sleep != null && sleep > 0 ? { sleep_7_8_hours: sleep >= 7 } : {}),
        ...(water != null && water > 0 ? { drink_enough_water: water >= 2.5 } : {}),
      });
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setClientDefaults({
        workout_experience_level: stringOrNull(c.workout_experience_level),
        sessions_per_week: numberOrNull(c.sessions_per_week),
      });

      const latest = Array.isArray(assessRes?.data) ? assessRes.data[0] : null;
      const weight = numberOrNull(latest?.weight);
      const bodyFat = numberOrNull(latest?.body_fat_pct);
      setLatestWeight(weight);
      setLatestBodyFat(bodyFat);

      setBaseline({
        assessment: {
          weight, bodyFat,
          bmi: numberOrNull(latest?.bmi),
          bpSystolic: numberOrNull(latest?.bp_systolic),
          bpDiastolic: numberOrNull(latest?.bp_diastolic),
          stepTest: stringOrNull(latest?.cardio_test_type),
          cardioCategory: stringOrNull(latest?.cardio_category),
          vo2Max: numberOrNull(latest?.vo2_max),
          strengthScore: numberOrNull(latest?.strength_score_computed),
          flexibilityCategory: stringOrNull(latest?.flexibility_category),
          flexibilityScore: numberOrNull(latest?.mobility_score_computed),
          date: isoDate(latest?.assessment_date ?? latest?.created_at),
        },
        parq: {
          status: parqRow.status ? String(parqRow.status) : null,
          date: isoDate(parqRow.assessment_date ?? parqRow.created_at),
          riskLevel: parqRow.risk_level ? String(parqRow.risk_level) : null,
        },
        lifestyle: {
          sleepHours: sleep != null && sleep > 0 ? sleep : null,
          stressLevel: numberOrNull(lifestyleRow.stress_level),
          date: isoDate(lifestyleRow.assessment_date ?? lifestyleRow.created_at),
        },
        nutrition: {
          waterLiters: water != null && water > 0 ? water : null,
          mealRegularity: stringOrNull(nutritionRow.meal_timing_consistency),
          preferences: stringList(nutritionRow.diet_preferences),
          allergies: stringList(nutritionRow.food_allergies),
          date: isoDate(nutritionRow.assessment_date ?? nutritionRow.created_at),
        },
        interview: {
          date: isoDate(interview?.created_at),
          completed: interview?.status === 'completed',
        },
      });

      setContext({
        occupation: stringOrNull(interview?.lifestyle_occupation) ?? stringOrNull(lifestyleRow.occupation_type),
        sittingHours: numberOrNull(interview?.lifestyle_sitting_hours) ?? numberOrNull(parqHistory.daily_sitting_hours),
        screenTime: stringOrNull(interview?.lifestyle_screen_time) ?? stringOrNull(lifestyleRow.screen_time_bracket),
        sleepHours: sleep,
        stressLevel: numberOrNull(lifestyleRow.stress_level),
        mealRegularity: stringOrNull(interview?.lifestyle_meal_regularity) ?? stringOrNull(nutritionRow.meal_timing_consistency),
        dietPreferences: stringList(nutritionRow.diet_preferences),
        foodAllergies: stringList(nutritionRow.food_allergies),
        smoking: stringOrNull(lifestyleRow.smoking_status),
        alcohol: stringOrNull(lifestyleRow.alcohol_status),
        sedentaryRisk: stringOrNull(lifestyleRow.sedentary_risk),
      });

      const overview = retestRes?.data ?? null;
      const schedule = overview?.schedule ?? null;
      setRetest({
        date: schedule?.scheduled_date ?? null,
        label: overview?.state?.label ?? '',
        state: overview?.state?.state ?? '',
        cadenceMonths: schedule?.cadence_months ?? overview?.settings?.cadence_months ?? null,
      });

      setGoals(Array.isArray(goalsRes?.data) ? goalsRes.data : []);
    } catch (err: unknown) {
      setLoadError(errorMessage(err, 'Failed to load client.'));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openWizard = (goalId: string | null) => {
    setEditingGoalId(goalId);
    setView('wizard');
  };

  // One active goal at a time: a new goal archives the old one, and an
  // archived goal can be made the active one again. There was no way to do
  // either, so every goal ever set stayed "active".
  const setStatus = async (goalId: string, status: 'active' | 'paused' | 'completed' | 'archived') => {
    try {
      await api.progress.goals.update(goalId, { status, is_active: status === 'active' });
      toast.success(`Goal ${status}.`);
      loadData();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Could not update the goal.'));
    }
  };

  const closeWizard = (refresh: boolean) => {
    setView('list');
    setEditingGoalId(null);
    if (refresh) loadData();
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600] text-[color:var(--text-secondary)]">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={loadData}>Retry</Button>
      </div>
    );
  }

  if (view === 'wizard') {
    const editingGoal = editingGoalId ? goals.find((g) => String(g.id) === editingGoalId) : null;
    return (
      <GoalWizard
        clientId={clientId} clientName={clientName}
        latestWeight={latestWeight} latestBodyFat={latestBodyFat}
        editingGoal={editingGoal || null}
        clientDefaults={clientDefaults}
        habits={habits}
        baseline={baseline}
        context={context}
        retest={retest}
        toast={toast}
        onDone={closeWizard}
      />
    );
  }

  return (
    <PageContainer>
      <PageHero
        icon={<Target size={20} />}
        title={`${clientName}'s Goals`}

        actions={
          <button type="button" onClick={() => openWizard(null)}
            className="inline-flex h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] px-5 text-[13px] font-[700] transition-transform active:scale-95 sm:w-auto"
            style={{ background: '#fff', color: '#0F172A' }}>
            <Plus size={16} /> New Goal
          </button>
        }
      />

      <div className="mx-auto w-full max-w-3xl space-y-3">
        {goals.length === 0 && (
          <div className="rounded-[20px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[14px] font-[600] text-[color:var(--text-muted)]">No goals set yet.</p>
            <Button className="mt-4" iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #0271EB, #0059CE)', color: '#fff' }}>
              Set First Goal
            </Button>
          </div>
        )}
        {goals.map((g) => (
          <div key={String(g.id)} className="space-y-1.5">
            <GoalCard goal={g} latestWeight={latestWeight} onClick={() => openWizard(String(g.id))} />
            <div className="flex justify-end gap-2 px-1">
              {(['active','paused','completed','archived'] as const).map((st) => (
                <button key={st} type="button" onClick={() => setStatus(String(g.id), st)}
                  className="rounded-full px-3 py-1.5 text-[11px] font-[700]"
                  style={{ border: '1px solid var(--border)', color: g.status === st ? '#0059CE' : 'var(--text-secondary)', background: g.status === st ? 'rgba(0,103,224,0.08)' : 'transparent' }}>
                  {st}
                </button>
              ))}
            </div>
          </div>
        ))}
        {/* Once a goal is set, the next intake step (usually PT Enrolment). */}
        {goals.length > 0 && (
          <div className="flex justify-end pt-2">
            <JourneyNextButton clientId={clientId} current="goals" />
          </div>
        )}
      </div>
    </PageContainer>
  );
}

/* ─────────────────────────────────────────────────────── WIZARD */
interface GoalWizardProps {
  clientId: string;
  clientName: string;
  latestWeight: number | null;
  latestBodyFat: number | null;
  editingGoal: Record<string, unknown> | null;
  clientDefaults: GoalClientDefaults;
  habits: Partial<LifestyleAnswers>;
  baseline: BaselineInfo;
  context: ClientContext;
  retest: RetestInfo;
  toast: ReturnType<typeof useToast>['toast'];
  onDone: (refresh: boolean) => void;
}

function GoalWizard({ clientId, clientName, latestWeight, latestBodyFat, editingGoal, clientDefaults, habits, baseline, context, retest, toast, onDone }: GoalWizardProps) {
  const goalId = editingGoal ? String(editingGoal.id) : null;
  const today = todayISO();
  const initial = useMemo(() => {
    const futureOrBlank = (date: string | null) => (date && date >= today ? date : '');
    if (editingGoal) {
      const fromRow = formFromGoalRow(editingGoal);
      return { ...fromRow, reviewDate: futureOrBlank(fromRow.reviewDate) || futureOrBlank(retest.date) };
    }
    const fresh = initGoalFormForClient(clientDefaults);
    return { ...fresh, lifestyle: { ...fresh.lifestyle, ...habits }, reviewDate: futureOrBlank(retest.date) };
  }, [clientDefaults, editingGoal, habits, retest.date, today]);

  const [form, setForm] = useState<GoalFormData>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<StepId>(1);
  const [reviewMode, setReviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const initFormRef = useRef<GoalFormData>(initial);

  // v3: K11 measurable targets, client agreement and the review date changed
  // the form shape, so a v2 draft would restore fields this wizard no longer
  // reads.
  const draftKey = `goal-assessment-draft.v3:${clientId}:${goalId || 'new'}`;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initFormRef.current), [form]);
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: draftKey, data: form, isDirty });

  useEffect(() => {
    // Never lay a draft over a goal saved after it (another device, or saved since).
    const savedAt = editingGoal ? Date.parse(String(editingGoal.updated_at ?? editingGoal.created_at ?? '')) || 0 : 0;
    const draft = restore(savedAt ? { notBefore: savedAt } : undefined);
    if (draft) { setForm({ ...initial, ...draft }); toast.info('Restored your unsaved draft.'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const set = useCallback(<K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  // One place where the challenge chips and their plans are kept in step:
  // selected barriers get a plan row, cleared ones lose it, and text already
  // typed is preserved. Without this a plan could outlive its challenge.
  const { biggestChallenges, challengeOther, barrierPlans } = form;
  useEffect(() => {
    const wanted = selectedChallenges({ biggestChallenges, challengeOther });
    const current = barrierPlans.map((p) => p.challenge);
    if (wanted.length === current.length && wanted.every((c, i) => c === current[i])) return;
    setForm((prev) => ({ ...prev, barrierPlans: barrierPlansFor(wanted, prev.barrierPlans) }));
  }, [biggestChallenges, challengeOther, barrierPlans]);

  const currentWeight = latestWeight ?? n(form.startingWeightManual);
  const currentBodyFat = latestBodyFat ?? n(form.startingBodyFatManual);

  const analysis = useMemo(() => {
    const measure = measureForForm(form, currentWeight, currentBodyFat);
    const days = daysRemaining(form.targetDate || null);
    const direction = measure ? goalDirection(measure.current, measure.target) : null;
    const requiredRate = measure ? calcRequiredWeeklyRate(measure.current, measure.target, days) : null;
    const safeRate = calcSafeWeeklyRateForMetric(measure?.metric ?? null, measure?.current ?? null, direction);
    const lifestyleScore = calcLifestyleReadinessScore(form.lifestyle);
    const motivationLevel = n(form.motivationLevel);
    const commitmentLevel = n(form.commitmentLevel);
    const difficulty = classifyGoalDifficulty(requiredRate, safeRate, lifestyleScore, motivationLevel, commitmentLevel);
    const estimatedWeeks = measure ? calcEstimatedDurationWeeks(measure.current, measure.target, safeRate) : null;
    const recommendedMonths = recommendPtDurationMonths(estimatedWeeks);
    const riskFactors = buildRiskFactors({
      requiredRate, safeRate, lifestyleReadinessScore: lifestyleScore,
      medicalRestrictions: form.lifestyle.medical_restrictions, daysRemaining: days, motivationLevel, commitmentLevel,
      metric: measure?.metric ?? null,
    });
    return {
      days, difficulty, estimatedWeeks, recommendedMonths, requiredRate, safeRate, riskFactors,
      metric: measure?.metric ?? null,
    };
  }, [form, currentWeight, currentBodyFat]);

  const handleNext = () => {
    const stepDef = STEPS.find((s) => s.id === step)!;
    const err = validateStep(step, form, today, currentWeight, currentBodyFat);
    setErrors((e) => ({ ...e, [stepDef.key]: err }));
    if (err) { toast.error(err); return; }
    if (step === LAST_STEP) { setReviewMode(true); return; }
    setStep((s) => (s + 1) as StepId);
  };

  const handleBack = () => {
    if (reviewMode) { setReviewMode(false); return; }
    if (step > 1) { setStep((s) => (s - 1) as StepId); return; }
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    onDone(false);
  };

  const handleSaveDraft = () => {
    const ok = saveNow();
    toast[ok ? 'success' : 'error'](ok ? 'Draft saved.' : 'Could not save draft — storage unavailable.');
  };

  const handleSubmit = async () => {
    // Going back can leave an earlier step invalid, and the review screen can
    // be reached by Next-ing past a field that was later cleared. Check every
    // step once more and land on the first one that needs attention.
    const allErrors: FormErrors = {};
    for (const s of STEPS) {
      const err = validateStep(s.id, form, today, currentWeight, currentBodyFat);
      if (err) allErrors[s.key] = err;
    }
    const firstInvalid = STEPS.find((s) => allErrors[s.key]);
    if (firstInvalid) {
      setErrors(allErrors);
      setReviewMode(false);
      setStep(firstInvalid.id);
      toast.error(allErrors[firstInvalid.key]!);
      return;
    }
    setSaving(true);
    try {
      const challenges = selectedChallenges(form);
      const shortWeeks = periodWeeks(form.shortTermWeeks, 8);
      const mediumWeeks = periodWeeks(form.mediumTermWeeks, 12);
      const schedule = recommendTrainingSplit(form.trainingDays, {
        goal: form.goalType, experience: form.experienceLevel, preferredDays: form.preferredDays,
      });
      const sessionMinutes = parseInt(form.sessionMinutes, 10) || null;
      const measure = measureForForm(form, currentWeight, currentBodyFat);

      const payload: Record<string, unknown> = {
        client_id: clientId,
        goal_type: form.goalType,
        goal_other: form.goalType === 'custom' ? form.goalName.trim() || null : null,
        // The statement is now asked for every goal type, not only custom ones.
        goal_description: form.goalDescription.trim() || null,
        // Legacy columns stay authoritative for weight/body-fat goals; other
        // K11 metrics live only in routine_blueprint.k11.
        target_weight: measure?.metric === 'weight' ? measure.target : null,
        target_body_fat: measure?.metric === 'body_fat' ? measure.target : null,
        target_date: form.targetDate || null,
        priority_goal: form.priorityGoal || null,
        motivation_reason: form.motivationReason || null,
        motivation_level: n(form.motivationLevel) ?? null,
        commitment_level: n(form.commitmentLevel) ?? null,
        biggest_challenges: challenges,
        lifestyle_readiness: buildLifestylePayload(form.lifestyle) ?? null,
        starting_weight: latestWeight == null ? (n(form.startingWeightManual) ?? undefined) : undefined,
        starting_body_fat_pct: latestBodyFat == null ? (n(form.startingBodyFatManual) ?? undefined) : undefined,
        notes: form.notes || null,
        status: form.status,
        training_days_per_week: n(form.trainingDays) ?? null,
        preferred_training_days: form.preferredDays.length ? form.preferredDays : null,
        review_date: form.reviewDate || null,
      };

      // Schedule, routine blueprint and milestones are computed client-side
      // (the backend stores what it is sent on these JSONB columns).
      const blueprint = buildRoutineBlueprint({
        goal: form.goalType, experience: form.experienceLevel, equipment: form.equipment,
        trainingDays: form.trainingDays, split: schedule.split,
      });
      const coaching: CoachingBlock = {
        success_metric: form.successMetric.trim() || undefined,
        confidence_level: n(form.confidenceLevel) ?? undefined,
        session_minutes: sessionMinutes ?? undefined,
        time_of_day: form.timeOfDay,
        barrier_plans: barrierPayload(form.barrierPlans),
      };
      const k11: K11Block = {
        measure: measure ? {
          metric: measure.metric,
          exercise: measure.exercise ?? null,
          label: measure.label ?? null,
          current: measure.current,
          target: measure.target,
          unit: measure.unit || null,
        } : undefined,
        client_agreement: form.clientAgreed,
        client_expectation: form.clientExpectation.trim() || null,
      };

      payload.training_split = schedule.split;
      payload.routine_blueprint = { ...blueprint, coaching, k11 };
      payload.milestones = form.milestones;
      payload.short_term_weeks = shortWeeks;
      payload.medium_term_weeks = mediumWeeks;

      if (goalId) {
        await api.progress.goals.update(goalId, payload);
        toast.success('Goal updated.');
      } else {
        await api.progress.goals.create(payload);
        toast.success('Goal saved.');
      }
      clear();
      onDone(true);
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Failed to save goal.'));
    } finally {
      setSaving(false);
    }
  };

  // Read-only view of what the plan is built on, each row linking to the
  // module that owns the record — the wizard never writes any of them.
  const baselineSources: BaselineSource[] = useMemo(() => {
    const q = `?client_id=${encodeURIComponent(clientId)}`;
    const { assessment, parq, lifestyle, nutrition, interview } = baseline;
    return [
      {
        key: 'assessment',
        label: 'Baseline fitness assessment',
        detail: assessment.date
          ? [assessment.weight != null ? `${assessment.weight} kg` : null, assessment.bodyFat != null ? `${assessment.bodyFat}%` : null, assessment.date].filter(Boolean).join(' · ')
          : 'No assessment on file',
        state: assessment.date ? 'complete' : 'missing',
        href: `/pt-os/assessment${q}`,
      },
      {
        key: 'interview',
        label: 'Client interview',
        detail: interview.date ? [interview.completed ? 'Completed' : 'Draft', interview.date].filter(Boolean).join(' · ') : 'Not recorded',
        state: interview.date ? (interview.completed ? 'complete' : 'pending') : 'missing',
        href: `/pt-os/interview${q}`,
      },
      {
        key: 'parq',
        label: 'PAR-Q health screening',
        detail: parq.date ? [parq.status, parq.riskLevel, parq.date].filter(Boolean).join(' · ') : 'Not completed',
        state: parqBaselineState(parq.status, Boolean(parq.date)),
        href: `/pt-os/parq${q}`,
      },
      {
        key: 'lifestyle',
        label: 'Lifestyle assessment',
        detail: lifestyle.date
          ? [lifestyle.sleepHours != null ? `${lifestyle.sleepHours} h sleep` : null, lifestyle.stressLevel != null ? `stress ${lifestyle.stressLevel}/10` : null, lifestyle.date].filter(Boolean).join(' · ')
          : 'Not recorded',
        state: lifestyle.date ? 'complete' : 'missing',
        href: `/pt-os/lifestyle-assessment${q}`,
      },
      {
        key: 'nutrition',
        label: 'Nutrition assessment',
        detail: nutrition.date
          ? [nutrition.waterLiters != null ? `${nutrition.waterLiters} L water` : null, nutrition.mealRegularity, nutrition.date].filter(Boolean).join(' · ')
          : 'Not recorded',
        state: nutrition.date ? 'complete' : 'missing',
        href: `/pt-os/nutrition-assessment${q}`,
      },
    ];
  }, [baseline, clientId]);

  // K11 asks for the initial test report: BP, BMI, body fat, step test,
  // strength and flexibility. They all sit on the same latest assessment row.
  const baselineMetrics: BaselineMetric[] = useMemo(() => {
    const a = baseline.assessment;
    const bp = a.bpSystolic != null && a.bpDiastolic != null ? `${a.bpSystolic}/${a.bpDiastolic} mmHg` : '—';
    const stepTest = a.stepTest
      ? [a.stepTest, a.vo2Max != null ? `VO₂ max ${a.vo2Max}` : a.cardioCategory].filter(Boolean).join(' · ')
      : '—';
    const flexibility = a.flexibilityCategory
      || (a.flexibilityScore != null ? `${a.flexibilityScore} / 100` : '—');
    return [
      { label: 'Blood pressure', value: bp },
      { label: 'BMI', value: a.bmi != null ? String(a.bmi) : '—' },
      { label: 'Body fat', value: a.bodyFat != null ? `${a.bodyFat}%` : '—' },
      { label: 'Step test', value: stepTest },
      { label: 'Strength', value: a.strengthScore != null ? `${a.strengthScore} / 100` : '—' },
      { label: 'Flexibility', value: flexibility },
    ];
  }, [baseline.assessment]);

  const timeOfDayLabel = TIME_OF_DAY_OPTIONS.find((o) => o.value === form.timeOfDay)?.label || '';
  const commitmentMinutes = weeklyCommitmentMinutes(parseInt(form.trainingDays, 10) || 0, form.sessionMinutes);
  const measure = measureForForm(form, currentWeight, currentBodyFat);

  return (
    <PageContainer>
      <PageHero
        icon={<Target size={18} />}
        title={goalId ? 'Edit Goal' : 'New Goal'}

      >
        {/* No Cancel action here — the sticky footer's Back button already
            exits the wizard at step 1 with the same discard-confirm guard,
            so a second escape hatch in the hero was redundant chrome. */}
        {!reviewMode && <StepperTimeline steps={STEPS} current={step} onStep={setStep} />}
      </PageHero>

      <div className="mx-auto max-w-3xl space-y-5">
        {!reviewMode ? (
          <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {step === 1 && <StepPrimaryGoal form={form} set={set} step={step} error={errors.primaryGoal} />}
            {step === 2 && <StepSmartGoal form={form} set={set} step={step} error={errors.smartGoal} />}
            {step === 3 && (
              <StepMeasureTarget
                form={form} set={set} step={step}
                currentWeight={currentWeight} currentBodyFat={currentBodyFat}
                measuredWeight={latestWeight != null} measuredBodyFat={latestBodyFat != null}
                error={errors.measureTarget}
              />
            )}
            {step === 4 && <StepDeadline form={form} set={set} step={step} error={errors.deadline} />}
            {step === 5 && <StepPriority form={form} set={set} step={step} error={errors.priority} />}
            {step === 6 && <StepMotivationCommitment form={form} set={set} step={step} />}
            {step === 7 && <StepChallenges form={form} set={set} step={step} error={errors.challenges} />}
            {step === 8 && <StepLifestyle form={form} set={set} step={step} context={context} clientId={clientId} error={errors.lifestyle} />}
            {step === 9 && <StepSchedule form={form} set={set} step={step} />}
            {step === 10 && <StepMilestones form={form} set={set} step={step} today={today} error={errors.milestones} />}
            {step === 11 && (
              <StepAssessmentReview
                form={form} set={set} step={step}
                sources={baselineSources} metrics={baselineMetrics}
                retest={retest} clientId={clientId} error={errors.assessmentReview}
              />
            )}
          </m.div>
        ) : (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-5">
            <GoalAnalysisDashboard
              difficulty={analysis.difficulty} estimatedDurationWeeks={analysis.estimatedWeeks}
              recommendedPtDurationMonths={analysis.recommendedMonths} requiredWeeklyRate={analysis.requiredRate}
              safeWeeklyRate={analysis.safeRate} riskFactors={analysis.riskFactors} metric={analysis.metric}
              rateUnit={analysis.metric === 'body_fat' ? '%/wk' : analysis.metric === 'lift' ? `${measure?.unit || 'kg'}/wk` : 'kg/wk'}
            />
            {form.targetDate && <GoalTimeline targetDate={form.targetDate} />}
            <GoalSummaryCard
              primaryGoalLabel={form.goalType === 'custom' ? (form.goalName || 'Custom Goal') : labelFor(GOAL_TYPE_META, form.goalType)}
              statement={form.goalDescription}
              successMetric={form.successMetric}
              measure={measure}
              currentWeight={currentWeight} targetWeight={measure?.metric === 'weight' ? n(form.targetWeight) : null}
              currentBodyFat={currentBodyFat} targetBodyFat={measure?.metric === 'body_fat' ? n(form.targetBodyFat) : null}
              targetDate={form.targetDate} priorityLabel={labelFor(PRIORITY_META, form.priorityGoal)}
              clientAgreed={form.clientAgreed}
              clientExpectation={form.clientExpectation}
              motivationLevel={n(form.motivationLevel) ?? 0}
              confidenceLevel={n(form.confidenceLevel) ?? 0}
              commitmentLevel={n(form.commitmentLevel) ?? 0}
              barriers={barrierPayload(form.barrierPlans)}
              availability={{
                commitment: `${form.trainingDays || '—'} day${form.trainingDays === '1' ? '' : 's'} × ${form.sessionMinutes || '—'} min · ${formatWeeklyCommitment(commitmentMinutes)}`,
                preferredDays: form.preferredDays,
                timeOfDayLabel,
              }}
              milestones={form.milestones}
              reviewDate={form.reviewDate}
            />
            <BaselineScreeningCard sources={baselineSources} metrics={baselineMetrics} />
            <TrainingSchedulePreview trainingDays={form.trainingDays} goal={form.goalType} experience={form.experienceLevel} preferredDays={form.preferredDays} />
            <MilestoneTracker startDate={today} targetDate={form.targetDate || null} milestones={form.milestones} />
          </m.div>
        )}
      </div>

      <div className="page-action-bar" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-3.5 flex items-center justify-between gap-3">
          <Button variant="outline" iconLeft={<ArrowLeft size={14} />} onClick={handleBack}>Back</Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSaveDraft}>Save Draft</Button>
            {!reviewMode ? (
              <Button
                iconLeft={<ArrowRight size={14} />}
                onClick={handleNext}
                style={{ background: 'linear-gradient(135deg, #0271EB, #0059CE)', color: '#fff' }}
              >
                {step === LAST_STEP ? 'Review' : 'Next'}
              </Button>
            ) : (
              <Button
                iconLeft={!saving ? <Check size={14} /> : undefined}
                loading={saving} disabled={saving}
                onClick={handleSubmit}
                style={{ background: 'linear-gradient(135deg, #0271EB, #0059CE)', color: '#fff' }}
              >
                {saving ? 'Saving...' : goalId ? 'Update Goal' : 'Save Goal'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
