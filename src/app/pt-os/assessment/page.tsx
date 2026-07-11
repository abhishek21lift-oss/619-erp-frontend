'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Search, Users, AlertCircle,
  ClipboardCheck, History, ChevronRight, X,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth-context';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import {
  computeAge, calcBmi, classifyBp, calcVo2MaxRockport, calcVo2MaxCooper,
  calcVo2MaxBruce, calcHarvardPei, classifyHarvardPei, classifyVo2Max, classifyStepTestRecovery,
  calc1RM, classifyStrength, classifyEndurance, classifyFlexibilityScore,
  scoreCategory, scoreBodyComposition, scoreHealthRisk, computeOverallScore,
} from '@/lib/fitness-calculations';
import type { FitnessCategory, Gender } from '@/lib/fitness-calculations';
import { STEPS, initAssessmentForm, n } from '@/components/pt-os/fitness-testing/types';
import type { AssessmentFormData, FormErrors, StepId } from '@/components/pt-os/fitness-testing/types';
import ProgressTimeline from '@/components/pt-os/fitness-testing/ProgressTimeline';
import AssessmentInfoCard from '@/components/pt-os/fitness-testing/AssessmentInfoCard';
import StepBloodPressure from '@/components/pt-os/fitness-testing/StepBloodPressure';
import StepAnthropometric from '@/components/pt-os/fitness-testing/StepAnthropometric';
import StepBodyComposition from '@/components/pt-os/fitness-testing/StepBodyComposition';
import StepCardio from '@/components/pt-os/fitness-testing/StepCardio';
import StepStrength from '@/components/pt-os/fitness-testing/StepStrength';
import StepEndurance from '@/components/pt-os/fitness-testing/StepEndurance';
import StepFlexibility from '@/components/pt-os/fitness-testing/StepFlexibility';
import FitnessDashboard, { type FitnessScores } from '@/components/pt-os/fitness-testing/FitnessDashboard';
import ProgressComparison from '@/components/pt-os/fitness-testing/ProgressComparison';

interface ClientOption { id: string; name: string; }
interface TrainerOption { id: string; name: string; }

const EASE = [0.16, 1, 0.3, 1] as const;

function buildCardioTestData(form: AssessmentFormData): Record<string, unknown> {
  switch (form.cardioTestType) {
    case 'Rockport 1-Mile Walk': return { timeMin: n(form.cardioTimeMin), heartRate: n(form.cardioHeartRate) };
    case 'Cooper 12-Minute Run': return { distanceMeters: n(form.cardioDistanceMeters) };
    case 'Bruce Protocol': return { treadmillMinutes: n(form.cardioTreadmillMinutes) };
    case 'Harvard Step Test': return {
      durationSec: n(form.cardioDurationSec), pulse1: n(form.cardioPulse1),
      pulse2: n(form.cardioPulse2), pulse3: n(form.cardioPulse3),
    };
    case 'YMCA 3-Minute Step Test': return { recoveryHr: n(form.cardioRecoveryHr) };
    case 'Custom': return { notes: form.cardioDistanceMeters || undefined };
    default: return {};
  }
}

function strengthExerciseName(form: AssessmentFormData): string {
  return (form.strengthExercise === 'Custom Exercise' ? form.strengthCustomExercise : form.strengthExercise) || '';
}

function estimateOneRM(form: AssessmentFormData): number | null {
  return form.strengthMode === 'direct'
    ? n(form.strengthDirect1RM)
    : calc1RM(n(form.strengthWeightKg), n(form.strengthReps), form.strengthFormula);
}

function validateStep(id: StepId, form: AssessmentFormData): string | undefined {
  if (id === 4) return form.cardioTestType ? undefined : 'Please select a cardiorespiratory test.';
  if (id === 5) return form.strengthExercise ? undefined : 'Please select an exercise.';
  if (id === 6) return form.enduranceTestType ? undefined : 'Please select an endurance test.';
  if (id === 7) return form.flexibilityTestType ? undefined : 'Please select a flexibility test.';
  return undefined;
}

