'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, HeartPulse, Plus, History,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageHero } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import {
  classifySleep, calcStressScore, classifyHydration, classifyActivity,
  calcNutritionScore, calcRecoveryScore, classifyRisk, calcHabitRiskScore,
  buildLifestyleRiskFactors, calcLifestyleScore, classifyLifestyleReadiness,
} from '@/lib/lifestyle-calculations';
import { STEPS, initLifestyleForm, n, COACH_NOTE_FIELDS, FOOD_PREFERENCE_OPTIONS } from '@/components/pt-os/lifestyle-assessment/types';
import type { LifestyleFormData, FormErrors, StepId, CoachNotes } from '@/components/pt-os/lifestyle-assessment/types';
import LifestyleProgressTimeline from '@/components/pt-os/lifestyle-assessment/LifestyleProgressTimeline';
import StepSleep from '@/components/pt-os/lifestyle-assessment/StepSleep';
import StepStress from '@/components/pt-os/lifestyle-assessment/StepStress';
import StepOccupationActivity from '@/components/pt-os/lifestyle-assessment/StepOccupationActivity';
import AssessmentDateField, { assessmentDateIssue } from '@/components/pt-os/shared/AssessmentDateField';
import { rangeIssue } from '@/lib/forms/ranges';
import StepSmokingAlcohol from '@/components/pt-os/lifestyle-assessment/StepSmokingAlcohol';
import StepAdditionalFactors from '@/components/pt-os/lifestyle-assessment/StepAdditionalFactors';
import LifestyleDashboard from '@/components/pt-os/lifestyle-assessment/LifestyleDashboard';
import HabitRiskBadges from '@/components/pt-os/lifestyle-assessment/HabitRiskBadges';
import WeeklyHabitGoals from '@/components/pt-os/lifestyle-assessment/WeeklyHabitGoals';
import CoachNotesPanel from '@/components/pt-os/shared/CoachNotesPanel';
import LifestyleComparison from '@/components/pt-os/lifestyle-assessment/LifestyleComparison';
import LifestyleCard from '@/components/pt-os/lifestyle-assessment/LifestyleCard';
import { errorMessage } from '@/lib/forms/errors';

const EASE = [0.16, 1, 0.3, 1] as const;

function validateStep(id: StepId, form: LifestyleFormData): string | undefined {
  if (id === 1) return assessmentDateIssue(form.assessmentDate);
  if (id === 3 && !form.occupationType) return 'Please select an occupation type.';
  if (id === 4 && !form.smokingStatus) return 'Please select a smoking status.';
  if (id === 4 && !form.alcoholStatus) return 'Please select an alcohol status.';
  if (id === 4) {
    return rangeIssue(['Cigarettes per day', form.cigarettesPerDay, 0, 100], ['Years of smoking', form.yearsSmoking, 0, 80],
      ['Drinks per week', form.drinksPerWeek, 0, 100]);
  }
  return undefined;
}

type NutritionHabits = Pick<LifestyleFormData, 'waterIntakeLiters' | 'mealFrequency' | 'breakfastHabit' | 'lateNightEating'>;

/** This assessment's own water and meal answers (older records have them),
 *  else the latest Nutrition assessment's. */
function withNutrition(form: LifestyleFormData, nh: NutritionHabits | null): NutritionHabits {
  return {
    waterIntakeLiters: form.waterIntakeLiters || nh?.waterIntakeLiters || '',
    mealFrequency: form.mealFrequency || nh?.mealFrequency || '',
    breakfastHabit: form.breakfastHabit || nh?.breakfastHabit || '',
    lateNightEating: form.lateNightEating ?? nh?.lateNightEating ?? null,
  };
}

