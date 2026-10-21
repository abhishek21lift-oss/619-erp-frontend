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
  goalDirection, calcRequiredWeeklyRate, calcSafeWeeklyRate, classifyGoalDifficulty,
  calcEstimatedDurationWeeks, recommendPtDurationMonths, buildRiskFactors, calcLifestyleReadinessScore, daysRemaining,
} from '@/lib/goal-calculations';
import {
  STEPS, LAST_STEP, GOAL_TYPE_META, PRIORITY_META, initGoalForm, n,
} from '@/components/pt-os/goal-assessment/types';
import type { GoalFormData, FormErrors, StepId, LifestyleAnswers } from '@/components/pt-os/goal-assessment/types';
import StepPrimaryGoal from '@/components/pt-os/goal-assessment/StepPrimaryGoal';
import StepSmartGoal from '@/components/pt-os/goal-assessment/StepSmartGoal';
import StepTargetWeight from '@/components/pt-os/goal-assessment/StepTargetWeight';
import StepTargetBodyFat from '@/components/pt-os/goal-assessment/StepTargetBodyFat';
import StepDeadline from '@/components/pt-os/goal-assessment/StepDeadline';
import StepPriority from '@/components/pt-os/goal-assessment/StepPriority';
import StepMotivationCommitment from '@/components/pt-os/goal-assessment/StepMotivationCommitment';
import StepChallenges, { CHALLENGE_OPTIONS, selectedChallenges } from '@/components/pt-os/goal-assessment/StepChallenges';
import StepLifestyle from '@/components/pt-os/goal-assessment/StepLifestyle';
import StepSchedule from '@/components/pt-os/goal-assessment/StepSchedule';
import StepMilestones from '@/components/pt-os/goal-assessment/StepMilestones';
import TrainingSchedulePreview from '@/components/pt-os/goal-assessment/TrainingSchedulePreview';
import MilestoneTracker from '@/components/pt-os/goal-assessment/MilestoneTracker';
import GoalAnalysisDashboard from '@/components/pt-os/goal-assessment/GoalAnalysisDashboard';
import GoalSummaryCard from '@/components/pt-os/goal-assessment/GoalSummaryCard';
import GoalTimeline from '@/components/pt-os/goal-assessment/GoalTimeline';
import GoalCard from '@/components/pt-os/goal-assessment/GoalCard';
import GoalProgressTimeline from '@/components/pt-os/goal-assessment/GoalProgressTimeline';
import BaselineScreeningCard from '@/components/pt-os/goal-assessment/BaselineScreeningCard';
import type { BaselineSource } from '@/components/pt-os/goal-assessment/BaselineScreeningCard';
import { errorMessage } from '@/lib/forms/errors';
import { todayISO } from '@/lib/forms/domain';
import { recommendTrainingSplit, buildRoutineBlueprint } from '@/lib/goal-scheduling';
import {
  barrierPlansFor, barrierPayload, formatWeeklyCommitment, TIME_OF_DAY_OPTIONS,
  validateMilestones, weeklyCommitmentMinutes,
} from '@/lib/goal-plan';
import type { BarrierPlan, GoalMilestone } from '@/lib/goal-plan';
import type { ParqForm } from '@/lib/api/types';
import { rangeIssue } from '@/lib/forms/ranges';
import JourneyNextButton from '@/components/pt-os/client/JourneyNextButton';

const EASE = [0.16, 1, 0.3, 1] as const;
const CHALLENGE_VALUES = new Set(CHALLENGE_OPTIONS.map((c) => c.value));

function labelFor<T extends { value: string; label: string }>(list: T[], value: string): string {
  return list.find((o) => o.value === value)?.label || '';
}

/** Whole weeks in the 1–52 range the backend accepts. */
function periodWeeks(value: string, fallback: number): number {
  const weeks = parseInt(value, 10);
  if (!Number.isFinite(weeks)) return fallback;
  return Math.max(1, Math.min(52, weeks));
}

