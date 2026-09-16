'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Apple, Loader2, ChevronDown, ChevronUp, Sparkles, RotateCcw, Droplets, ShoppingCart, Pill, Utensils } from 'lucide-react';
import { m, type Variants } from 'framer-motion';
import { api } from '@/lib/api';
import type { AiDietPlan, AiDietMeal } from '@/lib/api';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import { errorMessage } from '@/lib/forms/errors';
import {
  NumberField, SelectField, TextField, ChoiceChips, useStandaloneField,
} from '@/components/ui/form';
import { aiDietInputSchema, stated } from '@/lib/forms/schemas/aiGenerator';

const ACCENT = '#10B981';
const ACCENT_SOFT = '#34D399';
const ACCENT_DIM = 'rgba(16,185,129,0.10)';
const ACCENT_GRADIENT = `linear-gradient(135deg, ${ACCENT_SOFT}, ${ACCENT})`;

const ACTIVITY_LEVELS = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'];
const GOALS = ['weight_loss', 'muscle_gain', 'maintenance', 'recomposition'];
const BUDGETS = ['budget', 'moderate', 'premium'];

const labelMap: Record<string, string> = {
  sedentary: 'Sedentary (desk job)', lightly_active: 'Lightly Active', moderately_active: 'Moderately Active',
  very_active: 'Very Active', extra_active: 'Extra Active (athlete)',
  weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', maintenance: 'Maintenance', recomposition: 'Body Recomposition',
  budget: 'Budget Friendly', moderate: 'Moderate', premium: 'Premium',
  male: 'Male', female: 'Female', other: 'Other',
};

