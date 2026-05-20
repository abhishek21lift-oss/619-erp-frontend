'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Salad, Plus, Search, User, Clock, Flame, Droplets,
  Sun, Coffee, UtensilsCrossed, Moon, Apple, Banana,
  Target, Check, ChevronRight, Sparkles, Brain,
  TrendingUp, Activity, GlassWater,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { StatusPill } from '@/components/premium/StatusPill';
import { RevenueCard } from '@/components/premium/RevenueCard';
import { cn } from '@/components/ui/cn';

/* ────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────── */
type MealType = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';

interface Meal {
  id: string;
  type: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  time: string;
  emoji: string;
}

interface DietTemplate {
  id: string;
  name: string;
  description: string;
  goal: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meals: number;
  color: string;
  popular?: boolean;
}

interface Supplement {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  benefit: string;
  emoji: string;
}

/* ────────────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────────────── */
const MEAL_TYPES: { id: MealType; icon: React.ReactNode; label: string; time: string; color: string }[] = [
  { id: 'Breakfast', icon: <Coffee size={14} />, label: 'Breakfast', time: '6:00 – 9:00', color: '#f59e0b' },
  { id: 'Lunch', icon: <UtensilsCrossed size={14} />, label: 'Lunch', time: '12:00 – 14:00', color: '#6366f1' },
  { id: 'Snacks', icon: <Apple size={14} />, label: 'Snacks', time: '16:00 – 17:00', color: '#ec4899' },
  { id: 'Dinner', icon: <Moon size={14} />, label: 'Dinner', time: '19:00 – 21:00', color: '#dc2626' },
];

const MEALS: Meal[] = [
  { id: 'm1', type: 'Breakfast', name: 'Oats with Whey & Berries', calories: 420, protein: 35, carbs: 45, fats: 8, time: '07:00', emoji: '🥣' },
  { id: 'm2', type: 'Breakfast', name: 'Egg White Omelette', calories: 320, protein: 30, carbs: 8, fats: 18, time: '08:00', emoji: '🍳' },
  { id: 'm3', type: 'Breakfast', name: 'Greek Yogurt Parfait', calories: 280, protein: 20, carbs: 35, fats: 5, time: '07:30', emoji: '🥛' },
  { id: 'm4', type: 'Lunch', name: 'Grilled Chicken Bowl', calories: 520, protein: 45, carbs: 40, fats: 14, time: '12:30', emoji: '🍗' },
  { id: 'm5', type: 'Lunch', name: 'Salmon with Quinoa', calories: 480, protein: 38, carbs: 35, fats: 16, time: '13:00', emoji: '🐟' },
  { id: 'm6', type: 'Lunch', name: 'Paneer Tikka Wrap', calories: 450, protein: 28, carbs: 42, fats: 18, time: '12:00', emoji: '🌯' },
  { id: 'm7', type: 'Snacks', name: 'Protein Shake + Banana', calories: 250, protein: 25, carbs: 30, fats: 3, time: '16:00', emoji: '🥤' },
  { id: 'm8', type: 'Snacks', name: 'Mixed Nuts & Seeds', calories: 180, protein: 8, carbs: 10, fats: 14, time: '16:30', emoji: '🥜' },
  { id: 'm9', type: 'Snacks', name: 'Apple with Peanut Butter', calories: 220, protein: 8, carbs: 28, fats: 10, time: '17:00', emoji: '🍎' },
  { id: 'm10', type: 'Dinner', name: 'Grilled Fish with Veggies', calories: 400, protein: 40, carbs: 20, fats: 12, time: '19:30', emoji: '🐠' },
  { id: 'm11', type: 'Dinner', name: 'Chicken Stir Fry', calories: 380, protein: 35, carbs: 25, fats: 12, time: '20:00', emoji: '🥘' },
  { id: 'm12', type: 'Dinner', name: 'Cottage Cheese Salad', calories: 320, protein: 25, carbs: 15, fats: 18, time: '19:00', emoji: '🥗' },
];

