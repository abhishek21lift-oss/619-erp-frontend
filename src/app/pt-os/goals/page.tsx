'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, Target, Plus,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
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
  STEPS, GOAL_TYPE_META, PRIORITY_META, initGoalForm, n,
} from '@/components/pt-os/goal-assessment/types';
import type { GoalFormData, FormErrors, StepId, LifestyleAnswers } from '@/components/pt-os/goal-assessment/types';
import StepPrimaryGoal from '@/components/pt-os/goal-assessment/StepPrimaryGoal';
import StepTargetWeight from '@/components/pt-os/goal-assessment/StepTargetWeight';
import StepTargetBodyFat from '@/components/pt-os/goal-assessment/StepTargetBodyFat';
import StepDeadline from '@/components/pt-os/goal-assessment/StepDeadline';
import StepPriority from '@/components/pt-os/goal-assessment/StepPriority';
import StepMotivationCommitment from '@/components/pt-os/goal-assessment/StepMotivationCommitment';
import StepChallenges, { CHALLENGE_OPTIONS } from '@/components/pt-os/goal-assessment/StepChallenges';
import StepLifestyle from '@/components/pt-os/goal-assessment/StepLifestyle';
import GoalAnalysisDashboard from '@/components/pt-os/goal-assessment/GoalAnalysisDashboard';
import GoalSummaryCard from '@/components/pt-os/goal-assessment/GoalSummaryCard';
import GoalTimeline from '@/components/pt-os/goal-assessment/GoalTimeline';
import GoalCard from '@/components/pt-os/goal-assessment/GoalCard';
import GoalProgressTimeline from '@/components/pt-os/goal-assessment/GoalProgressTimeline';

const EASE = [0.16, 1, 0.3, 1] as const;
const CHALLENGE_VALUES = new Set(CHALLENGE_OPTIONS.map((c) => c.value));

function labelFor<T extends { value: string; label: string }>(list: T[], value: string): string {
  return list.find((o) => o.value === value)?.label || '';
}

function validateStep(id: StepId, form: GoalFormData): string | undefined {
  if (id === 1) {
    if (!form.goalType) return 'Please select a primary goal.';
    if (form.goalType === 'custom' && !form.goalName.trim()) return 'Please name the custom goal.';
  }
  if (id === 4 && !form.targetDate) return 'Please choose a target date.';
  if (id === 5 && !form.priorityGoal) return 'Please select a top priority.';
  return undefined;
}