function formFromRow(row: Record<string, unknown>): LifestyleFormData {
  const fresh = initLifestyleForm();
  const foodPrefs = Array.isArray(row.food_preferences) ? (row.food_preferences as string[]) : [];
  const knownFood = new Set(FOOD_PREFERENCE_OPTIONS.map((o) => o.value));
  const coachNotesRaw = (row.coach_notes as Partial<CoachNotes> | null) || {};
  return {
    ...fresh,
    assessmentDate: row.assessment_date ? String(row.assessment_date).slice(0, 10) : fresh.assessmentDate,
    sleepDurationHours: row.sleep_duration_hours != null ? String(row.sleep_duration_hours) : fresh.sleepDurationHours,
    bedTime: row.bed_time ? String(row.bed_time).slice(0, 5) : '',
    wakeTime: row.wake_time ? String(row.wake_time).slice(0, 5) : '',
    sleepQuality: row.sleep_quality != null ? String(row.sleep_quality) : '',
    stressLevel: row.stress_level != null ? String(row.stress_level) : fresh.stressLevel,
    waterIntakeLiters: row.water_intake_liters != null ? String(row.water_intake_liters) : '',
    occupationType: (row.occupation_type as LifestyleFormData['occupationType']) || '',
    dailyStepsBracket: (row.daily_steps_bracket as LifestyleFormData['dailyStepsBracket']) || '',
    workoutExperienceLevel: (row.workout_experience_level as LifestyleFormData['workoutExperienceLevel']) || '',
    yearsOfExperience: row.years_of_experience != null ? String(row.years_of_experience) : '',
    foodPreferences: foodPrefs.filter((f) => knownFood.has(f)),
    foodPreferenceOther: foodPrefs.find((f) => !knownFood.has(f)) || '',
    mealFrequency: row.meal_frequency != null ? String(row.meal_frequency) : '',
    breakfastHabit: (row.breakfast_habit as LifestyleFormData['breakfastHabit']) || '',
    lateNightEating: typeof row.late_night_eating === 'boolean' ? row.late_night_eating : null,
    smokingStatus: (row.smoking_status as LifestyleFormData['smokingStatus']) || '',
    cigarettesPerDay: row.cigarettes_per_day != null ? String(row.cigarettes_per_day) : '',
    yearsSmoking: row.years_smoking != null ? String(row.years_smoking) : '',
    alcoholStatus: (row.alcohol_status as LifestyleFormData['alcoholStatus']) || '',
    drinksPerWeek: row.drinks_per_week != null ? String(row.drinks_per_week) : '',
    screenTimeBracket: (row.screen_time_bracket as LifestyleFormData['screenTimeBracket']) || '',
    travelFrequency: (row.travel_frequency as LifestyleFormData['travelFrequency']) || '',
    energyLevel: row.energy_level != null ? String(row.energy_level) : fresh.energyLevel,
    motivationToExercise: row.motivation_to_exercise != null ? String(row.motivation_to_exercise) : fresh.motivationToExercise,
    recoveryQuality: (row.recovery_quality as LifestyleFormData['recoveryQuality']) || '',
    coachNotes: { ...fresh.coachNotes, ...coachNotesRaw },
  };
}

export default function PtLifestyleAssessmentPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>}>
        <LifestyleContent />
      </Suspense>
    </Guard>
  );
}

function LifestyleContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker title="Lifestyle" icon={<HeartPulse size={20} color="#fff" />} basePath="/pt-os/lifestyle-assessment" />;
  return <LifestyleHub key={clientId} clientId={clientId} router={router} toast={toast} />;
}

/* ─────────────────────────────────────────────────────── HUB (list + wizard) */
interface LifestyleHubProps {
  clientId: string;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>['toast'];
}