const DIET_TEMPLATES: DietTemplate[] = [
  { id: 'dt1', name: 'Weight Loss', description: 'Calorie-deficit plan with high protein', goal: 'Fat Loss', calories: 1800, protein: 140, carbs: 160, fats: 40, meals: 5, color: '#f59e0b', popular: true },
  { id: 'dt2', name: 'Muscle Gain', description: 'Surplus calories for muscle building', goal: 'Mass', calories: 3200, protein: 200, carbs: 380, fats: 80, meals: 6, color: '#dc2626' },
  { id: 'dt3', name: 'Maintenance', description: 'Balanced macros for weight stability', goal: 'Maintain', calories: 2400, protein: 160, carbs: 240, fats: 60, meals: 5, color: '#6366f1' },
  { id: 'dt4', name: 'Keto', description: 'High-fat, low-carb for ketosis', goal: 'Fat Loss', calories: 2000, protein: 130, carbs: 30, fats: 150, meals: 4, color: '#8b5cf6' },
  { id: 'dt5', name: 'Vegan', description: 'Plant-based whole foods plan', goal: 'General Health', calories: 2200, protein: 120, carbs: 280, fats: 70, meals: 5, color: '#10b981' },
];

const SUPPLEMENTS: Supplement[] = [
  { id: 's1', name: 'Whey Protein', dosage: '2 scoops', timing: 'Post-workout', benefit: 'Muscle recovery', emoji: '🥤' },
  { id: 's2', name: 'Creatine Monohydrate', dosage: '5g', timing: 'Pre/post workout', benefit: 'Strength & power', emoji: '💊' },
  { id: 's3', name: 'Omega-3 Fish Oil', dosage: '2 capsules', timing: 'With meals', benefit: 'Joint & heart health', emoji: '🐟' },
  { id: 's4', name: 'Vitamin D3 + K2', dosage: '5000 IU', timing: 'Morning', benefit: 'Bone health & immunity', emoji: '☀️' },
  { id: 's5', name: 'Magnesium Glycinate', dosage: '200mg', timing: 'Before bed', benefit: 'Sleep & recovery', emoji: '🌙' },
  { id: 's6', name: 'BCAAs', dosage: '10g', timing: 'During workout', benefit: 'Reduced muscle soreness', emoji: '💪' },
];

const AI_MEALS = [
  { name: 'AI-Optimized High Protein Bowl', calories: 460, protein: 48, desc: 'Based on your training load and recovery needs', time: 'Post-workout' },
  { name: 'Smart Carb-Cycling Dinner', calories: 380, protein: 35, desc: 'Adjusted for tomorrow\'s leg day training', time: 'Dinner' },
  { name: 'Recovery Smoothie Blend', calories: 310, protein: 30, desc: 'Enhanced with L-glutamine for muscle repair', time: 'Snacks' },
];

const MEAL_CALENDAR = [
  { date: '2026-05-18', calories: 2150, protein: 145, meals: 5 },
  { date: '2026-05-19', calories: 2320, protein: 160, meals: 5 },
  { date: '2026-05-20', calories: 1980, protein: 138, meals: 4 },
  { date: '2026-05-21', calories: 2410, protein: 170, meals: 5 },
  { date: '2026-05-22', calories: 2050, protein: 140, meals: 5 },
  { date: '2026-05-23', calories: 0, protein: 0, meals: 0 },
  { date: '2026-05-24', calories: 0, protein: 0, meals: 0 },
];

const CLIENTS = ['Abhishek Katiyar', 'Rahul Sharma', 'Priya Mehta', 'Neha Gupta', 'Ravi Patel', 'Sneha Singh'];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ────────────────────────────────────────────────────────────────────
   CIRCULAR PROGRESS
──────────────────────────────────────────────────────────────────── */
function CircularProgress({ value, max, label, color, unit }: {
  value: number; max: number; label: string; color: string; unit: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex h-[68px] w-[68px] items-center justify-center">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="5" />
          <motion.circle
            cx="36" cy="36" r="30" fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 30}
            initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 30 * (1 - pct / 100) }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <span className="text-[14px] font-[800]" style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <p className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
      <p className="text-[11px] font-[600]" style={{ color: 'rgb(100,116,139)' }}>{value}/{max}{unit}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   PAGE
