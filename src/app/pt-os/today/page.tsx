'use client';

// Today — the screen a trainer opens on the gym floor.
//
// ── What this replaces ─────────────────────────────────────────────────────
//
// Reaching the one thing a trainer does every day used to take five screens:
// search the client, open their profile, open Workout Log, tap New Session,
// then pick the programme and weekday from a dropdown. Every one of those
// answers a question the system could answer itself — it already knows who is
// on an active programme and what that programme prescribes for a Thursday.
//
// So this asks nothing. It lists the clients training today, what their plan
// says, and one button per client: Start, or Resume if a session is already
// open. The trainer's first tap is the one that matters.
//
// ── Why a rest day is shown, not hidden ────────────────────────────────────
//
// A client whose programme prescribes nothing today still appears, marked as
// a rest day. Hiding them would leave the trainer wondering whether the client
// is missing from the list because they are resting or because something is
// broken — and "nothing scheduled" is a real answer worth showing.
//
// ── Design notes ───────────────────────────────────────────────────────────
//
// This screen is read one-handed, at arm's length, in a bright room, by
// somebody who is mid-conversation with a client. Four things follow from that
// and are easy to undo by accident:
//
//   1. Every colour comes from a token, because the dark theme is not a tint
//      of the light one — a hard-coded rgba(15,23,42,…) chip is invisible on
//      a dark card, and this screen used two of them.
//   2. Nothing is said in colour alone. The time chip distinguishes a booked
//      slot from somebody's usual hour with an icon and a label, not a hue;
//      the explanation used to live in a `title` tooltip, which on the phone
//      this runs on does not exist.
//   3. Nothing legible is dimmed. Rest days were rendered at 0.72 opacity,
//      which pushed the muted subtitle under the contrast floor. They are set
//      apart by the moon badge, the wording and an outline button instead.
//   4. Motion is optional. The row stagger is skipped under
//      prefers-reduced-motion rather than shortened.

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import { m, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle, CalendarCheck, CalendarDays, ChevronRight, Clock, Dumbbell,
  Loader2, Moon, Play, RotateCw, Users,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import type { TodayClient, TodayRoster } from '@/lib/api';
import { fmtTime12 } from '@/lib/format';
import { useToast } from '@/lib/toast';
import { EmptyState, PageContainer, PageHero } from '@/components/ui';

export default function TodayPage() {
  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <AppShell>
        {/* max-w-screen-md with its own px-4 sat inside .shell-main's gutter,
            so this page was both narrower and further from the edge than the
            dashboard. PageContainer carries the dashboard's measurements. */}
        <PageContainer>
          <Today />
        </PageContainer>
      </AppShell>
    </Guard>
  );
}

