'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Salad, Plus, Search, Flame, Droplets,
  Coffee, UtensilsCrossed, Moon, Apple,
  Target, Check, Sparkles, Activity,
  GlassWater, X, ShoppingCart, Pill,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import { cn } from '@/components/ui/cn';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { ProgressRing } from '@/components/fitness/ProgressRing';
import { MealCard } from '@/components/fitness/MealCard';
import { GroceryList } from '@/components/fitness/GroceryList';
import { SpotlightCard } from '@/components/fitness/SpotlightCard';
import { AnimatedCounter } from '@/components/fitness/AnimatedCounter';
import { AiCoachPanel } from '@/components/fitness/AiCoachPanel';

type MealType = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';

interface Meal {
  id: string; type: MealType; name: string; calories: number;
  protein: number; carbs: number; fats: number; time: string; emoji: string;
}

interface DietTemplate {
  id: string; name: string; description: string; goal: string;
  calories: number; protein: number; carbs: number; fats: number;
  meals: number; color: string; popular?: boolean;
}

interface Supplement {
  id: string; name: string; dosage: string; timing: string; benefit: string; emoji: string;
}

const MEAL_TYPES: { id: MealType; icon: React.ReactNode; label: string; time: string; color: string }[] = [
  { id: 'Breakfast', icon: <Coffee size={13} />, label: 'Breakfast', time: '6-9 AM', color: '#f59e0b' },
  { id: 'Lunch', icon: <UtensilsCrossed size={13} />, label: 'Lunch', time: '12-2 PM', color: '#6366f1' },
  { id: 'Snacks', icon: <Apple size={13} />, label: 'Snacks', time: '4-5 PM', color: '#ec4899' },
  { id: 'Dinner', icon: <Moon size={13} />, label: 'Dinner', time: '7-9 PM', color: '#8b5cf6' },
];

