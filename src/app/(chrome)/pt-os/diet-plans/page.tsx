'use client';

import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSeededSearch } from '@/lib/use-seeded-search';
import { useRouter, useSearchParams } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  Salad, Plus, Search, Coffee, UtensilsCrossed, Moon, Apple,
  Sparkles, Activity, GlassWater, X, Pill,
  Target, Loader2, Users, Info, TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, LineChart, Line, ReferenceLine, LabelList, Cell,
} from 'recharts';
import Guard from '@/components/Guard';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DonutChart, PageContainer, PageHero } from '@/components/ui';
import { api } from '@/lib/api';
import type { Meal as ApiMeal, DietTemplate as ApiDietTemplate, DietAssignment, NutritionLog } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useTheme } from '@/components/ThemeProvider';
import { ProgressRing } from '@/components/fitness/ProgressRing';
import { MealCard } from '@/components/fitness/MealCard';
import { GroceryList } from '@/components/fitness/GroceryList';
import { SpotlightCard } from '@/components/fitness/SpotlightCard';
import { AiCoachPanel } from '@/components/fitness/AiCoachPanel';
import { identity } from '@/lib/palette';

type MealType = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner' | 'Pre Workout' | 'Post Workout';

interface Meal {
  id: string; type: MealType; name: string; calories: number;
  protein: number; carbs: number; fats: number; time: string; emoji: string;
  serving_size?: string | null; description?: string | null;
}

interface DietTemplate {
  id: string; name: string; description: string; goal: string;
  calories: number; protein: number; carbs: number; fats: number;
  meals: number; color: string;
}

interface Supplement {
  id: string; name: string; dosage: string; timing: string; benefit: string; emoji: string;
}

interface ClientOption { id: string; name: string; }

const MEAL_TYPES: { id: MealType; icon: React.ReactNode; label: string; time: string; color: string }[] = [
  { id: 'Breakfast', icon: <Coffee size={13} />, label: 'Breakfast', time: '6-9 AM', color: '#f59e0b' },
  { id: 'Lunch', icon: <UtensilsCrossed size={13} />, label: 'Lunch', time: '12-2 PM', color: '#0067e0' },
  { id: 'Snacks', icon: <Apple size={13} />, label: 'Snacks', time: '4-5 PM', color: '#0067e0' },
  { id: 'Dinner', icon: <Moon size={13} />, label: 'Dinner', time: '7-9 PM', color: '#0067e0' },
  { id: 'Pre Workout', icon: <Activity size={13} />, label: 'Pre Workout', time: 'Before training', color: '#f59e0b' },
  { id: 'Post Workout', icon: <Activity size={13} />, label: 'Post Workout', time: 'After training', color: '#10b981' },
];

// Chart-mark colors for the "Calories by Meal Type" bar chart — a SEPARATE
// set from MEAL_TYPES.color above, which only ever tints a pill background at
// ~10% opacity and is unaffected by this. A full-saturation mark sitting
// directly on the chart surface is a stricter test than a tint: validated
// with dataviz/scripts/validate_palette.js, the light-mode hex passes as-is,
// but amber/orange/emerald read too light against the dark surface (fail the
// lightness-band check) — these are darker steps of the SAME hues so both
// modes pass. Order matches MEAL_TYPES, which is the fixed categorical order
// used everywhere else on this page.
const MEAL_CHART_COLORS_LIGHT: Record<MealType, string> = {
  'Breakfast': '#f59e0b', 'Lunch': '#0067e0', 'Snacks': '#0067e0',
  'Dinner': '#0067e0', 'Pre Workout': '#f59e0b', 'Post Workout': '#10b981',
};
const MEAL_CHART_COLORS_DARK: Record<MealType, string> = {
  'Breakfast': '#d97706', 'Lunch': '#0067e0', 'Snacks': '#0067e0',
  'Dinner': '#0067e0', 'Pre Workout': '#b91c1c', 'Post Workout': '#059669',
};

// Macro donut (protein/carbs/fats) — same reasoning, same amber step swapped
// for dark mode. Matches the macro colors already used on ProgressRing/meter
// labels elsewhere on this page, so the donut and the meters read as the same
// system rather than two unrelated color schemes.
const MACRO_COLORS_LIGHT = { protein: '#0067e0', carbs: '#f59e0b', fats: '#0067e0' };
const MACRO_COLORS_DARK  = { protein: '#0067e0', carbs: '#d97706', fats: '#0067e0' };

