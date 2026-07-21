'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Search, Users, AlertCircle,
  Salad, Plus, X, History,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import {
  calcDietQualityScore, assessProtein, calcDailyFluidIntake, calcHydrationScore,
  calcDigestiveHealthScore, calcSupplementScore, calcNutritionRiskScore,
  buildNutritionRiskFactors, calcNutritionScore, classifyNutritionReadiness,
} from '@/lib/nutrition-calculations';
import { STEPS, initNutritionForm, n } from '@/components/pt-os/nutrition-assessment/types';
import type { NutritionFormData, FormErrors, StepId, CoachNotes } from '@/components/pt-os/nutrition-assessment/types';
import NutritionProgressTimeline from '@/components/pt-os/nutrition-assessment/NutritionProgressTimeline';
import StepDietPreference from '@/components/pt-os/nutrition-assessment/StepDietPreference';
import StepFoodRestrictions, { FOOD_ALLERGY_OPTIONS, FOODS_TO_AVOID_OPTIONS } from '@/components/pt-os/nutrition-assessment/StepFoodRestrictions';
import StepFavouriteFoods, { FAVOURITE_FOOD_OPTIONS } from '@/components/pt-os/nutrition-assessment/StepFavouriteFoods';
import StepSupplements from '@/components/pt-os/nutrition-assessment/StepSupplements';
import StepDigestiveHealth from '@/components/pt-os/nutrition-assessment/StepDigestiveHealth';
import StepMealPatternBehaviour from '@/components/pt-os/nutrition-assessment/StepMealPatternBehaviour';
import StepHydrationCravings from '@/components/pt-os/nutrition-assessment/StepHydrationCravings';
import StepContext from '@/components/pt-os/nutrition-assessment/StepContext';
import NutritionDashboard from '@/components/pt-os/nutrition-assessment/NutritionDashboard';
import NutritionRiskBadges from '@/components/pt-os/nutrition-assessment/NutritionRiskBadges';
import CoachNotesPanel from '@/components/pt-os/nutrition-assessment/CoachNotesPanel';
import NutritionComparison from '@/components/pt-os/nutrition-assessment/NutritionComparison';
import NutritionCard from '@/components/pt-os/nutrition-assessment/NutritionCard';

interface ClientOption { id: string; name: string; }

const EASE = [0.16, 1, 0.3, 1] as const;

function validateStep(id: StepId, form: NutritionFormData): string | undefined {
  if (id === 4 && form.takesSupplements === null) return 'Please indicate whether the client takes supplements.';
  return undefined;
}

function splitOther(values: string[], known: string[]): { known: string[]; other: string } {
  const knownSet = new Set(known);
  return {
    known: values.filter((v) => knownSet.has(v)),
    other: values.find((v) => !knownSet.has(v)) || '',
  };
}