function Today() {
  const router = useRouter();
  const { toast } = useToast();
  const [roster, setRoster] = useState<TodayRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.progress.workoutLog.today();
      setRoster(res?.data ?? null);
    } catch {
      // A failed request used to fall through to "Nobody is in today", which
      // reads as an answer about the day rather than a network error — the one
      // wrong reading a trainer cannot recover from, because it tells them to
      // stop looking. The toast disappears; this does not.
      setFailed(true);
      toast.error('Could not load today');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  /**
   * Start or resume. Resuming is just navigation; starting creates the session
   * with the programme and weekday already filled in, which is the whole point
   * — those are the two fields the old New Session form asked the trainer to
   * retype every time.
   */
  const open = async (c: TodayClient) => {
    if (starting) return;
    if (c.session_id) {
      router.push(`/pt-os/clients/${c.client_id}/workout-log/${c.session_id}`);
      return;
    }
    setStarting(c.client_id);
    try {
      const res = await api.progress.workoutLog.sessions.create({
        client_id: c.client_id,
        session_date: roster?.date,
        program_name: c.plan_name,
        workout_day: roster?.day_of_week,
      });
      const id = (res as { data?: { id?: string } })?.data?.id;
      if (!id) throw new Error('Session was created without an id');
      router.push(`/pt-os/clients/${c.client_id}/workout-log/${id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not start the session');
      setStarting(null);
    }
  };

  const clients = roster?.clients ?? [];
  const done = clients.filter((c) => c.session_status === 'completed').length;

  return (
    <>
      <PageHero
        icon={<CalendarDays size={20} />}
        title="Today"
        subtitle={roster?.day_of_week
          ? `${roster.day_of_week}${clients.length > 0 ? ` · ${done} of ${clients.length} done` : ''}`
          : undefined}
      >
        {/* How far through the day, without spending a row on it. The count in
            the subtitle is the same number in words; this is the version you
            can read without reading. */}
        {clients.length > 0 && (
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: 'rgba(255,255,255,0.18)' }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={clients.length}
            aria-valuenow={done}
            aria-label={`${done} of ${clients.length} sessions done today`}
          >
            <span
              className="block h-full rounded-full transition-[width] duration-300"
              style={{ width: `${(done / clients.length) * 100}%`, background: '#fff' }}
            />
          </div>
        )}
      </PageHero>

      {/* Skeletons rather than a lone spinner: the rows arrive in a known shape
          and reserving it stops the page jumping under a thumb already on its
          way to the first Start button. */}
      {loading ? (
        <RosterSkeleton />
      ) : failed ? (
        <EmptyState
          icon={<AlertTriangle size={22} />}
          title="Could not load today"
          description="The roster did not come back. Check the connection and try again — nothing has been lost."
          action={(
            <button
              type="button"
              onClick={load}
              className="inline-flex h-[44px] cursor-pointer items-center gap-2 rounded-[14px] px-4 text-[13.5px] font-[700] text-white transition-transform active:scale-95"
              style={{ background: 'var(--brand)' }}
            >
              <RotateCw size={16} /> Try again
            </button>
          )}
        />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Nobody is in today"
          description="Nothing booked, no programme prescribing today, and nobody whose enrolment names this weekday."
          action={(
            <button
              type="button"
              onClick={() => router.push('/pt-os/schedule-session')}
              className="inline-flex h-[44px] cursor-pointer items-center gap-2 rounded-[14px] px-4 text-[13.5px] font-[700] text-white transition-transform active:scale-95"
              style={{ background: 'var(--brand)' }}
            >
              <Dumbbell size={16} /> Book a session
            </button>
          )}
        />
      ) : (
        /* Rendered in the ORDER THE SERVER SENT, which is the order the day
           happens: earliest first, untimed after them, rest days last. It is
           not re-sorted or re-grouped here — the dashboard card shows the first
           two rows of this same list, and two independent sorts of the same
           data is how the two screens end up disagreeing about who is next.

           The rest-day heading is still drawn, but as a divider at the point
           the order reaches them rather than by pulling them into a separate
           array, so labelling them cannot change their position. */
        <div className="flex flex-col gap-2.5">
          {clients.map((c, i) => (
            <Fragment key={c.client_id}>
              {c.is_rest_day && !clients[i - 1]?.is_rest_day && (
                <h2 className="mt-3 text-[11px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Rest day
                </h2>
              )}
              <ClientRow
                c={c}
                i={i}
                starting={starting === c.client_id}
                busy={starting !== null}
                onOpen={() => open(c)}
              />
            </Fragment>
          ))}
        </div>
      )}
    </>
  );
}

function RosterSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-[18px] p-3.5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <span className="h-11 w-11 shrink-0 rounded-[14px]" style={{ background: 'var(--bg-subtle)' }} />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="block h-3 w-32 rounded-full" style={{ background: 'var(--bg-subtle)' }} />
            <span className="block h-2.5 w-44 rounded-full" style={{ background: 'var(--bg-subtle)' }} />
          </span>
          <span className="h-[44px] w-[86px] shrink-0 rounded-[14px]" style={{ background: 'var(--bg-subtle)' }} />
        </div>
      ))}
    </div>
  );
}

function ClientRow({
  c, i, starting, busy, onOpen,
}: { c: TodayClient; i: number; starting: boolean; busy: boolean; onOpen: () => void }) {
  const reduce = useReducedMotion();
  const doneAlready = c.session_status === 'completed';
  const inProgress = c.session_status === 'in_progress';

  return (
    <m.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : Math.min(i * 0.03, 0.2), duration: reduce ? 0 : 0.18 }}
      className="flex items-center gap-3 rounded-[18px] p-3.5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* The face, on every row.

          This used to pass photoUrl={null} on a rest day so the tile could show
          a moon instead, on the reasoning that the row is about the programme
          having nothing scheduled rather than about who the client is. In
          practice most of the roster is rest days on any given weekday, so the
          screen a trainer opens on the gym floor was a column of identical grey
          moons — the one thing that tells two rows apart at a glance, the
          person's face, was removed from exactly the rows that needed it most.
          It was also the only place in the app that withheld a photo it had.

          The rest day still reads as one: the moon badge on the corner of the
          photo, the "nothing scheduled" subtitle and the outline Start button.
          What it no longer does is dim the whole row — 0.72 opacity took the
          muted subtitle below the contrast floor to say something three other
          signals were already saying. */}
      <div className="relative shrink-0">
        <ClientAvatar
          name={c.client_name}
          photoUrl={c.client_photo}
          className="flex h-11 w-11 items-center justify-center rounded-[14px] text-[13px] font-[800] text-white"
          style={{ background: c.is_rest_day ? 'var(--text-muted)' : 'linear-gradient(135deg,#0067e0,#0059ce)' }}
        >
          {initials(c.client_name)}
        </ClientAvatar>
        {c.is_rest_day && (
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full"
            style={{ background: 'var(--text-muted)', border: '1.5px solid var(--bg-card)', color: '#fff' }}
          >
            <Moon size={9} />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* items-start, not items-center: when the name takes two lines the
            chip belongs beside the first of them, not floating in the gap
            between. */}
        <div className="flex items-start gap-1.5">
          {/* The time leads, because the list is ordered by it and a row you
              cannot read a time off is a row you have to count places to
              locate. Only a booked slot or an enrolment has one; a programme
              names a weekday and never an hour.

              Booked and usual-hour are told apart by the icon first and the
              tint second. They used to differ by tint alone, with the meaning
              parked in a `title` tooltip — a hover affordance on a screen that
              is only ever touched. Same 12-hour format as the dashboard card;
              this one said "06:00" while the card that links here said
              "6:00 AM" for the identical field. */}
          {c.start_time && (
            <span
              className="mt-[2px] inline-flex shrink-0 items-center gap-1 rounded-[7px] px-1.5 py-0.5 text-[11px] font-[800] tabular-nums"
              style={{
                background: c.source === 'booked' ? 'var(--brand-soft)' : 'var(--bg-subtle)',
                color: c.source === 'booked' ? 'var(--brand-hi)' : 'var(--text-secondary)',
              }}
            >
              {c.source === 'booked' ? <CalendarCheck size={10} aria-hidden /> : <Clock size={10} aria-hidden />}
              {fmtTime12(c.start_time)}
              <span className="sr-only">{c.source === 'booked' ? ' booked slot' : ' usual training time'}</span>
            </span>
          )}
          {/* Wraps rather than truncates. The chip and the button between them
              leave about 150px on a 390px phone, which is enough to turn
              "Rahul Sharma" into "Rahul Shar…" — an ellipsis on the one field
              the whole row is scanned for. The subtitle below still truncates;
              losing the tail of a programme name costs nothing. */}
          <p className="line-clamp-2 text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>
            {c.client_name}
          </p>
        </div>
        <p className="truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {/* Three shapes, because a client can now be here without a plan at
              all — the row used to interpolate plan_name unconditionally and
              would have read "null · 0 exercises" for exactly the newly
              enrolled client this list was extended to include. */}
          {!c.plan_name
            ? 'No programme yet · exercises can be added in the session'
            : c.is_rest_day
              ? `${c.plan_name} · nothing scheduled`
              : `${c.plan_name} · ${c.planned_exercises} exercise${c.planned_exercises === 1 ? '' : 's'}`}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpen}
        // Every button locks while any one start is in flight. Only the tapped
        // row used to lock, so a second tap on a second row during the round
        // trip opened a second session — the easiest mis-tap to make on a list
        // whose whole purpose is a column of identical buttons.
        disabled={busy}
        aria-label={`${inProgress ? 'Resume' : doneAlready ? 'Open' : 'Start'} ${c.client_name}'s session`}
        aria-busy={starting}
        className="flex h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-[14px] px-3.5 text-[13px] font-[700] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        // A rest day is still startable — a trainer may run an ad-hoc session —
        // but it gets an outline rather than the solid brand fill. Four equally
        // loud Start buttons would make the trainer read every row to find the
        // ones who are actually training today.
        //
        // Resume is the loudest thing on the screen when it appears, because a
        // session that is already open is the only row where anything is
        // currently happening. It was a pale amber wash carrying amber text,
        // which is both the quietest treatment here and below the contrast
        // floor in either theme.
        style={{
          background: doneAlready ? 'var(--bg-subtle)'
            : inProgress ? 'var(--amber-700)'
              : c.is_rest_day ? 'transparent' : 'var(--brand)',
          color: doneAlready ? 'var(--text-secondary)'
            : inProgress ? '#fff'
              : c.is_rest_day ? 'var(--text-secondary)' : '#fff',
          border: c.is_rest_day && !inProgress && !doneAlready ? '1px solid var(--border-2)' : '1px solid transparent',
        }}
      >
        {starting ? <Loader2 size={15} className="animate-spin" aria-hidden />
          : doneAlready ? <ChevronRight size={15} aria-hidden />
            : inProgress ? <RotateCw size={15} aria-hidden />
              : <Play size={15} aria-hidden />}
        {doneAlready ? 'Done' : inProgress ? 'Resume' : 'Start'}
      </button>
    </m.div>
  );
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}