const LOADING_STEPS = [
  'Analysing your profile…',
  'Calculating your calorie target…',
  'Balancing protein, carbs and fat…',
  'Building your meal schedule…',
  'Writing your grocery list…',
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─── Result atoms ───────────────────────────────────────────────────────── */
function MealCard({ meal, index }: { meal: AiDietMeal; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <m.div variants={fadeUp} initial="hidden" animate="show" custom={index}
      className="overflow-hidden rounded-[18px] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.07)]"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px]"
            style={{ background: open ? ACCENT_GRADIENT : ACCENT_DIM }}>
            <Utensils size={15} color={open ? '#fff' : ACCENT} />
          </span>
          <div className="min-w-0">
            <span className="block truncate text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>{meal.name}</span>
            {meal.time && <span className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>{meal.time}</span>}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2.5">
          <span className="rounded-full px-2.5 py-1 text-[11.5px] font-[700]" style={{ background: ACCENT_DIM, color: ACCENT }}>
            {meal.calories} kcal
          </span>
          {open ? <ChevronUp size={16} style={{ color: 'var(--text-disabled)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-disabled)' }} />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-[12px]" style={{ background: ACCENT_DIM }}>
            {[{ label: 'Protein', value: `${meal.protein_g}g` }, { label: 'Carbs', value: `${meal.carbs_g}g` }, { label: 'Fat', value: `${meal.fat_g}g` }].map((mac, i) => (
              <div key={mac.label} className="px-2 py-2.5 text-center"
                style={{ borderRight: i < 2 ? '1px solid rgba(16,185,129,0.15)' : 'none' }}>
                <div className="text-[15px] font-[750]" style={{ color: ACCENT }}>{mac.value}</div>
                <div className="text-[9.5px] font-[700] uppercase tracking-[0.06em]" style={{ color: '#059669' }}>{mac.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col">
            {meal.foods?.map((food, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5"
                style={{ borderBottom: i < (meal.foods?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>{food.name}</div>
                  <div className="mt-0.5 text-[11px]" style={{ color: 'var(--text-disabled)' }}>{food.quantity}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-[13px] font-[650]" style={{ color: 'var(--text-secondary)' }}>{food.calories} kcal</div>
                  <div className="mt-0.5 text-[11px] tabular-nums" style={{ color: 'var(--text-disabled)' }}>
                    P {food.protein_g} · C {food.carbs_g} · F {food.fat_g}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </m.div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function DietGeneratorPage() {
  // Same correction as the workout generator: /api/ai/diet/generate requires
  // a client_id and this page never sent one, so every generation from it
  // answered 400. The id comes from the query string.
  const clientId = useSearchParams().get('client_id');
  const [form, setForm] = useState({
    age: '', gender: 'male', weight_kg: '', height_cm: '',
    activity_level: 'moderately_active', goal: 'maintenance',
    dietary_preferences: '', allergies: '', budget: 'moderate', meal_frequency: '4',
  });
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [plan, setPlan] = useState<AiDietPlan | null>(null);
  const [meta, setMeta] = useState<{ model?: string; tier?: string; used_fallback?: boolean } | null>(null);
  const [error, setError] = useState('');
  /** Per-field messages from the schema. Populated only by a generate ATTEMPT. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /**
   * A same-frame re-entry guard. `loading` is state, so two taps in one frame
   * both read false and both fire a billed model call.
   */
  const generatingRef = useRef(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Written out rather than produced by a helper: `useStandaloneField` is a
  // hook, and a hook called from inside another function is the rule React
  // enforces against — the order has to be visible on the page.
  const ageField = useStandaloneField('age', form.age, (v: string) => set('age', v), { error: fieldErrors.age });
  const weightField = useStandaloneField('weight_kg', form.weight_kg, (v: string) => set('weight_kg', v), { error: fieldErrors.weight_kg });
  const heightField = useStandaloneField('height_cm', form.height_cm, (v: string) => set('height_cm', v), { error: fieldErrors.height_cm });
  const genderField = useStandaloneField('gender', form.gender, (v: string) => set('gender', v), { error: fieldErrors.gender });
  const goalField = useStandaloneField('goal', form.goal, (v: string) => set('goal', v), { error: fieldErrors.goal });
  const activityField = useStandaloneField('activity_level', form.activity_level, (v: string) => set('activity_level', v), { error: fieldErrors.activity_level });
  const budgetField = useStandaloneField('budget', form.budget, (v: string) => set('budget', v), { error: fieldErrors.budget });
  const mealsField = useStandaloneField('meal_frequency', form.meal_frequency, (v: string) => set('meal_frequency', v), { error: fieldErrors.meal_frequency });
  const preferencesField = useStandaloneField('dietary_preferences', form.dietary_preferences, (v: string) => set('dietary_preferences', v), { error: fieldErrors.dietary_preferences });
  const allergiesField = useStandaloneField('allergies', form.allergies, (v: string) => set('allergies', v), { error: fieldErrors.allergies });

  useEffect(() => {
    if (!loading) { setLoadStep(0); return; }
    const t = setInterval(() => setLoadStep((s) => (s + 1) % LOADING_STEPS.length), 2600);
    return () => clearInterval(t);
  }, [loading]);

  const handleGenerate = async () => {
    if (generatingRef.current) return;
    if (!clientId) {
      setError('Open this generator from a client profile — a plan is written for a specific client.');
      return;
    }

    /*
     * Optional, and stated by the trainer rather than asserted about the
     * client: the server prefers its own record wherever it holds one.
     *
     * What it will not do is turn an impossible figure into a calorie target.
     * A weight of 750 used to reach the prompt verbatim and the model
     * calculated a day's food from it. The server refuses that now, silently,
     * by treating it as absent; refusing it here is what turns the silence
     * into a correction — before a billed generation is spent on it.
     *
     * `parseInt(form.meal_frequency)` went too: on an empty box that is NaN,
     * which `JSON.stringify` writes as `null`.
     */
    const parsed = aiDietInputSchema.safeParse({
      age: form.age,
      weight_kg: form.weight_kg,
      height_cm: form.height_cm,
      meal_frequency: form.meal_frequency,
      dietary_preferences: form.dietary_preferences,
      allergies: form.allergies,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!(key in next)) next[key] = issue.message;
      }
      setFieldErrors(next);
      setError('Check the highlighted fields before generating.');
      return;
    }
    setFieldErrors({});

    generatingRef.current = true;
    setError(''); setLoading(true); setPlan(null); setMeta(null);
    try {
      const v = parsed.data;
      const res = await api.ai.generateDiet({
        client_id: clientId,
        age: stated(v.age), gender: form.gender || undefined,
        weight_kg: stated(v.weight_kg), height_cm: stated(v.height_cm),
        activity_level: form.activity_level || undefined, goal: form.goal || undefined,
        dietary_preferences: v.dietary_preferences ?? undefined,
        allergies: v.allergies ?? undefined,
        budget: form.budget, meal_frequency: stated(v.meal_frequency),
      });
      setPlan(res.data);
      setMeta({ model: res.model, tier: res.tier, used_fallback: res.used_fallback });
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to generate diet plan.'));
    } finally {
      generatingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <Guard>
      <PageContainer>

        <PageHero
          icon={<Apple size={20} />}
          title="AI Diet Generator"
          subtitle="Precision nutrition tailored to your metabolism, goals, and lifestyle."
        >
          <div className="flex flex-wrap gap-2">
            {['Calorie Calibrated', 'Macro Balanced', 'Allergen-Safe', 'Grocery List', 'Supplement Guide'].map((p) => (
              <span key={p} className="rounded-full px-3 py-1.5 text-[11.5px] font-[650] text-white"
                style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}>
                {p}
              </span>
            ))}
          </div>
        </PageHero>

      <div className="mx-auto w-full max-w-4xl">

        {/* ── Form ── */}
        <m.div variants={fadeUp} initial="hidden" animate="show" custom={1}
          className="mb-8 rounded-[22px] p-5 sm:p-7"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: ACCENT_DIM }}>
              <Utensils size={16} color={ACCENT} />
            </div>
            <div>
              <div className="text-[15px] font-[750]" style={{ color: 'var(--text-primary)' }}>Your Profile & Preferences</div>
              <div className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>Calories and macros are calculated from these</div>
            </div>
          </div>

          {/* No asterisks. These three are OPTIONAL and the server says so: it
              prefers its own record every time, and a blank box means "the
              record already knows, or nobody does". Marking them required was
              not merely unenforced, it was wrong. */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumberField field={ageField} label="Age" density="compact" mode="integer" placeholder="28" suffix="yrs" />
            <NumberField field={weightField} label="Weight" density="compact" mode="decimal" placeholder="75" suffix="kg" />
            <NumberField field={heightField} label="Height" density="compact" mode="decimal" placeholder="175" suffix="cm" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ChoiceChips
              field={genderField} legend="Gender" density="compact"
              options={['male', 'female', 'other'].map((g) => ({ value: g, label: labelMap[g] ?? g }))}
            />
            <SelectField
              field={goalField} label="Goal" density="compact"
              options={GOALS.map((g) => ({ value: g, label: labelMap[g] ?? g }))}
            />
            <SelectField
              field={activityField} label="Activity Level" density="compact"
              options={ACTIVITY_LEVELS.map((a) => ({ value: a, label: labelMap[a] ?? a }))}
            />
            <ChoiceChips
              field={budgetField} legend="Budget" density="compact"
              options={BUDGETS.map((b) => ({ value: b, label: labelMap[b] ?? b }))}
            />
            <ChoiceChips
              field={mealsField} legend="Meals per Day" density="compact" className="sm:col-span-2"
              options={['3', '4', '5', '6'].map((n) => ({ value: n, label: n }))}
            />
            <TextField
              field={preferencesField} label="Dietary Preferences" density="compact"
              className="sm:col-span-2" maxLength={300}
              placeholder="e.g. vegetarian, vegan, keto, Indian (optional)"
            />
            {/* Never defaulted to "none": the server's own comment explains
                that the old `|| 'none'` printed a clean bill of health for
                every client nobody had written a note about. */}
            <TextField
              field={allergiesField} label="Allergies / Foods to Avoid" density="compact"
              className="sm:col-span-2" maxLength={300}
              placeholder="e.g. nuts, dairy, gluten (optional)"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-[12px] px-4 py-2.5 text-[13px] font-[600]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button onClick={handleGenerate} disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] px-7 py-3 text-[14px] font-[750] text-white transition-all sm:w-auto"
              style={{
                background: ACCENT_GRADIENT,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(16,185,129,0.35)',
              }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Generating Plan…' : 'Generate Meal Plan'}
            </button>
            {plan && (
              <button onClick={() => { setPlan(null); setMeta(null); }}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-[13.5px] font-[650] sm:w-auto"
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <RotateCcw size={14} /> Start Over
              </button>
            )}
          </div>
        </m.div>

        {/* ── Loading ── */}
        {loading && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-5 py-14">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px]"
              style={{ background: ACCENT_DIM, border: '1px solid rgba(16,185,129,0.2)' }}>
              <span className="absolute inset-0 animate-ping rounded-[24px] opacity-20" style={{ background: ACCENT }} />
              <Apple size={30} color={ACCENT} />
            </div>
            <div className="text-center">
              <div className="text-[16px] font-[750]" style={{ color: 'var(--text-primary)' }}>{LOADING_STEPS[loadStep]}</div>
              <div className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>Usually takes 15–30 seconds</div>
            </div>
            <div className="flex gap-1.5">
              {LOADING_STEPS.map((_, i) => (
                <span key={i} className="h-1.5 w-6 rounded-full transition-colors"
                  style={{ background: i <= loadStep ? ACCENT : 'var(--border)' }} />
              ))}
            </div>
          </m.div>
        )}

        {/* ── Results ── */}
        {plan && (
          <div className="flex flex-col gap-5">
            {meta && (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={0}
                className="flex w-fit items-center gap-2 rounded-full px-3.5 py-2"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Sparkles size={13} color="#B45309" />
                <span className="text-[12px] font-[650]" style={{ color: '#B45309' }}>Generated by {meta.model}</span>
                {meta.used_fallback && <span className="text-[11px]" style={{ color: '#B45309', opacity: 0.7 }}>(fallback)</span>}
              </m.div>
            )}

            {/* Overview */}
            <m.div variants={fadeUp} initial="hidden" animate="show" custom={1}
              className="overflow-hidden rounded-[22px]"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', borderBottom: '1px solid var(--border)' }}>
                <h2 className="m-0 text-[20px] font-[820] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{plan.name}</h2>
                <p className="mb-0 mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{plan.description}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4">
                {[
                  { label: 'Daily Calories', value: String(plan.total_calories), unit: 'kcal' },
                  { label: 'Protein', value: String(plan.macros?.protein_g ?? '—'), unit: 'g' },
                  { label: 'Carbs', value: String(plan.macros?.carbs_g ?? '—'), unit: 'g' },
                  { label: 'Fat', value: String(plan.macros?.fat_g ?? '—'), unit: 'g' },
                ].map((s, i) => (
                  <div key={i} className="px-3 py-4 text-center"
                    style={{ borderRight: i % 2 === 0 || i < 3 ? '1px solid var(--border)' : 'none', borderTop: i >= 2 ? '1px solid var(--border)' : 'none' }}>
                    <div className="text-[19px] font-[800]" style={{ color: ACCENT }}>
                      {s.value}<span className="ml-0.5 text-[11px] font-[700]" style={{ color: '#059669' }}>{s.unit}</span>
                    </div>
                    <div className="mt-0.5 text-[10.5px] font-[600] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </m.div>

            {/* Meals */}
            <div>
              <div className="mb-3 text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>
                Daily Meal Plan
              </div>
              <div className="flex flex-col gap-2.5">
                {plan.meals?.map((meal, i) => <MealCard key={i} meal={meal} index={i} />)}
              </div>
            </div>

            {/* Hydration */}
            {plan.hydration_ml ? (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={2}
                className="flex items-center gap-4 rounded-[18px] px-5 py-4"
                style={{ background: '#F1F5F9', border: '1px solid #B8D7FF' }}>
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[13px]"
                  style={{ background: 'linear-gradient(135deg, #0067E0, #0059CE)', boxShadow: '0 6px 18px rgba(0,103,224,0.3)' }}>
                  <Droplets size={20} color="#fff" />
                </div>
                <div>
                  <div className="text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: '#0067E0' }}>Daily Hydration Target</div>
                  <div className="mt-0.5 text-[18px] font-[800]" style={{ color: 'var(--text-primary)' }}>
                    {plan.hydration_ml} <span className="text-[12px] font-[600]" style={{ color: 'var(--text-disabled)' }}>ml / day</span>
                  </div>
                </div>
              </m.div>
            ) : null}

            {/* Supplements */}
            {plan.supplements?.length ? (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={3}
                className="overflow-hidden rounded-[22px]"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: ACCENT_DIM }}>
                    <Pill size={15} color={ACCENT} />
                  </span>
                  <span className="text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>Supplement Guide</span>
                </div>
                {plan.supplements.map((s, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 px-5 py-3.5"
                    style={{ borderBottom: i < plan.supplements!.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div className="text-[14px] font-[650]" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                      <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-disabled)' }}>{s.dose} · {s.timing}</div>
                    </div>
                    <div className="max-w-[180px] flex-shrink-0 text-right text-[12px]" style={{ color: 'var(--text-disabled)' }}>{s.reason}</div>
                  </div>
                ))}
              </m.div>
            ) : null}

            {/* Grocery list */}
            {plan.grocery_list?.length ? (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={4}
                className="overflow-hidden rounded-[22px]"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: ACCENT_DIM }}>
                    <ShoppingCart size={15} color={ACCENT} />
                  </span>
                  <span className="text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>Grocery List</span>
                </div>
                <div className="flex flex-col gap-4 px-5 py-4">
                  {plan.grocery_list.map((cat, i) => (
                    <div key={i}>
                      <div className="mb-2 text-[10px] font-[700] uppercase tracking-[0.1em]" style={{ color: 'var(--text-disabled)' }}>{cat.category}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.items.map((item) => (
                          <span key={item} className="rounded-full px-3 py-1 text-[12px] font-[550]"
                            style={{ background: ACCENT_DIM, color: ACCENT, border: '1px solid rgba(16,185,129,0.18)' }}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </m.div>
            ) : null}

            {plan.notes && (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={5}
                className="rounded-[18px] px-5 py-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="mb-2 text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: ACCENT }}>Notes</div>
                <p className="m-0 text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{plan.notes}</p>
              </m.div>
            )}
          </div>
        )}
      </div>
      </PageContainer>
    </Guard>
  );
}