──────────────────────────────────────────────────────────────────── */
export default function DietPlansPage() {
  return <Guard><AppShell><DietPlansContent /></AppShell></Guard>;
}

function DietPlansContent() {
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [waterIntake, setWaterIntake] = useState(5);
  const [consumedCal, setConsumedCal] = useState(1850);
  const [calGoal, setCalGoal] = useState(2400);

  const filteredMeals = MEALS.filter((m) => {
    if (activeMealType && m.type !== activeMealType) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalProtein = filteredMeals.reduce((acc, m) => acc + m.protein, 0);
  const totalCarbs = filteredMeals.reduce((acc, m) => acc + m.carbs, 0);
  const totalFats = filteredMeals.reduce((acc, m) => acc + m.fats, 0);
  const proteinGoal = 160;
  const carbsGoal = 240;
  const fatsGoal = 60;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 border-b" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px)', borderColor: 'rgba(15,23,42,0.07)' }}>
        <div className="mx-auto max-w-screen-xl px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                  <Salad size={16} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>Diet Plans</h1>
                  <p className="text-[11px] font-[600] uppercase tracking-[0.08em]" style={{ color: 'rgb(148,163,184)' }}>
                    Personal Training / <span style={{ color: '#dc2626' }}>Diet Plans</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5"
                style={{ background: 'rgba(248,250,252,0.9)', border: '1.5px solid rgba(15,23,42,0.09)' }}>
                <User size={12} style={{ color: 'rgb(148,163,184)' }} />
                <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}
                  className="bg-transparent text-[11px] font-[500] outline-none" style={{ color: 'rgb(15,23,42)' }}>
                  <option value="">Assign to client…</option>
                  {CLIENTS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <PremiumButton tone="primary" glow size="sm" icon={<Plus size={12} />}>
                Create Diet Plan
              </PremiumButton>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
        {/* ── CALORIE TRACKING WIDGET ── */}
        <section className="mb-8">
          <div className="rounded-[22px] p-5 sm:p-6"
            style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-[15px] font-[760] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>
                  <span className="flex items-center gap-2">
                    <Flame size={16} style={{ color: '#dc2626' }} />
                    Daily Nutrition Tracker
                  </span>
                </h2>
                <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>Today's intake overview</p>
              </div>
              <PremiumButton tone="secondary" size="sm" icon={<Plus size={11} />}>
                Log Meal
              </PremiumButton>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Calorie Progress */}
              <div className="rounded-[16px] p-4" style={{ background: 'rgba(248,250,252,0.8)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={14} style={{ color: '#dc2626' }} />
                  <span className="text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Calories</span>
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="text-[28px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>{consumedCal}</span>
                  <span className="text-[14px] font-[600] mb-1" style={{ color: 'rgb(148,163,184)' }}>/ {calGoal}</span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(15,23,42,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(consumedCal / calGoal) * 100}%` }}
                    transition={{ duration: 1 }}
                    style={{ background: 'linear-gradient(90deg, #dc2626, #b91c1c)' }}
                  />
                </div>
                <p className="mt-1 text-[11px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>
                  {consumedCal >= calGoal ? 'Goal reached!' : `${calGoal - consumedCal} kcal remaining`}
                </p>
              </div>

              {/* Macro Rings */}
              <CircularProgress value={totalProtein} max={proteinGoal} label="Protein" color="#dc2626" unit="g" />
              <CircularProgress value={totalCarbs} max={carbsGoal} label="Carbs" color="#f59e0b" unit="g" />
              <CircularProgress value={totalFats} max={fatsGoal} label="Fats" color="#6366f1" unit="g" />
            </div>
          </div>
        </section>

        {/* ── MEAL PLANNING ── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-[760] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>
              Meal Planning
              <span className="ml-2 text-[11px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>({MEALS.length} meals)</span>
            </h2>
            <div className="relative flex items-center gap-2 rounded-[10px] px-3 py-1.5"
              style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(15,23,42,0.08)' }}>
              <Search size={11} style={{ color: 'rgb(148,163,184)' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search meals…"
                className="flex-1 bg-transparent text-[11.5px] font-[500] outline-none w-[120px]" style={{ color: 'rgb(15,23,42)' }} />
            </div>
          </div>

          {/* Meal Type Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => setActiveMealType(null)}
              className="rounded-[10px] px-3 py-1.5 text-[11px] font-[660] transition-all"
              style={{
                background: !activeMealType ? 'rgba(220,38,38,0.10)' : 'rgba(248,250,252,0.9)',
                border: !activeMealType ? '1.5px solid rgba(220,38,38,0.25)' : '1.5px solid rgba(15,23,42,0.08)',
                color: !activeMealType ? '#dc2626' : 'rgb(100,116,139)',
              }}
            >
              All
            </button>
            {MEAL_TYPES.map((mt) => (
              <button
                key={mt.id}
                onClick={() => setActiveMealType(mt.id)}
                className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11px] font-[660] transition-all"
                style={{
                  background: activeMealType === mt.id ? `${mt.color}12` : 'rgba(248,250,252,0.9)',
                  border: activeMealType === mt.id ? `1.5px solid ${mt.color}30` : '1.5px solid rgba(15,23,42,0.08)',
                  color: activeMealType === mt.id ? mt.color : 'rgb(100,116,139)',
                }}
              >
                {mt.icon} {mt.label}
                <span className="text-[9px] opacity-70">{mt.time}</span>
              </button>
            ))}
          </div>

          {/* Meal Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MEAL_TYPES.map((mt) => {
              const typeMeals = filteredMeals.filter((m) => m.type === mt.id);
              if (activeMealType && activeMealType !== mt.id) return null;
              if (typeMeals.length === 0) return null;
              return (
                <div key={mt.id}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-[7px]" style={{ background: `${mt.color}12` }}>
                      {mt.icon}
                    </div>
                    <p className="text-[12px] font-[700]" style={{ color: mt.color }}>{mt.label}</p>
                    <span className="text-[10px]" style={{ color: 'rgb(203,213,225)' }}>{mt.time}</span>
                  </div>
                  <div className="space-y-2">
                    {typeMeals.map((meal, idx) => (
                      <motion.div
                        key={meal.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="group relative rounded-[14px] p-3.5 transition-all cursor-pointer hover:-translate-y-0.5"
                        style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 1px 6px rgba(15,23,42,0.04)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[18px]">{meal.emoji}</span>
                            <div>
                              <p className="text-[12px] font-[680]" style={{ color: 'rgb(15,23,42)' }}>{meal.name}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: 'rgb(148,163,184)' }}>{meal.time}</p>
                            </div>
                          </div>
                          <span className="text-[12px] font-[750]" style={{ color: '#dc2626' }}>{meal.calories}</span>
                        </div>
                        <div className="mt-2 flex gap-2 text-[9.5px] font-[600]">
                          <span style={{ color: '#dc2626' }}>P {meal.protein}g</span>
                          <span style={{ color: '#f59e0b' }}>C {meal.carbs}g</span>
                          <span style={{ color: '#6366f1' }}>F {meal.fats}g</span>
                        </div>
                      </motion.div>
                    ))}
                    <button className="flex w-full items-center justify-center gap-1 rounded-[12px] py-2 text-[11px] font-[600] transition-all hover:bg-white/60"
                      style={{ color: 'rgb(148,163,184)', border: '1px dashed rgba(15,23,42,0.12)' }}>
                      <Plus size={11} /> Add Meal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── DIET TEMPLATES + HYDRATION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6 mb-8">
          {/* Diet Templates */}
          <section>
            <h2 className="text-[15px] font-[760] tracking-[-0.01em] mb-4" style={{ color: 'rgb(15,23,42)' }}>
              Diet Templates
              <span className="ml-2 text-[11px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>({DIET_TEMPLATES.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DIET_TEMPLATES.map((dt, idx) => (
                <motion.div
                  key={dt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative overflow-hidden rounded-[18px] p-4 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(15,23,42,0.06)' }}
                >
                  <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-10"
                    style={{ background: `radial-gradient(circle, ${dt.color}, transparent)` }} />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-[8px]"
                            style={{ background: `${dt.color}12` }}>
                            <Target size={12} style={{ color: dt.color }} />
                          </div>
                          <p className="text-[13px] font-[720]" style={{ color: 'rgb(15,23,42)' }}>{dt.name}</p>
                        </div>
                        <p className="mt-1 text-[11px]" style={{ color: 'rgb(148,163,184)' }}>{dt.description}</p>
                      </div>
                      {dt.popular && (
                        <span className="rounded-full px-2 py-0.5 text-[8px] font-[800] uppercase tracking-wider"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}>
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="text-center rounded-[8px] p-1.5" style={{ background: 'rgba(248,250,252,0.8)' }}>
                        <p className="text-[11px] font-[750]" style={{ color: dt.color }}>{dt.calories}</p>
                        <p className="text-[8.5px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>kcal</p>
                      </div>
                      <div className="text-center rounded-[8px] p-1.5" style={{ background: 'rgba(248,250,252,0.8)' }}>
                        <p className="text-[11px] font-[750]" style={{ color: dt.color }}>{dt.protein}g</p>
                        <p className="text-[8.5px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>Protein</p>
                      </div>
                      <div className="text-center rounded-[8px] p-1.5" style={{ background: 'rgba(248,250,252,0.8)' }}>
                        <p className="text-[11px] font-[750]" style={{ color: dt.color }}>{dt.meals}</p>
                        <p className="text-[8.5px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>Meals</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>{dt.goal}</span>
                      <button className="flex items-center gap-1 text-[11px] font-[700] transition-opacity hover:opacity-70"
                        style={{ color: dt.color }}>
                        Use Plan <ChevronRight size={11} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Hydration + Supplement */}
          <section className="space-y-5">
            {/* Hydration Tracker */}
            <div className="rounded-[20px] p-5" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
              <div className="flex items-center gap-2 mb-4">
                <GlassWater size={15} style={{ color: '#0ea5e9' }} />
                <p className="text-[12px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Hydration Goal</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex h-[72px] w-[72px] items-center justify-center">
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="5" />
                    <motion.circle
                      cx="36" cy="36" r="30" fill="none" stroke="#0ea5e9" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 30}
                      initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 30 * (1 - waterIntake / 8) }}
                      transition={{ duration: 1 }}
                    />
                  </svg>
                  <span className="text-[18px] font-[800]" style={{ color: '#0ea5e9' }}>{waterIntake}L</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>Progress</span>
                    <span className="text-[11px] font-[700]" style={{ color: '#0ea5e9' }}>{Math.round((waterIntake / 8) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(15,23,42,0.06)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(waterIntake / 8) * 100}%` }}
                      transition={{ duration: 1 }}
                      style={{ background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)' }}
                    />
                  </div>
                  <p className="mt-1 text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>{8 - waterIntake}L remaining</p>
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((glass) => (
                      <button
                        key={glass}
                        onClick={() => setWaterIntake(glass)}
                        className={cn(
                          'flex-1 h-6 rounded-[6px] transition-all',
                          glass <= waterIntake ? 'opacity-100' : 'opacity-20',
                        )}
                        style={{ background: glass <= waterIntake ? '#0ea5e9' : 'rgba(15,23,42,0.10)' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Supplement Recommendations */}
            <div className="rounded-[20px] p-5" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={15} style={{ color: '#8b5cf6' }} />
                <p className="text-[12px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Supplement Stack</p>
              </div>
              <div className="space-y-2">
                {SUPPLEMENTS.map((sup) => (
                  <div key={sup.id} className="flex items-center gap-3 rounded-[12px] p-2.5 transition-all"
                    style={{ background: 'rgba(248,250,252,0.8)' }}>
                    <span className="text-[16px]">{sup.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-[680]" style={{ color: 'rgb(15,23,42)' }}>{sup.name}</p>
                      <p className="text-[10px]" style={{ color: 'rgb(148,163,184)' }}>{sup.dosage} · {sup.timing}</p>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-[600]"
                      style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1' }}>
                      {sup.benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ── AI MEAL SUGGESTIONS + MEAL CALENDAR ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
          {/* AI Meal Suggestions */}
          <section>
            <h2 className="text-[15px] font-[760] tracking-[-0.01em] mb-4" style={{ color: 'rgb(15,23,42)' }}>
              <span className="flex items-center gap-2">
                <Brain size={16} style={{ color: '#8b5cf6' }} />
                AI Meal Suggestions
              </span>
            </h2>
            <div className="space-y-3">
              {AI_MEALS.map((meal, idx) => (
                <motion.div
                  key={meal.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="rounded-[16px] p-4 transition-all cursor-pointer hover:-translate-y-0.5"
                  style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 1px 8px rgba(15,23,42,0.05)' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: 'rgba(139,92,246,0.10)' }}>
                      <Sparkles size={15} style={{ color: '#8b5cf6' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{meal.name}</p>
                        <div className="text-right">
                          <p className="text-[13px] font-[800]" style={{ color: '#dc2626' }}>{meal.calories}</p>
                          <p className="text-[9px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>kcal</p>
                        </div>
                      </div>
                      <p className="mt-0.5 text-[11px]" style={{ color: 'rgb(148,163,184)' }}>{meal.desc}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-[700]"
                          style={{ background: 'rgba(139,92,246,0.10)', color: '#8b5cf6' }}>
                          {meal.time}
                        </span>
                        <span className="text-[10px] font-[600]" style={{ color: '#dc2626' }}>P {meal.protein}g</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Meal Calendar */}
          <section>
            <h2 className="text-[15px] font-[760] tracking-[-0.01em] mb-4" style={{ color: 'rgb(15,23,42)' }}>
              <span className="flex items-center gap-2">
                <Activity size={16} style={{ color: '#10b981' }} />
                Weekly History
              </span>
            </h2>
            <div className="rounded-[20px] p-5" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
              <div className="space-y-2">
                {MEAL_CALENDAR.map((day, i) => {
                  const isToday = day.date === '2026-05-20';
                  return (
                    <div key={day.date}
                      className={cn(
                        'flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 transition-all',
                        isToday && 'ring-1',
                      )}
                      style={{
                        background: isToday ? 'rgba(220,38,38,0.04)' : 'transparent',
                        boxShadow: isToday ? '0 0 0 1px rgba(220,38,38,0.20)' : undefined,
                      }}
                    >
                      <div className="w-8 text-center">
                        <p className={cn('text-[11px] font-[700]', isToday && 'text-[#dc2626]')}
                          style={{ color: isToday ? '#dc2626' : 'rgb(15,23,42)' }}>
                          {DAY_LABELS[i]}
                        </p>
                        <p className="text-[9px]" style={{ color: 'rgb(148,163,184)' }}>{day.date.split('-')[2]}</p>
                      </div>
                      <div className="flex-1">
                        {day.meals > 0 ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-[650]" style={{ color: 'rgb(15,23,42)' }}>{day.calories} kcal</span>
                              <span className="text-[10px]" style={{ color: 'rgb(148,163,184)' }}>{day.protein}g protein</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(15,23,42,0.06)' }}>
                              <div className="h-full rounded-full"
                                style={{
                                  width: `${(day.calories / calGoal) * 100}%`,
                                  background: day.calories > calGoal ? 'linear-gradient(90deg, #dc2626, #ef4444)' : 'linear-gradient(90deg, #10b981, #22c55e)',
                                }} />
                            </div>
                          </>
                        ) : (
                          <p className="text-[11px]" style={{ color: 'rgb(203,213,225)' }}>No data logged</p>
                        )}
                      </div>
                      <span className="text-[10px] font-[600] rounded-full px-2 py-0.5"
                        style={{
                          background: day.meals > 0 ? 'rgba(16,185,129,0.10)' : 'rgba(15,23,42,0.06)',
                          color: day.meals > 0 ? '#059669' : 'rgb(148,163,184)',
                        }}>
                        {day.meals > 0 ? `${day.meals} meals` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
