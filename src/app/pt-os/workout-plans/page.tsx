'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Plus, Search, User, Clock, ChevronRight, Target,
  Activity, Heart, Zap, Brain, FileText, LayoutGrid, List,
  Check, Copy, Edit3, Trash2, Sparkles, ArrowRight, RefreshCw,
  Flame, Trophy, BarChart3, Sun,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { cn } from '@/components/ui/cn';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core' | 'Cardio';
type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

interface Exercise {
  id: string; name: string; sets: number; reps: string;
  muscleGroup: MuscleGroup; difficulty: Difficulty; description: string; image: string;
}

interface WorkoutPlan {
  id: string; name: string; description: string; goal: string;
  duration: string; sessions: number; difficulty: Difficulty;
  client: string; exercises: number; progress: number; color: string;
}

interface AISuggestion {
  id: string; title: string; description: string; goal: string; intensity: string;
}

const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];
const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

const DIFFICULTY_COLORS: Record<Difficulty, { bg: string; color: string }> = {
  Beginner: { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7' },
  Intermediate: { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d' },
  Advanced: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5' },
};

const GROUP_COLORS: Record<MuscleGroup, string> = {
  Chest: '#ef4444', Back: '#8b5cf6', Legs: '#f59e0b',
  Shoulders: '#06b6d4', Arms: '#ec4899', Core: '#10b981', Cardio: '#6366f1',
};

const PLAN_COLORS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'linear-gradient(135deg, #ec4899, #f472b6)',
  'linear-gradient(135deg, #06b6d4, #22d3ee)',
  'linear-gradient(135deg, #ef4444, #f87171)',
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } }
};

const heroVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } }
};

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function WorkoutPlansPage() {
  return <Guard roles={['admin', 'manager', 'trainer']}><AppShell><Inner /></AppShell></Guard>;
}

