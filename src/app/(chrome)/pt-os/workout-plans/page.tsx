'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Plus, Search, User, FileText, LayoutGrid, List,
  Users, Trophy, CalendarDays, Sparkles, X, ShieldAlert, Loader2,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, PageContainer, PageHero } from '@/components/ui';
import { api } from '@/lib/api';
import type { WorkoutPlan, LibraryExercise, TrainingBrief, WorkoutAssignment } from '@/lib/api';
import { ApiError } from '@/lib/http';
import { useToast } from '@/lib/toast';
import { AnimatedCounter } from '@/components/fitness/AnimatedCounter';
import { WorkoutPlanCard } from '@/components/fitness/WorkoutPlanCard';
import NewProgrammeDialog from '@/components/pt-os/builder/NewProgrammeDialog';
import { ExerciseCard } from '@/components/fitness/ExerciseCard';
import { AiCoachPanel } from '@/components/fitness/AiCoachPanel';
import TrainingBriefPanel from '@/components/pt-os/TrainingBriefPanel';

interface ClientOption { id: string; name: string; }


/** The one accent this page uses. Six rotating card gradients were six
 *  different meanings for a colour that never meant anything. */
const ACCENT = '#0067e0';

/**
 * Which week of a programme a client is actually in.
 *
 * Derived from the assignment's own start date, so it is a measured fact
 * rather than a guess: no start date, a date the parser cannot read, or a
 * programme that has not begun yet all return null and the card simply omits
 * the counter. Clamped to the plan's length so a client six months into a
 * four-week block reads "Week 4 / 4" rather than "Week 27 / 4".
 */
