'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  CalendarCheck, ChevronLeft, ChevronRight, Clock, User, Dumbbell, Phone,
  CheckCircle2, XCircle, AlertTriangle, Loader2, CalendarPlus, CalendarDays, UserCog,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, EmptyState, PullToRefresh } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import type { PtSession, PtSessionStatus } from '@/lib/api';
import { useToast } from '@/lib/toast';

/* ── Date helpers ──────────────────────────────────────────────────────────
   All date maths is done on LOCAL calendar days formatted as YYYY-MM-DD.
   Going via toISOString() would convert to UTC first and shift the day for
   anyone east/west of GMT — in IST that silently lands every session on the
   wrong date. */
function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

/** Monday of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = (out.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(out, -dow);
}

function fmtTime(t?: string | null): string {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

function fmtDayLabel(ymd: string): string {
  const today = toYmd(new Date());
  const tomorrow = toYmd(addDays(new Date(), 1));
  const yesterday = toYmd(addDays(new Date(), -1));
  if (ymd === today) return 'Today';
  if (ymd === tomorrow) return 'Tomorrow';
  if (ymd === yesterday) return 'Yesterday';
  const [y, mo, d] = ymd.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
}

/** "today" / "tomorrow" stand alone, but a named date needs a preposition —
 *  "no sessions today" vs "no sessions on Monday, 3 Aug". */
function fmtDayPhrase(ymd: string): string {
  const label = fmtDayLabel(ymd);
  const relative = label === 'Today' || label === 'Tomorrow' || label === 'Yesterday';
  return relative ? label.toLowerCase() : `on ${label}`;
}

/* ── Status config — values match the pt_sessions CHECK constraint
   ('scheduled','completed','cancelled','no_show'), which is the only set
   the database will accept. Note the underscore in no_show. */