function buildLifestylePayload(l: LifestyleAnswers): Record<string, boolean> | undefined {
  const entries = Object.entries(l).filter(([, v]) => v !== null) as [string, boolean][];
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function formFromGoalRow(row: Record<string, unknown>): GoalFormData {
  const fresh = initGoalForm();
  const challenges = Array.isArray(row.biggest_challenges) ? (row.biggest_challenges as string[]) : [];
  const lifestyleRaw = (row.lifestyle_readiness as Record<string, boolean> | null) || {};
  return {
    ...fresh,
    goalType: (row.goal_type as GoalFormData['goalType']) || '',
    goalName: row.goal_type === 'custom' ? String(row.goal_other ?? '') : '',
    goalDescription: String(row.goal_description ?? ''),
    targetWeight: row.target_weight != null ? String(row.target_weight) : '',
    targetBodyFat: row.target_body_fat != null ? String(row.target_body_fat) : '',
    targetDate: row.target_date ? String(row.target_date).slice(0, 10) : '',
    priorityGoal: (row.priority_goal as GoalFormData['priorityGoal']) || '',
    motivationLevel: row.motivation_level != null ? String(row.motivation_level) : '7',
    commitmentLevel: row.commitment_level != null ? String(row.commitment_level) : '7',
    motivationReason: String(row.motivation_reason ?? ''),
    biggestChallenges: challenges.filter((c) => CHALLENGE_VALUES.has(c)),
    challengeOther: challenges.find((c) => !CHALLENGE_VALUES.has(c)) || '',
    lifestyle: { ...fresh.lifestyle, ...lifestyleRaw },
    startingWeightManual: row.starting_weight != null ? String(row.starting_weight) : '',
    startingBodyFatManual: row.starting_body_fat_pct != null ? String(row.starting_body_fat_pct) : '',
    notes: String(row.notes ?? ''),
  };
}

export default function PtGoalsPage() {
  return (
    <Guard>
      <AppShell>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>}>
          <GoalsContent />
        </Suspense>
      </AppShell>
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

function GoalsHub({ clientId, toast }: GoalsHubProps) {
  const [clientName, setClientName] = useState('');
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [latestBodyFat, setLatestBodyFat] = useState<number | null>(null);
  const [goals, setGoals] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, assessRes, goalsRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.assessments.list({ client_id: clientId, limit: 1 }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.goals.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));

      const latest = Array.isArray(assessRes?.data) ? assessRes.data[0] : null;
      setLatestWeight(latest?.weight != null ? parseFloat(String(latest.weight)) : null);
      setLatestBodyFat(latest?.body_fat_pct != null ? parseFloat(String(latest.body_fat_pct)) : null);

      setGoals(Array.isArray(goalsRes?.data) ? goalsRes.data : []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load client.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openWizard = (goalId: string | null) => {
    setEditingGoalId(goalId);
    setView('wizard');
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
        <p className="text-[14px] font-[600] text-slate-600">{loadError}</p>
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
        subtitle="Goal Assessment"
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
            <p className="text-[14px] font-[600] text-slate-500">No goals set yet.</p>
            <Button className="mt-4" iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #0271EB, #0059CE)', color: '#fff' }}>
              Set First Goal
            </Button>
          </div>
        )}
        {goals.map((g) => (
          <GoalCard key={String(g.id)} goal={g} latestWeight={latestWeight} onClick={() => openWizard(String(g.id))} />
        ))}
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
  toast: ReturnType<typeof useToast>['toast'];
  onDone: (refresh: boolean) => void;
}

function GoalWizard({ clientId, clientName, latestWeight, latestBodyFat, editingGoal, toast, onDone }: GoalWizardProps) {
  const goalId = editingGoal ? String(editingGoal.id) : null;
  const initial = useMemo(() => (editingGoal ? formFromGoalRow(editingGoal) : initGoalForm()), [editingGoal]);

  const [form, setForm] = useState<GoalFormData>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<StepId>(1);
  const [reviewMode, setReviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const initFormRef = useRef<GoalFormData>(initial);

  const draftKey = `goal-assessment-draft.v1:${clientId}:${goalId || 'new'}`;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initFormRef.current), [form]);
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: draftKey, data: form, isDirty });

  useEffect(() => {
    const draft = restore();
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
    const err = validateStep(step, form);
    setErrors((e) => ({ ...e, [stepDef.key]: err }));
    if (err) { toast.error(err); return; }
    if (step === 8) { setReviewMode(true); return; }
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
      const challenges = [...form.biggestChallenges];
      if (form.challengeOther.trim()) challenges.push(form.challengeOther.trim());

      const payload: Record<string, unknown> = {
        client_id: clientId,
        goal_type: form.goalType,
        goal_other: form.goalType === 'custom' ? form.goalName.trim() || undefined : undefined,
        goal_description: form.goalType === 'custom' ? form.goalDescription || undefined : undefined,
        target_weight: n(form.targetWeight) ?? undefined,
        target_body_fat: n(form.targetBodyFat) ?? undefined,
        target_date: form.targetDate || undefined,
        priority_goal: form.priorityGoal || undefined,
        motivation_reason: form.motivationReason || undefined,
        motivation_level: n(form.motivationLevel) ?? undefined,
        commitment_level: n(form.commitmentLevel) ?? undefined,
        biggest_challenges: challenges.length ? challenges : undefined,
        lifestyle_readiness: buildLifestylePayload(form.lifestyle),
        starting_weight: latestWeight == null ? (n(form.startingWeightManual) ?? undefined) : undefined,
        starting_body_fat_pct: latestBodyFat == null ? (n(form.startingBodyFatManual) ?? undefined) : undefined,
        notes: form.notes || undefined,
      };

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
      toast.error(err instanceof Error ? err.message : 'Failed to save goal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHero
        icon={<Target size={18} />}
        title={goalId ? 'Edit Goal' : 'New Goal'}
        subtitle={clientName}
      >
        {/* No Cancel action here — the sticky footer's Back button already
            exits the wizard at step 1 with the same discard-confirm guard,
            so a second escape hatch in the hero was redundant chrome. */}
        {!reviewMode && <GoalProgressTimeline current={step} onStep={setStep} />}
      </PageHero>

      <div className="mx-auto max-w-3xl space-y-5">
        {!reviewMode ? (
          <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {step === 1 && <StepPrimaryGoal form={form} set={set} error={errors.primaryGoal} />}
            {step === 2 && <StepTargetWeight form={form} set={set} currentWeight={latestWeight} error={errors.targetWeight} />}
            {step === 3 && <StepTargetBodyFat form={form} set={set} currentBodyFat={latestBodyFat} />}
            {step === 4 && <StepDeadline form={form} set={set} error={errors.deadline} />}
            {step === 5 && <StepPriority form={form} set={set} error={errors.priority} />}
            {step === 6 && <StepMotivationCommitment form={form} set={set} />}
            {step === 7 && <StepChallenges form={form} set={set} error={errors.challenges} />}
            {step === 8 && <StepLifestyle form={form} set={set} error={errors.lifestyle} />}
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
              currentWeight={currentWeight} targetWeight={n(form.targetWeight)}
              currentBodyFat={currentBodyFat} targetBodyFat={n(form.targetBodyFat)}
              targetDate={form.targetDate} priorityLabel={labelFor(PRIORITY_META, form.priorityGoal)}
              motivationLevel={n(form.motivationLevel) ?? 0} commitmentLevel={n(form.commitmentLevel) ?? 0}
            />
          </m.div>
        )}
      </div>

      <div className="page-action-bar" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
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
                {step === 8 ? 'Review' : 'Next'}
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
