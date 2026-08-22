'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Plus, Search, User, LayoutGrid, List,
  FileText, Trophy, Sparkles, X, ShieldAlert, Loader2, ClipboardList,
  CalendarDays, Users,
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
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
  // The library holds 890 exercises; a page holds 50. `exercises` is one page,
  // so it can never be the count — the card showed 50 for every studio no
  // matter how large its library was. The API has always returned the real
  // total beside the rows; nothing read it.
  const [exerciseTotal, setExerciseTotal] = useState(0);
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

  // Server-side search, debounced. The old filter ran over the 50 rows the
  // first page happened to contain, so typing "romanian" found nothing unless
  // a Romanian deadlift was in that page — the exercise existed and the tab
  // said it did not.
  useEffect(() => {
    const term = searchQuery.trim();
    const t = setTimeout(() => {
      api.exercises.list(term ? { q: term } : undefined)
        .then((r) => {
          setExercises(r.exercises || []);
          setExerciseTotal(r.total ?? (r.exercises || []).length);
        })
        .catch(() => { /* keep what is on screen rather than blanking it */ });
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

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
      setExerciseTotal(exRes.total ?? (exRes.exercises || []).length);
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
    // No name filter here any more — the server did it. Keeping both would
    // re-filter the server's results against a stale query mid-debounce and
    // blank the list for a moment on every keystroke.
    if (activeBodyPart !== 'All' && (ex.body_region ?? ex.body_part) !== activeBodyPart) return false;
    return true;
  });


  // ── What the KPI row is counting ──
  //
  // Every figure here is derived from the rows on screen. Two of them could
  // not be derived at all until the plans endpoint began returning who is on
  // each plan: before that, `progress` was a literal 0 for every studio-wide
  // read, so "Avg Completion" showed 0% no matter how much training had
  // happened, and there was no assigned-client field to count.
  //
  // The server has already narrowed each plan's roster to what this caller
  // may see — their own studio, and for a trainer their own clients — so
  // these are counts of what is in front of them, not of the whole studio.
  const roster = React.useMemo(
    () => plans.flatMap((p) => p.assignments ?? []),
    [plans],
  );

  /** One person on three programmes is one assigned client, not three. */
  const assignedClients = React.useMemo(
    () => new Set(roster.map((a) => a.client_id)).size,
    [roster],
  );

  /** Averaged across the people actually running something. A plan nobody is
   *  on has no completion to contribute, and folding its zero in would drag
   *  the studio's average down every time a trainer drafted a new programme. */
  const avgProgress = roster.length
    ? Math.round(roster.reduce((sum, a) => sum + (Number(a.progress_pct) || 0), 0) / roster.length)
    : 0;

  /** Sessions the roster is prescribed each week — the trainer's actual load.
   *  Summed per assignment, because two clients on one 3x/week plan is six
   *  sessions to deliver, not three. */
  const sessionsPerWeek = React.useMemo(
    () => plans.reduce(
      (sum, p) => sum + (p.assignments?.length ?? 0) * (Number(p.sessions_per_week) || 0),
      0,
    ),
    [plans],
  );

  const kpis = React.useMemo(() => (presetClientId
    ? [
      { label: 'Their Plans', display: plans.length, icon: <FileText size={13} />, color: '#0067E0' },
      { label: 'Brief Complete', display: `${briefClient ? briefCompleteness : 0}%`, icon: <ClipboardList size={13} />, color: '#10B981' },
      { label: 'Avg Completion', display: `${avgProgress}%`, icon: <Trophy size={13} />, color: '#F59E0B' },
      { label: 'Sessions/Week', display: sessionsPerWeek, icon: <CalendarDays size={13} />, color: '#0067E0' },
    ]
    : [
      { label: 'Active Plans', display: plans.length, icon: <FileText size={13} />, color: '#0067E0' },
      { label: 'Assigned Clients', display: assignedClients, icon: <Users size={13} />, color: '#10B981' },
      { label: 'Avg Completion', display: `${avgProgress}%`, icon: <Trophy size={13} />, color: '#F59E0B' },
      { label: 'Sessions/Week', display: sessionsPerWeek, icon: <CalendarDays size={13} />, color: '#0067E0' },
    ]
  ), [presetClientId, plans.length, briefClient, briefCompleteness, avgProgress, assignedClients, sessionsPerWeek]);

  /**
   * Where each of the card's three navigations goes.
   *
   * With a client in scope the builder is the working surface for all of
   * them — it is that client's programme. Studio-wide, Open lands on the
   * plan and Edit lands on the plan already in its exercise editor, so the
   * two actions are not the same button drawn twice.
   */
  const planHref = useCallback(
    (plan: WorkoutPlan, mode: 'open' | 'edit' = 'open') => (presetClientId
      ? `/pt-os/clients/${presetClientId}/training/builder?plan=${plan.id}`
      : `/pt-os/workout-plans/${plan.id}${mode === 'edit' ? '?edit=1' : ''}`),
    [presetClientId],
  );

  const tabs = React.useMemo(() => [
    // Only with a client in scope — there is no brief for "the studio".
    ...(presetClientId ? [{ key: 'brief', label: 'Brief' }] : []),
    { key: 'plans', label: 'Plans', count: plans.length },
    { key: 'library', label: 'Exercises', count: exerciseTotal },
    { key: 'ai', label: 'AI Assistant' },
  ] as Array<{ key: string; label: string; count?: number }>,
  [presetClientId, plans.length, exerciseTotal]);

  return (
    <div style={{ minHeight: '100%', position: 'relative' }}>
      <PageContainer>
        {/* ── Header ──
            The hero was the tallest thing on a phone before any work was
            visible: a full-bleed gradient panel with corner glows, a grid
            overlay and 28px of padding, carrying a title, one line of prose
            and two controls. `compact` keeps the surface and the identity and
            gives back roughly a third of the height, which is a whole plan
            card's worth of screen on a 390px viewport.

            AI moves in here as a peer of the other header controls. It used
            to be a 52px fixed circle floating over the content, and on this
            page it landed exactly on top of the first card's Assign button —
            the most prominent control on the screen sat on top of a real one
            and swallowed its taps. */}
        <PageHero
          compact
          icon={<Dumbbell size={17} />}
          title={briefClient?.name ?? 'Workout Plans'}
          subtitle={briefClient
            ? [
              briefClient.age != null ? `${briefClient.age} yrs` : null,
              briefClient.gender,
              briefClient.goal ? String(briefClient.goal).replace(/_/g, ' ') : null,
            ].filter(Boolean).join(' · ') || 'Design their programme'
            : 'Build and manage personalized training programs'}
        >
          <div className="flex items-center gap-2">
            {/* Grid/list, as small as it can be and still be a 44px target. */}
            <div className="flex shrink-0 gap-0.5 rounded-[11px] p-[3px]"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              {(['grid', 'list'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)}
                  aria-pressed={view === v}
                  aria-label={v === 'grid' ? 'Grid view' : 'List view'}
                  className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[9px] transition-colors"
                  style={{
                    background: view === v ? '#fff' : 'transparent',
                    color: view === v ? '#0F172A' : 'rgba(255,255,255,0.8)',
                  }}>
                  {v === 'grid' ? <LayoutGrid size={15} /> : <List size={15} />}
                </button>
              ))}
            </div>

            {/* Primary. The one filled control in the header. */}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[13px] px-4 text-[13px] font-[750] transition-transform active:scale-[0.98] sm:flex-none sm:px-5"
              style={{ background: '#fff', color: '#0F172A' }}>
              <Plus size={16} /> New Plan
            </button>

            {/* Available, not dominant. */}
            <button
              type="button"
              onClick={() => setAiPanelOpen(true)}
              aria-label="Open the AI coach"
              className="inline-flex h-[44px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[13px] px-3 text-[12.5px] font-[700] text-white transition-colors sm:px-4"
              style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.20)' }}>
              <Sparkles size={15} />
              <span className="hidden sm:inline">AI Assist</span>
            </button>
          </div>
        </PageHero>

        {/* ── KPIs ──
            Four numbers a trainer acts on, and deliberately quieter than the
            plan cards below them: no spotlight surface, no 30px icon tile, no
            count-up animation. They were the heaviest objects on the page and
            they are the least important — the plans are the page.

            Every one of these is now a real figure. "Assigned Clients" and
            "Avg Completion" could not be computed at all until the plans
            endpoint started returning who is on each plan; before that the
            completion KPI read 0% for every studio because the SQL emitted a
            literal zero. */}
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-card)] px-3.5 py-3"
            >
              <div className="flex items-center gap-1.5">
                <span style={{ color: k.color }} aria-hidden>{k.icon}</span>
                <span className="truncate text-[10.5px] font-[700] uppercase tracking-[0.07em] text-[var(--text-disabled)]">
                  {k.label}
                </span>
              </div>
              <div className="mt-1.5 text-[24px] font-[800] leading-none tracking-[-0.03em] text-[var(--text-primary)]">
                {dataLoading ? <span className="text-[var(--text-disabled)]">—</span> : k.display}
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ──
            The old row was a flex strip with `overflow-x: auto`, so on a
            390px screen the last tab ran off the right edge mid-word — the
            AI tab read "AI Suggest" with no way to tell it was cut. Three
            equal columns fit the viewport instead of scrolling out of it, and
            the labels are short enough to survive at that width. */}
        <div
          role="tablist"
          aria-label="Workout plans sections"
          className="grid gap-1 rounded-[13px] p-1 lg:max-w-[520px]"
          style={{
            background: 'var(--bg-subtle)',
            gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
          }}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-[10px] text-[12.5px] font-[700] transition-colors ${
                  active ? 'shadow-[0_1px_3px_rgba(15,23,42,0.10)]' : ''
                }`}
                style={{
                  // 44px explicitly, not padding: globals.css sets the root
                  // font size to 14px, so anything in rem lands at 87.5% of
                  // its nominal value and a "44px" tab measures 38.
                  height: 44,
                  background: active ? 'var(--bg-card)' : 'transparent',
                  color: active ? '#0067E0' : 'var(--text-muted)',
                }}
              >
                <span className="truncate">{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className="shrink-0 rounded-[7px] px-1.5 py-[1px] text-[10px] font-[700] tabular-nums"
                    style={{
                      background: active ? 'rgba(0,103,224,0.12)' : 'var(--bg-card)',
                      color: active ? '#0067E0' : 'var(--text-disabled)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
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
                    <div key={i} style={{ height: 196, borderRadius: 18, background: 'var(--bg-subtle)', animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.6 }} />
                  ))}
                </div>
              ) : plans.length === 0 ? (
                <div className="flex flex-col items-center rounded-[18px] border border-dashed border-[var(--border)] px-5 py-14 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[15px]"
                    style={{ background: 'rgba(0,103,224,0.09)' }}>
                    <Dumbbell size={22} color="#0067E0" />
                  </span>
                  <p className="mt-3.5 text-[15px] font-[700] text-[var(--text-primary)]">
                    No programmes yet
                  </p>
                  <p className="mt-1 max-w-[300px] text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                    Build one from scratch, or let the AI coach draft it from your client&rsquo;s goal and history.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button type="button" onClick={() => setCreateOpen(true)}
                      className="inline-flex h-[44px] items-center gap-1.5 rounded-[13px] px-4 text-[13px] font-[700] text-white transition-transform active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #0067E0 0%, #0059CE 100%)' }}>
                      <Plus size={15} /> New Plan
                    </button>
                    <button type="button" onClick={() => setAiPanelOpen(true)}
                      className="inline-flex h-[44px] items-center gap-1.5 rounded-[13px] border border-[var(--border)] px-4 text-[13px] font-[650] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]">
                      <Sparkles size={15} /> Draft with AI
                    </button>
                  </div>
                </div>
              ) : (
                <m.div variants={containerVariants} initial="hidden" animate="visible"
                  style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: 14 }}>
                  {plans.map((plan) => (
                    <m.div key={plan.id} variants={itemVariants}>
                      <WorkoutPlanCard
                        id={plan.id}
                        name={plan.name}
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
                        durationWeeks={plan.duration_weeks}
                        sessionsPerWeek={plan.sessions_per_week}
                        exerciseCount={plan.exercise_count}
                        progress={plan.progress}
                        assignments={plan.assignments}
                        compact={view === 'list'}
                        onOpen={() => router.push(planHref(plan))}
                        onEdit={() => router.push(planHref(plan, 'edit'))}
                        onAddExercises={() => router.push(planHref(plan, 'edit'))}
                        onAssign={() => setAssignPlan(plan)}
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
                <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>AI Assistant</h2>
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

      {/* The floating AI button is gone. It was a 52px fixed circle at
          right: 28px, above-bottom-nav — which on this page put it directly
          over the first card's Assign button, so the loudest thing on the
          screen sat on top of a real control and ate its taps. AI is now a
          header action and a tab; the panel below is unchanged. */}

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
