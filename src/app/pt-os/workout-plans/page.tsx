'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Plus, Search, User, Clock, Target,
  Activity, FileText, LayoutGrid, List, Check,
  Trophy, Sparkles, ChevronRight, X, ShieldAlert, Loader2, Trash2,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { api } from '@/lib/api';
import type { ParqForm, WorkoutPlan, LibraryExercise } from '@/lib/api';
import { ApiError } from '@/lib/http';
import { useToast } from '@/lib/toast';
import { SpotlightCard } from '@/components/fitness/SpotlightCard';
import { AnimatedCounter } from '@/components/fitness/AnimatedCounter';
import { WorkoutPlanCard } from '@/components/fitness/WorkoutPlanCard';
import { ExerciseCard } from '@/components/fitness/ExerciseCard';
import { AiCoachPanel } from '@/components/fitness/AiCoachPanel';
import { ExercisePicker, type PickedExercise } from '@/components/pt-os/workout-log/ExercisePicker';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface ClientOption { id: string; name: string; }
interface BuilderExercise {
  exercise_id: string; name: string; day_of_week: number; sets: number; reps: number; rest_seconds: number;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const GOALS: Array<{ value: string; label: string; color: string }> = [
  { value: 'muscle_gain', label: 'Muscle Gain', color: '#6366f1' },
  { value: 'weight_loss', label: 'Weight Loss', color: '#10b981' },
  { value: 'endurance', label: 'Endurance', color: '#ec4899' },
  { value: 'general_fitness', label: 'General Fitness', color: '#8b5cf6' },
  { value: 'recovery', label: 'Recovery', color: '#06b6d4' },
];

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
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
};