const MEAL_TYPE_TO_API: Record<MealType, string> = {
  'Breakfast': 'breakfast', 'Lunch': 'lunch', 'Snacks': 'snacks', 'Dinner': 'dinner',
  'Pre Workout': 'pre_workout', 'Post Workout': 'post_workout',
};
const MEAL_EMOJI: Record<MealType, string> = {
  'Breakfast': '🍳', 'Lunch': '🍽️', 'Snacks': '🍎', 'Dinner': '🌙', 'Pre Workout': '⚡', 'Post Workout': '💪',
};

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', maintenance: 'Maintenance',
  keto: 'Keto', vegan: 'Vegan', custom: 'Custom',
};
const TEMPLATE_COLORS = identity;

function apiMealTypeToLocal(apiType: string): MealType {
  const found = (Object.entries(MEAL_TYPE_TO_API) as [MealType, string][]).find(([, v]) => v === apiType);
  return found ? found[0] : 'Breakfast';
}

function mapApiMeal(row: ApiMeal): Meal {
  const type = apiMealTypeToLocal(row.meal_type);
  return {
    id: row.id, type, name: row.name,
    calories: row.calories, protein: row.protein_g, carbs: row.carbs_g, fats: row.fats_g,
    time: MEAL_TYPES.find((mt) => mt.id === type)?.time ?? '',
    emoji: MEAL_EMOJI[type],
    serving_size: row.serving_size, description: row.description,
  };
}

function mapApiTemplate(row: ApiDietTemplate, idx: number): DietTemplate {
  return {
    id: row.id, name: row.name, description: row.description ?? '',
    goal: GOAL_LABELS[row.goal] ?? row.goal,
    calories: row.daily_calories, protein: row.daily_protein_g, carbs: row.daily_carbs_g, fats: row.daily_fats_g,
    meals: row.meal_count, color: TEMPLATE_COLORS[idx % TEMPLATE_COLORS.length],
  };
}

function EmptyChartState({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '36px 12px', textAlign: 'center' }}>
      <TrendingUp size={22} style={{ color: 'var(--text-disabled)', opacity: 0.5 }} />
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function DietPlansPage() {
  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={22} className="animate-spin" /></div>}>
        <Inner />
      </Suspense>
    </Guard>
  );
}

