'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Salad, Plus, Search, User, Clock, Flame, Droplets,
  Sun, Coffee, UtensilsCrossed, Moon, Apple, Banana,
  Target, Check, ChevronRight, Sparkles, Brain,
  TrendingUp, Activity, GlassWater, RefreshCw,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { cn } from '@/components/ui/cn';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

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
  { id: 'Breakfast', icon: <Coffee size={14} />, label: 'Breakfast', time: '6:00 – 9:00', color: '#f59e0b' },
  { id: 'Lunch', icon: <UtensilsCrossed size={14} />, label: 'Lunch', time: '12:00 – 14:00', color: '#6366f1' },
  { id: 'Snacks', icon: <Apple size={14} />, label: 'Snacks', time: '16:00 – 17:00', color: '#ec4899' },
  { id: 'Dinner', icon: <Moon size={14} />, label: 'Dinner', time: '19:00 – 21:00', color: '#D97706' },
];

const DIET_GOALS = ['Muscle Gain', 'Weight Loss', 'Maintenance', 'Endurance', 'General Health'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } }
};
const heroVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } }
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
    } catch (e: any) { /* ignore */ }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const consumed = meals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFats = meals.reduce((s, m) => s + (m.fats || 0), 0);
  const goalCalories = 2400;

  const waterPct = Math.min((water / 8) * 100, 100);
  const calPct = Math.min((consumed / goalCalories) * 100, 100);

  const filteredTemplates = templates.filter((t) => {
    if (goalFilter && t.goal !== goalFilter) return false;
    if (search) return t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0a1a 0%, #052e16 20%, #0f172a 60%, #1a0a2e 100%)' }}>
      {/* ── Hero ── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0a0a1a 0%, #052e16 20%, #0f172a 45%, #1a1a2e 70%, #0a0a1a 100%)', padding: '48px 32px 40px', borderRadius: '0 0 40px 40px' }}>
        <m.div style={{ position: 'absolute', top: -60, right: -30, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)', pointerEvents: 'none' }}
          animate={{ x: [0, 20, -15, 0], y: [0, -30, 10, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} />
        <m.div style={{ position: 'absolute', bottom: -50, left: -40, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.08), transparent 70%)', pointerEvents: 'none' }}
          animate={{ x: [0, -20, 25, 0], y: [0, 20, -10, 0] }} transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }} />
        <m.div style={{ position: 'absolute', top: '20%', left: '60%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06), transparent 70%)', pointerEvents: 'none' }}
          animate={{ x: [0, 10, -8, 0], y: [0, -15, 8, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <m.div variants={heroVariants} initial="hidden" animate="visible"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 58, height: 58, borderRadius: 18, background: 'linear-gradient(135deg, #10b981, #34d399)', boxShadow: '0 8px 32px rgba(16,185,129,0.3)' }}>
              <Salad size={26} color="#fff" />
            </m.div>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0, #6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Diet Plans</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.45)' }}>Nutrition planning & meal tracking for your clients</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 12, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {/* ── Macro Progress ── */}
        <m.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Calories', value: consumed, max: goalCalories, unit: 'kcal', color: '#ef4444', icon: <Flame size={15} /> },
            { label: 'Protein', value: totalProtein, max: 160, unit: 'g', color: '#6366f1', icon: <Activity size={15} /> },
            { label: 'Carbs', value: totalCarbs, max: 260, unit: 'g', color: '#f59e0b', icon: <Banana size={15} /> },
            { label: 'Fats', value: totalFats, max: 65, unit: 'g', color: '#ec4899', icon: <Droplets size={15} /> },
          ].map((macro, i) => {
            const pct = Math.min((macro.value / macro.max) * 100, 100);
            return (
              <m.div key={macro.label} variants={itemVariants}
                style={{ borderRadius: 16, padding: 18, background: `linear-gradient(135deg, ${macro.color}15, rgba(30,27,75,0.5))`, border: '1px solid rgba(255,255,255,0.07)', cursor: 'default', transition: 'transform 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.5)' }}>{macro.label}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${macro.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: macro.color }}>{macro.icon}</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 8 }}>{macro.value}<span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>/{macro.max}{macro.unit}</span></div>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <m.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 2, background: macro.color }} />
                </div>
              </m.div>
            );
          })}
        </m.div>

        {/* ── Water Intake ── */}
        <m.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ borderRadius: 16, padding: 18, background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(16,185,129,0.04))', border: '1px solid rgba(6,182,212,0.12)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(16,185,129,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GlassWater size={18} color="#22d3ee" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.45)' }}>Water Intake</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#22d3ee' }}>{water}/8 glasses</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <m.div initial={{ width: 0 }} animate={{ width: `${waterPct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #06b6d4, #10b981)' }} />
              </div>
              <button onClick={() => setWater(Math.min(water + 1, 8))}
                style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.1)', color: '#22d3ee', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                + Add Glass
              </button>
            </div>
          </div>
        </m.div>

        {/* ── Meal Schedule ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 3, flexWrap: 'wrap' }}>
          {MEAL_TYPES.map((mt) => (
            <button key={mt.id} onClick={() => setActiveMealType(activeMealType === mt.id ? null : mt.id)}
              style={{
                padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6,
                background: activeMealType === mt.id ? `${mt.color}22` : 'transparent',
                color: activeMealType === mt.id ? mt.color : 'rgba(255,255,255,0.3)',
              }}>
              {mt.icon}
              {mt.label}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{mt.time}</span>
            </button>
          ))}
        </div>

        {/* ── Meals Grid ── */}
        <m.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 28 }}>
          {meals.filter((m) => !activeMealType || m.type === activeMealType).map((meal, i) => {
            const mt = MEAL_TYPES.find((t) => t.id === meal.type);
            return (
              <m.div key={meal.id} variants={itemVariants}
                style={{ borderRadius: 16, padding: 18, background: `linear-gradient(135deg, ${mt?.color || '#6366f1'}08, rgba(12,12,30,0.6))`, border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${mt?.color}15`; e.currentTarget.style.borderColor = `${mt?.color}30`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 20 }}>{meal.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: mt?.color || '#6366f1', background: `${mt?.color || '#6366f1'}18`, padding: '2px 8px', borderRadius: 6 }}>{meal.type}</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{meal.time}</span>
                </div>
                <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{meal.name}</h4>
                <div style={{ display: 'flex', gap: 10, fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
                  <span>🔥 {meal.calories} kcal</span>
                  <span>💪 {meal.protein}g</span>
                  <span>🍚 {meal.carbs}g</span>
                  <span>🧈 {meal.fats}g</span>
                </div>
              </m.div>
            );
          })}
        </m.div>

        {/* ── Diet Templates ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Salad size={15} color="#34d399" />
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>Diet Templates</h3>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Search size={13} color="rgba(255,255,255,0.3)" />
                <input placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, outline: 'none', width: 150 }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            <button onClick={() => setGoalFilter(null)}
              style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', background: !goalFilter ? 'rgba(16,185,129,0.15)' : 'transparent', color: !goalFilter ? '#34d399' : 'rgba(255,255,255,0.4)', borderColor: !goalFilter ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)' }}>
              All
            </button>
            {DIET_GOALS.map((g) => (
              <button key={g} onClick={() => setGoalFilter(goalFilter === g ? null : g)}
                style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', background: goalFilter === g ? 'rgba(16,185,129,0.15)' : 'transparent', color: goalFilter === g ? '#34d399' : 'rgba(255,255,255,0.4)', borderColor: goalFilter === g ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)' }}>
                {g}
              </button>
            ))}
          </div>
          <m.div variants={containerVariants} initial="hidden" animate="visible"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {filteredTemplates.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                No templates found. Create one to get started.
              </div>
            ) : filteredTemplates.map((t, i) => (
              <m.div key={t.id} variants={itemVariants}
                style={{ position: 'relative', borderRadius: 16, padding: 20, background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(12,12,30,0.5))', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${t.color}22, ${t.color}11)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 20 }}>🥗</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{t.name}</h4>
                  {t.popular && <span style={{ padding: '1px 7px', borderRadius: 8, fontSize: 9, fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#fcd34d' }}>Popular</span>}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 10px' }}>{t.description}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>🔥 {t.calories} kcal</span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>💪 {t.protein}g</span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#fcd34d' }}>🍚 {t.carbs}g</span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(236,72,153,0.1)', color: '#f9a8d4' }}>🧈 {t.fats}g</span>
                </div>
                {t.meals > 0 && <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{t.meals} meals · Goal: {t.goal}</div>}
              </m.div>
            ))}
          </m.div>
        </div>

        {/* ── Supplements ── */}
        <div style={{ borderRadius: 20, padding: 22, background: 'linear-gradient(135deg, rgba(236,72,153,0.06), rgba(245,158,11,0.04))', border: '1px solid rgba(236,72,153,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(245,158,11,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={17} color="#f9a8d4" />
            </div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>Supplement Stack</h3>
            <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 9.5, fontWeight: 700, background: 'rgba(236,72,153,0.15)', color: '#f9a8d4', letterSpacing: '0.05em' }}>RECOMMENDED</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {supplements.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 30, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                No supplements configured yet.
              </div>
            ) : supplements.map((s, i) => (
              <m.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{ borderRadius: 14, padding: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(236,72,153,0.1)', cursor: 'default', transition: 'all 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(236,72,153,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>{s.emoji}</span>
                  <div>
                    <h5 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{s.name}</h5>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{s.dosage}</span>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>{s.benefit}</p>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>⏰ {s.timing}</span>
              </m.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}