export default function WorkoutPlansPage() {
  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <AppShell>
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={22} className="animate-spin" /></div>}>
          <Inner />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function Inner() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetClientId = searchParams.get('client_id');

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [activeBodyPart, setActiveBodyPart] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<LibraryExercise[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [assignPlan, setAssignPlan] = useState<WorkoutPlan | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'library' | 'builder' | 'ai'>('plans');
  const [builderStep, setBuilderStep] = useState(0);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // ── Plan Builder state ──
  const [builderClientSearch, setBuilderClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [planName, setPlanName] = useState('');
  const [planGoal, setPlanGoal] = useState(GOALS[0].value);
  const [planDifficulty] = useState<Difficulty>('intermediate');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [builderExercises, setBuilderExercises] = useState<BuilderExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDay, setPickerDay] = useState(1);
  const [builderSaving, setBuilderSaving] = useState(false);

  const resetBuilder = useCallback(() => {
    setBuilderStep(0);
    setBuilderClientSearch('');
    setSelectedClient(null);
    setPlanName('');
    setPlanGoal(GOALS[0].value);
    setDurationWeeks(4);
    setSessionsPerWeek(3);
    setBuilderExercises([]);
  }, []);

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [exRes, metaRes, plRes, clRes] = await Promise.all([
        api.exercises.list(),
        api.exercises.meta(),
        api.workouts.plans.list(presetClientId ? { client_id: presetClientId } : undefined),
        api.pt.clients(),
      ]);
      setExercises(Array.isArray(exRes) ? exRes : []);
      setBodyParts(metaRes.body_parts || []);
      setPlans(Array.isArray(plRes) ? plRes : []);
      const clientArr = Array.isArray(clRes?.data) ? clRes.data : [];
      setClients((clientArr as Record<string, unknown>[]).map((c) => ({ id: String(c.id), name: String(c.name ?? '') })));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
    } finally { setDataLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pre-select the client the trainer arrived from (e.g. client profile
  // Quick Action) once the client list has loaded.
  useEffect(() => {
    if (!presetClientId || selectedClient || clients.length === 0) return;
    const match = clients.find((c) => c.id === presetClientId);
    if (match) setSelectedClient(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetClientId, clients]);

  /** Pre-check the PAR-Q + Informed Consent workout gate before assigning a
   *  plan. UX signal only — the backend independently enforces the gate —
   *  but it turns a raw 403 into a clear message with a direct action link. */
  const assignPlanToClient = useCallback(async (plan: WorkoutPlan, client: ClientOption): Promise<boolean> => {
    try {
      const listRes = await api.progress.parqForms.list({ client_id: client.id });
      const forms: ParqForm[] = listRes?.data ?? [];
      if (forms.length === 0) {
        toast.error(`${client.name} has no PAR-Q screening on file — it must be completed before a workout can be assigned.`, {
          duration: 0,
          action: { label: 'Start PAR-Q', onClick: () => router.push(`/pt-os/parq?client_id=${client.id}`) },
        });
        return false;
      }
      const latest = [...forms].sort((a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')))[0];
      const gate = await api.progress.parqForms.gateStatus(String(latest.id));
      if (gate.workout_gate_status !== 'cleared') {
        toast.error(`${client.name}'s PAR-Q risk is ${gate.risk_level.toUpperCase()} — medical clearance is required before a workout can be assigned.`, {
          duration: 0,
          action: { label: 'Review PAR-Q', onClick: () => router.push(`/pt-os/parq?client_id=${client.id}`) },
        });
        return false;
      }
      await api.workouts.assign({ workout_plan_id: plan.id, client_id: client.id });
      toast.success(`Assigned "${plan.name}" to ${client.name}.`);
      return true;
    } catch (err: unknown) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === 'CONSENT_REQUIRED') {
        toast.error(`${client.name} needs a completed Informed Consent before a workout can be assigned.`, {
          duration: 0,
          action: { label: 'Review Consent', onClick: () => router.push(`/pt-os/informed-consent?client_id=${client.id}`) },
        });
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to assign workout plan.');
      }
      return false;
    }
  }, [toast, router]);

  const handleAssignFromModal = useCallback(async (client: ClientOption) => {
    if (!assignPlan) return;
    const ok = await assignPlanToClient(assignPlan, client);
    if (ok) { setAssignPlan(null); fetchData(); }
  }, [assignPlan, assignPlanToClient, fetchData]);

  const handleDeletePlan = useCallback(async (plan: WorkoutPlan) => {
    if (!window.confirm(`Delete "${plan.name}"? This cannot be undone.`)) return;
    try {
      await api.workouts.plans.delete(plan.id);
      toast.success('Plan deleted.');
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not delete plan.');
    }
  }, [toast, fetchData]);

  const handlePickExercise = (ex: PickedExercise) => {
    if (!ex.id) return;
    setBuilderExercises((list) => [...list, { exercise_id: ex.id, name: ex.name, day_of_week: pickerDay, sets: 3, reps: 12, rest_seconds: 60 }]);
  };

  const updateBuilderExercise = (index: number, field: 'sets' | 'reps' | 'rest_seconds', value: number) => {
    setBuilderExercises((list) => list.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)));
  };
  const removeBuilderExercise = (index: number) => setBuilderExercises((list) => list.filter((_, i) => i !== index));

  const handleSaveBuilderPlan = async () => {
    if (!selectedClient) { toast.error('Select a client first.'); setBuilderStep(0); return; }
    if (!planName.trim()) { toast.error('Enter a plan name.'); setBuilderStep(1); return; }
    if (builderExercises.length === 0) { toast.error('Add at least one exercise.'); setBuilderStep(2); return; }

    setBuilderSaving(true);
    try {
      const { plan: createdPlan } = await api.workouts.plans.create({
        name: planName.trim(),
        goal: planGoal,
        difficulty: planDifficulty,
        duration_weeks: durationWeeks,
        sessions_per_week: sessionsPerWeek,
        exercises: builderExercises.map((ex, i) => ({
          exercise_id: ex.exercise_id, day_of_week: ex.day_of_week, sort_order: i,
          sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds,
        })),
      });
      await assignPlanToClient(createdPlan, selectedClient);
      resetBuilder();
      setActiveTab('plans');
      fetchData();
      router.push(`/pt-os/workout-plans/${createdPlan.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not create plan.');
    } finally {
      setBuilderSaving(false);
    }
  };

  const filteredExercises = exercises.filter((ex) => {
    if (activeBodyPart !== 'All' && ex.body_part !== activeBodyPart) return false;
    if (searchQuery) return ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  const filteredBuilderClients = clients.filter((c) => c.name.toLowerCase().includes(builderClientSearch.toLowerCase()));
  const builderExercisesByDay = new Map<number, Array<BuilderExercise & { index: number }>>();
  builderExercises.forEach((ex, index) => {
    if (!builderExercisesByDay.has(ex.day_of_week)) builderExercisesByDay.set(ex.day_of_week, []);
    builderExercisesByDay.get(ex.day_of_week)!.push({ ...ex, index });
  });

  const avgProgress = plans.length
    ? Math.round(plans.reduce((s, p) => s + (p.progress || 0), 0) / plans.length)
    : 0;

  return (
    <div style={{ minHeight: '100%', position: 'relative' }}>
      {/* ── Hero ── */}
      <div style={{ padding: '28px 32px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <m.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #6366f1, #ec4899)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)', flexShrink: 0 }}
            >
              <Dumbbell size={22} color="#fff" />
            </m.div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Workout Plans</h1>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Build and manage personalized training programs</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: 9, padding: 3, gap: 2 }}>
              {(['grid', 'list'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: '6px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'all 0.18s', background: view === v ? 'var(--bg-card)' : 'transparent', color: view === v ? '#6366f1' : 'var(--text-muted)', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  {v === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
                </button>
              ))}
            </div>
            <Button variant="primary" size="sm" onClick={() => { resetBuilder(); setActiveTab('builder'); }}>
              <Plus size={14} style={{ marginRight: 5 }} />New Plan
            </Button>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <m.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Total Plans', value: plans.length, icon: <FileText size={14} />, color: '#6366f1', spotColor: 'rgba(99,102,241,0.12)' },
            { label: 'Exercises', value: exercises.length, icon: <Activity size={14} />, color: '#10b981', spotColor: 'rgba(16,185,129,0.12)' },
            { label: 'Clients', value: clients.length, icon: <User size={14} />, color: '#f59e0b', spotColor: 'rgba(245,158,11,0.12)' },
            { label: 'Avg Completion', value: avgProgress, icon: <Trophy size={14} />, color: '#ec4899', spotColor: 'rgba(236,72,153,0.12)', suffix: '%' },
          ].map((s) => (
            <m.div key={s.label} variants={itemVariants}>
              <SpotlightCard spotlightColor={s.spotColor} style={{ padding: '16px 18px', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-disabled)' }}>{s.label}</span>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {dataLoading ? '—' : <AnimatedCounter value={s.value} suffix={s.suffix} />}
                </div>
              </SpotlightCard>
            </m.div>
          ))}
        </m.div>
      </div>

      <div style={{ padding: '20px 32px 60px', maxWidth: 1400, margin: '0 auto' }}>
        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 20, background: 'var(--bg-subtle)', borderRadius: 11, padding: 3 }}>
          {[
            { key: 'plans', label: 'Active Plans', count: plans.length, color: '#6366f1' },
            { key: 'library', label: 'Exercise Library', count: filteredExercises.length, color: '#10b981' },
            { key: 'builder', label: 'Plan Builder', color: '#f59e0b' },
            { key: 'ai', label: 'AI Suggestions', color: '#ec4899' },
          ].map((tab) => (
            <button key={tab.key}
              onClick={() => { setActiveTab(tab.key as typeof activeTab); if (tab.key === 'builder' && builderExercises.length === 0 && !selectedClient) setBuilderStep(0); }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
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
          {/* ── Plans Tab ── */}
          {activeTab === 'plans' && (
            <m.div key="plans" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {dataLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: 14 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ height: 180, borderRadius: 18, background: 'var(--bg-subtle)', animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.6 }} />
                  ))}
                </div>
              ) : plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <Dumbbell size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>No workout plans yet. Create your first plan to get started.</p>
                </div>
              ) : (
                <m.div variants={containerVariants} initial="hidden" animate="visible"
                  style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: 14 }}>
                  {plans.map((plan, i) => (
                    <m.div key={plan.id} variants={itemVariants}>
                      <WorkoutPlanCard
                        id={plan.id}
                        name={plan.name}
                        description={plan.description ?? undefined}
                        goal={plan.goal.replace('_', ' ')}
                        difficulty={plan.difficulty.charAt(0).toUpperCase() + plan.difficulty.slice(1)}
                        duration={`${plan.sessions_per_week}x/wk · ${plan.duration_weeks}wk`}
                        exerciseCount={plan.exercise_count}
                        progress={plan.progress}
                        color={PLAN_COLORS[i % PLAN_COLORS.length]}
                        compact={view === 'list'}
                        onAssign={() => setAssignPlan(plan)}
                        onEdit={() => router.push(`/pt-os/workout-plans/${plan.id}`)}
                        onDelete={() => handleDeletePlan(plan)}
                      />
                    </m.div>
                  ))}
                </m.div>
              )}
            </m.div>
          )}

          {/* ── Library Tab ── */}
          {activeTab === 'library' && (
            <m.div key="library" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {/* Filter bar */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                {(['All', ...bodyParts.slice(0, 10)]).map((bp) => (
                  <button key={bp}
                    onClick={() => setActiveBodyPart(bp)}
                    style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all 0.18s', background: activeBodyPart === bp ? 'rgba(99,102,241,0.1)' : 'transparent', color: activeBodyPart === bp ? '#6366f1' : 'var(--text-muted)', borderColor: activeBodyPart === bp ? 'rgba(99,102,241,0.3)' : 'var(--border)' }}>
                    {bp}
                  </button>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-subtle)', borderRadius: 8, padding: '5px 12px', border: '1px solid var(--border)' }}>
                  <Search size={13} color="var(--text-disabled)" />
                  <input placeholder="Search exercises…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 12, fontWeight: 500, outline: 'none', width: 180 }} />
                  {searchQuery && <button onClick={() => setSearchQuery('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 0, display: 'flex' }}><X size={12} /></button>}
                </div>
              </div>

              {dataLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{ height: 220, borderRadius: 18, background: 'var(--bg-subtle)', opacity: 0.6 }} />
                  ))}
                </div>
              ) : (
                <m.div variants={containerVariants} initial="hidden" animate="visible"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {filteredExercises.slice(0, 24).map((ex) => (
                    <m.div key={ex.id} variants={itemVariants}>
                      <ExerciseCard
                        id={ex.id}
                        name={ex.name}
                        muscleGroup={ex.muscle_group}
                        equipment={ex.equipment ?? undefined}
                        difficulty={ex.difficulty}
                        gifUrl={ex.gif_url ?? undefined}
                        setsDefault={ex.sets_default ?? undefined}
                        repsDefault={ex.reps_default ?? undefined}
                        restSeconds={ex.rest_seconds ?? undefined}
                      />
                    </m.div>
                  ))}
                  {filteredExercises.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                      No exercises found matching your filters.
                    </div>
                  )}
                </m.div>
              )}
            </m.div>
          )}

          {/* ── Builder Tab ── */}
          {activeTab === 'builder' && (
            <m.div key="builder" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ maxWidth: 640, margin: '0 auto' }}>
                {/* Step progress */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 28, position: 'relative' }}>
                  {[0, 1, 2, 3].map((step) => (
                    <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      <div onClick={() => setBuilderStep(step)}
                        style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1, fontWeight: 700, fontSize: 13, transition: 'all 0.2s', background: builderStep >= step ? '#6366f1' : 'var(--bg-subtle)', color: builderStep >= step ? '#fff' : 'var(--text-muted)', border: builderStep >= step ? 'none' : '2px solid var(--border)' }}>
                        {builderStep > step ? <Check size={14} /> : step + 1}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: builderStep >= step ? '#6366f1' : 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                        {['Client', 'Details', 'Exercises', 'Review'][step]}
                      </span>
                      {step < 3 && <div style={{ position: 'absolute', top: 16, left: '50%', right: '-50%', height: 2, background: builderStep > step ? '#6366f1' : 'var(--border)', zIndex: 0 }} />}
                    </div>
                  ))}
                </div>

                {/* Step content */}
                <div style={{ borderRadius: 18, padding: 28, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {builderStep === 0 && (
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Choose a Client</h3>
                      <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-muted)' }}>Select the client this plan is for.</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-subtle)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)', marginBottom: 16 }}>
                        <Search size={15} color="var(--text-disabled)" />
                        <input placeholder="Search clients…" value={builderClientSearch} onChange={(e) => setBuilderClientSearch(e.target.value)}
                          style={{ background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', flex: 1, fontFamily: 'inherit' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxHeight: 260, overflowY: 'auto' }}>
                        {filteredBuilderClients.slice(0, 40).map((c) => (
                          <button key={c.id} onClick={() => { setSelectedClient(c); setBuilderStep(1); }}
                            style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${selectedClient?.id === c.id ? '#6366f1' : 'var(--border)'}`, background: selectedClient?.id === c.id ? 'rgba(99,102,241,0.1)' : 'var(--bg-subtle)', color: selectedClient?.id === c.id ? '#6366f1' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.18s' }}>
                            <User size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />{c.name}
                          </button>
                        ))}
                        {filteredBuilderClients.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--text-disabled)' }}>No clients found.</p>}
                      </div>
                    </div>
                  )}
                  {builderStep === 1 && (
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Plan Details</h3>
                      <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-muted)' }}>Name the plan and set its goal and schedule.</p>

                      <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Plan Name</label>
                        <input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. Push Pull Legs" style={inputStyle} />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Goal</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {GOALS.map((g) => (
                            <button key={g.value} onClick={() => setPlanGoal(g.value)}
                              style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${planGoal === g.value ? g.color : 'var(--border)'}`, background: planGoal === g.value ? `${g.color}12` : 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.18s' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />{g.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                        <div>
                          <label style={labelStyle}>Duration (weeks)</label>
                          <input type="number" min={1} max={52} value={durationWeeks} onChange={(e) => setDurationWeeks(Math.max(1, Number(e.target.value) || 4))} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Sessions / week</label>
                          <input type="number" min={1} max={7} value={sessionsPerWeek} onChange={(e) => setSessionsPerWeek(Math.max(1, Number(e.target.value) || 3))} style={inputStyle} />
                        </div>
                      </div>

                      <button onClick={() => { if (!planName.trim()) { toast.error('Enter a plan name.'); return; } setBuilderStep(2); }}
                        style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                        Continue <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                      </button>
                    </div>
                  )}
                  {builderStep === 2 && (
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Add Exercises</h3>
                      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>Assign exercises from the library to each training day.</p>

                      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {WEEKDAYS.map((day, i) => (
                          <div key={day} style={{ padding: 12, borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{day}</span>
                              <button onClick={() => { setPickerDay(i + 1); setPickerOpen(true); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: '#6366f1', fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                                <Plus size={12} /> Add
                              </button>
                            </div>
                            {(builderExercisesByDay.get(i + 1) || []).map((ex) => (
                              <div key={ex.index} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8, background: 'var(--bg-card)', marginBottom: 4 }}>
                                <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</span>
                                <input type="number" min={1} value={ex.sets} onChange={(e) => updateBuilderExercise(ex.index, 'sets', Number(e.target.value) || 1)}
                                  style={{ width: 34, padding: '3px 4px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 11, textAlign: 'center' }} />
                                <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>×</span>
                                <input type="number" min={1} value={ex.reps} onChange={(e) => updateBuilderExercise(ex.index, 'reps', Number(e.target.value) || 1)}
                                  style={{ width: 34, padding: '3px 4px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 11, textAlign: 'center' }} />
                                <button onClick={() => removeBuilderExercise(ex.index)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--text-disabled)' }}>{builderExercises.length} exercise{builderExercises.length === 1 ? '' : 's'} added</p>

                      <button onClick={() => { if (builderExercises.length === 0) { toast.error('Add at least one exercise.'); return; } setBuilderStep(3); }}
                        style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                        Continue <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                      </button>
                    </div>
                  )}
                  {builderStep === 3 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Check size={24} color="#10b981" />
                      </div>
                      <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Review & Save Plan</h3>
                      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>Your workout plan is ready. Save it to create and assign it to your client.</p>

                      <div style={{ textAlign: 'left', background: 'var(--bg-subtle)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 12.5, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span><strong>Client:</strong> {selectedClient?.name || '—'}</span>
                        <span><strong>Plan:</strong> {planName || '—'}</span>
                        <span><strong>Goal:</strong> {GOALS.find((g) => g.value === planGoal)?.label}</span>
                        <span><strong>Schedule:</strong> {sessionsPerWeek}x/week for {durationWeeks} weeks</span>
                        <span><strong>Exercises:</strong> {builderExercises.length}</span>
                      </div>

                      <Button variant="primary" onClick={handleSaveBuilderPlan} disabled={builderSaving}>
                        {builderSaving ? <Loader2 size={14} className="animate-spin" style={{ marginRight: 6 }} /> : <Check size={14} style={{ marginRight: 6 }} />}
                        Save & Assign Plan
                      </Button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'space-between' }}>
                  <button onClick={() => setBuilderStep(Math.max(0, builderStep - 1))} disabled={builderStep === 0}
                    style={{ padding: '8px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: builderStep === 0 ? 'not-allowed' : 'pointer', opacity: builderStep === 0 ? 0.5 : 1 }}>
                    ← Back
                  </button>
                </div>
              </div>
            </m.div>
          )}

          {/* ── AI Tab ── */}
          {activeTab === 'ai' && (
            <m.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(236,72,153,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Sparkles size={28} color="#6366f1" />
                </div>
                <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>AI Workout Coach</h2>
                <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                  Generate personalized workout plans using AI. Just provide your client's details and let the AI build a complete training program.
                </p>
                <button onClick={() => setAiPanelOpen(true)}
                  style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} />Open AI Coach
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 32, textAlign: 'left' }}>
                  {[
                    { title: 'Personalized Plans', desc: 'Tailored to age, weight, goal, and experience level', color: '#6366f1' },
                    { title: 'Weekly Schedule', desc: 'Complete day-by-day training schedule with exercises', color: '#10b981' },
                    { title: 'Progression Notes', desc: 'Smart progression guidelines to maximize results', color: '#f59e0b' },
                  ].map((f) => (
                    <div key={f.title} style={{ padding: '16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, marginBottom: 10 }} />
                      <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</h4>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Floating AI button ── */}
      <m.button
        onClick={() => setAiPanelOpen(true)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        style={{ position: 'fixed', bottom: 28, right: 28, width: 52, height: 52, borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(99,102,241,0.45)', zIndex: 100 }}
        title="Open AI Coach"
      >
        <Sparkles size={20} />
      </m.button>

      {/* ── AI Coach Panel ── */}
      <AnimatePresence>
        {aiPanelOpen && (
          <>
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 8999 }}
              onClick={() => setAiPanelOpen(false)} />
            <AiCoachPanel type="workout" onClose={() => setAiPanelOpen(false)} />
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <AssignClientModal
        plan={assignPlan}
        onClose={() => setAssignPlan(null)}
        onSelectClient={handleAssignFromModal}
      />

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handlePickExercise} />
    </div>
  );
}

/* ── Assign-to-client modal — PAR-Q gate pre-check happens on selection ── */
function AssignClientModal({
  plan, onClose, onSelectClient,
}: {
  plan: WorkoutPlan | null;
  onClose: () => void;
  onSelectClient: (client: ClientOption) => Promise<void>;
}) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!plan) { setClients([]); setSearch(''); return; }
    setLoading(true);
    api.pt.clients().then((r: { data?: unknown[] }) => {
      const arr = Array.isArray(r?.data) ? r.data : [];
      setClients((arr as Record<string, unknown>[]).map((c) => ({ id: String(c.id), name: String(c.name ?? '') })));
    }).finally(() => setLoading(false));
  }, [plan]);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = async (client: ClientOption) => {
    setAssigningId(client.id);
    try {
      await onSelectClient(client);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Dialog open={Boolean(plan)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign &quot;{plan?.name}&quot; to a Client</DialogTitle>
        </DialogHeader>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-subtle)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border)' }}>
          <Search size={14} color="var(--text-disabled)" />
          <input
            autoFocus placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <ShieldAlert size={14} color="#d97706" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 11.5, color: '#92400e', lineHeight: 1.5 }}>
            Assignment is blocked unless the client has a PAR-Q screening on file with a &quot;cleared&quot; workout gate status and a completed Informed Consent.
          </p>
        </div>

        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Loader2 size={18} className="animate-spin" /></div>}
          {!loading && filtered.length === 0 && (
            <p style={{ textAlign: 'center', padding: 24, fontSize: 12.5, color: 'var(--text-muted)' }}>No clients found.</p>
          )}
          {!loading && filtered.map((c) => (
            <button
              key={c.id}
              disabled={assigningId !== null}
              onClick={() => handleSelect(c)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg-card)', cursor: assigningId !== null ? 'not-allowed' : 'pointer',
                textAlign: 'left', opacity: assigningId !== null && assigningId !== c.id ? 0.5 : 1,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                <User size={13} color="var(--text-disabled)" /> {c.name}
              </span>
              {assigningId === c.id && <Loader2 size={14} className="animate-spin" />}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