function formFromRow(row: Record<string, unknown>): NutritionFormData {
  const fresh = initNutritionForm();
  const allergiesRaw = Array.isArray(row.food_allergies) ? (row.food_allergies as string[]) : [];
  const avoidRaw = Array.isArray(row.foods_to_avoid) ? (row.foods_to_avoid as string[]) : [];
  const favRaw = Array.isArray(row.favourite_foods) ? (row.favourite_foods as string[]) : [];
  const allergies = splitOther(allergiesRaw, FOOD_ALLERGY_OPTIONS);
  const avoid = splitOther(avoidRaw, FOODS_TO_AVOID_OPTIONS);
  const fav = splitOther(favRaw, FAVOURITE_FOOD_OPTIONS);
  const coachNotesRaw = (row.coach_notes as Partial<CoachNotes> | null) || {};

  return {
    ...fresh,
    assessmentDate: row.assessment_date ? String(row.assessment_date).slice(0, 10) : fresh.assessmentDate,
    dietPreferences: Array.isArray(row.diet_preferences) ? (row.diet_preferences as string[]) : [],
    foodAllergies: allergies.known, foodAllergyOther: allergies.other,
    foodsToAvoid: avoid.known, foodsToAvoidOther: avoid.other,
    foodsToAvoidReason: (row.foods_to_avoid_reason as NutritionFormData['foodsToAvoidReason']) || '',
    favouriteFoods: fav.known, favouriteFoodOther: fav.other,
    takesSupplements: typeof row.takes_supplements === 'boolean' ? row.takes_supplements : null,
    supplements: Array.isArray(row.supplements) ? row.supplements as NutritionFormData['supplements'] : [],
    digestiveIssues: Array.isArray(row.digestive_issues) ? row.digestive_issues as NutritionFormData['digestiveIssues'] : [],
    mealsPerDay: row.meals_per_day != null ? String(row.meals_per_day) : '',
    breakfastRegularity: (row.breakfast_regularity as NutritionFormData['breakfastRegularity']) || '',
    lunchRegularity: (row.lunch_regularity as NutritionFormData['lunchRegularity']) || '',
    dinnerRegularity: (row.dinner_regularity as NutritionFormData['dinnerRegularity']) || '',
    snacksPerDay: row.snacks_per_day != null ? String(row.snacks_per_day) : '',
    lateNightEating: typeof row.late_night_eating === 'boolean' ? row.late_night_eating : null,
    mealTimingConsistency: (row.meal_timing_consistency as NutritionFormData['mealTimingConsistency']) || '',
    eatingOutFrequency: (row.eating_out_frequency as NutritionFormData['eatingOutFrequency']) || '',
    weekendEatingHabits: (row.weekend_eating_habits as NutritionFormData['weekendEatingHabits']) || '',
    eatingBehaviours: Array.isArray(row.eating_behaviours) ? (row.eating_behaviours as string[]) : [],
    waterIntakeLiters: row.water_intake_liters != null ? String(row.water_intake_liters) : '',
    teaCupsPerDay: row.tea_cups_per_day != null ? String(row.tea_cups_per_day) : '',
    coffeeCupsPerDay: row.coffee_cups_per_day != null ? String(row.coffee_cups_per_day) : '',
    softDrinksPerDay: row.soft_drinks_per_day != null ? String(row.soft_drinks_per_day) : '',
    juicesPerDay: row.juices_per_day != null ? String(row.juices_per_day) : '',
    alcoholicDrinksPerWeek: row.alcoholic_drinks_per_week != null ? String(row.alcoholic_drinks_per_week) : '',
    cravings: Array.isArray(row.cravings) ? (row.cravings as string[]) : [],
    cravingFrequency: (row.craving_frequency as NutritionFormData['cravingFrequency']) || '',
    mealPreparer: (row.meal_preparer as NutritionFormData['mealPreparer']) || '',
    nutritionBudget: (row.nutrition_budget as NutritionFormData['nutritionBudget']) || '',
    medicalConditions: Array.isArray(row.medical_conditions) ? (row.medical_conditions as string[]) : [],
    medicalNotes: row.medical_notes ? String(row.medical_notes) : '',
    coachNotes: { ...fresh.coachNotes, ...coachNotesRaw },
  };
}

export default function PtNutritionAssessmentPage() {
  return (
    <Guard>
      <AppShell>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>}>
          <NutritionContent />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function NutritionContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker />;
  return <NutritionHub key={clientId} clientId={clientId} router={router} toast={toast} />;
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
    <div className="mx-auto w-full max-w-3xl px-4 pt-3 pb-6 sm:px-6">
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex items-center gap-3 rounded-[20px] px-5 py-4"
        style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 8px 24px rgba(245,158,11,0.3)' }}
        >
          <Salad size={20} color="#fff" />
        </div>
        <h1 className="text-[20px] sm:text-[26px] font-[860] tracking-[-0.03em] leading-[1.08]" style={{ color: 'var(--text-primary)' }}>
          Diet &amp; Nutrition Profiling
        </h1>
      </m.div>

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
        <div className="flex flex-wrap gap-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/pt-os/nutrition-assessment?client_id=${c.id}`)}
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
  );
}

/* ─────────────────────────────────────────────────────── HUB (list + wizard) */
interface NutritionHubProps {
  clientId: string;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>['toast'];
}