function LifestyleHub({ clientId, toast }: LifestyleHubProps) {
  const [clientName, setClientName] = useState('');
  const [assessments, setAssessments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Water and meals are asked in Nutrition; this wizard scores them from the
  // latest Nutrition assessment (as the API does on save).
  const [nutritionHabits, setNutritionHabits] = useState<NutritionHabits | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, listRes, nutritionRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.lifestyleAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.nutritionAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setAssessments(Array.isArray(listRes?.data) ? listRes.data : []);
      const latestNutrition = (nutritionRes?.data ?? [])[0];
      setNutritionHabits(latestNutrition ? {
        waterIntakeLiters: latestNutrition.water_intake_liters != null ? String(latestNutrition.water_intake_liters) : '',
        mealFrequency: latestNutrition.meals_per_day != null ? String(latestNutrition.meals_per_day) : '',
        breakfastHabit: (latestNutrition.breakfast_regularity as LifestyleFormData['breakfastHabit']) || '',
        lateNightEating: typeof latestNutrition.late_night_eating === 'boolean' ? latestNutrition.late_night_eating : null,
      } : null);
    } catch (err: unknown) {
      setLoadError(errorMessage(err, 'Failed to load client.'));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openWizard = (id: string | null) => { setEditingId(id); setView('wizard'); };
  const closeWizard = (refresh: boolean) => { setView('list'); setEditingId(null); if (refresh) loadData(); };

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
    const editing = editingId ? assessments.find((a) => String(a.id) === editingId) : null;
    return <LifestyleWizard clientId={clientId} clientName={clientName} editing={editing || null} nutritionHabits={nutritionHabits} toast={toast} onDone={closeWizard} />;
  }

  const sorted = [...assessments].sort((a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')));
  const initial = sorted[sorted.length - 1];
  const latest = sorted[0];

  return (
    <div className="mx-auto w-full max-w-3xl py-6 space-y-5">
      <PageHero
        icon={<HeartPulse size={18} />}
        title={`${clientName}'s Lifestyle`}
        subtitle="Lifestyle Assessment"
        actions={
          <Button iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: '#fff', color: '#0F172A' }}>
            New Assessment
          </Button>
        }
      />

      {sorted.length >= 2 && <LifestyleComparison initial={initial} latest={latest} />}

      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="rounded-[20px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[14px] font-[600] text-[color:var(--text-muted)]">No lifestyle assessments yet.</p>
            <Button className="mt-4" iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #0271EB, #0059CE)', color: '#fff' }}>
              Start First Assessment
            </Button>
          </div>
        )}
        {sorted.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <History size={14} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[12.5px] font-[700] text-[color:var(--text-muted)]">Assessment History</p>
          </div>
        )}
        {sorted.map((a) => (
          <LifestyleCard key={String(a.id)} assessment={a} onClick={() => openWizard(String(a.id))} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── WIZARD */
interface LifestyleWizardProps {
  clientId: string;
  clientName: string;
  editing: Record<string, unknown> | null;
  nutritionHabits: NutritionHabits | null;
  toast: ReturnType<typeof useToast>['toast'];
  onDone: (refresh: boolean) => void;
}

function LifestyleWizard({ clientId, clientName, editing, nutritionHabits, toast, onDone }: LifestyleWizardProps) {
  const assessmentId = editing ? String(editing.id) : null;
  const initial = useMemo(() => (editing ? formFromRow(editing) : initLifestyleForm()), [editing]);

  const [form, setForm] = useState<LifestyleFormData>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<StepId>(1);
  const [reviewMode, setReviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const initFormRef = useRef<LifestyleFormData>(initial);

  const draftKey = `lifestyle-assessment-draft.v1:${clientId}:${assessmentId || 'new'}`;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initFormRef.current), [form]);
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: draftKey, data: form, isDirty });

  useEffect(() => {
    // Never lay a local draft over a record saved after it.
    const savedAt = editing ? Date.parse(String(editing.updated_at ?? editing.created_at ?? '')) || 0 : 0;
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

  const set = useCallback(<K extends keyof LifestyleFormData>(key: K, val: LifestyleFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const analysis = useMemo(() => {
    const sleep = classifySleep(n(form.sleepDurationHours), n(form.sleepQuality));
    const stressScore = calcStressScore(n(form.stressLevel));
    // Water intake now lives in the Nutrition assessment, not here, and no step
    // in this wizard collects it — so this is always absent.
    //
    // It used to substitute 3 L, to keep hydration from penalising the score or
    // raising a false "low hydration" risk. Neither needed substituting: both
    // calcHabitRiskScore and buildLifestyleRiskFactors already skip a null
    // hydrationScore, and mean() drops nulls, so an absent reading is excluded
    // from the composite rather than counted against it. Truly neutral.
    //
    // What the 3 did instead was score as 'Optimal' (85) and land in the mean.
    // The backend recomputes from the stored value — null — on POST, so the
    // Lifestyle Score on this review screen was several points above the one
    // being written, and could sit in a different readiness band than the one
    // the record ends up showing. Pass the absence through.
    const habits = withNutrition(form, nutritionHabits);
    const hydration = classifyHydration(n(habits.waterIntakeLiters));
    const activity = classifyActivity(form.dailyStepsBracket || null, form.occupationType || null);
    const nutritionScore = calcNutritionScore(n(habits.mealFrequency), habits.breakfastHabit || null, habits.lateNightEating);
    const recoveryScore = calcRecoveryScore(sleep.score, stressScore, n(form.energyLevel), form.recoveryQuality || null);
    const sedentaryRisk = classifyRisk(activity.score);
    const recoveryRisk = classifyRisk(recoveryScore);
    const habitInputs = {
      smokingStatus: form.smokingStatus || null, alcoholStatus: form.alcoholStatus || null,
      sleepScore: sleep.score, stressScore, hydrationScore: hydration.score, activityScore: activity.score, nutritionScore,
    };
    const habitRiskScore = calcHabitRiskScore(habitInputs);
    const riskFactors = buildLifestyleRiskFactors(habitInputs);
    const lifestyleScore = calcLifestyleScore(
      { sleep: sleep.score, stress: stressScore, hydration: hydration.score, activity: activity.score, nutrition: nutritionScore, recovery: recoveryScore },
      habitRiskScore,
    );
    const lifestyleReadiness = classifyLifestyleReadiness(lifestyleScore);
    return {
      sleepScore: sleep.score, stressScore, hydrationScore: hydration.score, activityScore: activity.score,
      nutritionScore, recoveryScore, sedentaryRisk, recoveryRisk, habitRiskScore, riskFactors, lifestyleScore, lifestyleReadiness,
    };
  }, [form, nutritionHabits]);

  const handleNext = () => {
    const stepDef = STEPS.find((s) => s.id === step)!;
    const err = validateStep(step, form);
    setErrors((e) => ({ ...e, [stepDef.key]: err }));
    if (err) { toast.error(err); return; }
    if (step === STEPS.length) { setReviewMode(true); return; }
    setStep((s) => (s + 1) as StepId);
  };

  // Deep-audit finding (shared with the PAR-Q/Informed Consent wizards):
  // LifestyleProgressTimeline's own click handler lets a click jump one step
  // ahead of `current`, and this used to be wired straight to `setStep`,
  // bypassing handleNext()'s validateStep() call — a user could click past
  // Occupation & Activity without selecting an occupation type. The one
  // forward jump the timeline can ever offer is exactly `step + 1` (ids here
  // have no gaps), so route it through handleNext() instead of duplicating
  // its validation. Any other click is backward (or the current step) and
  // stays a plain, unguarded setStep.
  const handleStepClick = (id: StepId) => {
    if (id === step + 1) { handleNext(); return; }
    setStep(id);
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
      // Every field this wizard asks is sent, as null when it is blank, so an
      // edit can clear an answer — `undefined` used to drop the key and the
      // old value stayed. Water, food preference, meals and motivation are
      // not asked here any more (Nutrition and Goal ask them); they are not
      // sent, so an older assessment keeps what it recorded.
      const payload: Record<string, unknown> = {
        client_id: clientId,
        assessment_date: form.assessmentDate,
        sleep_duration_hours: n(form.sleepDurationHours) ?? null,
        bed_time: form.bedTime || null,
        wake_time: form.wakeTime || null,
        sleep_quality: n(form.sleepQuality) ?? null,
        stress_level: n(form.stressLevel) ?? null,
        occupation_type: form.occupationType || null,
        daily_steps_bracket: form.dailyStepsBracket || null,
        smoking_status: form.smokingStatus || null,
        cigarettes_per_day: form.smokingStatus && form.smokingStatus !== 'never' ? n(form.cigarettesPerDay) ?? null : null,
        years_smoking: form.smokingStatus && form.smokingStatus !== 'never' ? n(form.yearsSmoking) ?? null : null,
        alcohol_status: form.alcoholStatus || null,
        drinks_per_week: form.alcoholStatus && form.alcoholStatus !== 'never' ? n(form.drinksPerWeek) ?? null : null,
        screen_time_bracket: form.screenTimeBracket || null,
        travel_frequency: form.travelFrequency || null,
        energy_level: n(form.energyLevel) ?? null,
        recovery_quality: form.recoveryQuality || null,
        coach_notes: form.coachNotes,
      };

      if (assessmentId) {
        await api.progress.lifestyleAssessments.update(assessmentId, payload);
        toast.success('Assessment updated.');
      } else {
        await api.progress.lifestyleAssessments.create(payload);
        toast.success('Assessment saved.');
      }
      clear();
      onDone(true);
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Failed to save assessment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-28">
      {/* The shared hero, as on Consent, PAR-Q, Fitness and Goal. This page
          had its own plain header, and a Cancel that discarded the wizard
          without the "Discard changes?" check Back makes; Back on the first
          step is the way out now. */}
      <div className="mx-auto max-w-3xl pt-1">
        <PageHero icon={<HeartPulse size={18} />} title={assessmentId ? 'Edit Assessment' : 'New Assessment'} subtitle={clientName}>
          {!reviewMode && <LifestyleProgressTimeline current={step} onStep={handleStepClick} />}
        </PageHero>
      </div>

      <div className="mx-auto max-w-3xl py-6 space-y-5">
        {!reviewMode ? (
          <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {step === 1 && (
              <div className="space-y-6">
                <AssessmentDateField value={form.assessmentDate} onChange={(v) => set('assessmentDate', v)} />
                <StepSleep form={form} set={set} error={errors.sleep} />
              </div>
            )}
            {step === 2 && <StepStress form={form} set={set} />}
            {step === 3 && <StepOccupationActivity form={form} set={set} error={errors.occupationActivity} />}
            {step === 4 && <StepSmokingAlcohol form={form} set={set} error={errors.smokingAlcohol} />}
            {step === 5 && <StepAdditionalFactors form={form} set={set} />}
          </m.div>
        ) : (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-5">
            <LifestyleDashboard scores={analysis} />
            <HabitRiskBadges riskFactors={analysis.riskFactors} />
            <WeeklyHabitGoals
              sleepDurationHours={n(form.sleepDurationHours)}
              waterIntakeLiters={n(withNutrition(form, nutritionHabits).waterIntakeLiters)}
              dailyStepsBracket={form.dailyStepsBracket || null}
              stressLevel={n(form.stressLevel)}
              mealFrequency={n(withNutrition(form, nutritionHabits).mealFrequency)}
            />
            <CoachNotesPanel
                fields={COACH_NOTE_FIELDS}
                notes={form.coachNotes}
                onChange={(key, value) => set('coachNotes', { ...form.coachNotes, [key]: value })}
              />
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
                {step === STEPS.length ? 'Review' : 'Next'}
              </Button>
            ) : (
              <Button
                iconLeft={!saving ? <Check size={14} /> : undefined}
                loading={saving} disabled={saving}
                onClick={handleSubmit}
                style={{ background: 'linear-gradient(135deg, #0271EB, #0059CE)', color: '#fff' }}
              >
                {saving ? 'Saving...' : assessmentId ? 'Update Assessment' : 'Save Assessment'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
