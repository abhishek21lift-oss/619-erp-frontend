'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Search, Users, AlertCircle,
  HeartPulse, Plus, X, History,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import {
  classifySleep, calcStressScore, classifyHydration, classifyActivity,
  calcNutritionScore, calcRecoveryScore, classifyRisk, calcHabitRiskScore,
  buildLifestyleRiskFactors, calcLifestyleScore, classifyLifestyleReadiness,
} from '@/lib/lifestyle-calculations';
import { STEPS, initLifestyleForm, n } from '@/components/pt-os/lifestyle-assessment/types';
import type { LifestyleFormData, FormErrors, StepId, CoachNotes } from '@/components/pt-os/lifestyle-assessment/types';
import LifestyleProgressTimeline from '@/components/pt-os/lifestyle-assessment/LifestyleProgressTimeline';
import StepSleep from '@/components/pt-os/lifestyle-assessment/StepSleep';
import StepStress from '@/components/pt-os/lifestyle-assessment/StepStress';
import StepOccupationActivity from '@/components/pt-os/lifestyle-assessment/StepOccupationActivity';
import StepWorkoutExperience from '@/components/pt-os/lifestyle-assessment/StepWorkoutExperience';
import { FOOD_PREFERENCE_OPTIONS } from '@/components/pt-os/lifestyle-assessment/StepFoodPreference';
import StepSmokingAlcohol from '@/components/pt-os/lifestyle-assessment/StepSmokingAlcohol';
import StepAdditionalFactors from '@/components/pt-os/lifestyle-assessment/StepAdditionalFactors';
import LifestyleDashboard from '@/components/pt-os/lifestyle-assessment/LifestyleDashboard';
import HabitRiskBadges from '@/components/pt-os/lifestyle-assessment/HabitRiskBadges';
import WeeklyHabitGoals from '@/components/pt-os/lifestyle-assessment/WeeklyHabitGoals';
import CoachNotesPanel from '@/components/pt-os/lifestyle-assessment/CoachNotesPanel';
import LifestyleComparison from '@/components/pt-os/lifestyle-assessment/LifestyleComparison';
import LifestyleCard from '@/components/pt-os/lifestyle-assessment/LifestyleCard';

interface ClientOption { id: string; name: string; }

const EASE = [0.16, 1, 0.3, 1] as const;

function validateStep(id: StepId, form: LifestyleFormData): string | undefined {
  if (id === 3 && !form.occupationType) return 'Please select an occupation type.';
  if (id === 5 && !form.smokingStatus) return 'Please select a smoking status.';
  if (id === 5 && !form.alcoholStatus) return 'Please select an alcohol status.';
  return undefined;
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
      <AppShell>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>}>
          <LifestyleContent />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function LifestyleContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker />;
  return <LifestyleHub key={clientId} clientId={clientId} router={router} toast={toast} />;
}

/* ─────────────────────────────────────────────────────── CLIENT PICKER */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'linear-gradient(135deg, #ec4899, #f472b6)',
  'linear-gradient(135deg, #06b6d4, #22d3ee)',
  'linear-gradient(135deg, #ef4444, #f87171)',
];

