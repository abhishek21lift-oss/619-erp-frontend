'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Plus, Search, User, Clock, ChevronRight, Target,
  Activity, Heart, Zap, Brain, FileText, LayoutGrid, List,
  Check, Copy, Edit3, Trash2, Sparkles, ArrowRight, RefreshCw,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { StatusPill } from '@/components/premium/StatusPill';
import { cn } from '@/components/ui/cn';
import { api } from '@/lib/api';

/* ────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────── */
type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core' | 'Cardio';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  muscleGroup: MuscleGroup;
  difficulty: Difficulty;
  description: string;
  image: string;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  goal: string;
  duration: string;
  sessions: number;
  difficulty: Difficulty;
  client: string;
  exercises: number;
  progress: number;
  color: string;
}

interface AISuggestion {
  id: string;
  title: string;
  description: string;
  goal: string;
  intensity: string;
}

/* ────────────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────────────── */
const MUSCLE_GROUPS: { id: MuscleGroup; icon: React.ReactNode; color: string }[] = [
  { id: 'Chest', icon: <Target size={14} />, color: '#dc2626' },
  { id: 'Back', icon: <Activity size={14} />, color: '#6366f1' },
  { id: 'Legs', icon: <Zap size={14} />, color: '#f59e0b' },
  { id: 'Shoulders', icon: <Dumbbell size={14} />, color: '#10b981' },
  { id: 'Arms', icon: <Dumbbell size={14} />, color: '#8b5cf6' },
  { id: 'Core', icon: <Heart size={14} />, color: '#ec4899' },
  { id: 'Cardio', icon: <Activity size={14} />, color: '#0ea5e9' },
];

const AI_SUGGESTIONS: AISuggestion[] = [
  { id: 'ai1', title: 'Progressive Overload Boost', description: 'Increase bench press by 5kg weekly for 4 weeks to break plateau', goal: 'Strength', intensity: 'High' },
  { id: 'ai2', title: 'Metabolic Finisher', description: 'Add 10-minute HIIT finisher to each session for fat loss acceleration', goal: 'Weight Loss', intensity: 'Medium' },
  { id: 'ai3', title: 'Recovery Optimization', description: 'Reduce volume by 20% for 2 weeks to enhance recovery and prevent overtraining', goal: 'Endurance', intensity: 'Low' },
  { id: 'ai4', title: 'Compound Focus', description: 'Replace isolation movements with compound lifts for greater muscle activation', goal: 'Muscle Gain', intensity: 'High' },
];

const GOAL_COLORS: Record<string, string> = {
  'Muscle Gain': '#6366f1',
  'Strength': '#10b981',
  'Weight Loss': '#f59e0b',
  'General Fitness': '#dc2626',
  'Endurance': '#0ea5e9',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Beginner: '#10b981',
  Intermediate: '#f59e0b',
  Advanced: '#dc2626',
};

/* ────────────────────────────────────────────────────────────────────
   LOADING SKELETON
──────────────────────────────────────────────────────────────────── */
function PlansSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[20px] p-5 animate-pulse"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-[10px]" style={{ background: 'var(--border)' }} />
            <div>
              <div className="h-3.5 w-28 rounded" style={{ background: 'var(--border)' }} />
              <div className="h-2.5 w-36 mt-1 rounded" style={{ background: 'var(--border)' }} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-5 w-16 rounded-full" style={{ background: 'var(--border)' }} />
            <div className="h-5 w-20 rounded-full" style={{ background: 'var(--border)' }} />
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full" style={{ background: 'var(--border)' }} />
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   PAGE
──────────────────────────────────────────────────────────────────── */
export default function WorkoutPlansPage() {
  return <Guard><AppShell><WorkoutPlansContent /></AppShell></Guard>;
}

