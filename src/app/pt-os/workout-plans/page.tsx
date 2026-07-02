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
  Beginner: { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  Intermediate: { bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
  Advanced: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
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
  const [activeTab, setActiveTab] = useState<'plans' | 'library' | 'builder' | 'ai'>('plans');
  const [builderStep, setBuilderStep] = useState(0);

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
    <div>
      {/* ── Hero ── */}
      <div style={{ padding: '32px 32px 28px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <motion.div variants={heroVariants} initial="hidden" animate="visible"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #6366f1, #ec4899)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
              <Dumbbell size={22} color="#fff" />
            </motion.div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>Workout Plans</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#6b7280' }}>Build and manage personalized training programs</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 2 }}>
              <button onClick={() => setView('grid')}
                style={{ padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === 'grid' ? '#fff' : 'transparent', color: view === 'grid' ? '#6366f1' : '#9ca3af', boxShadow: view === 'grid' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
                <LayoutGrid size={15} />
              </button>
              <button onClick={() => setView('list')}
                style={{ padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === 'list' ? '#fff' : 'transparent', color: view === 'list' ? '#6366f1' : '#9ca3af', boxShadow: view === 'list' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
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
              style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '18px 18px', background: '#fff', border: '1px solid #e5e7eb', cursor: 'default', transition: 'transform 0.3s' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ position: 'absolute', top: -15, right: -15, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${s.from}15, transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#9ca3af' }}>{s.label}</span>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `${s.from}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.from }}>{s.icon}</div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>{s.value}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Section Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F3F4F6', borderRadius: 12, padding: 3 }}>
          {[
            { key: 'plans', label: 'Active Plans', count: plans.length, color: '#6366f1' },
            { key: 'library', label: 'Exercise Library', count: filteredExercises.length, color: '#10b981' },
            { key: 'builder', label: 'Plan Builder', color: '#f59e0b' },
            { key: 'ai', label: 'AI Suggestions', color: '#ec4899' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key as typeof activeTab); if (tab.key === 'builder') setBuilderStep(0); }}
              style={{
                padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s',
                background: activeTab === tab.key ? '#fff' : 'transparent',
                color: activeTab === tab.key ? tab.color : '#9ca3af',
                boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              {tab.label}{tab.count !== undefined ? <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: `${tab.color}18`, color: tab.color }}>{tab.count}</span> : null}
            </button>
          ))}
        </div>

        {/* ── Plan Cards ── */}
        {activeTab === 'plans' && <div style={{ marginBottom: 28 }}>
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: 14 }}>
            {plans.slice(0, 4).map((plan, i) => (
              <motion.div key={plan.id} variants={itemVariants}
                style={{ borderRadius: 18, padding: view === 'grid' ? 20 : '14px 18px', background: '#fff', border: '1px solid #e5e7eb', display: view === 'list' ? 'flex' : 'block', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
                <div style={{ width: view === 'grid' ? '100%' : 44, height: view === 'grid' ? 4 : 44, borderRadius: view === 'grid' ? 20 : 12, background: PLAN_COLORS[i % PLAN_COLORS.length], marginBottom: view === 'grid' ? 14 : 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{plan.name}</h3>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: DIFFICULTY_COLORS[plan.difficulty]?.bg || 'rgba(148,163,184,0.12)', color: DIFFICULTY_COLORS[plan.difficulty]?.color || '#6b7280' }}>{plan.difficulty}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{plan.description}</p>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#9ca3af' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Target size={12} /> {plan.goal}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {plan.duration}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={12} /> {plan.exercises} exercises</span>
                  </div>
                  {view === 'grid' && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ height: 4, borderRadius: 2, background: '#F3F4F6', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${plan.progress}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${PLAN_COLORS[i % PLAN_COLORS.length]})` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#9ca3af' }}>
                        <span>Progress</span>
                        <span style={{ fontWeight: 700, color: '#6b7280' }}>{plan.progress}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>}

        {/* ── Exercise Library ── */}
        {activeTab === 'library' && <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setActiveMuscle('All')}
              style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', background: activeMuscle === 'All' ? 'rgba(99,102,241,0.1)' : '#fff', color: activeMuscle === 'All' ? '#6366f1' : '#6b7280', borderColor: activeMuscle === 'All' ? 'rgba(99,102,241,0.3)' : '#e5e7eb' }}>
              All
            </button>
            {MUSCLE_GROUPS.map((mg) => (
              <button key={mg} onClick={() => setActiveMuscle(mg)}
                style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', background: activeMuscle === mg ? `${GROUP_COLORS[mg]}12` : '#fff', color: activeMuscle === mg ? GROUP_COLORS[mg] : '#6b7280', borderColor: activeMuscle === mg ? `${GROUP_COLORS[mg]}40` : '#e5e7eb' }}>
                {mg}
              </button>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', background: '#F9FAFB', borderRadius: 8, padding: '4px 12px', border: '1px solid #e5e7eb' }}>
              <Search size={13} color="#9ca3af" />
              <input placeholder="Search exercises…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#111827', fontSize: 12, fontWeight: 500, outline: 'none', width: 180 }} />
            </div>
          </div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {filteredExercises.slice(0, 12).map((ex, i) => (
              <motion.div key={ex.id} variants={itemVariants}
                style={{ borderRadius: 14, padding: 16, background: '#fff', border: `1px solid ${GROUP_COLORS[ex.muscleGroup]}20`, cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${GROUP_COLORS[ex.muscleGroup]}08`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `${GROUP_COLORS[ex.muscleGroup]}40`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `${GROUP_COLORS[ex.muscleGroup]}20`; }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${GROUP_COLORS[ex.muscleGroup]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, color: GROUP_COLORS[ex.muscleGroup] }}>
                  <Dumbbell size={14} />
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{ex.name}</h4>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 8px' }}>{ex.muscleGroup} · {ex.difficulty}</p>
                <div style={{ display: 'flex', gap: 6, fontSize: 10.5, color: '#9ca3af' }}>
                  <span>{ex.sets} sets</span>
                  <span>·</span>
                  <span>{ex.reps}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>}

        {/* ── Plan Builder ── */}
        {activeTab === 'builder' && <div style={{ marginBottom: 28, borderRadius: 20, padding: 28, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Dumbbell size={17} color="#d97706" />
            </div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Plan Builder</h3>
          </div>
          {[
            { step: 0, label: 'Choose Client', icon: <User size={16} />, desc: 'Select the client this plan is for' },
            { step: 1, label: 'Set Goal & Duration', icon: <Target size={16} />, desc: 'Define fitness goal and program length' },
            { step: 2, label: 'Add Exercises', icon: <Dumbbell size={16} />, desc: 'Pick exercises from the library' },
            { step: 3, label: 'Review & Save', icon: <Check size={16} />, desc: 'Review and publish the plan' },
          ].map((s) => (
            <div key={s.step} onClick={() => setBuilderStep(s.step)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', marginBottom: 8, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', background: builderStep === s.step ? 'rgba(245,158,11,0.06)' : '#F9FAFB', border: `1px solid ${builderStep === s.step ? 'rgba(245,158,11,0.25)' : '#e5e7eb'}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: builderStep === s.step ? 'rgba(245,158,11,0.15)' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: builderStep === s.step ? '#d97706' : '#9ca3af' }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: builderStep === s.step ? '#111827' : '#374151' }}>Step {s.step + 1}: {s.label}</div>
                <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>{s.desc}</div>
              </div>
              {builderStep === s.step && <ChevronRight size={16} color="#d97706" style={{ marginLeft: 'auto' }} />}
            </div>
          ))}
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <PremiumButton onClick={() => { toast.info('Select a client first to start building a plan.'); }} style={{ fontSize: 12, padding: '8px 20px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Start Building
            </PremiumButton>
          </div>
        </div>}

        {/* ── AI Section ── */}
        {activeTab === 'ai' && <div style={{ borderRadius: 20, padding: 22, background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(236,72,153,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={17} color="#6366f1" />
            </div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>AI-Powered Suggestions</h3>
            <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 9.5, fontWeight: 700, background: 'rgba(99,102,241,0.1)', color: '#6366f1', letterSpacing: '0.05em' }}>BETA</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { title: 'Strength Builder', description: 'Progressive overload program for muscle gain', goal: 'Muscle Gain', intensity: 'High', color: '#ef4444' },
              { title: 'Fat Loss Circuit', description: 'High-intensity circuit training for fat burn', goal: 'Weight Loss', intensity: 'High', color: '#f59e0b' },
              { title: 'Endurance Plus', description: 'Build stamina with mixed cardio & strength', goal: 'Endurance', intensity: 'Medium', color: '#06b6d4' },
              { title: 'Flexibility Flow', description: 'Yoga-inspired mobility and recovery routine', goal: 'Flexibility', intensity: 'Low', color: '#10b981' },
            ].map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                style={{ borderRadius: 14, padding: 16, background: '#fff', border: `1px solid ${s.color}20`, cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${s.color}06`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                    <Zap size={13} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{s.goal}</span>
                  <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 10, fontSize: 9.5, fontWeight: 700, background: `${s.color}15`, color: s.color }}>{s.intensity}</span>
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#111827' }}>{s.title}</h4>
                <p style={{ margin: 0, fontSize: 11.5, color: '#6b7280' }}>{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>}
      </div>
    </div>
  );
}