function NutritionHub({ clientId, toast }: NutritionHubProps) {
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
        api.progress.nutritionAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
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
    return <NutritionWizard clientId={clientId} clientName={clientName} editing={editing || null} toast={toast} onDone={closeWizard} />;
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
                <Salad size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>Nutrition Assessment</span>
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
              {clientName}&apos;s Nutrition
            </h1>
          </div>
          <Button iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
            New Assessment
          </Button>
        </div>
      </m.div>

      {sorted.length >= 2 && <NutritionComparison initial={initial} latest={latest} />}

      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="rounded-[20px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[14px] font-[600] text-slate-500">No nutrition assessments yet.</p>
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
          <NutritionCard key={String(a.id)} assessment={a} onClick={() => openWizard(String(a.id))} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── WIZARD */
interface NutritionWizardProps {
  clientId: string;
  clientName: string;
  editing: Record<string, unknown> | null;
  toast: ReturnType<typeof useToast>['toast'];
  onDone: (refresh: boolean) => void;
}

function NutritionWizard({ clientId, clientName, editing, toast, onDone }: NutritionWizardProps) {
  const assessmentId = editing ? String(editing.id) : null;
  const initial = useMemo(() => (editing ? formFromRow(editing) : initNutritionForm()), [editing]);

  const [form, setForm] = useState<NutritionFormData>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<StepId>(1);
  const [reviewMode, setReviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const initFormRef = useRef<NutritionFormData>(initial);

  const draftKey = `nutrition-assessment-draft.v1:${clientId}:${assessmentId || 'new'}`;
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

  const set = useCallback(<K extends keyof NutritionFormData>(key: K, val: NutritionFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const analysis = useMemo(() => {
    const dietQualityScore = calcDietQualityScore(
      form.foodsToAvoid, form.favouriteFoods, form.cravings, form.cravingFrequency || null, form.eatingBehaviours,
      form.breakfastRegularity || null, form.lateNightEating
    );
    const protein = assessProtein(form.favouriteFoods, form.takesSupplements, form.supplements);
    const dailyFluidIntake = calcDailyFluidIntake(n(form.waterIntakeLiters), n(form.teaCupsPerDay), n(form.coffeeCupsPerDay), n(form.softDrinksPerDay), n(form.juicesPerDay));
    const hydrationScore = calcHydrationScore(n(form.waterIntakeLiters), n(form.softDrinksPerDay), n(form.alcoholicDrinksPerWeek));
    const digestiveHealthScore = calcDigestiveHealthScore(form.digestiveIssues);
    const supplementScore = calcSupplementScore(form.takesSupplements, form.supplements);

    // Alcohol/Smoking risk inputs come from a cross-module lookup of the
    // client's latest Lifestyle Assessment — the backend fetches and applies
    // this authoritatively on save. The live wizard preview simply omits
    // those two risk factors until the assessment is saved and re-fetched.
    const riskInputs = {
      proteinAssessment: protein.assessment, hydrationScore, digestiveHealthScore,
      cravings: form.cravings, cravingFrequency: form.cravingFrequency || null,
      medicalConditions: form.medicalConditions, medicalNotes: form.medicalNotes || null,
      alcoholStatus: null, smokingStatus: null,
    };
    const nutritionRiskScore = calcNutritionRiskScore(riskInputs);
    const riskFactors = buildNutritionRiskFactors(riskInputs);

    const nutritionScoreVal = calcNutritionScore(
      { dietQuality: dietQualityScore, protein: protein.score, hydration: hydrationScore, digestive: digestiveHealthScore, supplement: supplementScore },
      nutritionRiskScore
    );
    const nutritionReadiness = classifyNutritionReadiness(nutritionScoreVal);

    return {
      dietQualityScore, proteinScore: protein.score, proteinAssessment: protein.assessment,
      dailyFluidIntake, hydrationScore, digestiveHealthScore, supplementScore,
      nutritionRiskScore, riskFactors, nutritionScore: nutritionScoreVal, nutritionReadiness,
    };
  }, [form]);

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
      const foodAllergies = [...form.foodAllergies];
      if (form.foodAllergyOther.trim()) foodAllergies.push(form.foodAllergyOther.trim());
      const foodsToAvoid = [...form.foodsToAvoid];
      if (form.foodsToAvoidOther.trim()) foodsToAvoid.push(form.foodsToAvoidOther.trim());
      const favouriteFoods = [...form.favouriteFoods];
      if (form.favouriteFoodOther.trim()) favouriteFoods.push(form.favouriteFoodOther.trim());

      const payload: Record<string, unknown> = {
        client_id: clientId,
        assessment_date: form.assessmentDate || undefined,
        diet_preferences: form.dietPreferences.length ? form.dietPreferences : undefined,
        food_allergies: foodAllergies.length ? foodAllergies : undefined,
        foods_to_avoid: foodsToAvoid.length ? foodsToAvoid : undefined,
        foods_to_avoid_reason: form.foodsToAvoidReason || undefined,
        favourite_foods: favouriteFoods.length ? favouriteFoods : undefined,
        takes_supplements: form.takesSupplements ?? undefined,
        supplements: form.supplements.length ? form.supplements : undefined,
        digestive_issues: form.digestiveIssues.length ? form.digestiveIssues : undefined,
        meals_per_day: n(form.mealsPerDay) ?? undefined,
        breakfast_regularity: form.breakfastRegularity || undefined,
        lunch_regularity: form.lunchRegularity || undefined,
        dinner_regularity: form.dinnerRegularity || undefined,
        snacks_per_day: n(form.snacksPerDay) ?? undefined,
        late_night_eating: form.lateNightEating ?? undefined,
        meal_timing_consistency: form.mealTimingConsistency || undefined,
        eating_out_frequency: form.eatingOutFrequency || undefined,
        weekend_eating_habits: form.weekendEatingHabits || undefined,
        eating_behaviours: form.eatingBehaviours.length ? form.eatingBehaviours : undefined,
        water_intake_liters: n(form.waterIntakeLiters) ?? undefined,
        tea_cups_per_day: n(form.teaCupsPerDay) ?? undefined,
        coffee_cups_per_day: n(form.coffeeCupsPerDay) ?? undefined,
        soft_drinks_per_day: n(form.softDrinksPerDay) ?? undefined,
        juices_per_day: n(form.juicesPerDay) ?? undefined,
        alcoholic_drinks_per_week: n(form.alcoholicDrinksPerWeek) ?? undefined,
        cravings: form.cravings.length ? form.cravings : undefined,
        craving_frequency: form.cravingFrequency || undefined,
        meal_preparer: form.mealPreparer || undefined,
        nutrition_budget: form.nutritionBudget || undefined,
        medical_conditions: form.medicalConditions.length ? form.medicalConditions : undefined,
        medical_notes: form.medicalNotes || undefined,
        coach_notes: form.coachNotes,
      };

      if (assessmentId) {
        await api.progress.nutritionAssessments.update(assessmentId, payload);
        toast.success('Assessment updated.');
      } else {
        await api.progress.nutritionAssessments.create(payload);
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
              <Salad size={18} color="#fff" />
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
            <NutritionProgressTimeline current={step} onStep={setStep} />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-6 space-y-5">
        {!reviewMode ? (
          <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {step === 1 && <StepDietPreference form={form} set={set} error={errors.dietPreference} />}
            {step === 2 && <StepFoodRestrictions form={form} set={set} error={errors.foodRestrictions} />}
            {step === 3 && <StepFavouriteFoods form={form} set={set} error={errors.favouriteFoods} />}
            {step === 4 && <StepSupplements form={form} set={set} error={errors.supplements} />}
            {step === 5 && <StepDigestiveHealth form={form} set={set} />}
            {step === 6 && <StepMealPatternBehaviour form={form} set={set} error={errors.mealPatternBehaviour} />}
            {step === 7 && <StepHydrationCravings form={form} set={set} error={errors.hydrationCravings} />}
            {step === 8 && <StepContext form={form} set={set} />}
          </m.div>
        ) : (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-5">
            <NutritionDashboard scores={analysis} />
            <NutritionRiskBadges riskFactors={analysis.riskFactors} />
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
                {step === 8 ? 'Review' : 'Next'}
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