function WorkoutPlansContent() {
  const [activeMuscle, setActiveMuscle] = useState<MuscleGroup | null>(null);
  const [search, setSearch] = useState('');
  const [planSearch, setPlanSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  /* ── API State ── */
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  /* ── Builder State ── */
  const [buildingExercises, setBuildingExercises] = useState<
    { name: string; sets: string; muscle: string; color: string }[]
  >([
    { name: 'Barbell Bench Press', sets: '4×8-12', muscle: 'Chest', color: '#dc2626' },
    { name: 'Incline Dumbbell Press', sets: '3×10-12', muscle: 'Chest', color: '#dc2626' },
    { name: 'Cable Flyes', sets: '3×12-15', muscle: 'Chest', color: '#dc2626' },
  ]);

  const [planName, setPlanName] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setDataLoading(true);
      setDataError('');
      const [exercisesRes, plansRes, trainersRes] = await Promise.all([
        api.workouts.exercises.list().catch(() => []),
        api.workouts.plans.list().catch(() => []),
        api.trainers.list().catch(() => []),
      ]);
      setExercises(
        Array.isArray(exercisesRes)
          ? exercisesRes.map((e: any) => ({
              id: String(e.id ?? ''),
              name: e.name ?? '',
              sets: e.sets ?? 3,
              reps: e.reps ?? '10-12',
              muscleGroup: e.muscle_group ?? e.muscleGroup ?? 'Chest',
              difficulty: e.difficulty ?? 'Beginner',
              description: e.description ?? '',
              image: e.image ?? '🏋️',
            }))
          : [],
      );
      setWorkoutPlans(
        Array.isArray(plansRes)
          ? plansRes.map((p: any) => ({
              id: String(p.id ?? ''),
              name: p.name ?? '',
              description: p.description ?? '',
              goal: p.goal ?? 'General Fitness',
              duration: p.duration ?? '8 weeks',
              sessions: p.sessions ?? p.exercises?.length ?? 0,
              difficulty: p.difficulty ?? 'Beginner',
              client: p.client?.name ?? p.client_name ?? '',
              exercises: p.exercises?.length ?? 0,
              progress: p.progress ?? 0,
              color: p.color ?? '#6366f1',
            }))
          : [],
      );
      if (Array.isArray(trainersRes)) {
        const allClients = (await Promise.all(
          trainersRes.map((t: any) =>
            api.clients.list({ trainer_id: t.id ?? t }).catch(() => [])
          )
        )).flat();
        setClients(
          allClients.length > 0
            ? allClients.map((c: any) => c.name ?? c)
            : [],
        );
      } else {
        setClients([]);
      }
    } catch (err: any) {
      setDataError(err?.message || 'Failed to load data');
      setExercises([]);
      setWorkoutPlans([]);
      setClients([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredExercises = exercises.filter((e) => {
    if (activeMuscle && e.muscleGroup !== activeMuscle) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredPlans = workoutPlans.filter((p) => {
    if (planSearch && !p.name.toLowerCase().includes(planSearch.toLowerCase())) return false;
    return true;
  });

  const handleCreatePlan = () => {
    setBuildingExercises([]);
    setPlanName('');
  };

  const handleSaveDraft = async () => {
    try {
      await api.workouts.plans.create({
        name: planName || 'Untitled Plan',
        exercises: buildingExercises.map((e) => e.name),
        status: 'draft',
      });
      await fetchData();
    } catch {}
  };

  const handleAssignPlan = async () => {
    if (!selectedClient) return;
    try {
      const plan = workoutPlans.length > 0 ? workoutPlans[0] : null;
      await api.workouts.assign({
        client_id: selectedClient,
        workout_plan_id: plan?.id ?? '',
      });
    } catch {}
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-screen-xl px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                  <Dumbbell size={16} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>Workout Plans</h1>
                  <p className="text-[11px] font-[600] uppercase tracking-[0.08em]" style={{ color: 'rgb(148,163,184)' }}>
                    Personal Training / <span style={{ color: '#dc2626' }}>Workout Plans</span>
                  </p>
                </div>
              </div>
            </div>
            <PremiumButton tone="primary" glow icon={<Plus size={14} />} onClick={handleCreatePlan}>
              Create Plan
            </PremiumButton>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
        {dataLoading ? (
          <PlansSkeleton />
        ) : dataError ? (
          <div className="rounded-[20px] p-8 text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[16px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                <RefreshCw size={22} style={{ color: '#dc2626' }} />
              </div>
            </div>
            <h3 className="text-[16px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Failed to load data</h3>
            <p className="mt-1 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>{dataError}</p>
            <PremiumButton tone="primary" glow icon={<RefreshCw size={13} />} onClick={fetchData} className="mt-4">
              Retry
            </PremiumButton>
          </div>
        ) : (
          <>
            {/* ── WORKOUT PLANS GRID ── */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-[760] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>
                  Active Plans
                  <span className="ml-2 text-[11px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>({workoutPlans.length})</span>
                </h2>
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center gap-2 rounded-[10px] px-3 py-1.5"
                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.08)' }}>
                    <Search size={11} style={{ color: 'rgb(148,163,184)' }} />
                    <input value={planSearch} onChange={(e) => setPlanSearch(e.target.value)}
                      placeholder="Search plans…"
                      className="flex-1 bg-transparent text-[11.5px] font-[500] outline-none w-[120px]" style={{ color: 'rgb(15,23,42)' }} />
                  </div>
                  <div className="flex rounded-[8px] overflow-hidden" style={{ border: '1px solid rgba(15,23,42,0.08)' }}>
                    <button onClick={() => setView('grid')}
                      className="flex h-7 w-7 items-center justify-center transition-all"
                      style={{ background: view === 'grid' ? 'rgba(220,38,38,0.10)' : 'transparent', color: view === 'grid' ? '#dc2626' : 'rgb(148,163,184)' }}>
                      <LayoutGrid size={12} />
                    </button>
                    <button onClick={() => setView('list')}
                      className="flex h-7 w-7 items-center justify-center transition-all"
                      style={{ background: view === 'list' ? 'rgba(220,38,38,0.10)' : 'transparent', color: view === 'list' ? '#dc2626' : 'rgb(148,163,184)' }}>
                      <List size={12} />
                    </button>
                  </div>
                </div>
              </div>

              <div className={cn(
                'grid gap-4',
                view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
              )}>
                {filteredPlans.map((plan, idx) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="group relative overflow-hidden rounded-[20px] p-5 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}
                  >
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10"
                      style={{ background: `radial-gradient(circle, ${plan.color}, transparent)` }} />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                              style={{ background: `${plan.color}12` }}>
                              <Dumbbell size={14} style={{ color: plan.color }} />
                            </div>
                            <div>
                              <p className="text-[14px] font-[720] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>{plan.name}</p>
                              <p className="text-[11px] mt-0.5" style={{ color: 'rgb(148,163,184)' }}>{plan.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-[700]"
                          style={{ background: `${GOAL_COLORS[plan.goal] || '#6366f1'}12`, color: GOAL_COLORS[plan.goal] || '#6366f1' }}>
                          <Target size={10} /> {plan.goal}
                        </span>
                        <StatusPill status={plan.difficulty.toLowerCase() as any} className="!text-[10px]" />
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-[600]" style={{ background: 'var(--border)', color: 'rgb(100,116,139)' }}>
                          <Clock size={10} /> {plan.duration}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-[11px]">
                        <span style={{ color: 'rgb(148,163,184)' }}>{plan.sessions} sessions · {plan.exercises} exercises</span>
                        {plan.client && (
                          <span className="flex items-center gap-1 font-[600]" style={{ color: 'rgb(100,116,139)' }}>
                            <User size={10} /> {plan.client}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>Progress</span>
                          <span className="text-[10px] font-[700]" style={{ color: plan.color }}>{plan.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${plan.progress}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                            style={{ background: plan.color }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* ── EXERCISE LIBRARY ── */}
            <section className="mb-10">
              <h2 className="text-[15px] font-[760] tracking-[-0.01em] mb-4" style={{ color: 'rgb(15,23,42)' }}>
                Exercise Library
                <span className="ml-2 text-[11px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>({exercises.length} exercises)</span>
              </h2>

              {/* Muscle Group Tabs */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                <button
                  onClick={() => setActiveMuscle(null)}
                  className="rounded-[10px] px-3 py-1.5 text-[11px] font-[660] transition-all"
                  style={{
                    background: !activeMuscle ? 'rgba(220,38,38,0.10)' : 'var(--bg-subtle)',
                    border: !activeMuscle ? '1.5px solid rgba(220,38,38,0.25)' : '1.5px solid rgba(15,23,42,0.08)',
                    color: !activeMuscle ? '#dc2626' : 'rgb(100,116,139)',
                  }}
                >
                  All
                </button>
                {MUSCLE_GROUPS.map((mg) => (
                  <button
                    key={mg.id}
                    onClick={() => setActiveMuscle(mg.id)}
                    className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11px] font-[660] transition-all"
                    style={{
                      background: activeMuscle === mg.id ? `${mg.color}12` : 'var(--bg-subtle)',
                      border: activeMuscle === mg.id ? `1.5px solid ${mg.color}30` : '1.5px solid rgba(15,23,42,0.08)',
                      color: activeMuscle === mg.id ? mg.color : 'rgb(100,116,139)',
                    }}
                  >
                    {mg.icon} {mg.id}
                  </button>
                ))}
              </div>

              {/* Exercise Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {filteredExercises.map((ex, idx) => (
                  <motion.div
                    key={ex.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group relative rounded-[16px] p-4 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 1px 8px rgba(15,23,42,0.05)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[16px]"
                        style={{ background: `${MUSCLE_GROUPS.find((m) => m.id === ex.muscleGroup)?.color || '#6366f1'}12` }}>
                        {ex.image}
                      </div>
                      <button className="flex h-7 w-7 items-center justify-center rounded-[8px] opacity-0 group-hover:opacity-100 transition-all"
                        style={{ background: 'var(--border)' }}>
                        <Plus size={12} style={{ color: 'rgb(148,163,184)' }} />
                      </button>
                    </div>
                    <p className="mt-3 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{ex.name}</p>
                    <p className="mt-1 text-[11px] leading-snug" style={{ color: 'rgb(148,163,184)' }}>{ex.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]"
                        style={{ background: `${MUSCLE_GROUPS.find((m) => m.id === ex.muscleGroup)?.color || '#6366f1'}12`,
                          color: MUSCLE_GROUPS.find((m) => m.id === ex.muscleGroup)?.color || '#6366f1' }}>
                        {ex.muscleGroup}
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-[600]"
                        style={{ background: 'var(--border)', color: 'rgb(100,116,139)' }}>
                        {ex.sets}×{ex.reps}
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-[600]"
                        style={{ background: `${DIFFICULTY_COLORS[ex.difficulty]}12`, color: DIFFICULTY_COLORS[ex.difficulty] }}>
                        {ex.difficulty}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* ── DRAG & DROP BUILDER SECTION ── */}
            <section className="mb-10">
              <div className="rounded-[22px] p-6"
                style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-[15px] font-[760] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>Workout Builder</h2>
                    <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>Drag to reorder exercises and build your program</p>
                  </div>
                  <PremiumButton tone="primary" size="sm" glow icon={<Sparkles size={12} />}>
                    Generate with AI
                  </PremiumButton>
                </div>

                {/* Plan Name */}
                {buildingExercises.length > 0 && (
                  <div className="mb-4">
                    <input
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="Plan name…"
                      className="w-full rounded-[12px] px-4 py-2.5 text-[13px] font-[600] outline-none"
                      style={{ background: 'var(--bg-subtle)', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)' }}
                    />
                  </div>
                )}

                {/* Builder Drop Zone */}
                <div className="rounded-[16px] p-4 min-h-[200px] border-2 border-dashed transition-all"
                  style={{ borderColor: 'rgba(220,38,38,0.20)', background: 'rgba(248,250,252,0.7)' }}>
                  {buildingExercises.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] mb-3" style={{ background: 'rgba(220,38,38,0.08)' }}>
                        <Dumbbell size={20} style={{ color: '#dc2626' }} />
                      </div>
                      <p className="text-[13px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>Drag exercises here to build your workout</p>
                      <p className="text-[11px] mt-1" style={{ color: 'rgb(203,213,225)' }}>Click + on any exercise above to add it</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {buildingExercises.map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-center gap-3 rounded-[12px] p-3 transition-all"
                          style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.07)' }}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] cursor-grab active:cursor-grabbing"
                            style={{ background: 'var(--border)' }}>
                            <span className="text-[10px] font-[700]" style={{ color: 'rgb(148,163,184)' }}>≡</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[12.5px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{item.name}</p>
                            <p className="text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>{item.sets} · {item.muscle}</p>
                          </div>
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-[700]"
                            style={{ background: `${item.color}12`, color: item.color }}>
                            {item.muscle}
                          </span>
                          <button
                            onClick={() => setBuildingExercises((prev) => prev.filter((_, idx) => idx !== i))}
                            className="flex h-7 w-7 items-center justify-center rounded-[8px] transition hover:bg-red-50"
                            style={{ color: 'rgb(148,163,184)' }}>
                            <Trash2 size={11} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Client Assignment */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>Assign to client:</p>
                    <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}
                      className="rounded-[10px] px-3 py-1.5 text-[12px] font-[500] outline-none"
                      style={{ background: 'var(--bg-subtle)', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)' }}>
                      <option value="">Select client…</option>
                      {clients.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <PremiumButton tone="secondary" size="sm" onClick={handleSaveDraft}>Save as Draft</PremiumButton>
                    <PremiumButton tone="success" size="sm" glow icon={<Check size={12} />} onClick={handleAssignPlan}>
                      Assign Plan
                    </PremiumButton>
                  </div>
                </div>
              </div>
            </section>

            {/* ── AI SUGGESTIONS + PROGRESS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
              {/* AI Suggestions */}
              <section>
                <h2 className="text-[15px] font-[760] tracking-[-0.01em] mb-4" style={{ color: 'rgb(15,23,42)' }}>
                  <span className="flex items-center gap-2">
                    <Brain size={16} style={{ color: '#6366f1' }} />
                    AI Workout Suggestions
                  </span>
                </h2>
                <div className="space-y-3">
                  {AI_SUGGESTIONS.map((sug, idx) => (
                    <motion.div
                      key={sug.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group rounded-[16px] p-4 transition-all cursor-pointer hover:-translate-y-0.5"
                      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 1px 8px rgba(15,23,42,0.05)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                            style={{ background: 'rgba(99,102,241,0.10)' }}>
                            <Sparkles size={15} style={{ color: '#6366f1' }} />
                          </div>
                          <div>
                            <p className="text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{sug.title}</p>
                            <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: 'rgb(148,163,184)' }}>{sug.description}</p>
                          </div>
                        </div>
                        <ArrowRight size={14} className="shrink-0 opacity-0 group-hover:opacity-100 transition-all" style={{ color: '#6366f1' }} />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-[700]"
                          style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1' }}>
                          {sug.goal}
                        </span>
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-[700]"
                          style={{
                            background: sug.intensity === 'High' ? 'rgba(239,68,68,0.10)' : sug.intensity === 'Medium' ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.10)',
                            color: sug.intensity === 'High' ? '#ef4444' : sug.intensity === 'Medium' ? '#d97706' : '#059669',
                          }}>
                          {sug.intensity} Intensity
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Progress Tracking */}
              <section>
                <h2 className="text-[15px] font-[760] tracking-[-0.01em] mb-4" style={{ color: 'rgb(15,23,42)' }}>
                  <span className="flex items-center gap-2">
                    <Activity size={16} style={{ color: '#10b981' }} />
                    Progress Tracking
                  </span>
                </h2>
                <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  {/* Sample metrics */}
                  {[
                    { label: 'Strength Score', value: 78, color: '#6366f1', emoji: '💪' },
                    { label: 'Cardio Endurance', value: 65, color: '#10b981', emoji: '🏃' },
                    { label: 'Flexibility', value: 45, color: '#f59e0b', emoji: '🧘' },
                    { label: 'Consistency', value: 92, color: '#dc2626', emoji: '🔥' },
                  ].map((metric) => (
                    <div key={metric.label} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px]">{metric.emoji}</span>
                          <span className="text-[12px] font-[650]" style={{ color: 'rgb(100,116,139)' }}>{metric.label}</span>
                        </div>
                        <span className="text-[12px] font-[750]" style={{ color: metric.color }}>{metric.value}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${metric.value}%` }}
                          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                          style={{ background: `linear-gradient(90deg, ${metric.color}, ${metric.color}bb)` }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Weekly volume sample chart */}
                  <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[11px] font-[700] uppercase tracking-wider mb-3" style={{ color: 'rgb(148,163,184)' }}>Weekly Volume (kg)</p>
                    <div className="flex items-end gap-2 h-24">
                      {[
                        { day: 'Mon', value: 65 },
                        { day: 'Tue', value: 80 },
                        { day: 'Wed', value: 45 },
                        { day: 'Thu', value: 90 },
                        { day: 'Fri', value: 70 },
                        { day: 'Sat', value: 55 },
                        { day: 'Sun', value: 30 },
                      ].map((d) => (
                        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                          <motion.div
                            className="w-full rounded-[6px]"
                            initial={{ height: 0 }}
                            animate={{ height: `${d.value}%` }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            style={{ background: 'linear-gradient(180deg, #dc2626, #b91c1c)', maxHeight: '100%' }}
                          />
                          <span className="text-[9px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>{d.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trainer Notes */}
                <div className="mt-4 rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={13} style={{ color: '#dc2626' }} />
                    <p className="text-[12px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Trainer Notes</p>
                  </div>
                  <textarea
                    placeholder="Add training notes, observations, or adjustments…"
                    className="w-full rounded-[12px] px-3.5 py-2.5 text-[12.5px] font-[500] outline-none resize-none min-h-[80px]"
                    style={{ background: 'var(--bg-subtle)', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)' }}
                  />
                  <div className="mt-2 flex justify-end">
                    <PremiumButton tone="primary" size="sm">Save Notes</PremiumButton>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
