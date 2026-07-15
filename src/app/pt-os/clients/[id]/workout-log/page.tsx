'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, Plus, Search, List as ListIcon, Calendar as CalendarIcon,
  History, Loader2, AlertCircle, ChevronLeft, ChevronRight, Dumbbell,
  TrendingUp, Flame, CheckCircle2, Clock,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, PremiumAreaChart, PremiumBarChart, PullToRefresh } from '@/components/ui';
import { api } from '@/lib/api';
import type { WorkoutSession, WorkoutProgressPoint, WorkoutVolumePoint } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { fmtDate } from '@/lib/format';

type ViewMode = 'list' | 'calendar' | 'timeline';

const QUICK_EXERCISES = ['Bench Press', 'Squat', 'Deadlift'];

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
      const [clientRes, sessionsRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.workoutLog.sessions.list({ client_id: clientId, limit: 100 }),
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setSessions(sessionsRes?.data ?? []);
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

  const handleNewSession = async () => {
    setCreating(true);
    try {
      const res = await api.progress.workoutLog.sessions.create({ client_id: clientId });
      const newId = res?.data?.id;
      if (!newId) throw new Error('Server did not return a session id.');
      router.push(`/pt-os/clients/${clientId}/workout-log/${newId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not start a new session.');
      setCreating(false);
    }
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
      <div className="mx-auto w-full max-w-4xl px-5 sm:px-8 py-6 space-y-5 pb-24">
        <button onClick={() => router.push(`/pt-os/clients/${clientId}`)}
          className="flex items-center gap-2 text-[12px] font-[600] text-slate-500 transition-colors hover:text-slate-700">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            <ArrowLeft size={13} />
          </div>
          {clientName}
        </button>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
                <Dumbbell size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>Workout Log</span>
            </div>
            <h1 className="text-[26px] sm:text-[30px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
              {clientName}
            </h1>
          </div>
          <Button iconLeft={<Plus size={14} />} loading={creating} disabled={creating} onClick={handleNewSession}
            style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
            New Session
          </Button>
        </div>

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
                { key: 'Best Weight', label: 'Best Weight (kg)', color: '#7c3aed' },
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
