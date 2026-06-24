'use client';

import { useState } from 'react';
import { Apple, Loader2, ChevronDown, ChevronUp, Sparkles, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import type { AiDietPlan, AiDietMeal } from '@/lib/api';

const ACTIVITY_LEVELS = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'];
const GOALS = ['weight_loss', 'muscle_gain', 'maintenance', 'recomposition'];
const BUDGETS = ['budget', 'moderate', 'premium'];

const labelMap: Record<string, string> = {
  sedentary: 'Sedentary (desk job)', lightly_active: 'Lightly Active', moderately_active: 'Moderately Active',
  very_active: 'Very Active', extra_active: 'Extra Active (athlete)',
  weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', maintenance: 'Maintenance', recomposition: 'Body Recomposition',
  budget: 'Budget Friendly', moderate: 'Moderate', premium: 'Premium / Flexible',
};

function MealCard({ meal }: { meal: AiDietMeal }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        <div>
          <span className="font-semibold text-foreground">{meal.name}</span>
          <span className="ml-2 text-sm text-muted-foreground">· {meal.time}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{meal.calories} kcal</span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open && (
        <div className="p-4 space-y-3">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Protein: <strong className="text-foreground">{meal.protein_g}g</strong></span>
            <span>Carbs: <strong className="text-foreground">{meal.carbs_g}g</strong></span>
            <span>Fat: <strong className="text-foreground">{meal.fat_g}g</strong></span>
          </div>
          <div className="space-y-2">
            {meal.foods?.map((food, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-foreground">{food.name}</div>
                  <div className="text-xs text-muted-foreground">{food.quantity}</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{food.calories} kcal</div>
                  <div>P:{food.protein_g}g C:{food.carbs_g}g F:{food.fat_g}g</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DietGeneratorPage() {
  const [form, setForm] = useState({
    age: '', gender: 'male', weight_kg: '', height_cm: '',
    activity_level: 'moderately_active', goal: 'maintenance',
    dietary_preferences: '', allergies: '', budget: 'moderate', meal_frequency: '4',
  });
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AiDietPlan | null>(null);
  const [meta, setMeta] = useState<{ model?: string; tier?: string; used_fallback?: boolean } | null>(null);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    if (!form.age || !form.weight_kg || !form.height_cm) {
      setError('Age, weight and height are required.');
      return;
    }
    setError('');
    setLoading(true);
    setPlan(null);
    setMeta(null);
    try {
      const res = await api.ai.generateDiet({
        age: parseInt(form.age),
        gender: form.gender,
        weight_kg: parseFloat(form.weight_kg),
        height_cm: parseFloat(form.height_cm),
        activity_level: form.activity_level,
        goal: form.goal,
        dietary_preferences: form.dietary_preferences || undefined,
        allergies: form.allergies || undefined,
        budget: form.budget,
        meal_frequency: parseInt(form.meal_frequency),
      });
      setPlan(res.data);
      setMeta({ model: res.model, tier: res.tier, used_fallback: res.used_fallback });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate diet plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-green-500/10">
          <Apple className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Diet Generator</h1>
          <p className="text-muted-foreground text-sm">Get a personalised meal plan tailored to your goals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-2xl border border-border bg-card">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Age *</label>
          <input type="number" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 28" value={form.age} onChange={(e) => set('age', e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Gender</label>
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Weight (kg) *</label>
          <input type="number" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 75" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Height (cm) *</label>
          <input type="number" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 175" value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Activity Level</label>
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.activity_level} onChange={(e) => set('activity_level', e.target.value)}>
            {ACTIVITY_LEVELS.map((a) => <option key={a} value={a}>{labelMap[a]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Goal</label>
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.goal} onChange={(e) => set('goal', e.target.value)}>
            {GOALS.map((g) => <option key={g} value={g}>{labelMap[g]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Meals per Day</label>
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.meal_frequency} onChange={(e) => set('meal_frequency', e.target.value)}>
            {[3, 4, 5, 6].map((d) => <option key={d} value={d}>{d} meals</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Budget</label>
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.budget} onChange={(e) => set('budget', e.target.value)}>
            {BUDGETS.map((b) => <option key={b} value={b}>{labelMap[b]}</option>)}
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium text-foreground">Dietary Preferences</label>
          <input type="text" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. vegetarian, vegan, keto, Indian (optional)" value={form.dietary_preferences} onChange={(e) => set('dietary_preferences', e.target.value)} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium text-foreground">Allergies / Foods to Avoid</label>
          <input type="text" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. nuts, dairy, gluten (optional)" value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
        </div>
        {error && <div className="md:col-span-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
        <div className="md:col-span-2 flex gap-3">
          <button onClick={handleGenerate} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating…' : 'Generate Plan'}
          </button>
          {plan && (
            <button onClick={() => { setPlan(null); setMeta(null); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          )}
        </div>
      </div>

      {plan && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {meta && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>Generated by <code className="bg-muted px-1 rounded">{meta.model}</code></span>
              {meta.used_fallback && <span className="text-yellow-600">(fallback model)</span>}
            </div>
          )}

          <div className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {[
                { label: 'Daily Calories', value: `${plan.total_calories} kcal` },
                { label: 'Protein', value: `${plan.macros?.protein_g ?? '—'}g` },
                { label: 'Carbs', value: `${plan.macros?.carbs_g ?? '—'}g` },
                { label: 'Fat', value: `${plan.macros?.fat_g ?? '—'}g` },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-xl bg-muted/30 text-center">
                  <div className="text-lg font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Daily Meal Plan</h3>
            {plan.meals?.map((meal, i) => <MealCard key={i} meal={meal} />)}
          </div>

          {plan.hydration_ml ? (
            <div className="p-4 rounded-xl border border-border bg-muted/20">
              <div className="text-sm font-medium text-foreground mb-1">Hydration Target</div>
              <p className="text-sm text-muted-foreground">{plan.hydration_ml} ml / day</p>
            </div>
          ) : null}

          {plan.supplements?.length ? (
            <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <h3 className="font-semibold text-foreground">Supplement Suggestions</h3>
              {plan.supplements.map((s, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.dose} · {s.timing}</div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">{s.reason}</div>
                </div>
              ))}
            </div>
          ) : null}

          {plan.grocery_list?.length ? (
            <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <h3 className="font-semibold text-foreground">Grocery List</h3>
              {plan.grocery_list.map((cat, i) => (
                <div key={i}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{cat.category}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((item) => (
                      <span key={item} className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground">{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {plan.notes && (
            <div className="p-4 rounded-xl border border-border bg-muted/20">
              <div className="text-sm font-medium text-foreground mb-1">Notes</div>
              <p className="text-sm text-muted-foreground">{plan.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