function Inner() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const { theme } = useTheme();
  const mealChartColors = theme === 'dark' ? MEAL_CHART_COLORS_DARK : MEAL_CHART_COLORS_LIGHT;
  const macroColors = theme === 'dark' ? MACRO_COLORS_DARK : MACRO_COLORS_LIGHT;

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [water, setWater] = useState(0);
  const [savingWater, setSavingWater] = useState(false);
  const [clientName, setClientName] = useState('');
  const [activeAssignment, setActiveAssignment] = useState<DietAssignment | null>(null);
  const [history, setHistory] = useState<NutritionLog[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  // Seeded from ?q= so a hit from the global search lands on that template.
  const [search, setSearch] = useSeededSearch();
  const [goalFilter, setGoalFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'meals' | 'templates' | 'grocery' | 'supplements' | 'analytics'>('meals');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [addMealOpen, setAddMealOpen] = useState(false);
  const [mealDetail, setMealDetail] = useState<Meal | null>(null);
  const [assignTemplate, setAssignTemplate] = useState<DietTemplate | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mealsRaw, templatesRaw, supplementsRaw] = await Promise.all([
        api.diet.meals.list({ date }),
        api.diet.templates.list(),
        api.diet.supplements.list(),
      ]);
      setMeals(Array.isArray(mealsRaw) ? mealsRaw.map(mapApiMeal) : []);
      setTemplates(Array.isArray(templatesRaw) ? templatesRaw.map(mapApiTemplate) : []);
      setSupplements(Array.isArray(supplementsRaw) ? (supplementsRaw as unknown as Supplement[]) : []);

      if (clientId) {
        const [clientRes, assignRes, trackerRes] = await Promise.all([
          api.pt.client(clientId).catch(() => null),
          api.diet.assignments.list({ client_id: clientId, status: 'active' }).catch(() => []),
          api.diet.tracker.get({ client_id: clientId, date }).catch(() => null),
        ]);
        const c = clientRes?.data as Record<string, unknown> | undefined;
        setClientName(c ? String(c.name ?? '') : '');
        setActiveAssignment(Array.isArray(assignRes) && assignRes.length > 0 ? assignRes[0] : null);
        setWater(trackerRes?.today?.water_glasses ?? 0);
        // Backend returns the last 7 days newest-first; the trend charts read
        // left-to-right as oldest-first.
        setHistory(Array.isArray(trackerRes?.history) ? [...trackerRes.history].reverse() : []);
      } else {
        setClientName('');
        setActiveAssignment(null);
        setWater(0);
        setHistory([]);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load diet data.');
    } finally { setLoading(false); }
  }, [date, clientId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Number(), because `+` on a string concatenates.
  //
  // protein/carbs/fats are Postgres `numeric`, and node-postgres hands numeric
  // back as a STRING to avoid losing precision — so `0 + "25.0"` was "025.0",
  // which is the stray leading zero on the rings. With one meal it merely looks
  // wrong; with two it is `"025.0" + "30.0"` = "025.030.0", and every number
  // downstream of it — the ring fill, the donut, the remaining-kcal — is NaN.
  // calories is an `integer` column and comes back as a number, which is why it
  // was the only one of the four that added up.
  const num = (v: unknown) => Number(v) || 0;
  const consumed = meals.reduce((s, m) => s + num(m.calories), 0);
  const totalProtein = meals.reduce((s, m) => s + num(m.protein), 0);
  const totalCarbs = meals.reduce((s, m) => s + num(m.carbs), 0);
  const totalFats = meals.reduce((s, m) => s + num(m.fats), 0);

  const GOAL_CAL = activeAssignment?.daily_calories ?? 2400;
  const GOAL_PROT = activeAssignment?.daily_protein_g ?? 160;
  const GOAL_CARBS = activeAssignment?.daily_carbs_g ?? 260;
  const GOAL_FATS = activeAssignment?.daily_fats_g ?? 65;

  const waterPct = Math.min((water / 8) * 100, 100);

  // Macro-calorie contribution (protein/carbs 4 kcal/g, fats 9 kcal/g) — the
  // "part-to-whole" job the macro donut answers, distinct from the gram-vs-goal
  // meters above which each answer a "single ratio against a limit" job.
  const proteinKcal = totalProtein * 4;
  const carbsKcal = totalCarbs * 4;
  const fatsKcal = totalFats * 9;
  const macroKcalTotal = proteinKcal + carbsKcal + fatsKcal;
  const macroDonutData = useMemo(() => [
    { name: 'Protein', value: proteinKcal, color: macroColors.protein },
    { name: 'Carbs', value: carbsKcal, color: macroColors.carbs },
    { name: 'Fats', value: fatsKcal, color: macroColors.fats },
  ], [proteinKcal, carbsKcal, fatsKcal, macroColors]);

  // Calories per meal type — "compare magnitude across categories" → bar chart,
  // categorical color following the fixed MEAL_TYPES order.
  const mealCalorieBarData = useMemo(() => (
    MEAL_TYPES.map((mt) => ({
      name: mt.label,
      calories: meals.filter((m) => m.type === mt.id).reduce((s, m) => s + m.calories, 0),
      color: mealChartColors[mt.id],
    }))
  ), [meals, mealChartColors]);

  // 7-day trend series (client-scoped only — history is empty otherwise).
  const calorieTrendData = useMemo(() => (
    history.map((h) => ({
      date: new Date(h.log_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      calories: h.calories_consumed ?? 0,
    }))
  ), [history]);
  const waterTrendData = useMemo(() => (
    history.map((h) => ({
      date: new Date(h.log_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      glasses: h.water_glasses ?? 0,
    }))
  ), [history]);

  const filteredTemplates = templates.filter((t) => {
    if (goalFilter && t.goal !== goalFilter) return false;
    if (search) return t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const filteredMeals = meals.filter((m) => !activeMealType || m.type === activeMealType);

  const updateWater = async (next: number) => {
    if (!clientId) {
      toast.info('Open this page from a client’s profile to track their hydration.');
      return;
    }
    const clamped = Math.max(0, Math.min(next, 8));
    const prev = water;
    setWater(clamped);
    setSavingWater(true);
    try {
      await api.diet.tracker.update({ client_id: clientId, log_date: date, water_glasses: clamped });
    } catch (err: unknown) {
      setWater(prev);
      toast.error(err instanceof Error ? err.message : 'Could not save water intake.');
    } finally {
      setSavingWater(false);
    }
  };

  const handleAssignTemplate = async (template: DietTemplate, client: ClientOption) => {
    try {
      await api.diet.assign({ diet_template_id: template.id, client_id: client.id });
      toast.success(`Assigned "${template.name}" to ${client.name}.`);
      setAssignTemplate(null);
      if (client.id === clientId) fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not assign this plan.');
    }
  };

  return (
    <PageContainer>
      {/* Hero */}
      <PageHero
        icon={<Salad size={20} />}
        title="Diet Plans"
        subtitle="Nutrition planning and meal tracking for your clients"
      >
        {/* The date and Add Meal were a flex row that wrapped under the title
            on a phone; on the hero they are a fixed two-up. */}
        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            aria-label="Diet log date"
            className="h-[44px] w-full min-w-0 rounded-[12px] px-3 text-[13px] font-[600] text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', colorScheme: 'dark' }}
          />
          <button
            type="button"
            onClick={() => setAddMealOpen(true)}
            className="inline-flex h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[14px] px-4 text-[13px] font-[700] transition-transform active:scale-95"
            style={{ background: '#fff', color: '#0F172A' }}>
            <Plus size={16} /> Add Meal
          </button>
        </div>
      </PageHero>

      <div>
        {/* Client-scoping banner */}
        {clientId ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, fontWeight: 650, color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={13} /> Tracking for {clientName || 'this client'}
              {activeAssignment && <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>&middot; on &quot;{activeAssignment.template_name}&quot;</span>}
            </span>
            <button onClick={() => router.push('/pt-os/diet-plans')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 650, color: '#059669' }}>
              Change client
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-subtle)', marginBottom: 20 }}>
            <Info size={13} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Browsing the shared meal &amp; template library. Open this page from a client&apos;s profile to track their water intake or assign a plan.</span>
          </div>
        )}

        {/* Macro progress rings */}
        <m.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Calories', value: consumed, goal: GOAL_CAL, unit: 'kcal', color: '#ef4444' },
            { label: 'Protein', value: totalProtein, goal: GOAL_PROT, unit: 'g', color: '#0067e0' },
            { label: 'Carbs', value: totalCarbs, goal: GOAL_CARBS, unit: 'g', color: '#f59e0b' },
            { label: 'Fats', value: totalFats, goal: GOAL_FATS, unit: 'g', color: '#0067e0' },
          ].map((macro) => (
            <m.div key={macro.label} variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <ProgressRing
                size={90}
                strokeWidth={7}
                progress={Math.min((macro.value / macro.goal) * 100, 100)}
                color={macro.color}
                value={String(Math.round(macro.value * 10) / 10)}
                label={macro.unit}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>
                {macro.label}<br />
                <span style={{ color: 'var(--text-disabled)', fontWeight: 500 }}>/{macro.goal}{macro.unit}</span>
              </span>
            </m.div>
          ))}

          {/* Water intake */}
          <div style={{ flex: 1, minWidth: 200, marginLeft: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: clientId ? 1 : 0.6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,103,224,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GlassWater size={16} color="#0067e0" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-disabled)' }}>Hydration</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0067e0' }}>{water}/8 glasses</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                    <m.div initial={{ width: 0 }} animate={{ width: `${waterPct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #0067e0, #10b981)' }} />
                  </div>
                  <button onClick={() => updateWater(water + 1)} disabled={!clientId || savingWater}
                    style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(0,103,224,0.3)', background: 'rgba(0,103,224,0.1)', color: '#0067e0', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: clientId ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
                    + Glass
                  </button>
                </div>
              </div>
            </div>
          </div>
        </m.div>
      </div>

      <div style={{ padding: '20px 32px 60px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 20, background: 'var(--bg-subtle)', borderRadius: 11, padding: 3, overflowX: 'auto' }}>
          {[
            { key: 'meals', label: "Meal Library", count: meals.length, color: '#10b981' },
            { key: 'templates', label: 'Templates', count: templates.length, color: '#0067e0' },
            { key: 'grocery', label: 'Grocery List', color: '#f59e0b' },
            { key: 'supplements', label: 'Supplements', count: supplements.length, color: '#0067e0' },
            { key: 'analytics', label: 'Analytics', color: '#0067e0' },
          ].map((tab) => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0,
                fontSize: 12, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s',
                background: activeTab === tab.key ? 'var(--bg-card)' : 'transparent',
                color: activeTab === tab.key ? tab.color : 'var(--text-muted)',
                boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              {tab.label}
              {tab.count !== undefined && (
                <span style={{ marginLeft: 5, padding: '1px 6px', borderRadius: 9, fontSize: 10, fontWeight: 700, background: `${tab.color}18`, color: tab.color }}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Meals Tab */}
          {activeTab === 'meals' && (
            <m.div key="meals" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={() => setActiveMealType(null)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.18s', background: !activeMealType ? 'rgba(16,185,129,0.1)' : 'transparent', color: !activeMealType ? '#10b981' : 'var(--text-muted)', borderColor: !activeMealType ? 'rgba(16,185,129,0.3)' : 'var(--border)' }}>
                  All Meals
                </button>
                {MEAL_TYPES.map((mt) => (
                  <button key={mt.id} onClick={() => setActiveMealType(activeMealType === mt.id ? null : mt.id)}
                    style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 5, background: activeMealType === mt.id ? `${mt.color}14` : 'transparent', color: activeMealType === mt.id ? mt.color : 'var(--text-muted)', borderColor: activeMealType === mt.id ? `${mt.color}40` : 'var(--border)' }}>
                    {mt.icon}{mt.label} <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>{mt.time}</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ height: 150, borderRadius: 16, background: 'var(--bg-subtle)', opacity: 0.6, animation: 'pulse 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              ) : filteredMeals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <Salad size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>No meals in the library yet. Add your first meal to start building it out.</p>
                </div>
              ) : (
                <m.div variants={containerVariants} initial="hidden" animate="visible"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                  {filteredMeals.map((meal) => (
                    <m.div key={meal.id} variants={itemVariants}>
                      <MealCard
                        id={meal.id}
                        name={meal.name}
                        mealType={meal.type}
                        time={meal.time}
                        calories={meal.calories}
                        proteinG={meal.protein}
                        carbsG={meal.carbs}
                        fatG={meal.fats}
                        emoji={meal.emoji}
                        onClick={() => setMealDetail(meal)}
                      />
                    </m.div>
                  ))}
                </m.div>
              )}
            </m.div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <m.div key="templates" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                {[null, ...Object.values(GOAL_LABELS)].map((g) => (
                  <button key={g ?? 'all'} onClick={() => setGoalFilter(g)}
                    style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.18s', background: goalFilter === g ? 'rgba(0,103,224,0.1)' : 'transparent', color: goalFilter === g ? '#0067e0' : 'var(--text-muted)', borderColor: goalFilter === g ? 'rgba(0,103,224,0.3)' : 'var(--border)' }}>
                    {g ?? 'All Goals'}
                  </button>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-subtle)', borderRadius: 8, padding: '5px 12px', border: '1px solid var(--border)' }}>
                  <Search size={13} color="var(--text-disabled)" />
                  <input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 12, fontWeight: 500, width: 160 }} />
                  {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 0, display: 'flex' }}><X size={12} /></button>}
                </div>
              </div>

              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ height: 180, borderRadius: 16, background: 'var(--bg-subtle)', opacity: 0.6 }} />
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                  No templates found. Create one to get started.
                </div>
              ) : (
                <m.div variants={containerVariants} initial="hidden" animate="visible"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {filteredTemplates.map((t) => (
                    <m.div key={t.id} variants={itemVariants}>
                      <SpotlightCard spotlightColor="rgba(16,185,129,0.1)" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            <Salad size={18} color="#10b981" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</h4>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.goal}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.description}</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10.5, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            {t.calories} kcal
                          </span>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10.5, background: 'rgba(0,103,224,0.1)', color: '#0067e0' }}>
                            {t.protein}g P
                          </span>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10.5, background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                            {t.carbs}g C
                          </span>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10.5, background: 'rgba(0,103,224,0.1)', color: '#0067e0' }}>
                            {t.fats}g F
                          </span>
                        </div>
                        {t.meals > 0 && <div style={{ marginBottom: 12, fontSize: 11, color: 'var(--text-disabled)' }}>{t.meals} meals per day</div>}
                        <button onClick={() => setAssignTemplate(t)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 9, border: 'none', background: t.color, color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                          <Target size={12} /> Assign to Client
                        </button>
                      </SpotlightCard>
                    </m.div>
                  ))}
                </m.div>
              )}
            </m.div>
          )}

          {/* Grocery Tab */}
          {activeTab === 'grocery' && (
            <m.div key="grocery" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ maxWidth: 640, margin: '0 auto' }}>
                <GroceryList onGenerate={() => setAiPanelOpen(true)} />
              </div>
            </m.div>
          )}

          {/* Supplements Tab */}
          {activeTab === 'supplements' && (
            <m.div key="supplements" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,103,224,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pill size={16} color="#0067e0" />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Supplement Stack</h3>
                <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: 'rgba(0,103,224,0.1)', color: '#0067e0', letterSpacing: '0.05em' }}>RECOMMENDED</span>
              </div>

              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ height: 110, borderRadius: 14, background: 'var(--bg-subtle)', opacity: 0.6 }} />
                  ))}
                </div>
              ) : supplements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                  No supplements configured yet.
                </div>
              ) : (
                <m.div variants={containerVariants} initial="hidden" animate="visible"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {supplements.map((s) => (
                    <m.div key={s.id} variants={itemVariants}
                      style={{ borderRadius: 14, padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'default', transition: 'all 0.25s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,103,224,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,103,224,0.2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 24 }}>{s.emoji}</span>
                        <div>
                          <h5 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</h5>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.dosage}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 6px', lineHeight: 1.4 }}>{s.benefit}</p>
                      <span style={{ fontSize: 10.5, color: 'var(--text-disabled)' }}>Time: {s.timing}</span>
                    </m.div>
                  ))}
                </m.div>
              )}
            </m.div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <m.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {/* Calories by meal — magnitude comparison across categories → bar, categorical color, direct labels */}
                <SpotlightCard style={{ padding: 20 }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Calories by Meal</h4>
                  {mealCalorieBarData.every((d) => d.calories === 0) ? (
                    <EmptyChartState label="No meals logged for this date yet." />
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={mealCalorieBarData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={46} />
                        <YAxis tick={{ fontSize: 10.5, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40} />
                        <ChartTooltip
                          cursor={{ fill: 'var(--bg-subtle)' }}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                          labelStyle={{ color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 2 }}
                          formatter={(value: number) => [`${value} kcal`, 'Calories']}
                        />
                        <Bar dataKey="calories" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {mealCalorieBarData.map((d) => <Cell key={d.name} fill={d.color} />)}
                          <LabelList dataKey="calories" position="top" style={{ fontSize: 10.5, fontWeight: 700, fill: 'var(--text-secondary)' }} formatter={(v: number) => (v > 0 ? v : '')} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </SpotlightCard>

                {/* Macro composition — part-to-whole share of calories → donut, categorical color */}
                <SpotlightCard style={{ padding: 20 }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Macro Composition</h4>
                  {macroKcalTotal === 0 ? (
                    <EmptyChartState label="Log a meal to see the macro breakdown." />
                  ) : (
                    <DonutChart
                      data={macroDonutData}
                      centerValue={`${Math.round(macroKcalTotal)}`}
                      centerLabel="kcal from macros"
                      height={220}
                      valueFormatter={(v) => `${Math.round(v)} kcal`}
                    />
                  )}
                  <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total consumed</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{consumed} / {GOAL_CAL} kcal</span>
                    </div>
                    <div style={{ marginTop: 8, height: 5, borderRadius: 3, background: 'var(--bg-card)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <m.div initial={{ width: 0 }} animate={{ width: `${Math.min((consumed / GOAL_CAL) * 100, 100)}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-disabled)', textAlign: 'right' }}>
                      {Math.max(0, GOAL_CAL - consumed)} kcal remaining
                    </div>
                  </div>
                </SpotlightCard>

                {/* Hydration — today's interactive tracker + 7-day trend vs the daily target */}
                <SpotlightCard spotlightColor="rgba(0,103,224,0.08)" style={{ padding: 20 }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Hydration Tracker</h4>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <button key={i} onClick={() => updateWater(i + 1)} disabled={!clientId || savingWater}
                        style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid', cursor: clientId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s', background: i < water ? 'rgba(0,103,224,0.15)' : 'var(--bg-subtle)', borderColor: i < water ? 'rgba(0,103,224,0.4)' : 'var(--border)', color: i < water ? '#0067e0' : 'var(--text-disabled)', opacity: clientId ? 1 : 0.5 }}>
                        <GlassWater size={15} />
                      </button>
                    ))}
                  </div>
                  <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {!clientId ? 'Select a client to track hydration.' : water >= 8 ? 'Daily goal reached!' : `${8 - water} more glasses to reach your daily goal`}
                  </p>
                  {clientId && waterTrendData.length > 0 && (
                    <>
                      <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-disabled)' }}>Last 7 days</p>
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={waterTrendData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                          <YAxis domain={[0, 8]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={30} />
                          <ReferenceLine y={8} stroke="var(--text-disabled)" strokeDasharray="4 4" />
                          <ChartTooltip
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                            labelStyle={{ color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 2 }}
                            formatter={(value: number) => [`${value} glasses`, 'Water']}
                          />
                          <Line type="monotone" dataKey="glasses" stroke="#0067e0" strokeWidth={2} dot={{ r: 3, fill: '#0067e0' }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </SpotlightCard>

                {/* 7-day calorie trend vs daily target — Δ to target → line vs baseline */}
                <SpotlightCard spotlightColor="rgba(16,185,129,0.08)" style={{ padding: 20 }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>7-Day Calorie Trend</h4>
                  {!clientId ? (
                    <EmptyChartState label="Open this page from a client's profile to see their calorie trend." />
                  ) : calorieTrendData.length === 0 ? (
                    <EmptyChartState label="No logged history yet for this client." />
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={calorieTrendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10.5, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={44} />
                        <ReferenceLine y={GOAL_CAL} stroke="var(--text-disabled)" strokeDasharray="4 4" label={{ value: 'Goal', position: 'insideTopRight', fontSize: 10, fill: 'var(--text-disabled)' }} />
                        <ChartTooltip
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                          labelStyle={{ color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 2 }}
                          formatter={(value: number) => [`${value} kcal`, 'Calories']}
                        />
                        <Line type="monotone" dataKey="calories" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </SpotlightCard>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating AI button */}
      <m.button
        onClick={() => setAiPanelOpen(true)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className="above-bottom-nav" style={{ position: 'fixed', right: 28, width: 52, height: 52, borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #10b981, #34d399)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(16,185,129,0.45)', zIndex: 100 }}
        title="Open AI Diet Coach"
      >
        <Sparkles size={20} />
      </m.button>

      {/* AI Coach Panel */}
      <AnimatePresence>
        {aiPanelOpen && (
          <>
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 8999 }}
              onClick={() => setAiPanelOpen(false)} />
            <AiCoachPanel type="diet" onClose={() => setAiPanelOpen(false)} />
          </>
        )}
      </AnimatePresence>

      <AddMealModal open={addMealOpen} onClose={() => setAddMealOpen(false)} onCreated={fetchData} />
      <MealDetailModal meal={mealDetail} onClose={() => setMealDetail(null)} />
      <AssignTemplateModal template={assignTemplate} presetClientId={clientId} presetClientName={clientName}
        onClose={() => setAssignTemplate(null)} onAssign={handleAssignTemplate} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </PageContainer>
  );
}

/* ── Add Meal modal ── */
function AddMealModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', meal_type: 'breakfast', calories: '', protein_g: '', carbs_g: '', fats_g: '', serving_size: '' });

  const reset = () => setForm({ name: '', meal_type: 'breakfast', calories: '', protein_g: '', carbs_g: '', fats_g: '', serving_size: '' });

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Enter a meal name.'); return; }
    setSaving(true);
    try {
      await api.diet.meals.create({
        name: form.name.trim(), meal_type: form.meal_type,
        calories: Number(form.calories) || 0, protein_g: Number(form.protein_g) || 0,
        carbs_g: Number(form.carbs_g) || 0, fats_g: Number(form.fats_g) || 0,
        serving_size: form.serving_size || null,
      });
      toast.success('Meal added to the library.');
      reset();
      onClose();
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not add meal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Meal</DialogTitle></DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Meal name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 13 }} />
          <select aria-label="Meal type" value={form.meal_type} onChange={(e) => setForm((f) => ({ ...f, meal_type: e.target.value }))}
            style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 13 }}>
            {Object.entries(MEAL_TYPE_TO_API).map(([label, val]) => <option key={val} value={val}>{label}</option>)}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="number" placeholder="Calories" value={form.calories} onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))}
              style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 13 }} />
            <input placeholder="Serving size" value={form.serving_size} onChange={(e) => setForm((f) => ({ ...f, serving_size: e.target.value }))}
              style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 13 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <input type="number" placeholder="Protein (g)" value={form.protein_g} onChange={(e) => setForm((f) => ({ ...f, protein_g: e.target.value }))}
              style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 13 }} />
            <input type="number" placeholder="Carbs (g)" value={form.carbs_g} onChange={(e) => setForm((f) => ({ ...f, carbs_g: e.target.value }))}
              style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 13 }} />
            <input type="number" placeholder="Fats (g)" value={form.fats_g} onChange={(e) => setForm((f) => ({ ...f, fats_g: e.target.value }))}
              style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 13 }} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Add Meal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Meal detail modal (read-only) ── */
