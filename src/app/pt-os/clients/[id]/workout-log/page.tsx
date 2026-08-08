'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  Plus, Search, List as ListIcon, Calendar as CalendarIcon,
  History, Loader2, AlertCircle, ChevronLeft, ChevronRight, Dumbbell,
  TrendingUp, Flame, CheckCircle2, Clock, Sparkles,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, PremiumAreaChart, PremiumBarChart, PullToRefresh } from '@/components/ui';
import { SpotlightCard } from '@/components/fitness/SpotlightCard';
import { AnimatedCounter } from '@/components/fitness/AnimatedCounter';
import { api } from '@/lib/api';
import type { WorkoutSession, WorkoutProgressPoint, WorkoutVolumePoint, WorkoutAssignment, WorkoutAssignmentDetail } from '@/lib/api';
import { ApiError } from '@/lib/http';
import { useToast } from '@/lib/toast';
import { fmtDate } from '@/lib/format';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type ViewMode = 'list' | 'calendar' | 'timeline';

const QUICK_EXERCISES = ['Bench Press', 'Squat', 'Deadlift'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

function statusStyle(status: string) {
  return status === 'completed'
    ? { label: 'Completed', bg: 'rgba(16,185,129,0.12)', color: '#059669' }
    : { label: 'In Progress', bg: 'rgba(245,158,11,0.12)', color: '#d97706' };
}

export default function WorkoutLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Guard><AppShell><WorkoutLogHub clientId={id} /></AppShell></Guard>;
}