function validateStep(id: StepId, form: GoalFormData, today: string): string | undefined {
  if (id === 1) {
    if (!form.goalType) return 'Please select a primary goal.';
    if (form.goalType === 'custom' && !form.goalName.trim()) return 'Please name the custom goal.';
  }
  // The statement used to be collected for custom goals only, so a standard
  // goal was stored with no description at all.
  if (id === 2 && !form.goalDescription.trim()) {
    return 'Write the goal in one sentence so it can be measured.';
  }
  if (id === 3) {
    return rangeIssue(['Target weight', form.targetWeight, 25, 300, 'kg'], ['Starting weight', form.startingWeightManual, 25, 350, 'kg']);
  }
  if (id === 4) {
    return rangeIssue(['Target body fat', form.targetBodyFat, 3, 60, '%'], ['Starting body fat', form.startingBodyFatManual, 2, 75, '%']);
  }
  if (id === 5 && !form.targetDate) return 'Please choose a target date.';
  // A past target date used to be accepted, and the whole analysis then came
  // back blank without a word.
  if (id === 5 && form.targetDate < today) return 'The target date must be today or later.';
  if (id === 6 && !form.priorityGoal) return 'Please select a top priority.';
  if (id === 8) {
    const missing = selectedChallenges(form).find((c) => !form.barrierPlans.find((p) => p.challenge === c && p.plan.trim()));
    if (missing) return `Write a plan for "${missing}", or remove it from the challenges.`;
  }
  if (id === 10) {
    if (!form.trainingDays) return 'Please choose training days.';
    if (!form.sessionMinutes) return 'Please choose a session length.';
  }
  if (id === 11) {
    if (!form.milestones.length) return 'Add at least one milestone, or accept the suggested ones.';
    return validateMilestones(form.milestones, today, form.targetDate || null);
  }
  return undefined;
}

function buildLifestylePayload(l: LifestyleAnswers): Record<string, boolean> | undefined {
  const entries = Object.entries(l).filter(([, v]) => v !== null) as [string, boolean][];
  return entries.length ? Object.fromEntries(entries) : undefined;
}

/**
 * The coaching block rides on routine_blueprint, which is written and read by
 * this module alone. `preferred_training_days`, `short_term_weeks`,
 * `medium_term_weeks` and `milestones` are real columns, so only what has no
 * column lives here — see docs/goal-setting-coaching-fields.md in the backend
 * for the migration that would give these their own columns.
 */
interface CoachingBlock {
  success_metric?: string;
  confidence_level?: number;
  session_minutes?: number;
  time_of_day?: string;
  barrier_plans?: BarrierPlan[];
}

