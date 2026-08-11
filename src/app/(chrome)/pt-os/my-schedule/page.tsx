'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  CalendarCheck, ChevronLeft, ChevronRight, User, Dumbbell, Phone, Clock,
  CheckCircle2, XCircle, AlertTriangle, Loader2, CalendarPlus, CalendarDays, UserCog, Play,
} from 'lucide-react';
import Guard from '@/components/Guard';
import ClientAvatar, { initialsOf } from '@/components/pt-os/ClientAvatar';
import { Button, EmptyState, PullToRefresh } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { PtSession, PtSessionStatus, TodayClient } from '@/lib/api';
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
  scheduled: { label: 'Scheduled', color: '#0067e0', bg: 'rgba(0,103,224,0.12)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  no_show:   { label: 'No Show',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * One client on the selected day.
 *
 * Carries two independent things, which is why it is not two components:
 *
 *   the BOOKING  — a pt_sessions row, if one exists. Its status and the
 *                  Complete / No Show / Cancel actions belong to the
 *                  appointment.
 *   the WORKOUT  — Start or Resume, which creates or opens a workout_session.
 *                  Wired exactly as the Today page wires it, because a trainer
 *                  who starts a session from here and from there must land in
 *                  the same place with the same programme pre-filled.
 *
 * A client can have either, both, or only a programme day with neither.
 */
function DayRow({
  client, booking, onStatus, onOpen, busyStatus, starting,
}: {
  client: TodayClient | null;
  booking: PtSession | null;
  onStatus: (status: PtSessionStatus) => void;
  onOpen: () => void;
  busyStatus: boolean;
  starting: boolean;
}) {
  const meta = booking ? (STATUS_META[booking.status] ?? STATUS_META.scheduled) : null;
  const isScheduled = booking?.status === 'scheduled';
  const time = booking?.start_time ?? client?.start_time ?? null;
  const name = client?.client_name || booking?.client_name || 'Unknown client';
  const done = client?.session_status === 'completed';
  const inProgress = client?.session_status === 'in_progress';

  // What the programme says for this weekday. `plan_name` with zero planned
  // exercises is a rest day — still startable, because a trainer may run an
  // ad-hoc session, but it must not read as though a workout is waiting.
  const restDay = !!client && client.planned_exercises === 0;
  const detail = client
    ? (client.plan_name
        ? `${client.plan_name} · ${restDay ? 'rest day' : `${client.planned_exercises} exercise${client.planned_exercises === 1 ? '' : 's'}`}`
        : 'nothing scheduled')
    : (booking?.session_type || 'Booked session');

  return (
    <div
      className="rounded-[16px] p-3.5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
    >
      <div className="flex items-start gap-3">
        {/* The face, in the position the empty time rail used to hold.

            That rail was a 74px filled block carrying the string "—" on every
            programme row — and on a normal weekday most of the roster is
            programme rows, so the largest, leftmost, first-scanned element on
            the screen said nothing on five cards out of five. It was there to
            stop the column jittering between timed and untimed rows, which is
            a real problem; keeping a coloured box to solve it is not. The
            width is now held by something that differs per row.

            Same component and same 44px tile as Today, because a trainer
            moving between the two screens is looking for the same faces. */}
        <ClientAvatar
          name={name}
          photoUrl={client?.client_photo}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[13px] font-[800] text-white"
          style={{ background: restDay ? 'var(--text-muted)' : 'linear-gradient(135deg,#0067e0,#0059ce)' }}
        >
          {initialsOf(name)}
        </ClientAvatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[14px] font-[760]" style={{ color: 'var(--text-primary)' }}>
              {name}
            </p>
            {meta && (
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-[750] uppercase tracking-wide"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.label}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {/* The time, now shown only when there is one. It reads as a chip
                rather than a rail: present on the rows that have an hour,
                absent — not blank — on the rows that do not.

                tabular-nums so 6:00 and 11:30 occupy the same width and the
                column of times stays aligned down the list. */}
            {time && (
              <span
                className="inline-flex items-center gap-1 rounded-[7px] px-1.5 py-0.5 text-[11px] font-[800] tabular-nums"
                style={{
                  background: meta ? meta.bg : 'var(--brand-soft)',
                  color: meta ? meta.color : 'var(--brand-hi)',
                }}
              >
                <Clock size={10} aria-hidden />
                {fmtTime(time)}
                {booking?.duration_minutes ? ` · ${booking.duration_minutes}m` : ''}
              </span>
            )}
            <span className="flex min-w-0 items-center gap-1 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
              <Dumbbell size={11} className="shrink-0" />
              <span className="truncate">{detail}</span>
            </span>
          </div>

          {booking?.client_mobile && (
            // Given its own 44px row rather than sharing the meta line. It is a
            // tel: link — a touch target — and it was sitting inline at 11.5px
            // beside static text, which is both under the minimum size and
            // indistinguishable from the programme label next to it.
            <a
              href={`tel:${booking.client_mobile}`}
              className="mt-1 -ml-1.5 inline-flex h-11 items-center gap-1.5 rounded-[10px] px-1.5 text-[12px] font-[650]"
              style={{ color: 'var(--brand-hi)' }}
            >
              <Phone size={12} aria-hidden />
              {booking.client_mobile}
              <span className="sr-only"> — call {name}</span>
            </a>
          )}

          {booking?.notes && (
            <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{booking.notes}</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {/* The workout action, first: it is what a trainer taps on the
                floor. Absent for a booking with no client record behind it,
                because there is no programme to start.

                Every one of these was size="sm" — h-8, 32px — on a screen only
                ever used with a thumb, and up to four of them in one row. They
                are 44px now, which is the floor, and they wrap rather than
                shrink to fit. */}
            {client && (
              <Button
                disabled={starting}
                onClick={onOpen}
                aria-label={`${done ? 'View' : inProgress ? 'Resume' : 'Start'} ${name}'s session`}
                iconLeft={starting
                  ? <Loader2 size={14} className="animate-spin" />
                  : done ? <CheckCircle2 size={14} /> : <Play size={14} />}
                variant={done || restDay ? 'outline' : undefined}
                className="min-h-[44px]"
                // A rest day is still startable — a trainer may run an ad-hoc
                // session — but it does not get the solid brand fill. Four
                // equally loud Start buttons make the trainer read every row to
                // find the clients who are actually training today, which is
                // the one question this screen exists to answer. Today already
                // draws it this way; this page rendered all five identically.
                style={done || restDay ? undefined : {
                  background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff',
                }}
              >
                {done ? 'View' : inProgress ? 'Resume' : 'Start'}
              </Button>
            )}

            {isScheduled && (
              <>
                <Button
                  variant="outline" disabled={busyStatus} className="min-h-[44px]"
                  iconLeft={busyStatus ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  onClick={() => onStatus('completed')}
                >
                  Complete
                </Button>
                <Button
                  variant="ghost" disabled={busyStatus} className="min-h-[44px]"
                  iconLeft={<AlertTriangle size={14} />} onClick={() => onStatus('no_show')}
                >
                  No Show
                </Button>
                <Button
                  variant="ghost" disabled={busyStatus} className="min-h-[44px]"
                  iconLeft={<XCircle size={14} />} onClick={() => onStatus('cancelled')}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MySchedulePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const canManageTrainers = user?.role === 'admin' || user?.role === 'manager';

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<string>(() => toYmd(new Date()));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const from = toYmd(weekDays[0]);
  const to = toYmd(weekDays[6]);

  const schedule = useAsync(() => api.pt.mySessions({ from, to }), [from, to]);
  const sessions = useMemo(() => schedule.data?.data ?? [], [schedule.data]);
  const trainerLinked = schedule.data?.trainer_linked ?? true;

  // The day's roster, from the same endpoint the Today page uses.
  //
  // pt_sessions alone is not "who am I training today". It holds BOOKED slots,
  // and a studio records an attendance three different ways — a booking, an
  // active programme prescribing this weekday, or the training days chosen at
  // enrolment. /workout-log/today unions all three, clock-orders them, and
  // returns session_id so a started log can be resumed rather than
  // double-started. Reading pt_sessions only is why this page showed "Nothing
  // scheduled" while Today listed five clients for the same date.
  //
  // It is a separate fetch rather than a merge of the week query because the
  // roster is expensive to compute per day and only the SELECTED day is shown.
  const roster = useAsync(
    () => (trainerLinked
      ? api.progress.workoutLog.today({ date: selectedDay })
      : Promise.resolve(null)),
    [selectedDay, trainerLinked],
  );
  const rosterClients = useMemo(() => roster.data?.data?.clients ?? [], [roster.data]);

  const byDay = useMemo(() => {
    const map: Record<string, PtSession[]> = {};
    for (const s of sessions) {
      const key = String(s.session_date).slice(0, 10);
      (map[key] ||= []).push(s);
    }
    return map;
  }, [sessions]);

  const daySessions = useMemo(() => byDay[selectedDay] ?? [], [byDay, selectedDay]);

  /**
   * One row per client for the selected day.
   *
   * The roster is the spine — it already includes booked clients, so listing
   * pt_sessions alongside it would show the same person twice. Where a booking
   * exists it is attached to the row, which is what lets a single row carry
   * both the appointment's status (Completed / No Show) and the workout action
   * (Start / Resume). Server order is preserved: timed before untimed, rest
   * days last, and that ordering is the whole point of the endpoint.
   */
  const dayRows = useMemo(() => {
    const bookingFor = new Map<string, PtSession>();
    for (const s of daySessions) {
      // Earliest booking wins, matching the roster's own MIN(start_time).
      const existing = bookingFor.get(s.client_id);
      if (!existing || (s.start_time ?? '') < (existing.start_time ?? '')) {
        bookingFor.set(s.client_id, s);
      }
    }

    // Typed explicitly: inferred from the map alone `client` narrows to
    // TodayClient, and the booking-only rows pushed below would not fit.
    const rows: { client: TodayClient | null; booking: PtSession | null }[] =
      rosterClients.map((c) => ({
        client: c,
        booking: bookingFor.get(c.client_id) ?? null,
      }));

    // A booking whose client the roster did not return — cancelled, or a
    // client no longer active. Still the trainer's diary, so it is shown
    // rather than silently dropped.
    const seen = new Set(rosterClients.map((c) => c.client_id));
    for (const s of daySessions) {
      if (!seen.has(s.client_id)) {
        seen.add(s.client_id);
        rows.push({ client: null, booking: s });
      }
    }
    return rows;
  }, [rosterClients, daySessions]);

  // Counted over the SELECTED DAY's rows rather than the week's bookings.
  // Showing "0 this week" beside a list of five clients was the contradiction
  // that made this page look broken: the figures came from pt_sessions while
  // the list now comes from the roster, and two sources describing one screen
  // will always drift apart.
  const dayStats = useMemo(() => ({
    total: dayRows.length,
    done: dayRows.filter((r) => r.client?.session_status === 'completed').length,
    toDo: dayRows.filter((r) => r.client && r.client.session_status !== 'completed').length,
    missed: dayRows.filter((r) => r.booking
      && (r.booking.status === 'cancelled' || r.booking.status === 'no_show')).length,
  }), [dayRows]);

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
      // The roster carries the workout log's state, not the booking's, but a
      // cancelled booking changes what the row should offer — refetch both so
      // the two halves of a row cannot disagree.
      roster.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not update this session.');
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Start or resume the workout log — the same two-branch behaviour as the
   * Today page, deliberately identical rather than similar.
   *
   * Resuming is navigation. Starting creates the session with the programme
   * and weekday already filled in, which is the point: those are the two
   * fields the New Session form otherwise asks the trainer to retype at the
   * exact moment they are standing in front of the client.
   */
  const openWorkout = useCallback(async (c: TodayClient) => {
    if (startingId) return;
    if (c.session_id) {
      router.push(`/pt-os/clients/${c.client_id}/workout-log/${c.session_id}`);
      return;
    }
    setStartingId(c.client_id);
    try {
      const res = await api.progress.workoutLog.sessions.create({
        client_id: c.client_id,
        session_date: roster.data?.data?.date ?? selectedDay,
        program_name: c.plan_name,
        workout_day: roster.data?.data?.day_of_week,
      });
      const id = (res as { data?: { id?: string } })?.data?.id;
      if (!id) throw new Error('Session was created without an id');
      router.push(`/pt-os/clients/${c.client_id}/workout-log/${id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not start the session');
      setStartingId(null);
    }
  }, [startingId, router, roster.data, selectedDay, toast]);

  const monthLabel = `${weekDays[0].toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const todayYmd = toYmd(new Date());

  return (
    <Guard>
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
                  style={{ background: 'linear-gradient(135deg, #0067e0, #0059ce)', boxShadow: '0 8px 28px rgba(0,103,224,0.35)' }}>
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
                style={{ background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff' }}>
                Book Session
              </Button>
            </m.div>

            {/* No trainer profile resolved — explain rather than show a bare
                empty agenda that reads as a bug.

                Role-aware, because the old copy told the studio owner to "ask
                an admin" while they were the admin, on their own studio, with a
                diary full of sessions. An admin can fix this themselves; a
                trainer or receptionist genuinely cannot, and sending them to
                Trainers would only dead-end on a permission check. */}
            {!trainerLinked && schedule.data && (
              <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                <EmptyState
                  icon={<UserCog size={22} />}
                  title="No trainer profile matches this login"
                  description={canManageTrainers
                    ? `My Schedule shows the sessions booked against you as a trainer. ${user?.email
                        ? `No active trainer in this studio uses ${user.email}.`
                        : "No active trainer in this studio uses this login's email address."
                      } Add one, or correct an existing trainer's email, and this schedule fills in straight away.`
                    : 'My Schedule shows the sessions booked against you as a trainer. Ask your studio admin to add you as a trainer using this same email address, or view the studio-wide list in Session History.'}
                />
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {canManageTrainers && (
                    <Button iconLeft={<UserCog size={14} />}
                      onClick={() => router.push('/trainers')}
                      style={{ background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff' }}>
                      Manage Trainers
                    </Button>
                  )}
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
                        style={{ background: 'rgba(0,103,224,0.12)', color: '#0067e0' }}>
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
                            ? { background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff' }
                            : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                          <span className="text-[9.5px] font-[700] uppercase" style={{ opacity: isSelected ? 0.85 : 0.6 }}>
                            {WEEKDAY_INITIALS[i]}
                          </span>
                          <span className="text-[14px] font-[800] leading-none">{d.getDate()}</span>
                          <span className="flex h-1.5 items-center">
                            {count > 0 && (
                              <span className="h-1.5 w-1.5 rounded-full"
                                style={{ background: isSelected ? '#fff' : '#0067e0' }} />
                            )}
                          </span>
                          {isToday && !isSelected && (
                            <span className="text-[9px] font-[800] uppercase tracking-wide" style={{ color: '#0067e0' }}>now</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Week stats */}
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'On This Day', value: dayStats.total, color: '#0067e0' },
                    { label: 'To Do', value: dayStats.toDo, color: '#0067e0' },
                    { label: 'Completed', value: dayStats.done, color: '#10b981' },
                    { label: 'Missed', value: dayStats.missed, color: '#f59e0b' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-[14px] px-4 py-3"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                      <p className="text-[20px] font-[820] tracking-[-0.02em]" style={{ color: s.color }}>
                        {roster.data || schedule.data ? s.value : '—'}
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
                    {dayRows.length} client{dayRows.length === 1 ? '' : 's'}
                  </span>
                </div>

                {(schedule.loading || roster.loading) && !roster.data && !schedule.data && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <Loader2 size={26} className="animate-spin" style={{ color: '#0067e0' }} />
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

                {!schedule.loading && !roster.loading && !schedule.error && dayRows.length === 0 && (
                  <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                    <EmptyState
                      icon={<CalendarDays size={22} />}
                      title="Nothing scheduled"
                      description={`You have no sessions ${fmtDayPhrase(selectedDay)}.`}
                    />
                  </div>
                )}

                {dayRows.length > 0 && (
                  <div className="space-y-2.5">
                    {dayRows.map((row, i) => {
                      // Server order is preserved as-is: timed rows first, then
                      // untimed, rest days last. Re-sorting here would put this
                      // page and Today in a different order for the same day.
                      const key = row.client?.client_id ?? row.booking?.id ?? String(i);
                      return (
                        <m.div key={key}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.25 }}>
                          <DayRow
                            client={row.client}
                            booking={row.booking}
                            busyStatus={!!row.booking && busyId === row.booking.id}
                            starting={!!row.client && startingId === row.client.client_id}
                            onOpen={() => row.client && openWorkout(row.client)}
                            onStatus={(status) => row.booking && updateStatus(row.booking, status)}
                          />
                        </m.div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
        </div>
      </PullToRefresh>
    </Guard>
  );
}