function ClientAvatar({ name }: { name: string }) {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;
  const initials = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-[700] text-white"
      style={{ background: AVATAR_GRADIENTS[idx] }}
    >
      {initials || '?'}
    </div>
  );
}

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
    <div className="mx-auto w-full max-w-4xl px-4 pt-3 pb-6 sm:px-6">
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex items-center gap-3 rounded-[20px] px-5 py-4"
        style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 8px 24px rgba(245,158,11,0.3)' }}
        >
          <HeartPulse size={20} color="#fff" />
        </div>
        <h1 className="text-[20px] sm:text-[26px] font-[860] tracking-[-0.03em] leading-[1.08]" style={{ color: 'var(--text-primary)' }}>
          Daily Habits &amp; Recovery Analysis
        </h1>
      </m.div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input
            type="text" placeholder="Search clients..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[12px] py-2.5 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-amber-400"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        {!loading && !loadError && (
          <span className="flex-shrink-0 text-[12px] font-[600]" style={{ color: 'var(--text-disabled)' }}>
            {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
          </span>
        )}
      </div>

        {loading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 rounded-[16px] p-3.5" style={{ background: 'var(--bg-subtle)' }}>
                <div className="h-10 w-10 rounded-full" style={{ background: 'var(--border)' }} />
                <div className="h-3 w-24 rounded-full" style={{ background: 'var(--border)' }} />
              </div>
            ))}
          </div>
        )}

        {loadError && (
          <EmptyState
            icon={<AlertCircle size={20} />}
            title="Could not load clients"
            description="Something went wrong while fetching your client list."
          />
        )}

        {!loading && !loadError && filtered.length === 0 && (
          <EmptyState
            icon={<Users size={20} />}
            title="No clients found"
            description={search ? `No clients match "${search}".` : 'Add a client to get started.'}
          />
        )}

        {!loading && !loadError && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/pt-os/lifestyle-assessment?client_id=${c.id}`)}
                className="group flex items-center gap-3 rounded-[16px] p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                <ClientAvatar name={c.name} />
                <span className="flex-1 truncate text-[13.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                <ArrowRight size={14} className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--text-disabled)' }} />
              </button>
            ))}
          </div>
        )}
    </div>
  );
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, listRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.lifestyleAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setAssessments(Array.isArray(listRes?.data) ? listRes.data : []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load client.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openWizard = (id: string | null) => { setEditingId(id); setView('wizard'); };
  const closeWizard = (refresh: boolean) => { setView('list'); setEditingId(null); if (refresh) loadData(); };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>;
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
    const editing = editingId ? assessments.find((a) => String(a.id) === editingId) : null;
    return <LifestyleWizard clientId={clientId} clientName={clientName} editing={editing || null} toast={toast} onDone={closeWizard} />;
  }

  const sorted = [...assessments].sort((a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')));
  const initial = sorted[sorted.length - 1];
  const latest = sorted[0];

  return (
    <div className="mx-auto w-full max-w-3xl px-5 sm:px-8 py-6 space-y-5">
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-8 sm:p-10"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
                <HeartPulse size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>Lifestyle Assessment</span>
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
              {clientName}&apos;s Lifestyle
            </h1>
          </div>
          <Button iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
            New Assessment
          </Button>
        </div>
      </m.div>

      {sorted.length >= 2 && <LifestyleComparison initial={initial} latest={latest} />}

      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="rounded-[20px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[14px] font-[600] text-slate-500">No lifestyle assessments yet.</p>
            <Button className="mt-4" iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
              Start First Assessment
            </Button>
          </div>
        )}
        {sorted.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <History size={14} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[12.5px] font-[700] text-slate-500">Assessment History</p>
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
  toast: ReturnType<typeof useToast>['toast'];
  onDone: (refresh: boolean) => void;
}

function LifestyleWizard({ clientId, clientName, editing, toast, onDone }: LifestyleWizardProps) {
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

  const set = useCallback(<K extends keyof LifestyleFormData>(key: K, val: LifestyleFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const analysis = useMemo(() => {
    const sleep = classifySleep(n(form.sleepDurationHours), n(form.sleepQuality));
    const stressScore = calcStressScore(n(form.stressLevel));
    // Water intake now lives in the Nutrition assessment, not here. When it's
    // absent, treat hydration as neutral (~3 L) so it neither penalises the
    // lifestyle score nor raises a false "low hydration" risk.
    const hydration = classifyHydration(n(form.waterIntakeLiters) || 3);
    const activity = classifyActivity(form.dailyStepsBracket || null, form.occupationType || null);
    const nutritionScore = calcNutritionScore(n(form.mealFrequency), form.breakfastHabit || null, form.lateNightEating);
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
  }, [form]);

  const handleNext = () => {
    const stepDef = STEPS.find((s) => s.id === step)!;
    const err = validateStep(step, form);
    setErrors((e) => ({ ...e, [stepDef.key]: err }));
    if (err) { toast.error(err); return; }
    if (step === 6) { setReviewMode(true); return; }
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
      const foodPreferences = [...form.foodPreferences];
      if (form.foodPreferenceOther.trim()) foodPreferences.push(form.foodPreferenceOther.trim());

      const payload: Record<string, unknown> = {
        client_id: clientId,
        assessment_date: form.assessmentDate || undefined,
        sleep_duration_hours: n(form.sleepDurationHours) ?? undefined,
        bed_time: form.bedTime || undefined,
        wake_time: form.wakeTime || undefined,
        sleep_quality: n(form.sleepQuality) ?? undefined,
        stress_level: n(form.stressLevel) ?? undefined,
        water_intake_liters: n(form.waterIntakeLiters) ?? undefined,
        occupation_type: form.occupationType || undefined,
        daily_steps_bracket: form.dailyStepsBracket || undefined,
        workout_experience_level: form.workoutExperienceLevel || undefined,
        years_of_experience: n(form.yearsOfExperience) ?? undefined,
        food_preferences: foodPreferences.length ? foodPreferences : undefined,
        meal_frequency: n(form.mealFrequency) ?? undefined,
        breakfast_habit: form.breakfastHabit || undefined,
        late_night_eating: form.lateNightEating ?? undefined,
        smoking_status: form.smokingStatus || undefined,
        cigarettes_per_day: n(form.cigarettesPerDay) ?? undefined,
        years_smoking: n(form.yearsSmoking) ?? undefined,
        alcohol_status: form.alcoholStatus || undefined,
        drinks_per_week: n(form.drinksPerWeek) ?? undefined,
        screen_time_bracket: form.screenTimeBracket || undefined,
        travel_frequency: form.travelFrequency || undefined,
        energy_level: n(form.energyLevel) ?? undefined,
        motivation_to_exercise: n(form.motivationToExercise) ?? undefined,
        recovery_quality: form.recoveryQuality || undefined,
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
      toast.error(err instanceof Error ? err.message : 'Failed to save assessment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: 'linear-gradient(160deg,#f8fafc 0%,#f1f5f9 60%,#fafafe 100%)' }}>
      {/* Header — in normal flow on the page background (no sticky card). */}
      <div className="pt-1">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 6px 18px rgba(245,158,11,0.3)' }}>
              <HeartPulse size={18} color="#fff" />
            </div>
            <div>
              <h1 className="text-[19px] font-[860] tracking-[-0.03em] text-slate-900 leading-none sm:text-[22px]">{assessmentId ? 'Edit Assessment' : 'New Assessment'}</h1>
              <p className="text-[12px] font-[600] text-slate-400 mt-1">{clientName}</p>
            </div>
          </div>
          <button type="button" onClick={() => onDone(false)} className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-[650] transition-colors hover:bg-white" style={{ color: '#64748b', border: '1px solid rgba(15,23,42,0.08)' }}>
            <X size={12} /> Cancel
          </button>
        </div>
        {!reviewMode && (
          <div className="mx-auto max-w-3xl px-5 sm:px-8 pb-3">
            <LifestyleProgressTimeline current={step} onStep={setStep} />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-6 space-y-5">
        {!reviewMode ? (
          <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {step === 1 && <StepSleep form={form} set={set} error={errors.sleep} />}
            {step === 2 && <StepStress form={form} set={set} />}
            {step === 3 && <StepOccupationActivity form={form} set={set} error={errors.occupationActivity} />}
            {step === 4 && <StepWorkoutExperience form={form} set={set} error={errors.workoutExperience} />}
            {step === 5 && <StepSmokingAlcohol form={form} set={set} error={errors.smokingAlcohol} />}
            {step === 6 && <StepAdditionalFactors form={form} set={set} />}
          </m.div>
        ) : (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-5">
            <LifestyleDashboard scores={analysis} />
            <HabitRiskBadges riskFactors={analysis.riskFactors} />
            <WeeklyHabitGoals
              sleepDurationHours={n(form.sleepDurationHours)}
              waterIntakeLiters={null}
              dailyStepsBracket={form.dailyStepsBracket || null}
              stressLevel={n(form.stressLevel)}
              mealFrequency={n(form.mealFrequency)}
            />
            <CoachNotesPanel notes={form.coachNotes} set={(notes) => set('coachNotes', notes)} />
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
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
              >
                {step === 6 ? 'Review' : 'Next'}
              </Button>
            ) : (
              <Button
                iconLeft={!saving ? <Check size={14} /> : undefined}
                loading={saving} disabled={saving}
                onClick={handleSubmit}
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
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