function Inner() {
  const { toast } = useToast();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [activeMuscle, setActiveMuscle] = useState<MuscleGroup | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [trainers, setTrainers] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderStep, setBuilderStep] = useState(0);
  const [aiTab, setAiTab] = useState<'suggestions' | 'progress'>('suggestions');

  const fetchData = useCallback(async () => {
    setDataLoading(true); setDataError('');
    try {
      const [exRes, plRes, trRes] = await Promise.all([
        api.workouts.exercises.list(),
        api.workouts.plans.list(),
        api.pt.trainers(),
      ]);
      setExercises(Array.isArray((exRes as any)?.data) ? (exRes as any).data : []);
      setPlans(Array.isArray((plRes as any)?.data) ? (plRes as any).data : []);
      setTrainers(Array.isArray((trRes as any)?.data) ? (trRes as any).data.map((t: any) => t.name ?? t) : []);
    } catch (err: any) { setDataError(err?.message || 'Failed to load data'); }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredExercises = exercises.filter((ex) => {
    if (activeMuscle !== 'All' && ex.muscleGroup !== activeMuscle) return false;
    if (searchQuery) return ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f0a1e 0%, #0f172a 50%, #0a0a1a 100%)' }}>
      {/* ── Hero ── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1040 25%, #0f172a 55%, #1e0a2e 80%, #0f0a1e 100%)', padding: '48px 32px 40px', borderRadius: '0 0 40px 40px' }}>
        <motion.div style={{ position: 'absolute', top: -100, right: -40, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)', pointerEvents: 'none' }}
          animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' as const }} />
        <motion.div style={{ position: 'absolute', bottom: -70, left: -30, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.1), transparent 70%)', pointerEvents: 'none' }}
          animate={{ x: [0, -25, 30, 0], y: [0, 25, -15, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' as const }} />
        <motion.div style={{ position: 'absolute', top: '30%', left: '55%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)', pointerEvents: 'none' }}
          animate={{ x: [0, 15, -10, 0], y: [0, -20, 10, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' as const }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <motion.div variants={heroVariants} initial="hidden" animate="visible"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 58, height: 58, borderRadius: 18, background: 'linear-gradient(135deg, #6366f1, #ec4899)', boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}>
              <Dumbbell size={26} color="#fff" />
            </motion.div>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #e0e7ff, #c4b5fd, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Workout Plans</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.45)' }}>Build and manage personalized training programs</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2 }}>
              <button onClick={() => setView('grid')}
                style={{ padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === 'grid' ? 'rgba(99,102,241,0.2)' : 'transparent', color: view === 'grid' ? '#a5b4fc' : 'rgba(255,255,255,0.3)' }}>
                <LayoutGrid size={15} />
              </button>
              <button onClick={() => setView('list')}
                style={{ padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === 'list' ? 'rgba(99,102,241,0.2)' : 'transparent', color: view === 'list' ? '#a5b4fc' : 'rgba(255,255,255,0.3)' }}>
                <List size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {/* ── Quick Stats ── */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Plans', value: plans.length, icon: <FileText size={15} />, from: '#6366f1', to: '#4f46e5' },
            { label: 'Exercises', value: exercises.length, icon: <Activity size={15} />, from: '#10b981', to: '#059669' },
            { label: 'Active Clients', value: trainers.length, icon: <User size={15} />, from: '#f59e0b', to: '#d97706' },
            { label: 'Completion Rate', value: plans.length ? `${Math.round(plans.reduce((s, p) => s + p.progress, 0) / plans.length)}%` : '—', icon: <Trophy size={15} />, from: '#ec4899', to: '#db2777' },
          ].map((s, i) => (
            <motion.div key={s.label} variants={itemVariants}
              style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '18px 18px', background: `linear-gradient(135deg, ${s.from}18, rgba(30,27,75,0.6))`, border: '1px solid rgba(255,255,255,0.08)', cursor: 'default', transition: 'transform 0.3s' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ position: 'absolute', top: -15, right: -15, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${s.from}22, transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{s.icon}</div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>{s.value}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Section Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 3 }}>
          {[
            { key: 'plans', label: 'Active Plans', count: plans.length, color: '#6366f1' },
            { key: 'library', label: 'Exercise Library', count: filteredExercises.length, color: '#10b981' },
            { key: 'builder', label: 'Plan Builder', color: '#f59e0b' },
            { key: 'ai', label: 'AI Suggestions', color: '#ec4899' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => { if (tab.key === 'builder') { setBuilderOpen(true); setBuilderStep(0); } else setBuilderOpen(false); }}
              style={{
                padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s',
                background: !builderOpen && ((tab.key === 'plans') || (tab.key === 'library' && !builderOpen)) ? `linear-gradient(135deg, ${tab.color}22, ${tab.color}11)` : 'transparent',
                color: !builderOpen ? tab.color : 'rgba(255,255,255,0.3)',
              }}>
              {tab.label}{tab.count !== undefined ? <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: `${tab.color}22`, color: tab.color }}>{tab.count}</span> : null}
            </button>
          ))}
        </div>

        {/* ── Plan Cards ── */}
        <div style={{ marginBottom: 28 }}>
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: 14 }}>
            {plans.slice(0, 4).map((plan, i) => (
              <motion.div key={plan.id} variants={itemVariants}
                style={{ borderRadius: 18, padding: view === 'grid' ? 20 : '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)', display: view === 'list' ? 'flex' : 'block', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(99,102,241,0.12)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                <div style={{ width: view === 'grid' ? '100%' : 44, height: view === 'grid' ? 4 : 44, borderRadius: view === 'grid' ? 20 : 12, background: PLAN_COLORS[i % PLAN_COLORS.length], marginBottom: view === 'grid' ? 14 : 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{plan.name}</h3>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: DIFFICULTY_COLORS[plan.difficulty]?.bg || 'rgba(148,163,184,0.15)', color: DIFFICULTY_COLORS[plan.difficulty]?.color || '#cbd5e1' }}>{plan.difficulty}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{plan.description}</p>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Target size={12} /> {plan.goal}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {plan.duration}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={12} /> {plan.exercises} exercises</span>
                  </div>
                  {view === 'grid' && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${plan.progress}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${PLAN_COLORS[i % PLAN_COLORS.length]})` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                        <span>Progress</span>
                        <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{plan.progress}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ── Exercise Library ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setActiveMuscle('All')}
              style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', background: activeMuscle === 'All' ? 'rgba(99,102,241,0.2)' : 'transparent', color: activeMuscle === 'All' ? '#a5b4fc' : 'rgba(255,255,255,0.4)', borderColor: activeMuscle === 'All' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)' }}>
              All
            </button>
            {MUSCLE_GROUPS.map((mg) => (
              <button key={mg} onClick={() => setActiveMuscle(mg)}
                style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', background: activeMuscle === mg ? `${GROUP_COLORS[mg]}22` : 'transparent', color: activeMuscle === mg ? GROUP_COLORS[mg] : 'rgba(255,255,255,0.4)', borderColor: activeMuscle === mg ? `${GROUP_COLORS[mg]}44` : 'rgba(255,255,255,0.08)' }}>
                {mg}
              </button>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Search size={13} color="rgba(255,255,255,0.3)" />
              <input placeholder="Search exercises…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, outline: 'none', width: 180 }} />
            </div>
          </div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {filteredExercises.slice(0, 12).map((ex, i) => (
              <motion.div key={ex.id} variants={itemVariants}
                style={{ borderRadius: 14, padding: 16, background: 'rgba(255,255,255,0.02)', border: `1px solid ${GROUP_COLORS[ex.muscleGroup]}15`, cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${GROUP_COLORS[ex.muscleGroup]}08`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `${GROUP_COLORS[ex.muscleGroup]}30`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `${GROUP_COLORS[ex.muscleGroup]}15`; }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${GROUP_COLORS[ex.muscleGroup]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, color: GROUP_COLORS[ex.muscleGroup] }}>
                  <Dumbbell size={14} />
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{ex.name}</h4>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 8px' }}>{ex.muscleGroup} · {ex.difficulty}</p>
                <div style={{ display: 'flex', gap: 6, fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>
                  <span>{ex.sets} sets</span>
                  <span>·</span>
                  <span>{ex.reps}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ── AI Section ── */}
        <div style={{ borderRadius: 20, padding: 22, background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(236,72,153,0.04))', border: '1px solid rgba(139,92,246,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={17} color="#c4b5fd" />
            </div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>AI-Powered Suggestions</h3>
            <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 9.5, fontWeight: 700, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', letterSpacing: '0.05em' }}>BETA</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { title: 'Strength Builder', description: 'Progressive overload program for muscle gain', goal: 'Muscle Gain', intensity: 'High', color: '#ef4444' },
              { title: 'Fat Loss Circuit', description: 'High-intensity circuit training for fat burn', goal: 'Weight Loss', intensity: 'High', color: '#f59e0b' },
              { title: 'Endurance Plus', description: 'Build stamina with mixed cardio & strength', goal: 'Endurance', intensity: 'Medium', color: '#06b6d4' },
              { title: 'Flexibility Flow', description: 'Yoga-inspired mobility and recovery routine', goal: 'Flexibility', intensity: 'Low', color: '#10b981' },
            ].map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                style={{ borderRadius: 14, padding: 16, background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.color}15`, cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${s.color}08`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                    <Zap size={13} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{s.goal}</span>
                  <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 10, fontSize: 9.5, fontWeight: 700, background: `${s.color}18`, color: s.color }}>{s.intensity}</span>
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{s.title}</h4>
                <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}