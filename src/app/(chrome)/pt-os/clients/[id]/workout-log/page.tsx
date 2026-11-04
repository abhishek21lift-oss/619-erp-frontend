'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  Plus, Search, List as ListIcon, Calendar as CalendarIcon,
  History, Loader2, AlertCircle, ChevronLeft, ChevronRight, Dumbbell,
  TrendingUp, Flame, CheckCircle2, Clock, Sparkles, Activity,
  Timer, Trophy, Percent, CalendarDays,
} from 'lucide-react';
import Guard from '@/components/Guard';
import {
  Button, Dialog, DialogContent, DialogHeader, DialogTitle,
  PullToRefresh, FormField, SelectInput, EmptyState, TextInput,
} from '@/components/ui';
import {
  PremiumAreaChart, PremiumBarChart, PremiumDonutChart, PremiumLineChart,
} from '@/components/visualizations';
import { SpotlightCard } from '@/components/fitness/SpotlightCard';
import { AnimatedCounter } from '@/components/fitness/AnimatedCounter';
import { api } from '@/lib/api';
import type {
  WorkoutSession, WorkoutProgressPoint, WorkoutAssignment,
  WorkoutAssignmentDetail, TrainingAnalytics,
} from '@/lib/api';
import {
  computeWorkoutAnalytics, muscleDistribution, rangeForPreset,
  dayKey, addDays, type DateRange, type HeatmapDay, type RangePreset,
} from '@/lib/workout-log-analytics';
import { screeningBlockOf } from '@/lib/screeningBlock';
import { useToast } from '@/lib/toast';
import { fmtDate, fmtDayMonth } from '@/lib/format';
import { indigo } from '@/lib/palette';
import { errorMessage } from '@/lib/forms/errors';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type ViewMode = 'list' | 'calendar' | 'timeline';

const QUICK_EXERCISES = ['Bench Press', 'Squat', 'Deadlift'];

const RANGE_PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '6mo', label: '6M' },
  { id: '1y', label: '1Y' },
  { id: 'custom', label: 'Custom' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

function statusStyle(status: string) {
  if (status === 'completed') return { label: 'Completed', bg: 'rgba(16,185,129,0.12)', color: '#059669' };
  // An empty log left open on an earlier day, closed by the server's sweep
  // (migration 220). Still listed — it can be opened and finished — but it
  // was never a workout, so it reads as one that did not happen.
  if (status === 'abandoned') return { label: 'Not logged', bg: 'rgba(100,116,139,0.12)', color: '#475569' };
  return { label: 'In Progress', bg: 'rgba(245,158,11,0.12)', color: '#d97706' };
}

/** 12,345 -> 12.3k. Chart axes need a short number, not a full one. */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

export default function WorkoutLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Guard><WorkoutLogHub clientId={id} /></Guard>;
}