export default function PtAssessmentPage() {
  return (
    <Guard>
      <AppShell>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>}>
          <AssessmentContent />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function AssessmentContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker />;
  return <AssessmentWizard key={clientId} clientId={clientId} isAdmin={isAdmin} router={router} toast={toast} />;
}

/* ─────────────────────────────────────────────────────── CLIENT PICKER */
function ClientPicker() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    api.pt.clients().then((r: { data?: unknown[] }) => {
      const arr = Array.isArray(r?.data) ? r.data : [];
      setClients((arr as Record<string, unknown>[]).map((c) => ({ id: String(c.id), name: String(c.name ?? '') })));
    }).catch(() => setLoadError(true)).finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
            <ClipboardCheck size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>Fitness Testing</span>
        </div>
        <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
          Scientific Baseline Assessment
        </h1>
        <p className="mt-3 max-w-xl text-[14px]" style={{ color: 'var(--text-muted)' }}>
          Select a client to begin or review their 7-step fitness assessment.
        </p>
      </m.div>

      <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input
            type="text" placeholder="Search clients..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-[10px] text-[13px] outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid #d1d5db', color: 'var(--text-primary)' }}
          />
        </div>
        {loading && <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" /></div>}
        {loadError && <p className="text-center py-8 text-[13px]" style={{ color: 'var(--text-muted)' }}>Could not load clients.</p>}
        {!loading && !loadError && (
          <div className="flex flex-wrap gap-2 max-h-[360px] overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/pt-os/assessment?client_id=${c.id}`)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-[600] transition-all"
                style={{ background: '#F9FAFB', border: '1px solid #e5e7eb', color: '#334155' }}
              >
                <Users size={13} /> {c.name}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>No clients found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── WIZARD */
interface AssessmentWizardProps {
  clientId: string;
  isAdmin: boolean;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>['toast'];
}

function AssessmentWizard({ clientId, isAdmin, router, toast }: AssessmentWizardProps) {
  const [clientName, setClientName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState<AssessmentFormData>(initAssessmentForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<StepId>(1);
  const [reviewMode, setReviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const initFormRef = useRef<AssessmentFormData>(initAssessmentForm());

  const draftKey = `fitness-testing-draft.v1:${clientId}`;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initFormRef.current), [form]);
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: draftKey, data: form, isDirty });

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, trainersRes, historyRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.pt.trainers() as Promise<{ data?: TrainerOption[] }>,
        api.progress.assessments.list({ client_id: clientId, limit: 50 }) as Promise<{ data?: Record<string, unknown>[] }>,
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setAge(computeAge(c.dob ? String(c.dob) : null));
      const g = String(c.gender ?? '');
      setGender(g === 'Male' || g === 'Female' || g === 'Other' ? g : null);

      const list = Array.isArray(trainersRes?.data) ? trainersRes.data : [];
      setTrainers(list);
      const hist = Array.isArray(historyRes?.data) ? historyRes.data : [];
      setHistory(hist);

      const existingTrainerId = String(c.trainer_id ?? '');
      const existingTrainerName = String(c.trainer_name ?? '');
      const defaultTrainer = !existingTrainerId && list.length === 1 ? list[0] : null;

      const loaded: AssessmentFormData = {
        ...initAssessmentForm(),
        trainerId: defaultTrainer?.id || existingTrainerId,
        trainerName: defaultTrainer?.name || existingTrainerName,
      };

      const draft = restore();
      const finalForm = draft ? { ...loaded, ...draft } : loaded;
      setForm(finalForm);
      initFormRef.current = loaded;
      if (draft) toast.info('Restored your unsaved draft.');
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load client.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const set = useCallback(<K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleTrainerChange = (trainerId: string) => {
    const t = trainers.find((tr) => tr.id === trainerId);
    setForm((prev) => ({ ...prev, trainerId, trainerName: t?.name || '' }));
  };

  const liveScores = useMemo<FitnessScores>(() => {
    const bmi = calcBmi(n(form.weight), n(form.heightCm));
    const bp = classifyBp(n(form.bpSystolic), n(form.bpDiastolic));
    const healthRiskScore = scoreHealthRisk(bp.category, bmi);
    const bodyCompositionScore = scoreBodyComposition(n(form.bodyFatPct), gender);

    let vo2: number | null = null;
    let cardioCategory: FitnessCategory | null = null;
    if (form.cardioTestType === 'Rockport 1-Mile Walk') {
      vo2 = calcVo2MaxRockport(n(form.weight), age, gender, n(form.cardioTimeMin), n(form.cardioHeartRate));
    } else if (form.cardioTestType === 'Cooper 12-Minute Run') {
      vo2 = calcVo2MaxCooper(n(form.cardioDistanceMeters));
    } else if (form.cardioTestType === 'Bruce Protocol') {
      vo2 = calcVo2MaxBruce(n(form.cardioTreadmillMinutes));
    } else if (form.cardioTestType === 'Harvard Step Test') {
      const pei = calcHarvardPei(n(form.cardioDurationSec), n(form.cardioPulse1), n(form.cardioPulse2), n(form.cardioPulse3));
      cardioCategory = classifyHarvardPei(pei);
    } else if (form.cardioTestType === 'YMCA 3-Minute Step Test') {
      cardioCategory = classifyStepTestRecovery(n(form.cardioRecoveryHr));
    }
    if (vo2 != null && !cardioCategory) cardioCategory = classifyVo2Max(vo2, age, gender);
    const cardioScore = scoreCategory(cardioCategory);

    const oneRM = estimateOneRM(form);
    const strengthCategory = classifyStrength(oneRM, n(form.weight), form.strengthExercise || null, gender);
    const strengthScore = scoreCategory(strengthCategory);

    const enduranceValue = form.enduranceValueType === 'reps' ? n(form.enduranceReps) : n(form.enduranceDurationSec);
    const enduranceCategory = classifyEndurance(form.enduranceTestType || null, enduranceValue, gender);
    const enduranceScore = scoreCategory(enduranceCategory);

    const flexCategory = classifyFlexibilityScore(n(form.flexibilityScore));
    const mobilityScore = scoreCategory(flexCategory);

    const overallScore = computeOverallScore({
      bodyComposition: bodyCompositionScore, endurance: enduranceScore,
      mobility: mobilityScore, cardio: cardioScore, healthRisk: healthRiskScore, strength: strengthScore,
    });

    return { cardioScore, strengthScore, enduranceScore, mobilityScore, bodyCompositionScore, healthRiskScore, overallScore };
  }, [form, age, gender]);

  const handleNext = () => {
    const stepDef = STEPS.find((s) => s.id === step)!;
    const err = validateStep(step, form);
    setErrors((e) => ({ ...e, [stepDef.key]: err }));
    if (err) { toast.error(err); return; }
    if (step === 7) { setReviewMode(true); return; }
    setStep((s) => (s + 1) as StepId);
  };

  const handleBack = () => {
    if (reviewMode) { setReviewMode(false); return; }
    if (step > 1) { setStep((s) => (s - 1) as StepId); return; }
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    router.push(`/pt-os/clients/${clientId}`);
  };

  const handleSaveDraft = () => {
    const ok = saveNow();
    toast[ok ? 'success' : 'error'](ok ? 'Draft saved.' : 'Could not save draft — storage unavailable.');
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        client_id: clientId,
        trainer_id: form.trainerId || undefined,
        assessment_date: form.assessmentDate,
        assessment_type: form.assessmentType,
        assessment_notes: form.assessmentNotes || undefined,
        age: age ?? undefined, gender: gender ?? undefined,

        bp_systolic: n(form.bpSystolic) ?? undefined, bp_diastolic: n(form.bpDiastolic) ?? undefined,
        resting_heart_rate: n(form.restingHeartRate) ?? undefined, resting_spo2: n(form.restingSpo2) ?? undefined,

        weight: n(form.weight) ?? undefined, height_cm: n(form.heightCm) ?? undefined,
        waist_cm: n(form.waistCm) ?? undefined, hips_cm: n(form.hipsCm) ?? undefined,
        neck_cm: n(form.neckCm) ?? undefined, chest_cm: n(form.chestCm) ?? undefined,
        arm_right_cm: n(form.armRightCm) ?? undefined, arm_left_cm: n(form.armLeftCm) ?? undefined,
        thigh_right_cm: n(form.thighRightCm) ?? undefined, thigh_left_cm: n(form.thighLeftCm) ?? undefined,
        calf_right_cm: n(form.calfRightCm) ?? undefined, calf_left_cm: n(form.calfLeftCm) ?? undefined,

        body_comp_method: form.bodyCompMethod || undefined,
        body_fat_pct: n(form.bodyFatPct) ?? undefined, muscle_mass_pct: n(form.muscleMassPct) ?? undefined,
        visceral_fat: n(form.visceralFat) ?? undefined, subcutaneous_fat_pct: n(form.subcutaneousFatPct) ?? undefined,
        body_water_pct: n(form.bodyWaterPct) ?? undefined, bone_mass_kg: n(form.boneMassKg) ?? undefined,
        bmr: n(form.bmr) ?? undefined, metabolic_age: n(form.metabolicAge) ?? undefined,

        cardio_test_type: form.cardioTestType || undefined,
        cardio_test_data: buildCardioTestData(form),

        strength_exercise: strengthExerciseName(form) || undefined,
        strength_weight_kg: n(form.strengthWeightKg) ?? undefined,
        strength_reps: n(form.strengthReps) ?? undefined,
        strength_formula: form.strengthFormula,
        strength_direct_1rm: n(form.strengthDirect1RM) ?? undefined,
        strength_is_direct: form.strengthMode === 'direct',

        endurance_test_type: form.enduranceTestType || undefined,
        endurance_test_data: { reps: n(form.enduranceReps) ?? undefined, durationSec: n(form.enduranceDurationSec) ?? undefined },

        flexibility_test_data: {
          testType: form.flexibilityTestType || undefined,
          customTestType: form.flexibilityTestType === 'Custom' ? (form.flexibilityCustomTest || undefined) : undefined,
          left: n(form.flexibilityLeft) ?? undefined, right: n(form.flexibilityRight) ?? undefined,
          score: n(form.flexibilityScore) ?? undefined, rom: n(form.flexibilityRom) ?? undefined,
          limitationNotes: form.flexibilityLimitationNotes || undefined,
        },

        posture_notes: form.postureNotes || undefined,
        health_notes: form.healthNotes || undefined,
      };

      const res = await api.progress.assessments.create(payload) as { data?: Record<string, unknown> };
      const created = res?.data;

      const oneRM = estimateOneRM(form);
      if (oneRM != null && created?.id) {
        await api.progress.strengthLogs.create({
          client_id: clientId,
          exercise_name: strengthExerciseName(form) || 'Bench Press',
          weight_kg: n(form.strengthWeightKg) ?? undefined,
          reps_done: n(form.strengthReps) ?? undefined,
          assessment_id: created.id,
          one_rm_formula: form.strengthFormula,
          is_direct_1rm: form.strengthMode === 'direct',
          one_rm_estimate: oneRM,
        });
      }

      clear();
      if (created) setHistory((h) => [created, ...h]);
      toast.success(created?.bp_unsafe ? 'Assessment saved. Blood pressure flagged unsafe — medical clearance recommended.' : 'Assessment saved.');

      const fresh = initAssessmentForm();
      fresh.trainerId = form.trainerId;
      fresh.trainerName = form.trainerName;
      setForm(fresh);
      initFormRef.current = fresh;
      setErrors({});
      setStep(1);
      setReviewMode(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save assessment.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} />
      </div>
    );
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

  const nextAssessmentNumber = history.length + 1;
  const sortedHistory = [...history].sort((a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')));
  const initialAssessment = sortedHistory[sortedHistory.length - 1];
  const latestAssessment = sortedHistory[0];

  return (
    <div className="min-h-screen pb-28" style={{ background: 'linear-gradient(160deg,#f8fafc 0%,#f1f5f9 60%,#fafafe 100%)' }}>
      <div className="sticky top-0 z-40" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[13px]" style={{ background: '#0f172a' }}>
              <ClipboardCheck size={17} color="#F59E0B" />
            </div>
            <div>
              <h1 className="text-[18px] font-[860] tracking-[-0.03em] text-slate-900 leading-none">Fitness Testing</h1>
              <p className="text-[11px] font-[600] text-slate-400 mt-0.5">{clientName || 'Client'} · Assessment #{nextAssessmentNumber}</p>
            </div>
          </div>
          <button
            type="button" onClick={() => router.push('/pt-os/assessment')}
            className="flex items-center gap-1 text-[11.5px] font-[650]" style={{ color: '#94a3b8' }}
          >
            <X size={12} /> Change client
          </button>
        </div>
        {!reviewMode && (
          <div className="mx-auto max-w-3xl px-5 sm:px-8 pb-3">
            <ProgressTimeline current={step} onStep={setStep} />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-6 space-y-5">
        {!reviewMode ? (
          <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {step === 1 && <AssessmentInfoCard form={form} set={set} clientName={clientName} nextAssessmentNumber={nextAssessmentNumber} isAdmin={isAdmin} trainers={trainers} onTrainerChange={handleTrainerChange} />}
            {step === 1 && <StepBloodPressure form={form} set={set} error={errors.bp} />}
            {step === 2 && <StepAnthropometric form={form} set={set} error={errors.anthropometric} />}
            {step === 3 && <StepBodyComposition form={form} set={set} age={age} gender={gender} error={errors.bodyComposition} />}
            {step === 4 && <StepCardio form={form} set={set} age={age} gender={gender} error={errors.cardio} />}
            {step === 5 && <StepStrength form={form} set={set} gender={gender} error={errors.strength} />}
            {step === 6 && <StepEndurance form={form} set={set} gender={gender} error={errors.endurance} />}
            {step === 7 && <StepFlexibility form={form} set={set} error={errors.flexibility} />}
          </m.div>
        ) : (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <FitnessDashboard scores={liveScores} />
          </m.div>
        )}

        {sortedHistory.length >= 2 && (
          <ProgressComparison initial={initialAssessment} latest={latestAssessment} />
        )}

        {sortedHistory.length > 0 && (
          <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2.5 mb-5">
                <History size={16} style={{ color: 'var(--text-muted)' }} />
                <h2 className="text-[15px] font-[760] text-slate-900">Assessment History</h2>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sortedHistory.map((a) => (
                  <div key={String(a.id)} className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3" style={{ background: 'var(--bg-subtle)' }}>
                    <div>
                      <p className="text-[13px] font-[700] text-slate-700">{String(a.assessment_date ?? '').slice(0, 10)}</p>
                      <p className="text-[11px] text-slate-400 capitalize">{String(a.assessment_type ?? '').replace(/_/g, ' ')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.overall_fitness_score != null && (
                        <span className="rounded-full px-2.5 py-1 text-[11.5px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
                          Score {String(a.overall_fitness_score)}
                        </span>
                      )}
                      <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-3.5 flex items-center justify-between gap-3">
          <Button variant="outline" iconLeft={<ArrowLeft size={14} />} onClick={handleBack}>Back</Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSaveDraft}>Save Draft</Button>
            {!reviewMode ? (
              <Button
                iconLeft={<ArrowRight size={14} />}
                onClick={handleNext}
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
              >
                {step === 7 ? 'Review' : 'Next'}
              </Button>
            ) : (
              <Button
                iconLeft={!saving ? <Check size={14} /> : undefined}
                loading={saving} disabled={saving}
                onClick={handleSubmit}
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
              >
                {saving ? 'Saving...' : 'Save Assessment'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