function WorkoutLogHub({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const [clientName, setClientName] = useState('');
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<WorkoutAssignment | null>(null);
  const [planDays, setPlanDays] = useState<string[]>([]);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);

  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [chartExercise, setChartExercise] = useState('Bench Press');
  const [chartSearch, setChartSearch] = useState('');
  const [progressData, setProgressData] = useState<WorkoutProgressPoint[]>([]);
  const [volumeData, setVolumeData] = useState<WorkoutVolumePoint[]>([]);
  const [volumeGroupBy, setVolumeGroupBy] = useState<'week' | 'month'>('week');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, sessionsRes, assignRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.workoutLog.sessions.list({ client_id: clientId, limit: 100 }),
        api.workouts.assignments.list({ client_id: clientId, status: 'active' }).catch(() => []),
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setSessions(sessionsRes?.data ?? []);
      const assignment = Array.isArray(assignRes) && assignRes.length > 0 ? assignRes[0] : null;
      setActiveAssignment(assignment);
      if (assignment) {
        const detail: WorkoutAssignmentDetail = await api.workouts.assignments.detail(assignment.id);
        const days = Array.from(new Set(detail.exercises.map((ex) => WEEKDAYS[ex.day_of_week - 1]).filter(Boolean)));
        setPlanDays(days);
      } else {
        setPlanDays([]);
      }
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load client.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadVolume = useCallback(async () => {
    try {
      const res = await api.progress.workoutLog.volumeSummary({ client_id: clientId, group_by: volumeGroupBy });
      setVolumeData(res?.data ?? []);
    } catch { /* non-fatal */ }
  }, [clientId, volumeGroupBy]);

  useEffect(() => { loadVolume(); }, [loadVolume]);

  const loadProgress = useCallback(async () => {
    if (!chartExercise) { setProgressData([]); return; }
    try {
      const res = await api.progress.workoutLog.progress({ client_id: clientId, exercise_name: chartExercise });
      setProgressData(res?.data ?? []);
    } catch { setProgressData([]); }
  }, [clientId, chartExercise]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadData(), loadVolume(), loadProgress()]);
  }, [loadData, loadVolume, loadProgress]);

  const createSession = async (opts: { workout_day?: string; freestyle?: boolean } = {}) => {
    setCreating(true);
    setDayPickerOpen(false);
    try {
      const payload: Record<string, unknown> = { client_id: clientId };
      if (opts.freestyle) {
        payload.workout_assignment_id = null;
      } else if (opts.workout_day && activeAssignment) {
        payload.workout_assignment_id = activeAssignment.id;
        payload.program_name = activeAssignment.plan_name;
        payload.workout_day = opts.workout_day;
      }
      const res = await api.progress.workoutLog.sessions.create(payload);
      const newId = res?.data?.id;
      if (!newId) throw new Error('Server did not return a session id.');
      if (res?.screening_warnings?.length) {
        toast.warning(res.screening_warnings.join(' '), {
          duration: 8000, action: { label: 'Start PAR-Q', onClick: () => router.push(`/pt-os/parq?client_id=${clientId}`) },
        });
      }
      router.push(`/pt-os/clients/${clientId}/workout-log/${newId}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'PARQ_BLOCKED') {
        toast.error('This client\'s PAR-Q screening flags them as medically blocked — clearance is required before logging a session.', {
          duration: 0, action: { label: 'Review PAR-Q', onClick: () => router.push(`/pt-os/parq?client_id=${clientId}`) },
        });
      } else {
        toast.error(err instanceof Error ? err.message : 'Could not start a new session.');
      }
      setCreating(false);
    }
  };

  const handleNewSession = () => {
    if (activeAssignment && planDays.length > 0) { setDayPickerOpen(true); return; }
    createSession();
  };

  const programs = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => { if (s.program_name) set.add(s.program_name); });
    return Array.from(set);
  }, [sessions]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = sessions.filter((s) => {
      const d = new Date(s.session_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return {
      total: sessions.length,
      completed: sessions.filter((s) => s.status === 'completed').length,
      thisMonth,
      progress: activeAssignment?.progress_pct ?? 0,
    };
  }, [sessions, activeAssignment]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sessions.filter((s) => {
      if (programFilter && s.program_name !== programFilter) return false;
      if (!q) return true;
      const hay = `${fmtDate(s.session_date)} ${s.program_name || ''} ${s.workout_day || ''} ${s.notes || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sessions, search, programFilter]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of sessions) {
      const key = String(s.session_date).slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sessions]);

  const calendarList = selectedDay ? (sessionsByDay.get(selectedDay) ?? []) : filtered;

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600] text-slate-600">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={loadData}>Retry</Button>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={refreshAll}>
      <div className="mx-auto w-full max-w-4xl pt-1 space-y-5 pb-24">

        {/* ── Gradient Hero ── */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 p-5 sm:p-7 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
        >
          {/* Corner glows as ONE unfiltered gradient layer, replacing two
              `blur-3xl` circles. `filter: blur()` promotes a child to its own
              compositing layer, and WebKit then applies this card's rounded
              `overflow-hidden` clip to that layer as a RECTANGLE — so the blob's
              square corner paints outside the rounded corner. Reported on iOS
              against the client profile card, which had the identical pattern.
              A gradient needs no filter, so nothing is promoted and the clip holds.
              240px, and the averaged colour for each two-tone blob, were fitted
              against the old rendering by pixel comparison: 0.99/255 mean
              difference, where two offset radials per blob scored 2.10. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: [
                'radial-gradient(circle 240px at calc(100% - 32px) 32px, rgba(251,169,48,0.2), transparent 70%)',
                'radial-gradient(circle 240px at 32px calc(100% - 16px), rgba(251,130,97,0.2), transparent 70%)',
              ].join(', '),
            }}
            aria-hidden
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <m.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-[0_4px_20px_rgba(245,158,11,0.35)]"
              >
                <Dumbbell size={22} />
              </m.span>
              <div className="min-w-0">
                <span className="text-[11px] font-[700] uppercase tracking-[0.1em]" style={{ color: 'var(--text-disabled)' }}>Workout Log</span>
                <h1 className="truncate text-[22px] sm:text-[28px] font-extrabold tracking-[-0.02em] leading-tight text-[var(--text-primary)]">{clientName}</h1>
              </div>
            </div>
            <Button iconLeft={<Plus size={14} />} loading={creating} disabled={creating} onClick={handleNewSession}
              className="shrink-0"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
              New Session
            </Button>
          </div>

          {/* ── KPI cards ── */}
          <m.div variants={containerVariants} initial="hidden" animate="visible"
            className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Total Sessions', value: stats.total, icon: <Dumbbell size={14} />, color: '#f59e0b', spotColor: 'rgba(245,158,11,0.12)' },
              { label: 'Completed', value: stats.completed, icon: <CheckCircle2 size={14} />, color: '#10b981', spotColor: 'rgba(16,185,129,0.12)' },
              { label: 'This Month', value: stats.thisMonth, icon: <CalendarIcon size={14} />, color: '#0067e0', spotColor: 'rgba(0,103,224,0.12)' },
              { label: 'Plan Progress', value: stats.progress, suffix: '%', icon: <TrendingUp size={14} />, color: '#0067e0', spotColor: 'rgba(0,103,224,0.12)' },
            ].map((s) => (
              <m.div key={s.label} variants={itemVariants}>
                <SpotlightCard spotlightColor={s.spotColor} style={{ padding: '14px 16px', cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-disabled)', lineHeight: 1.3 }}>{s.label}</span>
                    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </div>
                </SpotlightCard>
              </m.div>
            ))}
          </m.div>
        </m.div>

        {/* ── Active Plan ── */}
        {activeAssignment && (
          <button onClick={() => router.push(`/pt-os/workout-plans/${activeAssignment.workout_plan_id}`)}
            className="flex w-full items-center justify-between gap-4 rounded-[18px] px-5 py-4 text-left transition hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, rgba(0,103,224,0.08), rgba(0,103,224,0.05))', border: '1px solid rgba(0,103,224,0.2)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'rgba(0,103,224,0.15)' }}>
                <Sparkles size={15} style={{ color: '#0067e0' }} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>{activeAssignment.plan_name}</p>
                <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Active plan &middot; {activeAssignment.progress_pct}% complete</p>
              </div>
            </div>
            <div className="hidden sm:block w-28 flex-shrink-0">
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(0,103,224,0.15)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, activeAssignment.progress_pct)}%`, background: '#0067e0' }} />
              </div>
            </div>
          </button>
        )}

        {/* ── Progress Charts ── */}
        <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} style={{ color: '#F59E0B' }} />
            <h3 className="text-[13px] font-[760] text-gray-900">Progress</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {QUICK_EXERCISES.map((ex) => (
              <button key={ex} onClick={() => { setChartExercise(ex); setChartSearch(''); }}
                className="rounded-full px-3 py-1.5 text-[11.5px] font-[700] transition"
                style={{ background: chartExercise === ex ? '#0f172a' : 'var(--bg-subtle)', color: chartExercise === ex ? '#fff' : '#64748b' }}>
                {ex}
              </button>
            ))}
            <input
              type="text" placeholder="Or search exercise…" value={chartSearch}
              onChange={(e) => setChartSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && chartSearch.trim()) setChartExercise(chartSearch.trim()); }}
              className="rounded-full px-3 py-1.5 text-[11.5px] outline-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', width: 160 }}
            />
          </div>
          {progressData.length === 0 ? (
            <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>No logged sets for {chartExercise} yet.</p>
          ) : (
            <PremiumAreaChart
              data={progressData.map((p) => ({ date: fmtDate(p.session_date), 'Est. 1RM': p.est_1rm ?? 0, 'Best Weight': p.best_weight }))}
              xKey="date"
              areas={[
                { key: 'Est. 1RM', label: 'Est. 1RM (kg)', color: '#F59E0B' },
                { key: 'Best Weight', label: 'Best Weight (kg)', color: '#0067e0' },
              ]}
              height={220}
            />
          )}

          <div className="mt-6 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame size={14} style={{ color: '#ef4444' }} />
              <h4 className="text-[12.5px] font-[700] text-gray-900">Training Volume</h4>
            </div>
            <div className="flex gap-1.5">
              {(['week', 'month'] as const).map((g) => (
                <button key={g} onClick={() => setVolumeGroupBy(g)}
                  className="rounded-full px-2.5 py-1 text-[10.5px] font-[700] capitalize transition"
                  style={{ background: volumeGroupBy === g ? '#0f172a' : 'var(--bg-subtle)', color: volumeGroupBy === g ? '#fff' : '#64748b' }}>
                  {g}ly
                </button>
              ))}
            </div>
          </div>
          {volumeData.length === 0 ? (
            <p className="py-6 text-center text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>No volume logged yet.</p>
          ) : (
            <PremiumBarChart
              data={volumeData.map((v) => ({ period: fmtDate(v.period), Volume: Math.round(v.volume) }))}
              xKey="period"
              bars={[{ key: 'Volume', label: 'Volume (kg)', color: '#F59E0B' }]}
              height={180}
            />
          )}
        </div>

        {/* ── History ── */}
        <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <History size={15} style={{ color: '#F59E0B' }} />
              <h3 className="text-[13px] font-[760] text-gray-900">Session History</h3>
            </div>
            <div className="flex gap-1.5">
              {([
                { id: 'list', icon: ListIcon },
                { id: 'calendar', icon: CalendarIcon },
                { id: 'timeline', icon: History },
              ] as const).map(({ id: v, icon: Icon }) => (
                <button key={v} onClick={() => { setView(v); setSelectedDay(null); }}
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] transition"
                  style={{ background: view === v ? '#0f172a' : 'var(--bg-subtle)', color: view === v ? '#fff' : '#64748b' }}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          {view !== 'calendar' && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
                <input
                  type="text" placeholder="Search by date, exercise, notes…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-[10px] text-[12.5px] outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                />
              </div>
              {programs.length > 0 && (
                <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}
                  className="rounded-[10px] px-3 py-2 text-[12.5px] outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <option value="">All programs</option>
                  {programs.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
            </div>
          )}

          {view === 'calendar' && (
            <CalendarView
              month={calendarMonth} setMonth={setCalendarMonth}
              sessionsByDay={sessionsByDay} selectedDay={selectedDay} setSelectedDay={setSelectedDay}
            />
          )}

          {view === 'list' && <SessionList sessions={filtered} clientId={clientId} router={router} />}
          {view === 'timeline' && <SessionTimeline sessions={filtered} clientId={clientId} router={router} />}
          {view === 'calendar' && (
            <div className="mt-4">
              <SessionList sessions={calendarList} clientId={clientId} router={router} />
            </div>
          )}
        </div>
      </div>

      <Dialog open={dayPickerOpen} onOpenChange={setDayPickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log a session for {activeAssignment?.plan_name}</DialogTitle>
          </DialogHeader>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Which day&apos;s exercises will you log?</p>
          <div className="grid grid-cols-2 gap-2">
            {planDays.map((day) => (
              <button key={day} onClick={() => createSession({ workout_day: day })} disabled={creating}
                className="rounded-[12px] px-3 py-2.5 text-[12.5px] font-[700] transition hover:-translate-y-0.5"
                style={{ background: 'rgba(0,103,224,0.1)', color: '#0067e0', border: '1px solid rgba(0,103,224,0.25)' }}>
                {day}
              </button>
            ))}
          </div>
          <button onClick={() => createSession({ freestyle: true })} disabled={creating}
            className="w-full rounded-[12px] py-2.5 text-[12.5px] font-[650]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            Or start a freestyle session instead
          </button>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
}

function SessionList({ sessions, clientId, router }: { sessions: WorkoutSession[]; clientId: string; router: ReturnType<typeof useRouter> }) {
  if (sessions.length === 0) {
    return <p className="py-10 text-center text-[13px] font-[600]" style={{ color: 'var(--text-disabled)' }}>No sessions found.</p>;
  }
  return (
    <div className="space-y-2.5">
      {sessions.map((s) => {
        const style = statusStyle(s.status);
        return (
          <button key={s.id} onClick={() => router.push(`/pt-os/clients/${clientId}/workout-log/${s.id}`)}
            className="flex w-full items-center justify-between gap-3 rounded-[14px] px-4 py-3.5 text-left transition hover:-translate-y-0.5"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[13.5px] font-[700] text-gray-900">{fmtDate(s.session_date)}</p>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]" style={{ background: style.bg, color: style.color }}>{style.label}</span>
              </div>
              <p className="mt-1 truncate text-[12px] text-slate-500">
                {[s.program_name, s.workout_day].filter(Boolean).join(' · ') || 'Freestyle session'}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3 text-[11px] font-[650]" style={{ color: '#94a3b8' }}>
              {s.exercise_count != null && <span>{s.exercise_count} ex</span>}
              {s.completed_set_count != null && <span>{s.completed_set_count} sets</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SessionTimeline({ sessions, clientId, router }: { sessions: WorkoutSession[]; clientId: string; router: ReturnType<typeof useRouter> }) {
  if (sessions.length === 0) {
    return <p className="py-10 text-center text-[13px] font-[600]" style={{ color: 'var(--text-disabled)' }}>No sessions found.</p>;
  }
  return (
    <div className="relative space-y-4 pl-6">
      <div className="absolute left-[9px] top-1 bottom-1 w-px" style={{ background: 'var(--border)' }} />
      {sessions.map((s) => {
        const style = statusStyle(s.status);
        return (
          <div key={s.id} className="relative">
            <span className="absolute -left-6 top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full"
              style={{ background: s.status === 'completed' ? '#10b981' : '#F59E0B', width: 18, height: 18 }}>
              {s.status === 'completed' ? <CheckCircle2 size={11} color="#fff" /> : <Clock size={10} color="#fff" />}
            </span>
            <button onClick={() => router.push(`/pt-os/clients/${clientId}/workout-log/${s.id}`)}
              className="flex w-full flex-col items-start rounded-[12px] px-3.5 py-2.5 text-left transition hover:opacity-80"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-[12.5px] font-[700] text-gray-900">{fmtDate(s.session_date)}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-slate-500">
                {[s.program_name, s.workout_day].filter(Boolean).join(' · ') || 'Freestyle session'}
                {s.completed_set_count != null ? ` · ${s.completed_set_count} sets` : ''}
              </p>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({
  month, setMonth, sessionsByDay, selectedDay, setSelectedDay,
}: {
  month: Date;
  setMonth: (d: Date) => void;
  sessionsByDay: Map<string, WorkoutSession[]>;
  selectedDay: string | null;
  setSelectedDay: (d: string | null) => void;
}) {
  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const todayKey = new Date().toISOString().slice(0, 10);

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonth(new Date(year, monthIdx - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'var(--bg-subtle)' }}>
          <ChevronLeft size={14} />
        </button>
        <p className="text-[13px] font-[760] text-gray-900">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        <button onClick={() => setMonth(new Date(year, monthIdx + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'var(--bg-subtle)' }}>
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <p key={i} className="text-[10px] font-[700]" style={{ color: 'var(--text-disabled)' }}>{d}</p>
        ))}
        {cells.map((key, i) => {
          if (!key) return <div key={i} />;
          const has = sessionsByDay.has(key);
          const isToday = key === todayKey;
          const isSelected = key === selectedDay;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(isSelected ? null : key)}
              className="flex h-9 flex-col items-center justify-center rounded-[8px] text-[11.5px] font-[650] transition"
              style={{
                background: isSelected ? '#0f172a' : has ? 'rgba(245,158,11,0.1)' : 'transparent',
                color: isSelected ? '#fff' : has ? '#d97706' : '#475569',
                border: isToday && !isSelected ? '1px solid #F59E0B' : '1px solid transparent',
              }}
            >
              {Number(key.slice(-2))}
              {has && <span className="mt-0.5 h-1 w-1 rounded-full" style={{ background: isSelected ? '#fff' : '#F59E0B' }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