const DIET_GOALS = ['Muscle Gain', 'Weight Loss', 'Maintenance', 'Endurance', 'General Health'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function DietPlansPage() {
  return <Guard roles={['admin', 'manager', 'trainer']}><AppShell><Inner /></AppShell></Guard>;
}

function Inner() {
  const { toast } = useToast();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [water, setWater] = useState(5);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  const [search, setSearch] = useState('');
  const [goalFilter, setGoalFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'meals' | 'templates' | 'grocery' | 'supplements' | 'analytics'>('meals');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, tRes, sRes] = await Promise.all([
        api.diet.meals.list({ date }),
        api.diet.templates.list(),
        api.diet.supplements.list(),
      ]);
      setMeals(Array.isArray((mRes as any)?.data) ? (mRes as any).data : []);
      setTemplates(Array.isArray((tRes as any)?.data) ? (tRes as any).data : []);
      setSupplements(Array.isArray((sRes as any)?.data) ? (sRes as any).data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const consumed = meals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFats = meals.reduce((s, m) => s + (m.fats || 0), 0);

  const GOAL_CAL = 2400;
  const GOAL_PROT = 160;
  const GOAL_CARBS = 260;
  const GOAL_FATS = 65;

  const waterPct = Math.min((water / 8) * 100, 100);

  const filteredTemplates = templates.filter((t) => {
    if (goalFilter && t.goal !== goalFilter) return false;
    if (search) return t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const filteredMeals = meals.filter((m) => !activeMealType || m.type === activeMealType);

  const mockGrocery = [
    { category: 'Protein', items: ['Chicken breast', 'Eggs', 'Greek yogurt', 'Tuna', 'Whey protein'] },
    { category: 'Vegetables', items: ['Spinach', 'Broccoli', 'Bell peppers', 'Cucumber', 'Sweet potato'] },
    { category: 'Fruits', items: ['Banana', 'Blueberries', 'Apple', 'Orange'] },
    { category: 'Grains', items: ['Oats', 'Brown rice', 'Whole wheat bread', 'Quinoa'] },
    { category: 'Dairy', items: ['Milk', 'Cottage cheese', 'Mozzarella'] },
  ];

  return (
    <div style={{ minHeight: '100%', position: 'relative' }}>
      {/* Hero */}
      <div style={{ padding: '28px 32px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <m.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #10b981, #34d399)', boxShadow: '0 4px 20px rgba(16,185,129,0.35)', flexShrink: 0 }}
            >
              <Salad size={22} color="#fff" />
            </m.div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Diet Plans</h1>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Nutrition planning and meal tracking for your clients</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', outline: 'none' }} />
            <Button variant="primary" size="sm" onClick={() => toast.info('Add meal coming soon.')}>
              <Plus size={14} style={{ marginRight: 5 }} />Add Meal
            </Button>
          </div>
        </div>

        {/* Macro progress rings */}
        <m.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Calories', value: consumed, goal: GOAL_CAL, unit: 'kcal', color: '#ef4444' },
            { label: 'Protein', value: totalProtein, goal: GOAL_PROT, unit: 'g', color: '#6366f1' },
            { label: 'Carbs', value: totalCarbs, goal: GOAL_CARBS, unit: 'g', color: '#f59e0b' },
            { label: 'Fats', value: totalFats, goal: GOAL_FATS, unit: 'g', color: '#ec4899' },
          ].map((macro) => (
            <m.div key={macro.label} variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <ProgressRing
                size={90}
                strokeWidth={7}
                progress={Math.min((macro.value / macro.goal) * 100, 100)}
                color={macro.color}
                value={String(macro.value)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GlassWater size={16} color="#22d3ee" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-disabled)' }}>Hydration</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#22d3ee' }}>{water}/8 glasses</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                    <m.div initial={{ width: 0 }} animate={{ width: `${waterPct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #06b6d4, #10b981)' }} />
                  </div>
                  <button onClick={() => setWater(Math.min(water + 1, 8))}
                    style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.1)', color: '#22d3ee', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
        <div style={{ display: 'flex', gap: 3, marginBottom: 20, background: 'var(--bg-subtle)', borderRadius: 11, padding: 3 }}>
          {[
            { key: 'meals', label: "Today's Meals", count: meals.length, color: '#10b981' },
            { key: 'templates', label: 'Templates', count: templates.length, color: '#6366f1' },
            { key: 'grocery', label: 'Grocery List', color: '#f59e0b' },
            { key: 'supplements', label: 'Supplements', count: supplements.length, color: '#ec4899' },
            { key: 'analytics', label: 'Analytics', color: '#06b6d4' },
          ].map((tab) => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
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
                  <p style={{ margin: 0, fontSize: 14 }}>No meals logged for this date. Add your first meal to start tracking.</p>
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
                        onClick={() => toast.info(`Viewing ${meal.name}`)}
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
                {[null, ...DIET_GOALS].map((g) => (
                  <button key={g ?? 'all'} onClick={() => setGoalFilter(g)}
                    style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.18s', background: goalFilter === g ? 'rgba(99,102,241,0.1)' : 'transparent', color: goalFilter === g ? '#6366f1' : 'var(--text-muted)', borderColor: goalFilter === g ? 'rgba(99,102,241,0.3)' : 'var(--border)' }}>
                    {g ?? 'All Goals'}
                  </button>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-subtle)', borderRadius: 8, padding: '5px 12px', border: '1px solid var(--border)' }}>
                  <Search size={13} color="var(--text-disabled)" />
                  <input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 12, fontWeight: 500, outline: 'none', width: 160 }} />
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
                      <SpotlightCard spotlightColor="rgba(16,185,129,0.1)" style={{ padding: 20, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            <Salad size={18} color="#10b981" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</h4>
                              {t.popular && <span style={{ padding: '1px 6px', borderRadius: 7, fontSize: 9, fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#D97706', flexShrink: 0 }}>Popular</span>}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.goal}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.description}</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10.5, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            {t.calories} kcal
                          </span>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10.5, background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                            {t.protein}g P
                          </span>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10.5, background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                            {t.carbs}g C
                          </span>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10.5, background: 'rgba(236,72,153,0.1)', color: '#ec4899' }}>
                            {t.fats}g F
                          </span>
                        </div>
                        {t.meals > 0 && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-disabled)' }}>{t.meals} meals per day</div>}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingCart size={16} color="#f59e0b" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Weekly Grocery List</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Check off items as you shop</p>
                  </div>
                </div>
                <GroceryList items={mockGrocery} onGenerate={() => setAiPanelOpen(true)} />
              </div>
            </m.div>
          )}

          {/* Supplements Tab */}
          {activeTab === 'supplements' && (
            <m.div key="supplements" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(236,72,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pill size={16} color="#ec4899" />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Supplement Stack</h3>
                <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: 'rgba(236,72,153,0.1)', color: '#ec4899', letterSpacing: '0.05em' }}>RECOMMENDED</span>
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
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(236,72,153,0.08)'; e.currentTarget.style.borderColor = 'rgba(236,72,153,0.2)'; }}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <SpotlightCard style={{ padding: 20 }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Calorie Breakdown by Meal</h4>
                  {MEAL_TYPES.map((mt) => {
                    const mealCals = meals.filter((m) => m.type === mt.id).reduce((s, m) => s + m.calories, 0);
                    const pct = GOAL_CAL > 0 ? (mealCals / GOAL_CAL) * 100 : 0;
                    return (
                      <div key={mt.id} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ color: mt.color }}>{mt.icon}</span>{mt.label}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{mealCals} kcal</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                          <m.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                            style={{ height: '100%', borderRadius: 3, background: mt.color }} />
                        </div>
                      </div>
                    );
                  })}
                </SpotlightCard>

                <SpotlightCard style={{ padding: 20 }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Macro Summary</h4>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
                    {[
                      { l: 'Protein', v: totalProtein, g: GOAL_PROT, c: '#6366f1' },
                      { l: 'Carbs', v: totalCarbs, g: GOAL_CARBS, c: '#f59e0b' },
                      { l: 'Fats', v: totalFats, g: GOAL_FATS, c: '#ec4899' },
                    ].map(({ l, v, g, c }) => (
                      <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <ProgressRing size={72} strokeWidth={6} progress={Math.min((v / g) * 100, 100)} color={c} value={`${v}g`} label={l} />
                        <span style={{ fontSize: 10.5, color: 'var(--text-disabled)' }}>of {g}g</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
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

                <SpotlightCard spotlightColor="rgba(6,182,212,0.08)" style={{ padding: 20 }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Hydration Tracker</h4>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <button key={i} onClick={() => setWater(i + 1)}
                        style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s', background: i < water ? 'rgba(6,182,212,0.15)' : 'var(--bg-subtle)', borderColor: i < water ? 'rgba(6,182,212,0.4)' : 'var(--border)', color: i < water ? '#22d3ee' : 'var(--text-disabled)' }}>
                        <GlassWater size={15} />
                      </button>
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    {water >= 8 ? 'Daily goal reached!' : `${8 - water} more glasses to reach your daily goal`}
                  </p>
                </SpotlightCard>

                <SpotlightCard spotlightColor="rgba(16,185,129,0.08)" style={{ padding: 20 }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Meal Frequency</h4>
                  {MEAL_TYPES.map((mt) => {
                    const count = meals.filter((m) => m.type === mt.id).length;
                    return (
                      <div key={mt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: mt.color }}>{mt.icon}</span>{mt.label}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: count > 0 ? '#10b981' : 'var(--text-disabled)' }}>{count} {count === 1 ? 'meal' : 'meals'}</span>
                          {count > 0 && <Check size={12} color="#10b981" />}
                        </div>
                      </div>
                    );
                  })}
                  <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {meals.length} total meals logged today
                  </p>
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
        style={{ position: 'fixed', bottom: 28, right: 28, width: 52, height: 52, borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #10b981, #34d399)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(16,185,129,0.45)', zIndex: 100 }}
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