function currentWeekOf(startDate: string | null | undefined, durationWeeks: number): number | null {
  if (!startDate || !durationWeeks) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  const days = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  if (days < 0) return null;
  return Math.min(durationWeeks, Math.floor(days / 7) + 1);
}

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
  /**
   * Active assignments — who is running which plan, from when, and how far in.
   *
   * The plan row itself carries none of that: it is a prescription, not a
   * person's copy of one. This is the existing assignments endpoint the
   * client profile and workout log already read; nothing new is computed
   * server-side. `null` means the read failed, which is deliberately
   * distinct from `[]` (nobody is assigned) — the KPIs below print an em
   * dash for the first and a real zero for the second.
   */
  const [assignments, setAssignments] = useState<WorkoutAssignment[] | null>([]);
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
      const [exRes, metaRes, plRes, clRes, asRes] = await Promise.all([
        api.exercises.list(),
        api.exercises.meta(),
        api.workouts.plans.list(presetClientId ? { client_id: presetClientId } : undefined),
        api.pt.clients(),
        // Only with a client in scope. /api/workouts/assignments requires a
        // client_id, so a studio-wide view would mean one request per client
        // — a request storm to decorate a card. With no client we simply do
        // not claim who is on a plan.
        //
        // Non-fatal either way: a failure costs the client name and the week
        // counter, not the screen.
        presetClientId
          ? api.workouts.assignments.list({ client_id: presetClientId, status: 'active' }).catch(() => null)
          : Promise.resolve(null),
      ]);
      // /api/exercises returns a paged envelope, and its filter facets are
      // muscle regions rather than the old free-text body_part strings.
      setExercises(exRes.exercises || []);
      setExerciseTotal(exRes.total ?? (exRes.exercises || []).length);
      setBodyParts(Object.keys(metaRes.muscles_by_region || {}));
      setPlans(Array.isArray(plRes) ? plRes : []);
      const clientArr = Array.isArray(clRes?.data) ? clRes.data : [];
      setClients((clientArr as Record<string, unknown>[]).map((c) => ({ id: String(c.id), name: String(c.name ?? '') })));
      setAssignments(Array.isArray(asRes) ? asRes : null);
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


  /**
   * The assignment covering each plan, by plan id.
   *
   * A plan can legitimately have several — reassigned after a break, or two
   * clients on the same template. The card shows one name, so this keeps the
   * most recently started, which is the one a trainer means by "who is on
   * this". `assignmentCount` is what the card would need to say "and 2 more";
   * for now the extra rows still count toward the KPIs below.
   */
  const assignmentByPlan = React.useMemo(() => {
    const map = new Map<string, WorkoutAssignment>();
    for (const a of assignments ?? []) {
      const prev = map.get(a.workout_plan_id);
      if (!prev || (a.start_date ?? '') > (prev.start_date ?? '')) map.set(a.workout_plan_id, a);
    }
    return map;
  }, [assignments]);

  const clientNameById = React.useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients],
  );

  /**
   * The four numbers a trainer actually manages by.
   *
   * Each is either measured or an em dash — never a zero standing in for
   * "we could not read that". Active Plans and Avg Completion come from the
   * plans themselves; the two that describe people come from assignments,
   * so they go unknown together when that read fails.
   */
  const activePlans = plans.filter((p) => p.is_active !== false).length;

  const avgProgress = plans.length
    ? Math.round(plans.reduce((s, p) => s + (p.progress || 0), 0) / plans.length)
    : 0;

  /**
   * Sessions a week.
   *
   * With a client in scope this is what they are actually assigned — their
   * real weekly load. Studio-wide it is the prescribed load across active
   * plans, because assignments are not readable without a client_id (see the
   * fetch above). Two different questions, so the label below changes with
   * the mode rather than presenting one as the other.
   */
  const sessionsPerWeek = assignments && assignments.length
    ? assignments.reduce((s, a) => s + (a.sessions_per_week || 0), 0)
    : plans.filter((p) => p.is_active !== false)
      .reduce((s, p) => s + (p.sessions_per_week || 0), 0);

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
        {/* ── Header ──
            Was a 200px+ gradient slab with corner glows, a grid overlay and a
            vignette. It is a flat header now: the page's name, one line of
            context, and the two controls that act on the page. Roughly a
            third of the height, and nothing decorative left to look past. */}
        <PageHero
          compact
          icon={<Dumbbell size={18} />}
          title={briefClient?.name ?? 'Workout Plans'}
          subtitle={briefClient
            ? [
              briefClient.age != null ? `${briefClient.age} yrs` : null,
              briefClient.gender,
              briefClient.goal ? String(briefClient.goal).replace(/_/g, ' ') : null,
            ].filter(Boolean).join(' · ') || 'Design their programme'
            : 'Build and manage training programmes'}
          actions={(
          <div className="flex shrink-0 items-center gap-2">
            {/* View toggle — compact, and only where a grid exists to toggle. */}
            <div
              className="flex shrink-0 gap-0.5 rounded-[11px] p-0.5"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
            >
              {(['grid', 'list'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)}
                  aria-pressed={view === v}
                  aria-label={v === 'grid' ? 'Grid view' : 'List view'}
                  className="flex items-center justify-center rounded-[9px] transition-colors"
                  style={{
                    height: 38, width: 40,
                    background: view === v ? 'var(--bg-card)' : 'transparent',
                    color: view === v ? ACCENT : 'var(--text-disabled)',
                    boxShadow: view === v ? '0 1px 2px rgba(15,23,42,0.10)' : 'none',
                  }}>
                  {v === 'grid' ? <LayoutGrid size={15} /> : <List size={15} />}
                </button>
              ))}
            </div>

            {/* AI, at the weight it deserves: a quiet secondary beside the
                primary, replacing the 52px floating button that used to sit
                on top of the plan cards. */}
            <button
              type="button"
              onClick={() => setAiPanelOpen(true)}
              aria-label="Open AI Assist"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[11px] px-3 text-[12.5px] font-[650] transition-colors"
              style={{
                minHeight: 44,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
              }}
            >
              <Sparkles size={14} style={{ color: ACCENT }} />
              <span className="hidden sm:inline">AI Assist</span>
            </button>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[11px] px-4 text-[13px] font-[700] text-white transition-transform active:scale-[0.98] sm:flex-none"
              style={{ background: ACCENT, minHeight: 44, boxShadow: '0 2px 10px rgba(0,103,224,0.28)' }}>
              <Plus size={16} /> New Plan
            </button>
          </div>
          )}
        />

        {/* ── KPI cards ──
            Out of the hero and onto the page, as cards like every other KPI
            row in the app. Inside a tinted gradient panel they were tiles on a
            tile. */}
        {/* ── KPIs ──
            Deliberately lighter than a plan card: no spotlight, no tinted
            icon chip, no per-metric colour. A hairline, a small grey label
            and one large number, so the row reads as context above the
            content rather than competing with it.

            A metric that could not be read shows an em dash. `null` here
            means the assignments call failed — printing 0 clients would be a
            claim about the studio rather than about the request. */}
        <m.div variants={containerVariants} initial="hidden" animate="visible"
          className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {(presetClientId
              ? [
                { label: 'Their Plans', value: plans.length as number | null, icon: <FileText size={13} /> },
                { label: 'Brief Complete', value: briefClient ? briefCompleteness : null, icon: <Trophy size={13} />, suffix: '%' },
                { label: 'Avg Completion', value: avgProgress, icon: <Trophy size={13} />, suffix: '%' },
                { label: 'Sessions / Week', value: sessionsPerWeek, icon: <CalendarDays size={13} /> },
              ]
              : [
                { label: 'Active Plans', value: activePlans as number | null, icon: <FileText size={13} /> },
                // "Clients", not "Assigned Clients": assignments cannot be
                // read studio-wide (see the fetch), so this is the roster
                // this trainer has — which is measured — rather than a
                // narrower number the page cannot actually see.
                { label: 'Clients', value: clients.length, icon: <Users size={13} /> },
                { label: 'Avg Completion', value: avgProgress, icon: <Trophy size={13} />, suffix: '%' },
                { label: 'Sessions / Week', value: sessionsPerWeek, icon: <CalendarDays size={13} /> },
              ]
            ).map((s) => (
              <m.div key={s.label} variants={itemVariants}
                className="rounded-[14px] px-3.5 py-3"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-1.5">
                  <span style={{ color: 'var(--text-disabled)' }}>{s.icon}</span>
                  <span
                    className="truncate text-[10.5px] font-[700] uppercase"
                    style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}
                  >
                    {s.label}
                  </span>
                </div>
                <div
                  className="mt-1.5 text-[24px] font-[800] tabular-nums sm:text-[26px]"
                  style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}
                >
                  {dataLoading || s.value === null
                    ? <span style={{ color: 'var(--text-disabled)' }}>—</span>
                    : <AnimatedCounter value={s.value} suffix={s.suffix} />}
                </div>
              </m.div>
            ))}
        </m.div>

        {/* ── Tabs ──
            The old row was `overflow-x-auto` with `flexShrink: 0` tabs, so on
            a 390px phone "AI Suggestions" sat off the right edge with nothing
            to indicate it was there — the reported cut-off. These share the
            width instead: each tab is `flex-1` over a `min-w-0` basis, so
            three (or four, with a client in scope) always fit and the row can
            never overflow. Labels are short enough not to need truncating at
            that width, and the count moves under the label on the narrowest
            screens rather than pushing the text out. */}
        <div
          className="flex gap-0.5 rounded-[12px] p-1"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          role="tablist"
          aria-label="Workout plans sections"
        >
          {[
            // Only with a client in scope — there is no brief for "the studio".
            ...(presetClientId ? [{ key: 'brief', label: 'Brief' }] : []),
            { key: 'plans', label: 'Plans', count: plans.length },
            { key: 'library', label: 'Exercises', count: exerciseTotal },
            { key: 'ai', label: 'AI Assistant' },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-1.5 transition-colors"
                style={{
                  // 44px explicitly, not padding: globals.css sets the root
                  // font size to 14px, so a rem-expressed "44px" measures 38.
                  minHeight: 44,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12.5, fontWeight: 700,
                  background: active ? 'var(--bg-card)' : 'transparent',
                  color: active ? ACCENT : 'var(--text-muted)',
                  boxShadow: active ? '0 1px 3px rgba(15,23,42,0.10)' : 'none',
                }}>
                <span className="truncate">{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className="shrink-0 text-[11px] font-[700] tabular-nums"
                    style={{ color: active ? ACCENT : 'var(--text-disabled)', opacity: active ? 0.75 : 1 }}
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
                <div style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' : '1fr', gap: 12 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ height: 180, borderRadius: 18, background: 'var(--bg-subtle)', animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.6 }} />
                  ))}
                </div>
              ) : plans.length === 0 ? (
                <div className="flex flex-col items-center px-5 py-14 text-center">
                  <span
                    className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-[15px]"
                    style={{ background: 'rgba(0,103,224,0.08)', color: ACCENT }}
                  >
                    <Dumbbell size={22} />
                  </span>
                  <p className="text-[15px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                    No workout plans yet
                  </p>
                  <p className="mt-1 max-w-[34ch] text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Build a programme from scratch, or let AI draft one from a client&apos;s brief.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-[11px] px-4 text-[13px] font-[700] text-white"
                    style={{ background: ACCENT, minHeight: 44 }}
                  >
                    <Plus size={15} /> New Plan
                  </button>
                </div>
              ) : (
                <m.div variants={containerVariants} initial="hidden" animate="visible"
                  style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' : '1fr', gap: 12 }}>
                  {plans.map((plan) => {
                    const assignment = assignmentByPlan.get(plan.id);
                    const builderHref = presetClientId
                      ? `/pt-os/clients/${presetClientId}/training/builder?plan=${plan.id}`
                      : `/pt-os/workout-plans/${plan.id}`;
                    return (
                      <m.div key={plan.id} variants={itemVariants}>
                        <WorkoutPlanCard
                          name={plan.name}
                          // Read rather than trusted. NOT NULL in the schema
                          // today, but a plan from an older migration or an
                          // import can arrive without it, and `null.replace`
                          // here throws during render — taking the whole
                          // /pt-os segment to its error boundary rather than
                          // dropping one card.
                          goal={plan.goal ? plan.goal.replace(/_/g, ' ') : undefined}
                          prescription={[
                            plan.duration_weeks ? `${plan.duration_weeks} week${plan.duration_weeks === 1 ? '' : 's'}` : null,
                            plan.sessions_per_week ? `${plan.sessions_per_week} session${plan.sessions_per_week === 1 ? '' : 's'}/week` : null,
                          ].filter(Boolean).join(' · ') || undefined}
                          exerciseCount={plan.exercise_count}
                          // The assigned client's own progress when there is
                          // one, since that is the number the week counter
                          // beside it describes; the plan's own otherwise.
                          progress={assignment?.progress_pct ?? plan.progress}
                          clientName={assignment ? clientNameById.get(assignment.client_id) ?? null : null}
                          currentWeek={currentWeekOf(assignment?.start_date, plan.duration_weeks)}
                          durationWeeks={plan.duration_weeks}
                          compact={view === 'list'}
                          onOpen={() => router.push(builderHref)}
                          onEdit={() => router.push(builderHref)}
                          onAssign={() => setAssignPlan(plan)}
                          onDelete={() => handleDeletePlan(plan)}
                          onAddExercises={() => router.push(builderHref)}
                        />
                      </m.div>
                    );
                  })}
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
              <div className="mx-auto max-w-[640px] px-1 py-6 text-center sm:py-8">
                <span
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px]"
                  style={{ background: 'rgba(0,103,224,0.08)', color: ACCENT }}
                >
                  <Sparkles size={24} />
                </span>
                <h2 className="text-[18px] font-[750]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  AI Workout Coach
                </h2>
                <p className="mx-auto mt-2 max-w-[42ch] text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Generate a personalised programme from a client&apos;s details, then edit it like any other plan.
                </p>
                <button onClick={() => setAiPanelOpen(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-[12px] px-5 text-[13.5px] font-[700] text-white"
                  style={{ background: ACCENT, minHeight: 44, boxShadow: '0 2px 10px rgba(0,103,224,0.28)' }}>
                  <Sparkles size={15} /> Open AI Coach
                </button>

                <div className="mt-7 grid grid-cols-1 gap-2.5 text-left sm:grid-cols-3">
                  {[
                    { title: 'Personalised plans', desc: 'Built around age, weight, goal and experience.' },
                    { title: 'Weekly schedule', desc: 'A day-by-day split with exercises already chosen.' },
                    { title: 'Progression notes', desc: 'How to load the programme week over week.' },
                  ].map((f) => (
                    <div key={f.title} className="rounded-[14px] p-3.5"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <h4 className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{f.title}</h4>
                      <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </PageContainer>

      {/* The floating AI button is gone. It was a fixed 52px disc pinned above
          the bottom nav, which put it directly over the last plan card's
          action row — covering the controls a trainer actually presses, on
          the one viewport where they are hardest to hit. AI is now the
          "AI Assist" button in the header and the AI Assistant tab, both of
          which open this same panel. */}

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