function WorkoutLogHub({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const [clientName, setClientName] = useState('');
  // Recent history (latest 100), so changing the analytics range never takes
  // away the session you came here to open.
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

  const [rangePreset, setRangePreset] = useState<RangePreset>('90d');
  const [customFrom, setCustomFrom] = useState(() => addDays(dayKey(new Date()), -29));
  const [customTo, setCustomTo] = useState(() => dayKey(new Date()));
  const [rangeSessions, setRangeSessions] = useState<WorkoutSession[]>([]);
  const [rangeLoading, setRangeLoading] = useState(true);
  const [rangeError, setRangeError] = useState('');
  const [trainingStats, setTrainingStats] = useState<TrainingAnalytics | null>(null);
  const [statsError, setStatsError] = useState('');
  const rangeRequest = useRef(0);

  const range = useMemo<DateRange>(
    () => rangeForPreset(rangePreset, dayKey(new Date()), { from: customFrom, to: customTo }),
    [rangePreset, customFrom, customTo],
  );

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
      setLoadError(errorMessage(err, 'Failed to load client.'));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  /** One range, one sessions read. The analytics read is optional: losing it
   *  costs the muscle/PR panels, not the session stats measured above. */
  const loadRange = useCallback(async () => {
    const request = ++rangeRequest.current;
    setRangeLoading(true);
    setRangeError('');
    setStatsError('');
    try {
      const days = Math.round(
        (Date.parse(`${range.to}T12:00:00Z`) - Date.parse(`${range.from}T12:00:00Z`)) / 86400000,
      ) + 1;
      const weeks = Math.min(Math.max(Math.ceil(days / 7), 1), 52);
      const [sessionsRes, statsResult] = await Promise.all([
        api.progress.workoutLog.sessions.list({
          client_id: clientId, limit: 400, from: range.from, to: range.to,
        }),
        api.progress.workoutLog.analytics({ client_id: clientId, weeks, as_of: range.to })
          .then(
            (res) => ({ ok: true as const, data: res?.data ?? null }),
            (cause: unknown) => ({ ok: false as const, cause }),
          ),
      ]);
      if (request !== rangeRequest.current) return;
      setRangeSessions(sessionsRes?.data ?? []);
      if (statsResult.ok) setTrainingStats(statsResult.data);
      else setStatsError(errorMessage(statsResult.cause, 'Muscle and record breakdown unavailable.'));
    } catch (err: unknown) {
      if (request !== rangeRequest.current) return;
      setRangeError(errorMessage(err, 'Failed to load this range.'));
    } finally {
      if (request === rangeRequest.current) setRangeLoading(false);
    }
  }, [clientId, range.from, range.to]);

  useEffect(() => { loadRange(); }, [loadRange]);

  const loadProgress = useCallback(async () => {
    if (!chartExercise) { setProgressData([]); return; }
    try {
      const res = await api.progress.workoutLog.progress({ client_id: clientId, exercise_name: chartExercise });
      setProgressData(res?.data ?? []);
    } catch { setProgressData([]); }
  }, [clientId, chartExercise]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadData(), loadRange(), loadProgress()]);
  }, [loadData, loadRange, loadProgress]);

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
      const block = screeningBlockOf(err);
      if (block) {
        toast.error(`This client's ${block.reason} before logging a session.`, {
          duration: 0, action: { label: block.actionLabel, onClick: () => router.push(block.path(clientId)) },
        });
      } else {
        toast.error(errorMessage(err, 'Could not start a new session.'));
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

  const analytics = useMemo(
    () => computeWorkoutAnalytics(rangeSessions, trainingStats?.prs ?? [], range),
    [rangeSessions, trainingStats, range],
  );

  const muscles = useMemo(
    () => muscleDistribution(trainingStats?.muscles ?? []),
    [trainingStats],
  );

  const weekly = useMemo(() => analytics.weeks.map((w) => ({
    week: fmtDayMonth(w.week_start),
    Sessions: w.sessions,
    Completed: w.completed,
    Volume: Math.round(w.volume),
    Duration: w.avg_duration,
  })), [analytics.weeks]);

  const durationWeeks = useMemo(
    () => weekly.filter((w) => w.Duration != null),
    [weekly],
  );

  const chartProgress = useMemo(
    () => progressData.filter((p) => {
      const day = String(p.session_date).slice(0, 10);
      return day >= range.from && day <= range.to;
    }),
    [progressData, range.from, range.to],
  );

  const rangeDays = useMemo(
    () => Math.round(
      (Date.parse(`${range.to}T12:00:00Z`) - Date.parse(`${range.from}T12:00:00Z`)) / 86400000,
    ) + 1,
    [range.from, range.to],
  );

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

  const primaryKpis: Array<{
    label: string; value: number | null; suffix?: string; icon: React.ReactNode;
    color: string; spotColor: string;
  }> = [
    { label: 'Sessions', value: analytics.total, icon: <Dumbbell size={14} />, color: '#f59e0b', spotColor: 'rgba(245,158,11,0.12)' },
    { label: 'Completion', value: analytics.completion_pct, suffix: '%', icon: <Percent size={14} />, color: '#10b981', spotColor: 'rgba(16,185,129,0.12)' },
    { label: 'Total Volume', value: analytics.total_volume, suffix: ' kg', icon: <Flame size={14} />, color: '#ef4444', spotColor: 'rgba(239,68,68,0.12)' },
    { label: 'Avg Duration', value: analytics.avg_duration, suffix: ' min', icon: <Timer size={14} />, color: indigo[450], spotColor: 'rgba(220,88,109,0.12)' },
    { label: 'Week Streak', value: analytics.week_streak, suffix: analytics.week_streak === 1 ? ' wk' : ' wks', icon: <TrendingUp size={14} />, color: '#852E4E', spotColor: 'rgba(163,55,87,0.12)' },
    { label: 'PRs', value: statsError ? null : analytics.pr_count, icon: <Trophy size={14} />, color: indigo[700], spotColor: 'rgba(107,36,64,0.12)' },
  ];

  const secondaryKpis = [
    { label: 'Completed', value: analytics.completed },
    { label: 'Avg Volume', value: analytics.avg_volume, suffix: ' kg' },
    { label: 'Sets Done', value: analytics.completed_sets },
    { label: 'Active Days', value: analytics.active_days },
  ];

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
              A gradient needs no filter, so nothing is promoted and the clip holds. */}
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

          <m.div variants={containerVariants} initial="hidden" animate="visible"
            className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {primaryKpis.map((s) => (
              <m.div key={s.label} variants={itemVariants}>
                <SpotlightCard spotlightColor={s.spotColor} style={{ padding: '14px 16px', cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-disabled)', lineHeight: 1.3 }}>{s.label}</span>
                    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                  </div>
                  <div className="truncate" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {s.value == null
                      ? <span style={{ color: 'var(--text-disabled)' }}>—</span>
                      : <AnimatedCounter value={s.value} suffix={s.suffix} />}
                  </div>
                </SpotlightCard>
              </m.div>
            ))}
          </m.div>
        </m.div>

        {/* ── Range filter ── */}
        <div className="rounded-[20px] p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} style={{ color: '#F59E0B' }} />
              <h2 className="text-[13px] font-[760] text-gray-900">Analytics range</h2>
            </div>
            <div role="group" aria-label="Analytics range" className="flex flex-wrap gap-1.5">
              {RANGE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setRangePreset(p.id)}
                  aria-pressed={rangePreset === p.id}
                  className="min-h-9 rounded-full px-3 py-1.5 text-[11.5px] font-[750] transition"
                  style={{
                    background: rangePreset === p.id ? '#0f172a' : 'var(--bg-subtle)',
                    color: rangePreset === p.id ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {rangePreset === 'custom' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <FormField label="From">
                <TextInput
                  type="date" value={customFrom} max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </FormField>
              <FormField label="To">
                <TextInput
                  type="date" value={customTo} min={customFrom} max={dayKey(new Date())}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </FormField>
            </div>
          )}

          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
            {fmtDate(range.from)} → {fmtDate(range.to)}
            {rangeSessions.length >= 400 && ' · Showing the latest 400 sessions in this range'}
            {rangeDays > 364 && ' · Muscle and PR panels cover the latest 52 weeks'}
          </p>
        </div>

        {/* ── Analytics ── */}
        {rangeLoading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-[20px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: '#F59E0B' }} />
          </div>
        ) : rangeError ? (
          <div role="alert" className="flex items-start gap-2 rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Could not load this range</p>
              <p className="mt-1 text-red-600">{rangeError}</p>
            </div>
            <Button variant="outline" onClick={loadRange}>Retry</Button>
          </div>
        ) : analytics.total === 0 ? (
          <div className="rounded-[20px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <EmptyState
              icon={<Activity size={20} />}
              title="No sessions in this range"
              description="Nothing was logged between these dates. Widen the range, or start a session — the recent history below is unaffected."
              action={<Button iconLeft={<Plus size={14} />} onClick={handleNewSession}>New Session</Button>}
            />
          </div>
        ) : (
          <>
            {/* Secondary measured totals. These are the four numbers that are
                too specific for the hero cards but too useful to hide. */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {secondaryKpis.map((s) => (
                <div key={s.label} className="rounded-[16px] px-4 py-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] font-[750] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>{s.label}</p>
                  <p className="mt-1.5 text-[19px] font-[800] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
                    {s.value == null ? '—' : <AnimatedCounter value={s.value} suffix={s.suffix} />}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <PremiumAreaChart
                data={weekly}
                xKey="week"
                areas={[{ key: 'Volume', label: 'Volume (kg)', color: '#F59E0B' }]}
                title="Training volume"
                subtitle={`Completed set volume by week · ${fmtDate(range.from)} → ${fmtDate(range.to)}`}
                height={220}
                formatValue={(v) => `${compact(v)} kg`}
                emptyTitle="No volume logged in this range"
                emptyDescription="Log a weighted set to see the weekly load."
              />

              <PremiumBarChart
                data={weekly}
                xKey="week"
                bars={[
                  { key: 'Sessions', label: 'Sessions', color: '#A33757' },
                  { key: 'Completed', label: 'Completed', color: '#10B981' },
                ]}
                title="Sessions by week"
                subtitle="Logged sessions, completed or still open"
                height={220}
                emptyTitle="No sessions in this range"
                emptyDescription="The calendar above shows what the log contains."
              />

              <PremiumDonutChart
                data={muscles}
                title="Sets by muscle"
                subtitle="Completed working sets in the analytics window"
                centerLabel="hard sets"
                formatValue={(v) => `${Math.round(v)} sets`}
                height={240}
                error={statsError || null}
                onRetry={loadRange}
                emptyTitle="No muscle data yet"
                emptyDescription="Sets appear here once they are linked to a library exercise."
              />

              <PremiumLineChart
                data={durationWeeks}
                xKey="week"
                lines={[{ key: 'Duration', label: 'Avg duration (min)', color: indigo[500] }]}
                title="Session duration"
                subtitle="Average logged duration per week"
                height={240}
                formatValue={(v) => `${Math.round(v)} min`}
                emptyTitle="Not enough durations yet"
                emptyDescription="A trend needs two weeks with a saved session duration."
              />
            </div>

            <CalendarHeatmapPanel days={analytics.heatmap} range={range} />
          </>
        )}

        {/* ── Active Plan ── */}
        {activeAssignment && (
          <button onClick={() => router.push(`/pt-os/workout-plans/${activeAssignment.workout_plan_id}`)}
            className="flex w-full items-center justify-between gap-4 rounded-[18px] px-5 py-4 text-left transition hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, rgba(163,55,87,0.08), rgba(163,55,87,0.05))', border: '1px solid rgba(163,55,87,0.2)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'rgba(163,55,87,0.15)' }}>
                <Sparkles size={15} style={{ color: '#852E4E' }} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>{activeAssignment.plan_name}</p>
                <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Active plan &middot; {activeAssignment.progress_pct}% complete</p>
              </div>
            </div>
            <div className="hidden sm:block w-28 flex-shrink-0">
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(163,55,87,0.15)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, activeAssignment.progress_pct)}%`, background: '#A33757' }} />
              </div>
            </div>
          </button>
        )}

        {/* ── Exercise progress ── */}
        <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} style={{ color: '#F59E0B' }} />
            <h3 className="text-[13px] font-[760] text-gray-900">Exercise Progress</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {QUICK_EXERCISES.map((ex) => (
              <button key={ex} onClick={() => { setChartExercise(ex); setChartSearch(''); }}
                className="rounded-full px-3 py-1.5 text-[11.5px] font-[700] transition"
                style={{ background: chartExercise === ex ? '#0f172a' : 'var(--bg-subtle)', color: chartExercise === ex ? '#fff' : '#64748b' }}>
                {ex}
              </button>
            ))}
            <input aria-label="Or search exercise"
              type="text" placeholder="Or search exercise…" value={chartSearch}
              onChange={(e) => setChartSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && chartSearch.trim()) setChartExercise(chartSearch.trim()); }}
              className="rounded-full px-3 py-1.5 text-[11.5px] outline-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', width: 160 }}
            />
          </div>
          {chartProgress.length === 0 ? (
            <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>No logged sets for {chartExercise} in this range.</p>
          ) : (
            <PremiumAreaChart
              data={chartProgress.map((p) => ({ date: fmtDate(p.session_date), 'Est. 1RM': p.est_1rm ?? 0, 'Best Weight': p.best_weight }))}
              xKey="date"
              areas={[
                { key: 'Est. 1RM', label: 'Est. 1RM (kg)', color: '#F59E0B' },
                { key: 'Best Weight', label: 'Best Weight (kg)', color: '#A33757' },
              ]}
              height={220}
              bordered={false}
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
                  aria-label={`${v} view`} aria-pressed={view === v}
                  className="flex h-11 w-11 items-center justify-center rounded-[10px] transition"
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
                <input aria-label="Search by date, exercise, notes"
                  type="text" placeholder="Search by date, exercise, notes…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-[10px] text-[12.5px] outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                />
              </div>
              {programs.length > 0 && (
                <FormField label="Filter by program" labelHidden>
                  <SelectInput value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
                    <option value="">All programs</option>
                    {programs.map((p) => <option key={p} value={p}>{p}</option>)}
                  </SelectInput>
                </FormField>
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
                style={{ background: 'rgba(163,55,87,0.1)', color: '#852E4E', border: '1px solid rgba(163,55,87,0.25)' }}>
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

// ── Calendar heatmap ────────────────────────────────────────────────────────
//
// A year of training at a glance. Built from the same week buckets as the
// charts, so a day the heatmap calls trained is a day the session list has.
// Columns are Monday–Sunday, matching weekBuckets, and the padding days of the
// first/last week are rendered but never counted.

function CalendarHeatmapPanel({ days, range }: { days: HeatmapDay[]; range: DateRange }) {
  const weeks = useMemo(() => {
    const out: HeatmapDay[][] = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    return out;
  }, [days]);

  const maxVolume = Math.max(0, ...days.map((d) => d.volume));
  const maxSessions = Math.max(0, ...days.map((d) => d.sessions));
  const scale = maxVolume > 0 ? maxVolume : maxSessions;
  const tones = [
    'var(--bg-subtle)',
    'rgba(245,158,11,0.16)',
    'rgba(245,158,11,0.32)',
    'rgba(245,158,11,0.55)',
    'rgba(245,158,11,0.82)',
    '#F59E0B',
  ];
  const toneFor = (day: HeatmapDay) => {
    if (day.sessions === 0) return 0;
    const ratio = scale > 0 ? (maxVolume > 0 ? day.volume / scale : day.sessions / scale) : 0;
    return Math.max(1, Math.min(5, Math.ceil(ratio * 5)));
  };
  const today = dayKey(new Date());

  return (
    <section
      className="rounded-[20px] p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}
      aria-label="Training calendar heatmap"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarIcon size={15} style={{ color: '#F59E0B' }} />
          <h3 className="text-[13px] font-[760] text-gray-900">Training Calendar</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-[650]" style={{ color: 'var(--text-disabled)' }}>
          Less
          {tones.map((t, i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: t, border: '1px solid var(--border)' }} />
          ))}
          More
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-[3px]">
          {weeks.map((week) => (
            <div key={week[0].date} className="flex flex-col gap-[3px]">
              {week.map((day) => {
                const tone = toneFor(day);
                return (
                  <span
                    key={day.date}
                    role="img"
                    aria-label={day.in_range
                      ? `${fmtDate(day.date)}: ${day.sessions} ${day.sessions === 1 ? 'session' : 'sessions'}${day.volume > 0 ? `, ${Math.round(day.volume)} kg` : ''}`
                      : undefined}
                    aria-hidden={!day.in_range}
                    title={day.in_range
                      ? `${fmtDate(day.date)} · ${day.sessions} ${day.sessions === 1 ? 'session' : 'sessions'}${day.volume > 0 ? ` · ${Math.round(day.volume)} kg` : ''}`
                      : undefined}
                    className="h-3 w-3 rounded-[3px] sm:h-3.5 sm:w-3.5"
                    style={{
                      background: day.in_range ? tones[tone] : 'transparent',
                      border: day.date === today && day.in_range
                        ? '1.5px solid #0f172a'
                        : '1px solid var(--border)',
                      opacity: day.in_range ? 1 : 0.35,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
        {fmtDate(range.from)} → {fmtDate(range.to)} · {days.filter((d) => d.in_range).length} days
      </p>
    </section>
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
              {s.duration_minutes ? <span>{s.duration_minutes} min</span> : null}
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
              style={{ background: s.status === 'completed' ? '#10b981' : s.status === 'abandoned' ? '#94A3B8' : '#F59E0B', width: 18, height: 18 }}>
              {s.status === 'completed' ? <CheckCircle2 size={11} color="#fff" /> : <Clock size={10} color="#fff" />}
            </span>
            <button onClick={() => router.push(`/pt-os/clients/${clientId}/workout-log/${s.id}`)}
              className="flex w-full flex-col items-start rounded-[12px] px-3.5 py-2.5 text-left transition hover:opacity-80"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-[12.5px] font-[700] text-gray-900">{fmtDate(s.session_date)}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-slate-500">
                {[s.program_name, s.workout_day].filter(Boolean).join(' · ') || 'Freestyle session'}
                {s.completed_set_count != null ? ` · ${s.completed_set_count} sets` : ''}
                {s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}
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
  const todayKey = dayKey(new Date());

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonth(new Date(year, monthIdx - 1, 1))} aria-label="Previous month" className="flex h-11 w-11 items-center justify-center rounded-[8px]" style={{ background: 'var(--bg-subtle)' }}>
          <ChevronLeft size={14} />
        </button>
        <p className="text-[13px] font-[760] text-gray-900">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        <button onClick={() => setMonth(new Date(year, monthIdx + 1, 1))} aria-label="Next month" className="flex h-11 w-11 items-center justify-center rounded-[8px]" style={{ background: 'var(--bg-subtle)' }}>
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
              className="flex h-11 flex-col items-center justify-center rounded-[8px] text-[11.5px] font-[650] transition"
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
