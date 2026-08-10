'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Plus, Search, User, Clock, Target,
  Activity, FileText, LayoutGrid, List, Check,
  Trophy, Sparkles, ChevronRight, X, ShieldAlert, Loader2, Trash2, ClipboardList,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, PageContainer, PageHero } from '@/components/ui';
import { api } from '@/lib/api';
import type { WorkoutPlan, LibraryExercise, TrainingBrief } from '@/lib/api';
import { ApiError } from '@/lib/http';
import { useToast } from '@/lib/toast';
import { SpotlightCard } from '@/components/fitness/SpotlightCard';
import { AnimatedCounter } from '@/components/fitness/AnimatedCounter';
import { WorkoutPlanCard } from '@/components/fitness/WorkoutPlanCard';
import NewProgrammeDialog from '@/components/pt-os/builder/NewProgrammeDialog';
import { ExerciseCard } from '@/components/fitness/ExerciseCard';
import { AiCoachPanel } from '@/components/fitness/AiCoachPanel';
import TrainingBriefPanel from '@/components/pt-os/TrainingBriefPanel';

interface ClientOption { id: string; name: string; }


const GOALS: Array<{ value: string; label: string; color: string }> = [
  { value: 'muscle_gain', label: 'Muscle Gain', color: '#0067e0' },
  { value: 'weight_loss', label: 'Weight Loss', color: '#10b981' },
  { value: 'endurance', label: 'Endurance', color: '#0067e0' },
  { value: 'general_fitness', label: 'General Fitness', color: '#0067e0' },
  { value: 'recovery', label: 'Recovery', color: '#0067e0' },
];