const STATUS_META: Record<PtSessionStatus, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  no_show:   { label: 'No Show',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function SessionRow({
  session, onStatus, busy,
}: {
  session: PtSession;
  onStatus: (status: PtSessionStatus) => void;
  busy: boolean;
}) {
  const meta = STATUS_META[session.status] ?? STATUS_META.scheduled;
  const isScheduled = session.status === 'scheduled';

  return (
    <div
      className="rounded-[16px] p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
    >
      <div className="flex items-start gap-3.5">
        {/* Time rail */}
        <div className="flex w-[74px] shrink-0 flex-col items-center rounded-[12px] py-2"
          style={{ background: meta.bg }}>
          <span className="text-[12.5px] font-[800] leading-tight" style={{ color: meta.color }}>
            {fmtTime(session.start_time)}
          </span>
          {session.duration_minutes ? (
            <span className="mt-0.5 text-[10px] font-[650]" style={{ color: meta.color, opacity: 0.85 }}>
              {session.duration_minutes} min
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[13.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>
              {session.client_name || 'Unknown client'}
            </p>
            <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-[750] uppercase tracking-wide"
              style={{ background: meta.bg, color: meta.color }}>
              {meta.label}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {session.session_type && (
              <span className="flex items-center gap-1 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                <Dumbbell size={11} />{session.session_type}
              </span>
            )}
            {session.end_time && (
              <span className="flex items-center gap-1 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                <Clock size={11} />ends {fmtTime(session.end_time)}
              </span>
            )}
            {session.client_mobile && (
              <a href={`tel:${session.client_mobile}`}
                className="flex items-center gap-1 text-[11.5px] font-[600] hover:underline"
                style={{ color: 'var(--text-muted)' }}>
                <Phone size={11} />{session.client_mobile}
              </a>
            )}
          </div>

          {session.notes && (
            <p className="mt-2 text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{session.notes}</p>
          )}

          {isScheduled && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" disabled={busy}
                iconLeft={busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                onClick={() => onStatus('completed')}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}>
                Complete
              </Button>
              <Button size="sm" variant="outline" disabled={busy}
                iconLeft={<AlertTriangle size={12} />} onClick={() => onStatus('no_show')}>
                No Show
              </Button>
              <Button size="sm" variant="ghost" disabled={busy}
                iconLeft={<XCircle size={12} />} onClick={() => onStatus('cancelled')}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MySchedulePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<string>(() => toYmd(new Date()));
  const [busyId, setBusyId] = useState<string | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const from = toYmd(weekDays[0]);
  const to = toYmd(weekDays[6]);

  const schedule = useAsync(() => api.pt.mySessions({ from, to }), [from, to]);
  const sessions = useMemo(() => schedule.data?.data ?? [], [schedule.data]);
  const trainerLinked = schedule.data?.trainer_linked ?? true;

  const byDay = useMemo(() => {
    const map: Record<string, PtSession[]> = {};
    for (const s of sessions) {
      const key = String(s.session_date).slice(0, 10);
      (map[key] ||= []).push(s);
    }
    return map;
  }, [sessions]);

  const daySessions = byDay[selectedDay] ?? [];

  const weekStats = useMemo(() => ({
    total: sessions.length,
    completed: sessions.filter((s) => s.status === 'completed').length,
    upcoming: sessions.filter((s) => s.status === 'scheduled').length,
    missed: sessions.filter((s) => s.status === 'cancelled' || s.status === 'no_show').length,
  }), [sessions]);

  const shiftWeek = useCallback((delta: number) => {
    const next = addDays(weekStart, delta * 7);
    setWeekStart(next);
    // Keep the selection on the same weekday in the newly shown week, so
    // paging back and forth doesn't silently strand the agenda on a day
    // that is no longer visible in the strip.
    const dow = (new Date(`${selectedDay}T00:00:00`).getDay() + 6) % 7;
    setSelectedDay(toYmd(addDays(next, dow)));
  }, [weekStart, selectedDay]);

  const jumpToToday = useCallback(() => {
    setWeekStart(startOfWeek(new Date()));
    setSelectedDay(toYmd(new Date()));
  }, []);

  const updateStatus = async (session: PtSession, status: PtSessionStatus) => {
    setBusyId(session.id);
    try {
      await api.pt.updateSession(session.id, { status });
      toast.success(`Marked ${STATUS_META[status].label.toLowerCase()}.`);
      schedule.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not update this session.');
    } finally {
      setBusyId(null);
    }
  };

  const monthLabel = `${weekDays[0].toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const todayYmd = toYmd(new Date());

  return (
    <Guard>
      <AppShell>
        <PullToRefresh onRefresh={schedule.refetch}>
          {/* No background or horizontal padding of our own: .shell-main
              (globals.css) already paints the canvas and supplies the page
              gutter + max-width. Re-declaring them here painted a greyer
              --bg-subtle panel on top of --bg-canvas and doubled the side
              padding, so the page sat narrower and a different colour than
              every other screen. */}
          <div className="relative z-10 mx-auto mt-1 w-full max-w-[1600px] pb-6">

              {/* Header */}
              <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px]"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)', boxShadow: '0 8px 28px rgba(99,102,241,0.35)' }}>
                    <CalendarCheck size={24} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-[24px] sm:text-[28px] font-[860] tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
                      My Schedule
                    </h1>
                    <p className="mt-0.5 text-[13px] font-[500]" style={{ color: 'var(--text-muted)' }}>
                      Your own PT sessions, week by week
                    </p>
                  </div>
                </div>
                <Button iconLeft={<CalendarPlus size={15} />}
                  onClick={() => router.push('/pt-os/schedule-session')}
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)', color: '#fff' }}>
                  Book Session
                </Button>
              </m.div>

              {/* Account not linked to a trainer profile — explain rather than
                  show a bare empty agenda that reads as a bug. */}
              {!trainerLinked && schedule.data && (
                <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                  <EmptyState
                    icon={<UserCog size={22} />}
                    title="Your account isn't linked to a trainer profile"
                    description="My Schedule shows the sessions assigned to you as a trainer. Ask an admin to link your login to a trainer, or view the studio-wide list in Session History."
                  />
                  <div className="mt-4 flex justify-center">
                    <Button variant="outline" iconLeft={<CalendarDays size={14} />}
                      onClick={() => router.push('/pt-os/sessions')}>
                      Open Session History
                    </Button>
                  </div>
                </div>
              )}

              {trainerLinked && (
                <>
                  {/* Week navigator */}
                  <div className="mb-4 rounded-[18px] p-4"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <button type="button" onClick={() => shiftWeek(-1)} aria-label="Previous week"
                        className="flex h-8 w-8 items-center justify-center rounded-[9px] transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ border: '1px solid var(--border)' }}>
                        <ChevronLeft size={15} style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{monthLabel}</span>
                        <button type="button" onClick={jumpToToday}
                          className="rounded-full px-2.5 py-1 text-[10.5px] font-[750] uppercase tracking-wide transition-opacity hover:opacity-80"
                          style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                          Today
                        </button>
                      </div>
                      <button type="button" onClick={() => shiftWeek(1)} aria-label="Next week"
                        className="flex h-8 w-8 items-center justify-center rounded-[9px] transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ border: '1px solid var(--border)' }}>
                        <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {weekDays.map((d, i) => {
                        const ymd = toYmd(d);
                        const isSelected = ymd === selectedDay;
                        const isToday = ymd === todayYmd;
                        const count = (byDay[ymd] ?? []).length;
                        return (
                          <button key={ymd} type="button" onClick={() => setSelectedDay(ymd)}
                            className="flex flex-col items-center gap-1 rounded-[12px] py-2 transition-all"
                            style={isSelected
                              ? { background: 'linear-gradient(135deg, #6366f1, #4338ca)', color: '#fff' }
                              : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                            <span className="text-[9.5px] font-[700] uppercase" style={{ opacity: isSelected ? 0.85 : 0.6 }}>
                              {WEEKDAY_INITIALS[i]}
                            </span>
                            <span className="text-[14px] font-[800] leading-none">{d.getDate()}</span>
                            <span className="flex h-1.5 items-center">
                              {count > 0 && (
                                <span className="h-1.5 w-1.5 rounded-full"
                                  style={{ background: isSelected ? '#fff' : '#6366f1' }} />
                              )}
                            </span>
                            {isToday && !isSelected && (
                              <span className="text-[8.5px] font-[800] uppercase tracking-wide" style={{ color: '#6366f1' }}>now</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Week stats */}
                  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'This Week', value: weekStats.total, color: '#6366f1' },
                      { label: 'Upcoming', value: weekStats.upcoming, color: '#3b82f6' },
                      { label: 'Completed', value: weekStats.completed, color: '#10b981' },
                      { label: 'Missed', value: weekStats.missed, color: '#f59e0b' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-[14px] px-4 py-3"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                        <p className="text-[20px] font-[820] tracking-[-0.02em]" style={{ color: s.color }}>
                          {schedule.data ? s.value : '—'}
                        </p>
                        <p className="mt-0.5 text-[10.5px] font-[650] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Agenda for the selected day */}
                  <div className="mb-3 flex items-center gap-2">
                    <User size={14} style={{ color: 'var(--text-muted)' }} />
                    <h2 className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                      {fmtDayLabel(selectedDay)}
                    </h2>
                    <span className="text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                      {daySessions.length} session{daySessions.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {schedule.loading && !schedule.data && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                      <Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} />
                      <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Loading your schedule…</p>
                    </div>
                  )}

                  {schedule.error && !schedule.loading && (
                    <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <EmptyState
                        icon={<AlertTriangle size={22} />}
                        title="Could not load your schedule"
                        description={schedule.error.message}
                      />
                      <div className="mt-4 flex justify-center">
                        <Button variant="outline" onClick={() => schedule.refetch()}>Retry</Button>
                      </div>
                    </div>
                  )}

                  {!schedule.loading && !schedule.error && daySessions.length === 0 && (
                    <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                      <EmptyState
                        icon={<CalendarDays size={22} />}
                        title="Nothing scheduled"
                        description={`You have no sessions ${fmtDayPhrase(selectedDay)}.`}
                      />
                    </div>
                  )}

                  {daySessions.length > 0 && (
                    <div className="space-y-2.5">
                      {daySessions.map((s, i) => (
                        <m.div key={s.id}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.25 }}>
                          <SessionRow
                            session={s}
                            busy={busyId === s.id}
                            onStatus={(status) => updateStatus(s, status)}
                          />
                        </m.div>
                      ))}
                    </div>
                  )}
                </>
              )}
          </div>
        </PullToRefresh>
      </AppShell>
    </Guard>
  );
}