function formFromGoalRow(row: Record<string, unknown>): GoalFormData {
  const fresh = initGoalForm();
  const challenges = Array.isArray(row.biggest_challenges) ? (row.biggest_challenges as string[]) : [];
  const lifestyleRaw = (row.lifestyle_readiness as Record<string, boolean> | null) || {};
  const coaching = ((row.routine_blueprint as { coaching?: CoachingBlock } | null)?.coaching) || {};
  const milestones = Array.isArray(row.milestones) ? (row.milestones as GoalMilestone[]) : [];
  const preferred = Array.isArray(row.preferred_training_days) ? (row.preferred_training_days as string[]) : [];
  return {
    ...fresh,
    goalType: (row.goal_type as GoalFormData['goalType']) || '',
    goalName: row.goal_type === 'custom' ? String(row.goal_other ?? '') : '',
    goalDescription: String(row.goal_description ?? ''),
    successMetric: String(coaching.success_metric ?? ''),
    targetWeight: row.target_weight != null ? String(row.target_weight) : '',
    targetBodyFat: row.target_body_fat != null ? String(row.target_body_fat) : '',
    targetDate: row.target_date ? String(row.target_date).slice(0, 10) : '',
    priorityGoal: (row.priority_goal as GoalFormData['priorityGoal']) || '',
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
    experienceLevel: 'beginner',
    equipment: 'full_gym',
    status: (row.status as GoalFormData['status']) || (row.is_active ? 'active' : 'archived'),
    milestones,
    shortTermWeeks: row.short_term_weeks != null ? String(row.short_term_weeks) : '8',
    mediumTermWeeks: row.medium_term_weeks != null ? String(row.medium_term_weeks) : '12',
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
  assessment: { weight: number | null; bodyFat: number | null; date: string | null };
  parq: { status: string | null; date: string | null; riskLevel: string | null };
  lifestyle: { sleepHours: number | null; date: string | null };
  nutrition: { waterLiters: number | null; date: string | null };
}

const EMPTY_BASELINE: BaselineInfo = {
  assessment: { weight: null, bodyFat: null, date: null },
  parq: { status: null, date: null, riskLevel: null },
  lifestyle: { sleepHours: null, date: null },
  nutrition: { waterLiters: null, date: null },
};

const isoDate = (v: unknown): string | null => (v ? String(v).slice(0, 10) : null);

function GoalsHub({ clientId, toast }: GoalsHubProps) {
  const [clientName, setClientName] = useState('');
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [latestBodyFat, setLatestBodyFat] = useState<number | null>(null);
  // Sleep and water are asked in Lifestyle and Nutrition. A new goal's
  // readiness answers start from them rather than asking a second time.
  const [habits, setHabits] = useState<Partial<LifestyleAnswers>>({});
  const [baseline, setBaseline] = useState<BaselineInfo>(EMPTY_BASELINE);
  const [goals, setGoals] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, assessRes, goalsRes, lifestyleRes, nutritionRes, parqRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.assessments.list({ client_id: clientId, limit: 1 }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.goals.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.lifestyleAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.nutritionAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.parqForms.list({ client_id: clientId }) as Promise<{ data?: ParqForm[] }>,
      ]);
      const lifestyleRow = (lifestyleRes?.data ?? [])[0] ?? {};
      const nutritionRow = (nutritionRes?.data ?? [])[0] ?? {};
      const parqRow = (parqRes?.data ?? [])[0] ?? {};
      const sleep = Number(lifestyleRow.sleep_duration_hours);
      const water = Number(nutritionRow.water_intake_liters);
      setHabits({
        ...(Number.isFinite(sleep) && sleep > 0 ? { sleep_7_8_hours: sleep >= 7 } : {}),
        ...(Number.isFinite(water) && water > 0 ? { drink_enough_water: water >= 2.5 } : {}),
      });
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));

      const latest = Array.isArray(assessRes?.data) ? assessRes.data[0] : null;
      const weight = latest?.weight != null ? parseFloat(String(latest.weight)) : null;
      const bodyFat = latest?.body_fat_pct != null ? parseFloat(String(latest.body_fat_pct)) : null;
      setLatestWeight(weight);
      setLatestBodyFat(bodyFat);

      setBaseline({
        assessment: { weight, bodyFat, date: isoDate(latest?.assessment_date ?? latest?.created_at) },
        parq: {
          status: parqRow.status ? String(parqRow.status) : null,
          date: isoDate(parqRow.assessment_date ?? parqRow.created_at),
          riskLevel: parqRow.risk_level ? String(parqRow.risk_level) : null,
        },
        lifestyle: {
          sleepHours: Number.isFinite(sleep) && sleep > 0 ? sleep : null,
          date: isoDate(lifestyleRow.assessment_date ?? lifestyleRow.created_at),
        },
        nutrition: {
          waterLiters: Number.isFinite(water) && water > 0 ? water : null,
          date: isoDate(nutritionRow.assessment_date ?? nutritionRow.created_at),
        },
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
        habits={habits}
        baseline={baseline}
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
  habits: Partial<LifestyleAnswers>;
  baseline: BaselineInfo;
  toast: ReturnType<typeof useToast>['toast'];
  onDone: (refresh: boolean) => void;
}

function GoalWizard({ clientId, clientName, latestWeight, latestBodyFat, editingGoal, habits, baseline, toast, onDone }: GoalWizardProps) {
  const goalId = editingGoal ? String(editingGoal.id) : null;
  const today = todayISO();
  const initial = useMemo(() => {
    if (editingGoal) return formFromGoalRow(editingGoal);
    const fresh = initGoalForm();
    return { ...fresh, lifestyle: { ...fresh.lifestyle, ...habits } };
  }, [editingGoal, habits]);

  const [form, setForm] = useState<GoalFormData>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<StepId>(1);
  const [reviewMode, setReviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const initFormRef = useRef<GoalFormData>(initial);

  // v2: the form shape changed (SMART statement, confidence, preferred days,
  // barrier plans, milestones), so a v1 draft would restore a form this
  // wizard no longer has fields for.
  const draftKey = `goal-assessment-draft.v2:${clientId}:${goalId || 'new'}`;
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
    const days = daysRemaining(form.targetDate || null);
    const target = n(form.targetWeight);
    const direction = goalDirection(currentWeight, target);
    const requiredRate = calcRequiredWeeklyRate(currentWeight, target, days);
    const safeRate = calcSafeWeeklyRate(currentWeight, direction);
    const lifestyleScore = calcLifestyleReadinessScore(form.lifestyle);
    const motivationLevel = n(form.motivationLevel);
    const commitmentLevel = n(form.commitmentLevel);
    const difficulty = classifyGoalDifficulty(requiredRate, safeRate, lifestyleScore, motivationLevel, commitmentLevel);
    const estimatedWeeks = calcEstimatedDurationWeeks(currentWeight, target, safeRate);
    const recommendedMonths = recommendPtDurationMonths(estimatedWeeks);
    const riskFactors = buildRiskFactors({
      requiredRate, safeRate, lifestyleReadinessScore: lifestyleScore,
      medicalRestrictions: form.lifestyle.medical_restrictions, daysRemaining: days, motivationLevel, commitmentLevel,
    });
    return { days, difficulty, estimatedWeeks, recommendedMonths, requiredRate, safeRate, riskFactors };
  }, [form, currentWeight]);

  const handleNext = () => {
    const stepDef = STEPS.find((s) => s.id === step)!;
    const err = validateStep(step, form, today);
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
    setSaving(true);
    try {
      const challenges = selectedChallenges(form);
      const shortWeeks = periodWeeks(form.shortTermWeeks, 8);
      const mediumWeeks = periodWeeks(form.mediumTermWeeks, 12);
      const schedule = recommendTrainingSplit(form.trainingDays, {
        goal: form.goalType, experience: form.experienceLevel, preferredDays: form.preferredDays,
      });
      const sessionMinutes = parseInt(form.sessionMinutes, 10) || null;

      const payload: Record<string, unknown> = {
        client_id: clientId,
        goal_type: form.goalType,
        goal_other: form.goalType === 'custom' ? form.goalName.trim() || null : null,
        // The statement is now asked for every goal type, not only custom ones.
        goal_description: form.goalDescription.trim() || null,
        target_weight: n(form.targetWeight) ?? null,
        target_body_fat: n(form.targetBodyFat) ?? null,
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

      payload.training_split = schedule.split;
      payload.routine_blueprint = { ...blueprint, coaching };
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
    const { assessment, parq, lifestyle, nutrition } = baseline;
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
        key: 'parq',
        label: 'PAR-Q health screening',
        detail: parq.date ? [parq.status, parq.riskLevel, parq.date].filter(Boolean).join(' · ') : 'Not completed',
        state: parq.date ? (parq.status === 'completed' ? 'complete' : 'pending') : 'missing',
        href: `/pt-os/parq${q}`,
      },
      {
        key: 'lifestyle',
        label: 'Lifestyle assessment',
        detail: lifestyle.date
          ? (lifestyle.sleepHours != null ? `${lifestyle.sleepHours} h sleep · ${lifestyle.date}` : lifestyle.date)
          : 'Not recorded',
        state: lifestyle.date ? 'complete' : 'missing',
        href: `/pt-os/lifestyle-assessment${q}`,
      },
      {
        key: 'nutrition',
        label: 'Nutrition assessment',
        detail: nutrition.date
          ? (nutrition.waterLiters != null ? `${nutrition.waterLiters} L water · ${nutrition.date}` : nutrition.date)
          : 'Not recorded',
        state: nutrition.date ? 'complete' : 'missing',
        href: `/pt-os/nutrition-assessment${q}`,
      },
    ];
  }, [baseline, clientId]);

  const timeOfDayLabel = TIME_OF_DAY_OPTIONS.find((o) => o.value === form.timeOfDay)?.label || '';
  const commitmentMinutes = weeklyCommitmentMinutes(parseInt(form.trainingDays, 10) || 0, form.sessionMinutes);

  return (
    <PageContainer>
      <PageHero
        icon={<Target size={18} />}
        title={goalId ? 'Edit Goal' : 'New Goal'}

      >
        {/* No Cancel action here — the sticky footer's Back button already
            exits the wizard at step 1 with the same discard-confirm guard,
            so a second escape hatch in the hero was redundant chrome. */}
        {!reviewMode && <GoalProgressTimeline current={step} onStep={setStep} />}
      </PageHero>

      <div className="mx-auto max-w-3xl space-y-5">
        {!reviewMode ? (
          <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {step === 1 && <StepPrimaryGoal form={form} set={set} step={step} error={errors.primaryGoal} />}
            {step === 2 && <StepSmartGoal form={form} set={set} step={step} error={errors.smartGoal} />}
            {step === 3 && <StepTargetWeight form={form} set={set} step={step} currentWeight={currentWeight} measured={latestWeight != null} error={errors.targetWeight} />}
            {step === 4 && <StepTargetBodyFat form={form} set={set} step={step} currentBodyFat={currentBodyFat} measured={latestBodyFat != null} />}
            {step === 5 && <StepDeadline form={form} set={set} step={step} error={errors.deadline} />}
            {step === 6 && <StepPriority form={form} set={set} step={step} error={errors.priority} />}
            {step === 7 && <StepMotivationCommitment form={form} set={set} step={step} />}
            {step === 8 && <StepChallenges form={form} set={set} step={step} error={errors.challenges} />}
            {step === 9 && <StepLifestyle form={form} set={set} step={step} error={errors.lifestyle} />}
            {step === 10 && <StepSchedule form={form} set={set} step={step} />}
            {step === 11 && <StepMilestones form={form} set={set} step={step} today={today} error={errors.milestones} />}
          </m.div>
        ) : (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-5">
            <GoalAnalysisDashboard
              difficulty={analysis.difficulty} estimatedDurationWeeks={analysis.estimatedWeeks}
              recommendedPtDurationMonths={analysis.recommendedMonths} requiredWeeklyRate={analysis.requiredRate}
              safeWeeklyRate={analysis.safeRate} riskFactors={analysis.riskFactors}
            />
            {form.targetDate && <GoalTimeline targetDate={form.targetDate} />}
            <GoalSummaryCard
              primaryGoalLabel={form.goalType === 'custom' ? (form.goalName || 'Custom Goal') : labelFor(GOAL_TYPE_META, form.goalType)}
              statement={form.goalDescription}
              successMetric={form.successMetric}
              currentWeight={currentWeight} targetWeight={n(form.targetWeight)}
              currentBodyFat={currentBodyFat} targetBodyFat={n(form.targetBodyFat)}
              targetDate={form.targetDate} priorityLabel={labelFor(PRIORITY_META, form.priorityGoal)}
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
            />
            <BaselineScreeningCard sources={baselineSources} />
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