const PLAN_COLORS = [
  'linear-gradient(135deg, #0067e0, #0059ce)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'linear-gradient(135deg, #0067e0, #0059ce)',
  'linear-gradient(135deg, #0067e0, #0059ce)',
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
  background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
};

export default function WorkoutPlansPage() {
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
  const presetClientId = searchParams.get('client_id');

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [activeBodyPart, setActiveBodyPart] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<LibraryExercise[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [assignPlan, setAssignPlan] = useState<WorkoutPlan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  // Arriving with ?client_id= is the client profile's "Workout Plans" button:
  // somebody has opened ONE client meaning to design for them.
  //
  // With a client in scope the brief is the landing tab: it is the thing you
  // came to read before designing anything, and burying it behind a tap makes
  // it as unread as the six screens it replaces.
  const [activeTab, setActiveTab] = useState<'brief' | 'plans' | 'library' | 'ai'>(
    presetClientId ? 'brief' : 'plans',
  );
  /** Filled by the brief panel, so the hero can name the client it describes. */
  const [briefClient, setBriefClient] = useState<TrainingBrief['client'] | null>(null);
  const [briefCompleteness, setBriefCompleteness] = useState(0);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // ── Plan Builder state ──

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [exRes, metaRes, plRes, clRes] = await Promise.all([
        api.exercises.list(),
        api.exercises.meta(),
        api.workouts.plans.list(presetClientId ? { client_id: presetClientId } : undefined),
        api.pt.clients(),
      ]);
      // /api/exercises returns a paged envelope, and its filter facets are
      // muscle regions rather than the old free-text body_part strings.
      setExercises(exRes.exercises || []);
      setBodyParts(Object.keys(metaRes.muscles_by_region || {}));
      setPlans(Array.isArray(plRes) ? plRes : []);
      const clientArr = Array.isArray(clRes?.data) ? clRes.data : [];
      setClients((clientArr as Record<string, unknown>[]).map((c) => ({ id: String(c.id), name: String(c.name ?? '') })));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
    } finally { setDataLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);


  /** Assign a plan. The backend screening gate hard-blocks only clients
   *  whose PAR-Q explicitly flags them as medically blocked; missing
   *  paperwork assigns fine and comes back as screening_warnings, which we
   *  surface as a nudge with a direct link to start the PAR-Q. */
  const assignPlanToClient = useCallback(async (plan: WorkoutPlan, client: ClientOption): Promise<boolean> => {
    try {
      const res = await api.workouts.assign({ workout_plan_id: plan.id, client_id: client.id });
      toast.success(`Assigned "${plan.name}" to ${client.name}.`);
      if (res?.screening_warnings?.length) {
        toast.warning(`${client.name}: ${res.screening_warnings.join(' ')}`, {
          duration: 8000,
          action: { label: 'Start PAR-Q', onClick: () => router.push(`/pt-os/parq?client_id=${client.id}`) },
        });
      }
      return true;
    } catch (err: unknown) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === 'PARQ_BLOCKED') {
        toast.error(`${client.name}'s PAR-Q screening flags them as medically blocked — clearance is required before assigning a workout.`, {
          duration: 0,
          action: { label: 'Review PAR-Q', onClick: () => router.push(`/pt-os/parq?client_id=${client.id}`) },
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


  const filteredExercises = exercises.filter((ex) => {
    // body_region is the normalized bucket; body_part is the legacy text the
    // same rows still carry, so this keeps matching either way.
    if (activeBodyPart !== 'All' && (ex.body_region ?? ex.body_part) !== activeBodyPart) return false;
    if (searchQuery) return ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });


  const avgProgress = plans.length
    ? Math.round(plans.reduce((s, p) => s + (p.progress || 0), 0) / plans.length)
    : 0;

  return (
    <div style={{ minHeight: '100%', position: 'relative' }}>
      <PageContainer>
        {/* ── Hero ──
            This was a lavender-to-pink gradient card with its own corner
            glows and its own max-w-[1400px] container — a different surface
            from every other page's header, 120px wider than the dashboard,
            and starting at mt-1 instead of matching the dashboard's own gap.
            The stat tiles that lived inside it move out below, where they
            are cards like every other KPI row in the app. */}
        <PageHero
          icon={<Dumbbell size={20} />}
          title={briefClient?.name ?? 'Workout Plans'}
          subtitle={briefClient
            ? [
              briefClient.age != null ? `${briefClient.age} yrs` : null,
              briefClient.gender,
              briefClient.goal ? String(briefClient.goal).replace(/_/g, ' ') : null,
            ].filter(Boolean).join(' · ') || 'Design their programme'
            : 'Build and manage personalized training programs'}
        >
          {/* View toggle + New Plan, on the hero. The pill row and the title
              used to share a flex row that wrapped awkwardly on a phone. */}
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 gap-1 rounded-[11px] p-1"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              {(['grid', 'list'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)}
                  aria-pressed={view === v}
                  aria-label={v === 'grid' ? 'Grid view' : 'List view'}
                  className="flex h-[36px] w-[38px] cursor-pointer items-center justify-center rounded-[8px] transition-colors"
                  style={{
                    background: view === v ? '#fff' : 'transparent',
                    color: view === v ? '#0F172A' : 'rgba(255,255,255,0.8)',
                  }}>
                  {v === 'grid' ? <LayoutGrid size={15} /> : <List size={15} />}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-[14px] px-4 text-[13px] font-[700] transition-transform active:scale-95 sm:flex-none"
              style={{ background: '#fff', color: '#0F172A' }}>
              <Plus size={16} /> New Plan
            </button>
          </div>
        </PageHero>

        {/* ── KPI cards ──
            Out of the hero and onto the page, as cards like every other KPI
            row in the app. Inside a tinted gradient panel they were tiles on a
            tile. */}
        <m.div variants={containerVariants} initial="hidden" animate="visible"
          className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* Scoped to whoever is in view. Opening ONE client's plans and
                being told the studio has 11 clients and 200 library exercises
                answers a question nobody asked from here; what matters is how
                complete this client's brief is and what they are running. */}
            {(presetClientId
              ? [
                { label: 'Their Plans', value: plans.length, icon: <FileText size={14} />, color: '#0067e0', spotColor: 'rgba(0,103,224,0.12)' },
                { label: 'Brief Complete', value: briefClient ? briefCompleteness : 0, icon: <ClipboardList size={14} />, color: '#10b981', spotColor: 'rgba(16,185,129,0.12)', suffix: '%' },
                { label: 'Exercises', value: exercises.length, icon: <Activity size={14} />, color: '#f59e0b', spotColor: 'rgba(245,158,11,0.12)' },
                { label: 'Completion', value: avgProgress, icon: <Trophy size={14} />, color: '#0067e0', spotColor: 'rgba(0,103,224,0.12)', suffix: '%' },
              ]
              : [
                { label: 'Total Plans', value: plans.length, icon: <FileText size={14} />, color: '#0067e0', spotColor: 'rgba(0,103,224,0.12)' },
                { label: 'Exercises', value: exercises.length, icon: <Activity size={14} />, color: '#10b981', spotColor: 'rgba(16,185,129,0.12)' },
                { label: 'Clients', value: clients.length, icon: <User size={14} />, color: '#f59e0b', spotColor: 'rgba(245,158,11,0.12)' },
                { label: 'Avg Completion', value: avgProgress, icon: <Trophy size={14} />, color: '#0067e0', spotColor: 'rgba(0,103,224,0.12)', suffix: '%' },
              ]
            ).map((s) => (
              <m.div key={s.label} variants={itemVariants}>
                <SpotlightCard spotlightColor={s.spotColor} style={{ padding: '14px 16px', cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-disabled)', lineHeight: 1.3 }}>{s.label}</span>
                    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {dataLoading ? '—' : <AnimatedCounter value={s.value} suffix={s.suffix} />}
                  </div>
                </SpotlightCard>
              </m.div>
            ))}
        </m.div>

        {/* ── Tabs (horizontally scrollable on mobile) ── */}
        <div className="flex gap-1 overflow-x-auto" style={{ background: 'var(--bg-subtle)', borderRadius: 11, padding: 3, scrollbarWidth: 'none' }}>
          {[
            // Only with a client in scope — there is no brief for "the studio".
            ...(presetClientId ? [{ key: 'brief', label: 'Client Brief', color: '#0067e0' }] : []),
            { key: 'plans', label: presetClientId ? 'Their Plans' : 'Active Plans', count: plans.length, color: '#0067e0' },
            { key: 'library', label: 'Exercise Library', count: filteredExercises.length, color: '#10b981' },
            { key: 'ai', label: 'AI Suggestions', color: '#0067e0' },
          ].map((tab) => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              style={{
                flexShrink: 0, whiteSpace: 'nowrap',
                // 44px explicitly, not padding: globals.css sets the root font
                // size to 14px, so anything expressed in rem lands at 87.5% of
                // its nominal value and a "44px" tab measures 38.
                height: 44, padding: '0 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
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
          {/* ── Client brief ──
              The reason this page exists when you arrive from a client. Every
              input a programme needs, assembled from assessments that were
              already taken and until now only readable one screen at a time. */}
          {activeTab === 'brief' && presetClientId && (
            <TrainingBriefPanel clientId={presetClientId} onLoaded={(b) => { setBriefClient(b.client); setBriefCompleteness(b.completeness_pct); }} />
          )}

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
                        // Both are read rather than trusted. They are NOT NULL
                        // in the schema today, but a plan built by an older
                        // migration or an import can arrive without them, and
                        // `null.charAt` here throws during render — which
                        // takes the whole /pt-os segment to its error boundary
                        // rather than dropping one card.
                        goal={plan.goal ? plan.goal.replace(/_/g, ' ') : undefined}
                        difficulty={plan.difficulty
                          ? plan.difficulty.charAt(0).toUpperCase() + plan.difficulty.slice(1)
                          : undefined}
                        duration={`${plan.sessions_per_week}x/wk · ${plan.duration_weeks}wk`}
                        exerciseCount={plan.exercise_count}
                        progress={plan.progress}
                        color={PLAN_COLORS[i % PLAN_COLORS.length]}
                        compact={view === 'list'}
                        onAssign={() => setAssignPlan(plan)}
                        onEdit={() => router.push(
                          presetClientId
                            ? `/pt-os/clients/${presetClientId}/training/builder?plan=${plan.id}`
                            : `/pt-os/workout-plans/${plan.id}`,
                        )}
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
              {/* Filter bar — search goes full-width above the chips on mobile */}
              <div className="mb-4 flex flex-col gap-3">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-subtle)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
                  <Search size={13} color="var(--text-disabled)" />
                  <input aria-label="Search exercises" placeholder="Search exercises…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }} />
                  {searchQuery && <button onClick={() => setSearchQuery('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 0, display: 'flex' }}><X size={13} /></button>}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {(['All', ...bodyParts.slice(0, 12)]).map((bp) => (
                    <button key={bp}
                      onClick={() => setActiveBodyPart(bp)}
                      style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '5px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all 0.18s', background: activeBodyPart === bp ? 'rgba(0,103,224,0.1)' : 'transparent', color: activeBodyPart === bp ? '#0067e0' : 'var(--text-muted)', borderColor: activeBodyPart === bp ? 'rgba(0,103,224,0.3)' : 'var(--border)' }}>
                      {bp}
                    </button>
                  ))}
                </div>
              </div>

              {dataLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{ height: 220, borderRadius: 18, background: 'var(--bg-subtle)', opacity: 0.6 }} />
                  ))}
                </div>
              ) : (
                <m.div variants={containerVariants} initial="hidden" animate="visible"
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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

          {/* ── AI Tab ── */}
          {activeTab === 'ai' && (
            <m.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, rgba(0,103,224,0.15), rgba(0,103,224,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Sparkles size={28} color="#0067e0" />
                </div>
                <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>AI Workout Coach</h2>
                <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                  Generate personalized workout plans using AI. Just provide your client's details and let the AI build a complete training program.
                </p>
                <button onClick={() => setAiPanelOpen(true)}
                  style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} />Open AI Coach
                </button>

                <div className="mt-8 grid grid-cols-1 gap-3.5 text-left sm:grid-cols-3">
                  {[
                    { title: 'Personalized Plans', desc: 'Tailored to age, weight, goal, and experience level', color: '#0067e0' },
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
      </PageContainer>

      {/* ── Floating AI button ── */}
      <m.button
        onClick={() => setAiPanelOpen(true)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className="above-bottom-nav" style={{ position: 'fixed', right: 28, width: 52, height: 52, borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(0,103,224,0.45)', zIndex: 100 }}
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

      <NewProgrammeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        presetClientId={presetClientId}
        onCreated={fetchData}
      />

      <AssignClientModal
        plan={assignPlan}
        onClose={() => setAssignPlan(null)}
        onSelectClient={handleAssignFromModal}
      />

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
          <input aria-label="Search clients"
            autoFocus placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13 }}
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
