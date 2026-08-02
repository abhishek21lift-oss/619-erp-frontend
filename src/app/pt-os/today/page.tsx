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

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  CalendarDays, ChevronRight, Dumbbell, Loader2, Moon, Play, RotateCw, Users,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import type { TodayClient, TodayRoster } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { EmptyState } from '@/components/ui';

export default function TodayPage() {
  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <AppShell>
        <div className="mx-auto max-w-screen-md px-4 py-4 pb-28">
          <Today />
        </div>
      </AppShell>
    </Guard>
  );
}

function Today() {
  const router = useRouter();
  const { toast } = useToast();
  const [roster, setRoster] = useState<TodayRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.progress.workoutLog.today();
      setRoster(res?.data ?? null);
    } catch {
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

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={26} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    );
  }

  const clients = roster?.clients ?? [];
  const training = clients.filter((c) => !c.is_rest_day);
  const resting = clients.filter((c) => c.is_rest_day);
  const done = clients.filter((c) => c.session_status === 'completed').length;

  return (
    <>
      <header className="mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-white"
            style={{ background: 'linear-gradient(135deg,#0067e0,#0059ce)' }}
          >
            <CalendarDays size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[20px] font-[800]" style={{ color: 'var(--text-primary)' }}>Today</h1>
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              {roster?.day_of_week}
              {clients.length > 0 && ` · ${done} of ${clients.length} done`}
            </p>
          </div>
        </div>
      </header>

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Nobody is on a programme today"
          description="Assign a client a workout programme and they will appear here on the days it prescribes."
          action={(
            <button
              type="button"
              onClick={() => router.push('/pt-os/workout-plans')}
              className="inline-flex h-[44px] items-center gap-2 rounded-[14px] px-4 text-[13.5px] font-[700] text-white"
              style={{ background: 'var(--brand)' }}
            >
              <Dumbbell size={16} /> Workout Programs
            </button>
          )}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {training.map((c, i) => (
            <ClientRow key={c.assignment_id} c={c} i={i} starting={starting === c.client_id} onOpen={() => open(c)} />
          ))}

          {resting.length > 0 && (
            <>
              <p className="mt-3 text-[11px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Rest day
              </p>
              {resting.map((c, i) => (
                <ClientRow key={c.assignment_id} c={c} i={i} starting={starting === c.client_id} onOpen={() => open(c)} />
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}

function ClientRow({
  c, i, starting, onOpen,
}: { c: TodayClient; i: number; starting: boolean; onOpen: () => void }) {
  const doneAlready = c.session_status === 'completed';
  const inProgress = c.session_status === 'in_progress';

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.2), duration: 0.18 }}
      className="flex items-center gap-3 rounded-[18px] p-3.5"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        opacity: c.is_rest_day && !inProgress ? 0.72 : 1,
      }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-[13px] font-[800] text-white"
        style={{ background: c.is_rest_day ? 'var(--text-muted)' : 'linear-gradient(135deg,#0067e0,#0059ce)' }}
      >
        {c.is_rest_day ? <Moon size={16} /> : initials(c.client_name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>
          {c.client_name}
        </p>
        <p className="truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {c.is_rest_day
            ? `${c.plan_name} · nothing scheduled`
            : `${c.plan_name} · ${c.planned_exercises} exercise${c.planned_exercises === 1 ? '' : 's'}`}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpen}
        disabled={starting}
        aria-label={`${inProgress ? 'Resume' : doneAlready ? 'Open' : 'Start'} ${c.client_name}'s session`}
        className="flex h-[44px] shrink-0 items-center gap-1.5 rounded-[14px] px-3.5 text-[13px] font-[700] disabled:opacity-60"
        // A rest day is still startable — a trainer may run an ad-hoc session —
        // but it does not get the solid brand button. Four equally loud Start
        // buttons would make the trainer read every row to find the ones who
        // are actually training today.
        style={{
          background: doneAlready ? 'var(--bg-subtle)'
            : inProgress ? 'rgba(245,158,11,0.14)'
              : c.is_rest_day ? 'var(--bg-subtle)' : 'var(--brand)',
          color: doneAlready ? 'var(--text-muted)'
            : inProgress ? '#b45309'
              : c.is_rest_day ? 'var(--text-muted)' : '#fff',
        }}
      >
        {starting ? <Loader2 size={15} className="animate-spin" />
          : doneAlready ? <ChevronRight size={15} />
            : inProgress ? <RotateCw size={15} />
              : <Play size={15} />}
        {doneAlready ? 'Done' : inProgress ? 'Resume' : 'Start'}
      </button>
    </m.div>
  );
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}
