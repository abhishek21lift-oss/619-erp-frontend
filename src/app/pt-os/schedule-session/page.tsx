'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, List, LayoutGrid, ChevronLeft, ChevronRight,
  Plus, Search, Dumbbell, Users, ClipboardList, AlertTriangle,
  CheckCircle2, X, RefreshCw, Repeat, User, Train,
  MoreHorizontal, Edit3, Trash2, Copy,
} from 'lucide-react';
import { enrolmentState, ENROLMENT_META, type ClientRow } from '@/lib/enrolment';
import { toInputDate, toHHMM } from '@/lib/format';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

import { PremiumModal } from '@/components/premium/PremiumModal';
import { FloatingPanel } from '@/components/premium/FloatingPanel';
import { StatusPill } from '@/components/premium/StatusPill';
import { PremiumTable } from '@/components/premium/PremiumTable';
import { cn } from '@/components/ui/cn';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

/* ────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────── */
type ViewMode = 'calendar' | 'timeline' | 'weekly' | 'daily';

type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

type SessionType = '1-on-1' | 'Group' | 'Assessment';

interface PTSession {
  id: string;
  client: string;
  client_id?: string;
  trainer: string;
  date: string;
  time: string;
  duration: number;
  type: SessionType;
  status: SessionStatus;
  notes: string;
  recurring: boolean;
  clientAvatar: string;
}

interface NewSessionData {
  client: string;
  client_id?: string;
  trainer: string;
  date: string;
  time: string;
  duration: number;
  type: SessionType;
  notes: string;
  recurring: boolean;
}

/* ────────────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────────────── */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => `${String(6 + i).padStart(2, '0')}:00`);

const TYPE_COLORS: Record<SessionType, string> = {
  '1-on-1': '#6366f1',
  'Group': '#f59e0b',
  'Assessment': '#10b981',
};

/* ────────────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────────────── */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// session_date is a Postgres DATE, which node-postgres hands back as a JS Date,
// so res.json() sends "2026-08-02T00:00:00.000Z" rather than "2026-08-02".
// Every day cell on the grid compares against a plain YYYY-MM-DD, so passing
// the raw value straight through meant a booked session matched no day at all
// and simply never appeared — the booking looked like it had not happened.
// start_time is the same story one field over: "06:00:00" against the "06:00"
// the time input and the conflict check both use.
function mapApiSession(s: Record<string, unknown>, trainerArr: { id: string; name: string }[]): PTSession {
  const clientName = String(s.client_name ?? '');
  return {
    id: String(s.id ?? ''),
    client: clientName,
    client_id: s.client_id != null ? String(s.client_id) : '',
    trainer: trainerArr.find((t) => t.id === s.trainer_id)?.name ?? String(s.trainer_id ?? ''),
    date: toInputDate(s.session_date as string | null),
    time: toHHMM(s.start_time as string | null),
    duration: Number(s.duration_minutes) || 60,
    type: capitalize(String(s.session_type ?? '1-on-1')) as SessionType,
    status: (s.status as SessionStatus) ?? 'scheduled',
    notes: String(s.notes ?? ''),
    recurring: Boolean(s.recurrence_id),
    clientAvatar: initials(clientName),
  };
}

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#dc2626', '#14b8a6'];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/* ────────────────────────────────────────────────────────────────────
   LOADING SKELETON