function MealDetailModal({ meal, onClose }: { meal: Meal | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(meal)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        {meal && (
          <>
            <DialogHeader>
              <DialogTitle>{meal.emoji} {meal.name}</DialogTitle>
            </DialogHeader>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 11.5, background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>{meal.type}</span>
              {meal.serving_size && <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 11.5, background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>{meal.serving_size}</span>}
            </div>
            {meal.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>{meal.description}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { l: 'Calories', v: meal.calories, u: 'kcal', c: '#ef4444' },
                { l: 'Protein', v: meal.protein, u: 'g', c: '#0067e0' },
                { l: 'Carbs', v: meal.carbs, u: 'g', c: '#f59e0b' },
                { l: 'Fats', v: meal.fats, u: 'g', c: '#0067e0' },
              ].map((m) => (
                <div key={m.l} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 10, background: `${m.c}10` }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: m.c }}>{m.v}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{m.l} ({m.u})</p>
                </div>
              ))}
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Assign template to a client modal ── */
function AssignTemplateModal({
  template, presetClientId, presetClientName, onClose, onAssign,
}: {
  template: DietTemplate | null;
  presetClientId: string | null;
  presetClientName: string;
  onClose: () => void;
  onAssign: (template: DietTemplate, client: ClientOption) => Promise<void>;
}) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!template || presetClientId) { setClients([]); setSearch(''); return; }
    setLoading(true);
    api.pt.clients().then((r: { data?: unknown[] }) => {
      const arr = Array.isArray(r?.data) ? r.data : [];
      setClients((arr as Record<string, unknown>[]).map((c) => ({ id: String(c.id), name: String(c.name ?? '') })));
    }).finally(() => setLoading(false));
  }, [template, presetClientId]);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = async (client: ClientOption) => {
    if (!template) return;
    setAssigningId(client.id);
    try { await onAssign(template, client); } finally { setAssigningId(null); }
  };

  return (
    <Dialog open={Boolean(template)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign &quot;{template?.name}&quot;{presetClientId ? ` to ${presetClientName || 'this client'}` : ' to a Client'}</DialogTitle>
        </DialogHeader>

        {presetClientId ? (
          <Button variant="primary" disabled={assigningId !== null}
            onClick={() => handleSelect({ id: presetClientId, name: presetClientName })}>
            {assigningId ? <Loader2 size={14} className="animate-spin" /> : `Confirm assign to ${presetClientName || 'this client'}`}
          </Button>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-subtle)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border)' }}>
              <Search size={14} color="var(--text-disabled)" />
              <input autoFocus placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13 }} />
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
              {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Loader2 size={18} className="animate-spin" /></div>}
              {!loading && filtered.length === 0 && <p style={{ textAlign: 'center', padding: 24, fontSize: 12.5, color: 'var(--text-muted)' }}>No clients found.</p>}
              {!loading && filtered.map((c) => (
                <button key={c.id} disabled={assigningId !== null} onClick={() => handleSelect(c)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: assigningId !== null ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: assigningId !== null && assigningId !== c.id ? 0.5 : 1 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    <Users size={13} color="var(--text-disabled)" /> {c.name}
                  </span>
                  {assigningId === c.id && <Loader2 size={14} className="animate-spin" />}
                </button>
              ))}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