──────────────────────────────────────────────────────────────────── */
function SessionsSkeleton() {
  return (
    <div className="rounded-[20px] p-5 animate-pulse"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
      <div className="h-3 w-32 rounded mb-4" style={{ background: 'var(--bg-subtle)' }} />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-[10px]" style={{ background: 'var(--bg-subtle)' }} />
          <div className="flex-1">
            <div className="h-3 w-28 rounded" style={{ background: 'var(--bg-subtle)' }} />
            <div className="h-2.5 w-40 mt-1.5 rounded" style={{ background: 'var(--bg-subtle)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   PAGE
──────────────────────────────────────────────────────────────────── */
export default function ScheduleSessionPage() {
  return <Guard><AppShell><SchedulePageContent /></AppShell></Guard>;
}

function SchedulePageContent() {
  const [view, setView] = useState<ViewMode>('calendar');
  const [sessions, setSessions] = useState<PTSession[]>([]);
  const [search, setSearch] = useState('');

  const today = todayStr();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSessionPanel, setShowSessionPanel] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  /* ── API State ── */
  const [trainerList, setTrainerList] = useState<{ id: string; name: string }[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState('');
  const { toast } = useToast();

  const fetchSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      setSessionsError('');
      const trainersRes = (await api.pt.trainers()) as { data: any[] };
      const trainerArr = Array.isArray(trainersRes?.data) ? trainersRes.data : [];
      setTrainerList(trainerArr);
      const allSessionsData = trainerArr.length > 0
        ? (await Promise.all(
            trainerArr.map((t: any) =>
              api.pt.sessions({ trainer_id: t.id }).then(r => (r as any)?.data ?? []).catch((err) => { toast.error(err?.message || 'Failed to load sessions'); return []; })
            )
          )).flat()
        : [];
      setSessions(allSessionsData.map((s: Record<string, unknown>) => mapApiSession(s, trainerArr)));
    } catch (err: any) {
      setSessionsError(err?.message || 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);


  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (search && !s.client.toLowerCase().includes(search.toLowerCase()) && !s.trainer.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [sessions, search]);

  const sessionsForDate = useMemo(() => {
    return filteredSessions.filter((s) => s.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  }, [filteredSessions, selectedDate]);

  const weekDates = useMemo(() => {
    const start = new Date(year, month, parseInt(selectedDate.split('-')[2]) || 1);
    const day = start.getDay();
    const diff = start.getDate() - day;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(diff + i);
      return d.toISOString().split('T')[0];
    });
  }, [year, month, selectedDate]);

  const navigateMonth = (dir: number) => {
    setCurrentDate(new Date(year, month + dir, 1));
  };

  /* ── Clients for modal ── */
  const [modalClients, setModalClients] = useState<ClientRow[]>([]);
  const [modalClientsLoading, setModalClientsLoading] = useState(false);

  // Every client in the studio, not the ones assigned to a trainer.
  //
  // This used to call api.pt.clients({ trainer_id }). Only three of the
  // twenty-two clients have a trainer_id set, and all three of those are
  // expired — so the booking dialog listed three expired people and hid every
  // active client. There was no way to book a session for someone currently
  // training, which is the entire purpose of the screen.
  const fetchClients = useCallback(async () => {
    try {
      setModalClientsLoading(true);
      const clientsRes = await api.pt.clients();
      const clients = clientsRes.data as ClientRow[];
      setModalClients(Array.isArray(clients) ? clients : []);
    } catch {
      setModalClients([]);
    } finally {
      setModalClientsLoading(false);
    }
  }, []);

  const handleCreateSession = async (data: NewSessionData) => {
    const hasConflict = sessions.some(
      (s) => s.date === data.date && s.trainer === data.trainer && s.time === data.time && s.status === 'scheduled'
    );
    if (hasConflict) {
      setConflict(true);
      return;
    }
    setConflict(false);

    // The dialog fills this in from the studio's own trainer, so reaching here
    // means the studio has no trainer record at all — which is a setup problem,
    // not something to fix by picking one.
    const trainerObj = trainerList.find((t) => t.name === data.trainer) ?? trainerList[0];
    if (!trainerObj) {
      toast.error('This studio has no trainer set up yet, so a session cannot be booked.');
      return;
    }

    try {
      const res = await api.pt.createSession({
        trainer_id: trainerObj.id,
        client_id: data.client_id,
        title: 'PT Session',
        date: data.date,
        start_time: data.time,
        notes: data.notes,
        duration_minutes: data.duration,
        session_type: data.type.toLowerCase(),
        recurring: data.recurring,
      });
      const created = Array.isArray(res?.data) ? res.data : [res?.data];
      const newSessions = (created as Record<string, unknown>[])
        .filter(Boolean)
        .map((s) => mapApiSession({ ...s, client_name: data.client }, trainerList));
      setSessions((prev) => [...newSessions, ...prev]);
      setShowCreateModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not book the session.');
    }
  };

  const updateSessionStatus = async (id: string, status: SessionStatus) => {
    const prevSessions = sessions;
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    try {
      await api.pt.updateSession(id, { status });
    } catch (err: unknown) {
      setSessions(prevSessions);
      toast.error(err instanceof Error ? err.message : 'Could not update the session.');
    }
  };

  return (
    <div>
      {/* ── HEADER ── */}
      {/* Header — in normal flow on the page background (no sticky bar). */}
      <div>
        <div className="mx-auto max-w-screen-xl py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                  <Calendar size={16} style={{ color: '#F59E0B' }} />
                </div>
                <div>
                  <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>Schedule Session</h1>
                  <p className="text-[11px] font-[600] uppercase tracking-[0.08em]" style={{ color: 'rgb(148,163,184)' }}>
                    Personal Training / <span style={{ color: '#F59E0B' }}>Schedule Session</span>
                  </p>
                </div>
              </div>
            </div>
            <Button variant="primary" iconLeft={<Plus size={14} />} onClick={() => setShowCreateModal(true)}>
              Book Session
            </Button>
          </div>

          {/* View Toggles */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-[12px] p-0.5"
              style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
              {([
                { id: 'calendar' as ViewMode, label: 'Calendar', icon: <Calendar size={12} /> },
                { id: 'timeline' as ViewMode, label: 'Timeline', icon: <Clock size={12} /> },
                { id: 'weekly' as ViewMode, label: 'Weekly', icon: <LayoutGrid size={12} /> },
                { id: 'daily' as ViewMode, label: 'Daily', icon: <List size={12} /> },
              ]).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className="flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[11px] font-[660] transition-all"
                  style={{
                    background: view === v.id ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'transparent',
                    color: view === v.id ? '#fff' : 'rgb(148,163,184)',
                    boxShadow: view === v.id ? '0 2px 8px rgba(220,38,38,0.2)' : 'none',
                  }}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex flex-1 min-w-[180px] max-w-[260px] items-center gap-2 rounded-[12px] px-3 py-1.5"
              style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
              <Search size={12} style={{ color: 'rgb(148,163,184)' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sessions…"
                className="flex-1 bg-transparent text-[12px] font-[500] outline-none" style={{ color: 'rgb(15,23,42)' }} />
            </div>

            {/* Date Nav */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => navigateMonth(-1)} className="flex h-7 w-7 items-center justify-center rounded-[8px] transition hover:bg-black/5">
                <ChevronLeft size={13} style={{ color: 'rgb(100,116,139)' }} />
              </button>
              <span className="text-[13px] font-[680] min-w-[140px] text-center" style={{ color: 'rgb(15,23,42)' }}>
                {MONTHS[month]} {year}
              </span>
              <button onClick={() => navigateMonth(1)} className="flex h-7 w-7 items-center justify-center rounded-[8px] transition hover:bg-black/5">
                <ChevronRight size={13} style={{ color: 'rgb(100,116,139)' }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="mx-auto max-w-screen-xl py-6">
        {sessionsLoading ? (
          <SessionsSkeleton />
        ) : sessionsError ? (
          <div className="rounded-[20px] p-8 text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[16px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                <RefreshCw size={22} style={{ color: '#F59E0B' }} />
              </div>
            </div>
            <h3 className="text-[16px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Failed to load sessions</h3>
            <p className="mt-1 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>{sessionsError}</p>
            <Button variant="primary" iconLeft={<RefreshCw size={13} />} onClick={fetchSessions} className="mt-4">
              Retry
            </Button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ── CALENDAR VIEW ── */}
            {view === 'calendar' && (
              <m.div key="calendar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                {/* Calendar Grid */}
                <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {WEEKDAYS.map((d) => (
                      <div key={d} className="text-center text-[11px] font-[700] uppercase tracking-wider py-2" style={{ color: 'rgb(148,163,184)' }}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-[54px] sm:h-[68px]" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isSelected = selectedDate === dateStr;
                      const isToday = dateStr === today;
                      const daySessions = filteredSessions.filter((s) => s.date === dateStr);
                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDate(dateStr)}
                          className={cn(
                            'relative rounded-[12px] p-1 text-left transition-all',
                          )}
                          style={{
                            background: isSelected ? 'linear-gradient(135deg,#F59E0B,#D97706)' : isToday ? 'rgba(220,38,38,0.06)' : 'transparent',
                            border: isToday && !isSelected ? '1.5px solid rgba(220,38,38,0.20)' : '1.5px solid transparent',
                            minHeight: 54,
                          }}
                        >
                          <span className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-[700]',
                            isSelected ? 'text-white' : '',
                          )}
                            style={{ color: isSelected ? '#fff' : 'rgb(15,23,42)' }}>
                            {day}
                          </span>
                          {daySessions.length > 0 && (
                            <div className="flex gap-0.5 mt-0.5 flex-wrap">
                              {daySessions.slice(0, 3).map((s) => (
                                <div key={s.id}
                                  className="h-1 w-1.5 rounded-full"
                                  style={{ background: s.status === 'scheduled' ? '#F59E0B' : s.status === 'completed' ? '#10b981' : '#9ca3af' }}
                                />
                              ))}
                              {daySessions.length > 3 && (
                                <span className="text-[8px] font-[700]" style={{ color: 'rgb(148,163,184)' }}>+{daySessions.length - 3}</span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sessions for selected date */}
                <div>
                  <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                    <p className="text-[12px] font-[700] uppercase tracking-wider mb-4" style={{ color: 'rgb(148,163,184)' }}>
                      Sessions · {selectedDate}
                    </p>
                    {sessionsForDate.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] mb-3" style={{ background: 'rgba(220,38,38,0.08)' }}>
                          <Calendar size={20} style={{ color: '#F59E0B' }} />
                        </div>
                        <p className="text-[13px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>No sessions scheduled</p>
                        <p className="text-[11px] mt-1" style={{ color: 'rgb(203,213,225)' }}>Book a session to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sessionsForDate.map((session, idx) => (
                          <m.div
                            key={session.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="flex items-center gap-3 rounded-[14px] p-3.5 transition-all cursor-pointer hover:bg-black/[0.02]"
                            style={{ background: 'var(--bg-subtle)', border: '1px solid rgba(15,23,42,0.06)' }}
                            onClick={() => setShowSessionPanel(session.id)}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-[700] text-white"
                              style={{ background: AVATAR_COLORS[parseInt(session.id) % AVATAR_COLORS.length] }}>
                              {session.clientAvatar}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12.5px] font-[680]" style={{ color: 'rgb(15,23,42)' }}>{session.client}</p>
                              <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>{session.time} · {session.duration}min · {session.trainer}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]"
                                style={{ background: `${TYPE_COLORS[session.type]}12`, color: TYPE_COLORS[session.type] }}>
                                {session.type}
                              </span>
                              <StatusPill status={session.status} />
                            </div>
                          </m.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </m.div>
            )}

            {/* ── TIMELINE VIEW ── */}
            {view === 'timeline' && (
              <m.div key="timeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <p className="text-[12px] font-[700] uppercase tracking-wider mb-5" style={{ color: 'rgb(148,163,184)' }}>
                    Timeline · {selectedDate}
                  </p>
                  <div className="relative">
                    <div className="absolute left-[15px] top-0 bottom-0 w-0.5" style={{ background: 'var(--bg-subtle)' }} />
                    {sessionsForDate.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] mb-3" style={{ background: 'rgba(220,38,38,0.08)' }}>
                          <Clock size={20} style={{ color: '#F59E0B' }} />
                        </div>
                        <p className="text-[13px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>No sessions on this day</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sessionsForDate.map((session, idx) => (
                          <m.div
                            key={session.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.06 }}
                            className="relative flex gap-5 cursor-pointer group"
                            onClick={() => setShowSessionPanel(session.id)}
                          >
                            <div className="flex flex-col items-center shrink-0 w-[60px]">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 z-10"
                                style={{
                                  background: session.status === 'completed' ? '#10b981' : session.status === 'cancelled' ? '#9ca3af' : '#fff',
                                  borderColor: session.status === 'completed' ? '#10b981' : session.status === 'cancelled' ? '#9ca3af' : '#F59E0B',
                                }}>
                                {session.status === 'completed' ? <CheckCircle2 size={12} color="white" /> : <span className="text-[10px] font-[800]" style={{ color: '#F59E0B' }}>{session.time.split(':')[0]}</span>}
                              </div>
                              <span className="mt-1 text-[10px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>{session.time}</span>
                            </div>
                            <div className="flex-1 rounded-[14px] p-3.5 transition-all border"
                              style={{ background: 'var(--bg-card)', borderColor: 'rgba(0,0,0,0.07)' }}>
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{session.client}</p>
                                  <p className="text-[11px] mt-0.5" style={{ color: 'rgb(148,163,184)' }}>
                                    {session.trainer} · {session.duration}min · {session.type}
                                  </p>
                                </div>
                                <StatusPill status={session.status} />
                              </div>
                              {session.notes && (
                                <p className="mt-2 text-[11.5px] italic" style={{ color: 'rgb(148,163,184)' }}>{session.notes}</p>
                              )}
                            </div>
                          </m.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </m.div>
            )}

            {/* ── WEEKLY VIEW ── */}
            {view === 'weekly' && (
              <m.div key="weekly" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="rounded-[20px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <div className="grid grid-cols-7 border-b" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
                    {WEEKDAYS.map((day, i) => {
                      const dateStr = weekDates[i];
                      const isToday = dateStr === today;
                      return (
                        <div key={day} className={cn('p-3 text-center border-r', i === 6 && 'border-r-0')}
                          style={{ borderColor: 'rgba(0,0,0,0.07)', background: isToday ? 'rgba(220,38,38,0.04)' : 'transparent' }}>
                          <p className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>{day}</p>
                          <p className={cn('text-[16px] font-[800] mt-0.5', isToday && 'text-[#F59E0B]')}
                            style={{ color: isToday ? '#F59E0B' : 'rgb(15,23,42)' }}>
                            {dateStr.split('-')[2]}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-7">
                    {weekDates.map((dateStr, colIdx) => {
                      const daySessions = filteredSessions.filter((s) => s.date === dateStr);
                      return (
                        <div key={dateStr} className={cn('p-2 border-r min-h-[200px]', colIdx === 6 && 'border-r-0')}
                          style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
                          {daySessions.length === 0 ? (
                            <p className="text-[10px] text-center mt-6" style={{ color: 'rgb(203,213,225)' }}>No sessions</p>
                          ) : (
                            <div className="space-y-1">
                              {daySessions.map((s) => (
                                <div key={s.id}
                                  className="rounded-[8px] p-2 cursor-pointer transition-all hover:opacity-80"
                                  style={{
                                    background: s.status === 'scheduled' ? 'rgba(220,38,38,0.10)' : s.status === 'completed' ? 'rgba(16,185,129,0.10)' : 'rgba(156,163,175,0.10)',
                                    border: '1px solid rgba(15,23,42,0.06)',
                                  }}
                                  onClick={() => setShowSessionPanel(s.id)}
                                >
                                  <p className="text-[10px] font-[700] truncate" style={{ color: 'rgb(15,23,42)' }}>{s.client}</p>
                                  <p className="text-[9px]" style={{ color: 'rgb(148,163,184)' }}>{s.time} · {s.duration}min</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </m.div>
            )}

            {/* ── DAILY VIEW ── */}
            {view === 'daily' && (
              <m.div key="daily" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                  <PremiumTable
                    columns={[
                      { key: 'client', header: 'Client', render: (s: PTSession) => (
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[10px] font-[700] text-white"
                            style={{ background: AVATAR_COLORS[parseInt(s.id) % AVATAR_COLORS.length] }}>{s.clientAvatar}</div>
                          <div>
                            <p className="text-[12.5px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{s.client}</p>
                          </div>
                        </div>
                      )},
                      { key: 'trainer', header: 'Trainer', render: (s: PTSession) => (
                        <div className="flex items-center gap-2">
                          <Train size={12} style={{ color: 'rgb(148,163,184)' }} />
                          <span className="text-[12px]" style={{ color: 'rgb(100,116,139)' }}>{s.trainer}</span>
                        </div>
                      )},
                      { key: 'time', header: 'Time', render: (s: PTSession) => (
                        <div className="flex items-center gap-2">
                          <Clock size={12} style={{ color: 'rgb(148,163,184)' }} />
                          <span className="text-[12px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>{s.time}</span>
                          <span className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>({s.duration}min)</span>
                        </div>
                      )},
                      { key: 'type', header: 'Type', render: (s: PTSession) => (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]"
                          style={{ background: `${TYPE_COLORS[s.type]}12`, color: TYPE_COLORS[s.type] }}>
                          {s.type}
                        </span>
                      )},
                      { key: 'status', header: 'Status', render: (s: PTSession) => <StatusPill status={s.status} /> },
                    ]}
                    data={sessionsForDate}
                    keyExtractor={(s) => s.id}
                    emptyMessage="No sessions found"
                  />
                  <div>
                    <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                      <p className="text-[12px] font-[700] uppercase tracking-wider mb-3" style={{ color: 'rgb(148,163,184)' }}>Trainer Availability</p>
                      <div className="space-y-3">
                        {trainerList.map((trainer, i) => {
                          const busySessions = sessionsForDate.filter((s) => s.trainer === trainer.name && s.status === 'scheduled');
                          return (
                            <div key={trainer.id} className="flex items-center gap-3">
                              <div className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[9px] font-[700] text-white"
                                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                                {initials(trainer.name)}
                              </div>
                              <div className="flex-1">
                                <p className="text-[11.5px] font-[650]" style={{ color: 'rgb(15,23,42)' }}>{trainer.name}</p>
                              </div>
                              {busySessions.length > 0 ? (
                                <span className="text-[10px] font-[600] rounded-full px-2 py-0.5" style={{ background: 'rgba(245,158,11,0.10)', color: '#d97706' }}>
                                  {busySessions.length} booked
                                </span>
                              ) : (
                                <span className="text-[10px] font-[600] rounded-full px-2 py-0.5" style={{ background: 'rgba(16,185,129,0.10)', color: '#059669' }}>
                                  Available
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── CREATE SESSION MODAL ── */}
      <CreateSessionModal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setConflict(false); }}
        onConfirm={handleCreateSession}
        conflict={conflict}
        onDismissConflict={() => setConflict(false)}
        trainerOptions={trainerList.map((t) => t.name)}
        clientOptions={modalClients}
        clientOptionsLoading={modalClientsLoading}
        onOpened={fetchClients}
      />

      {/* ── SESSION DETAIL PANEL ── */}
      <SessionDetailPanel
        sessionId={showSessionPanel}
        sessions={sessions}
        onClose={() => setShowSessionPanel(null)}
        onUpdateStatus={updateSessionStatus}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   CREATE SESSION MODAL
──────────────────────────────────────────────────────────────────── */
function CreateSessionModal({
  open, onClose, onConfirm, conflict, onDismissConflict,
  trainerOptions, clientOptions, clientOptionsLoading, onOpened,
}: {
  open: boolean; onClose: () => void; onConfirm: (data: NewSessionData) => void | Promise<void>;
  conflict: boolean; onDismissConflict: () => void;
  trainerOptions: string[]; clientOptions: ClientRow[]; clientOptionsLoading: boolean;
  onOpened: () => void;
}) {
  const [form, setForm] = useState<NewSessionData>({
    client: '', client_id: '', trainer: '', date: new Date().toISOString().split('T')[0], time: '06:00',
    duration: 60, type: '1-on-1', notes: '', recurring: false,
  });
  const [step, setStep] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // A studio has one trainer: its owner. The dialog used to ask which, from a
  // list of one, and made it required — so booking took an extra tap that had
  // no alternative answer. It is now filled in and shown as fact.
  const defaultTrainer = trainerOptions[0] ?? '';

  useEffect(() => {
    if (!open) return;
    onOpened();
    setForm((f) => (f.trainer === defaultTrainer ? f : { ...f, trainer: defaultTrainer }));
    // onOpened is a useCallback with no deps; re-running on identity would refetch forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTrainer]);

  // Reset only once the modal has actually closed, not the instant a confirm
  // or cancel is clicked — this used to run inline in handleConfirm, which
  // snapped the dialog back to the step 1 form the moment "Confirm Booking"
  // was clicked, before the booking request had even finished. It looked
  // exactly like the click had been undone. The 200ms delay lets the modal's
  // own fade-out finish before the fields underneath it change.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setStep(1);
      setClientSearch('');
      setForm({ client: '', client_id: '', trainer: defaultTrainer, date: new Date().toISOString().split('T')[0], time: '06:00', duration: 60, type: '1-on-1', notes: '', recurring: false });
    }, 200);
    return () => clearTimeout(t);
  }, [open, defaultTrainer]);

  const handleConfirm = async () => {
    if (step === 1) {
      if (!form.client || !form.time) return;
      setStep(2);
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(form);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Twenty-two names in a two-column grid is a wall. Search narrows it; the
  // full list is still the default, because most studios have few enough to
  // scan.
  const resolvedClients = clientSearch.trim()
    ? clientOptions.filter((c) => c.name.toLowerCase().includes(clientSearch.trim().toLowerCase()))
    : clientOptions;

  return (
    <PremiumModal
      open={open}
      onClose={handleClose}
      title={step === 1 ? 'Book PT Session' : 'Review & Confirm'}
      subtitle={step === 1 ? 'Enter session details' : 'Verify booking details'}
      icon={<Calendar size={16} />}
      size="lg"
      footer={
        <div className="flex gap-3 w-full justify-end">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={submitting}>Cancel</Button>
          {(step === 1 || conflict) ? (
            <Button variant="primary" size="sm" onClick={handleConfirm} disabled={!form.client || !form.time || submitting}>
              {step === 1 ? 'Continue' : submitting ? 'Booking…' : 'Book Anyway'}
            </Button>
          ) : (
            <Button variant="success" size="sm" iconLeft={<CheckCircle2 size={13} />} onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </Button>
          )}
        </div>
      }
    >
      {conflict && (
        <m.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2.5 rounded-[12px] p-3.5 text-[12.5px] font-[600]"
          style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', color: '#d97706' }}>
          <AlertTriangle size={14} /> Booking conflict detected! This time slot overlaps with an existing session.
        </m.div>
      )}

      {step === 1 ? (
        <div className="space-y-4">
          {/* Client */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Client *</p>
              {!clientOptionsLoading && (
                <span className="text-[11px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>
                  {resolvedClients.length} of {clientOptions.length}
                </span>
              )}
            </div>

            {clientOptions.length > 6 && (
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search clients…"
                className="mb-2 h-[44px] w-full rounded-[10px] px-3 text-[12.5px] outline-none"
                style={{ background: '#f9fafb', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)' }}
              />
            )}

            {clientOptionsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-9 rounded-[10px] animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
                ))}
              </div>
            ) : resolvedClients.length === 0 ? (
              <p className="rounded-[10px] px-3 py-3 text-[12px]" style={{ background: '#f9fafb', color: 'rgb(148,163,184)' }}>
                {clientSearch.trim() ? `No client matches "${clientSearch.trim()}".` : 'No clients yet.'}
              </p>
            ) : (
              <div className="grid max-h-[220px] grid-cols-2 gap-2 overflow-y-auto">
                {resolvedClients.map((c) => {
                  const selected = form.client_id === c.id;
                  // Booking a session for someone whose package expired, or who
                  // was never enrolled, is allowed — a trainer may be booking
                  // the session that renews them. It just must not be a
                  // surprise, so the state is on the tile rather than found out
                  // afterwards.
                  const meta = ENROLMENT_META[enrolmentState(c)];
                  return (
                    <button key={c.id} type="button" onClick={() => setForm((f) => ({ ...f, client: c.name, client_id: c.id }))}
                      className="flex flex-col items-start gap-1 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-[600] transition-all"
                      style={{
                        background: selected ? 'rgba(2,113,235,0.08)' : '#f9fafb',
                        border: selected ? '1.5px solid rgba(2,113,235,0.45)' : '1.5px solid rgba(15,23,42,0.09)',
                        color: selected ? '#0059CE' : 'rgb(100,116,139)',
                      }}
                    >
                      <span className="w-full truncate">{c.name}</span>
                      <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-[700] uppercase tracking-wide"
                        style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trainer — not a choice. The studio belongs to one trainer, so this
              is shown as fact rather than asked for. */}
          <div>
            <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Trainer</p>
            <div className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-[12px] font-[600]"
              style={{ background: '#f9fafb', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(71,85,105)' }}>
              <User size={13} style={{ color: 'rgb(148,163,184)' }} />
              {defaultTrainer || 'No trainer on this studio'}
            </div>
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Date</p>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-[10px] px-3 py-2.5 text-[12.5px] font-[500] outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)' }} />
            </div>
            <div>
              <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Time</p>
              <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="w-full rounded-[10px] px-3 py-2.5 text-[12.5px] font-[500] outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)' }} />
            </div>
            <div>
              <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Duration</p>
              <select value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: parseInt(e.target.value) }))}
                className="w-full rounded-[10px] px-3 py-2.5 text-[12.5px] font-[500] outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)' }}>
                {[30, 45, 60, 75, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          {/* Session Type */}
          <div>
            <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Session Type</p>
            <div className="grid grid-cols-3 gap-2">
              {(['1-on-1', 'Group', 'Assessment'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className="rounded-[10px] px-3 py-2.5 text-[12px] font-[600] transition-all"
                  style={{
                    background: form.type === t ? 'rgba(220,38,38,0.10)' : '#f9fafb',
                    border: form.type === t ? '1.5px solid rgba(220,38,38,0.30)' : '1.5px solid rgba(15,23,42,0.09)',
                    color: form.type === t ? '#F59E0B' : 'rgb(100,116,139)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Notes</p>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Session focus, client notes, or instructions…"
              className="w-full rounded-[10px] px-3 py-2.5 text-[12.5px] font-[500] outline-none resize-none"
              style={{ background: 'var(--bg-subtle)', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)', minHeight: 60 }}
            />
          </div>

          {/* Recurring */}
          <button type="button" onClick={() => setForm((f) => ({ ...f, recurring: !f.recurring }))}
            className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-[12px] font-[600] transition-all"
            style={{
              background: form.recurring ? 'rgba(220,38,38,0.08)' : '#f9fafb',
              border: form.recurring ? '1.5px solid rgba(220,38,38,0.25)' : '1.5px solid rgba(15,23,42,0.09)',
              color: form.recurring ? '#F59E0B' : 'rgb(100,116,139)',
            }}>
            <Repeat size={13} />
            {form.recurring ? 'Recurring weekly' : 'Make this a recurring session'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {[
            { k: 'Client', v: form.client },
            { k: 'Trainer', v: form.trainer },
            { k: 'Date', v: form.date },
            { k: 'Time', v: form.time },
            { k: 'Duration', v: `${form.duration} min` },
            { k: 'Type', v: form.type },
            { k: 'Recurring', v: form.recurring ? 'Yes (weekly)' : 'No' },
            { k: 'Notes', v: form.notes || '—' },
          ].map((item) => (
            <div key={item.k} className="flex justify-between py-1.5 border-b" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
              <span className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>{item.k}</span>
              <span className="text-[12px] font-[650]" style={{ color: 'rgb(15,23,42)' }}>{item.v}</span>
            </div>
          ))}
        </div>
      )}
    </PremiumModal>
  );
}

/* ────────────────────────────────────────────────────────────────────
   SESSION DETAIL PANEL
──────────────────────────────────────────────────────────────────── */
function SessionDetailPanel({
  sessionId, sessions, onClose, onUpdateStatus,
}: {
  sessionId: string | null; sessions: PTSession[]; onClose: () => void;
  onUpdateStatus: (id: string, status: SessionStatus) => void;
}) {
  const session = sessions.find((s) => s.id === sessionId);

  if (!session) return null;

  return (
    <FloatingPanel
      open={!!sessionId}
      onClose={onClose}
      title={session.client}
      subtitle={`Session with ${session.trainer}`}
      icon={<Dumbbell size={16} />}
      size="md"
    >
      <div className="space-y-5">
        {/* Status & Type */}
        <div className="flex items-center gap-3">
          <StatusPill status={session.status} pulse={session.status === 'scheduled'} />
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]"
            style={{ background: `${TYPE_COLORS[session.type]}12`, color: TYPE_COLORS[session.type] }}>
            {session.type}
          </span>
          {session.recurring && (
            <span className="flex items-center gap-1 text-[11px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>
              <Repeat size={11} /> Weekly
            </span>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Date', value: session.date },
            { label: 'Time', value: session.time },
            { label: 'Duration', value: `${session.duration} minutes` },
            { label: 'Client', value: session.client },
            { label: 'Trainer', value: session.trainer },
            { label: 'ID', value: `#${session.id}` },
          ].map((item) => (
            <div key={item.label} className="rounded-[10px] p-3" style={{ background: 'var(--bg-subtle)' }}>
              <p className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>{item.label}</p>
              <p className="mt-1 text-[13px] font-[650]" style={{ color: 'rgb(15,23,42)' }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Notes */}
        {session.notes && (
          <div className="rounded-[12px] p-3.5" style={{ background: 'var(--bg-subtle)', border: '1px solid rgba(15,23,42,0.06)' }}>
            <p className="text-[10px] font-[700] uppercase tracking-wider mb-1.5" style={{ color: 'rgb(148,163,184)' }}>Session Notes</p>
            <p className="text-[12.5px]" style={{ color: 'rgb(100,116,139)' }}>{session.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div>
          <p className="text-[10px] font-[700] uppercase tracking-wider mb-2" style={{ color: 'rgb(148,163,184)' }}>Update Status</p>
          <div className="flex gap-2">
            {(['scheduled', 'completed', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => { onUpdateStatus(session.id, status); onClose(); }}
                className={cn(
                  'flex-1 rounded-[10px] px-3 py-2 text-[11px] font-[700] transition-all',
                  session.status === status && 'ring-2',
                )}
                style={{
                  background: status === 'completed' ? 'rgba(16,185,129,0.10)' : status === 'cancelled' ? 'rgba(239,68,68,0.10)' : 'rgba(99,102,241,0.10)',
                  color: status === 'completed' ? '#059669' : status === 'cancelled' ? '#ef4444' : '#6366f1',
                  borderColor: status === 'completed' ? '#10b981' : status === 'cancelled' ? '#ef4444' : '#6366f1',
                  border: '1.5px solid transparent',
                  ...(session.status === status ? { borderColor: status === 'completed' ? '#10b981' : status === 'cancelled' ? '#ef4444' : '#6366f1' } : {}),
                }}
              >
                {status === 'completed' ? 'Complete' : status === 'cancelled' ? 'Cancel' : 'Schedule'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}
