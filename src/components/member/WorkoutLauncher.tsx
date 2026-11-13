'use client';

/**
 * The way into a guided workout, at the top of the Workout tab.
 *
 * In order of what the member most likely wants:
 *   1. a workout they started and left — "Resume"
 *   2. today's day of their programme — "Start today's workout"
 *   3. no programme day today, but a past session — "Repeat <date>'s session"
 * and, when the programme has other days, a quiet "train another day" list.
 *
 * The trainer decides whether the member may start a workout alone: when
 * `allowSelfWorkout` is false only Resume is offered, because a session the
 * member already started must still be finishable. Every start goes through
 * the server, which owns the permission, the prescription snapshot and the
 * single open session.
 *
 * Opening the guided screen pushes a history entry, so the phone's Back
 * button closes it (keeping the workout for later) instead of leaving the app.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import { ChevronRight, Loader2, Play, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import type { MeLastPerformance, MeSession, MeWorkoutPlan, MeWorkoutSession } from '@/lib/api';
import { ApiError } from '@/lib/http';
import { rgba } from '@/lib/palette';
import { EASE, MC, longDate } from './MemberUI';
import { loadDraft, loggedSetCount, newDraft, type WorkoutDraft } from './workoutDraft';

// The guided screen is only needed once they tap Start.
const GuidedWorkout = dynamic(() => import('./GuidedWorkout'), { ssr: false });

const DAY_NAMES = ['Anytime', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** 1 = Monday … 7 = Sunday, matching workout_exercises.day_of_week. */
function todayIso(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

type Source = {
  title: string;
  assignment_id: string | null;
  program_name: string | null;
  workout_day: string | null;
  exercises: {
    name: string; sets: number | null; reps: string | number | null; target_weight: number | null;
    rest_seconds?: number | null; notes?: string | null; media_url?: string | null; video_url?: string | null;
  }[];
};

function fromPlanDay(plan: MeWorkoutPlan, day: MeWorkoutPlan['days'][number]): Source {
  const dayName = DAY_NAMES[day.day_of_week] ?? `Day ${day.day_of_week}`;
  return {
    title: day.day_of_week === 0 ? plan.name : `${dayName} · ${plan.name}`,
    assignment_id: plan.assignment_id,
    program_name: plan.name,
    workout_day: dayName,
    exercises: day.exercises,
  };
}

function fromSession(s: MeSession): Source {
  return {
    title: s.workout_day || s.program_name || 'Repeat session',
    assignment_id: null,
    program_name: s.program_name,
    workout_day: s.workout_day,
    exercises: s.exercises.map((e) => {
      const heaviest = e.sets.reduce<number | null>((w, x) => (x.weight_kg !== null && (w === null || x.weight_kg > w) ? x.weight_kg : w), null);
      return { name: e.name, sets: e.sets.length || null, reps: e.sets[0]?.reps ?? null, target_weight: heaviest };
    }),
  };
}

/** A local draft that predates server sessions still needs one to submit. */
function sourceFromDraft(d: WorkoutDraft): Source {
  return {
    title: d.title,
    assignment_id: d.assignment_id,
    program_name: d.program_name,
    workout_day: d.workout_day,
    exercises: d.exercises.map((x) => ({
      name: x.name, sets: x.sets.length, reps: null, target_weight: null,
    })),
  };
}

/** The draft the server autosaved, when it is one this app can open. */
function storedDraft(s: MeWorkoutSession): WorkoutDraft | null {
  const d = s.draft as WorkoutDraft | null;
  return d && d.version === 1 && Array.isArray(d.exercises) && d.exercises.length > 0 ? d : null;
}

/** Build the draft for a session that has none yet: what they tapped, plus their history. */
function draftFromSession(s: MeWorkoutSession, source: Source | null, last: MeLastPerformance): WorkoutDraft {
  const stored = storedDraft(s);
  if (stored) return { ...stored, session_id: s.id };
  const title = source?.title
    ?? ([s.workout_day, s.program_name].filter(Boolean).join(' · ') || 'Workout');
  return {
    ...newDraft({
      title,
      assignment_id: source?.assignment_id ?? s.workout_assignment_id,
      program_name: source?.program_name ?? s.program_name,
      workout_day: source?.workout_day ?? s.workout_day,
      exercises: source?.exercises ?? s.prescribed?.exercises ?? [],
      last,
      now: new Date(s.started_at),
    }),
    session_id: s.id,
  };
}

export default function WorkoutLauncher({ plans, sessions, allowSelfWorkout, openSession, onSaved }: {
  plans: MeWorkoutPlan[];
  sessions: MeSession[];
  /** The trainer's permission to start a workout without them. */
  allowSelfWorkout: boolean;
  /** A session the member left open on the server; resume is always allowed. */
  openSession: MeWorkoutSession | null;
  /** A workout was saved — the page refreshes its session history. */
  onSaved: () => void;
}) {
  const [open, setOpen] = useState<WorkoutDraft | null>(null);
  const [active, setActive] = useState<MeWorkoutSession | null>(null);
  const [saved, setSaved] = useState<WorkoutDraft | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pushed = useRef(false);

  useEffect(() => { setSaved(loadDraft()); }, []);

  const close = useCallback(() => {
    setOpen(null);
    setSaved(loadDraft());
    if (pushed.current) { pushed.current = false; window.history.back(); }
  }, []);

  // Back button while training: close the screen, keep the workout.
  useEffect(() => {
    if (!open) return;
    const onPop = () => { pushed.current = false; setOpen(null); setSaved(loadDraft()); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open]);

  const show = (draft: WorkoutDraft, session: MeWorkoutSession | null) => {
    window.history.pushState({ guidedWorkout: true }, '');
    pushed.current = true;
    setActive(session);
    setOpen(draft);
  };

  const start = async (key: string, source: Source, dayOfWeek: number | null, keep?: WorkoutDraft) => {
    if (source.exercises.length === 0) return;
    setStarting(key);
    setError(null);
    try {
      const { data } = await api.me.startWorkout({
        assignment_id: source.assignment_id,
        day_of_week: dayOfWeek,
      });
      if (keep) { show({ ...keep, session_id: data.session.id }, data.session); return; }
      let last: MeLastPerformance = {};
      try {
        last = (await api.me.lastPerformance(source.exercises.map((x) => x.name))).data ?? {};
      } catch {
        // Without history the sets start from the plan's targets — still a workout.
      }
      show(draftFromSession(data.session, source, last), data.session);
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'SELF_WORKOUT_NOT_ALLOWED'
        ? 'Your trainer has not enabled self workouts.'
        : 'Could not start the workout. Try again.');
    } finally {
      setStarting(null);
    }
  };

  const resumeOpen = async () => {
    if (!openSession) return;
    const stored = storedDraft(openSession);
    if (stored) { show(stored, openSession); return; }
    const exercises = openSession.prescribed?.exercises ?? [];
    if (exercises.length === 0) return;
    setStarting('resume');
    try {
      let last: MeLastPerformance = {};
      try {
        last = (await api.me.lastPerformance(exercises.map((x) => x.name))).data ?? {};
      } catch {
        // The prescription is enough to start.
      }
      show(draftFromSession(openSession, null, last), openSession);
    } finally {
      setStarting(null);
    }
  };

  const today = todayIso();
  const plan = plans.find((p) => p.days.some((d) => d.day_of_week === today || d.day_of_week === 0)) ?? null;
  const todayDay = plan?.days.find((d) => d.day_of_week === today) ?? plan?.days.find((d) => d.day_of_week === 0) ?? null;
  const lastSession = sessions.find((s) => s.exercises.some((e) => e.sets.length > 0)) ?? null;
  const otherDays = allowSelfWorkout
    ? plans.flatMap((p) => p.days.filter((d) => d !== todayDay && d.exercises.length > 0).map((d) => ({ p, d })))
    : [];
  const repeatDay = lastSession
    ? plans.flatMap((p) => p.days.map((d) => ({ p, d })))
      .find(({ d }) => DAY_NAMES[d.day_of_week] === lastSession.workout_day) ?? null
    : null;

  let hero: { key: string; label: string; sub: string; icon: ReactNode; run: () => void } | null = null;
  if (saved) {
    const n = loggedSetCount(saved);
    hero = {
      key: 'resume', label: 'Resume your workout',
      sub: `${saved.title} · ${n} set${n === 1 ? '' : 's'} logged`,
      icon: <Play size={18} fill="currentColor" aria-hidden />,
      run: () => {
        if (openSession) show(saved, openSession);
        else void start('resume', sourceFromDraft(saved), null, saved);
      },
    };
  } else if (openSession) {
    const openDraft = storedDraft(openSession);
    const n = openDraft ? loggedSetCount(openDraft) : 0;
    hero = {
      key: 'resume', label: 'Resume your workout',
      sub: `${openSession.workout_day || openSession.program_name || 'Workout'}${n > 0 ? ` · ${n} set${n === 1 ? '' : 's'} logged` : ''}`,
      icon: <Play size={18} fill="currentColor" aria-hidden />,
      run: () => void resumeOpen(),
    };
  } else if (allowSelfWorkout && plan && todayDay && todayDay.exercises.length > 0) {
    hero = {
      key: 'today', label: 'Start today\'s workout',
      sub: `${todayDay.exercises.length} exercise${todayDay.exercises.length === 1 ? '' : 's'} · ${plan.name}`,
      icon: <Play size={18} fill="currentColor" aria-hidden />,
      run: () => void start('today', fromPlanDay(plan, todayDay), todayDay.day_of_week),
    };
  } else if (allowSelfWorkout && lastSession) {
    const source = fromSession(lastSession);
    if (repeatDay) source.assignment_id = repeatDay.p.assignment_id;
    hero = {
      key: 'repeat', label: 'Repeat your last session',
      sub: `${longDate(lastSession.session_date) ?? ''} · ${lastSession.exercises.length} exercise${lastSession.exercises.length === 1 ? '' : 's'}`,
      icon: <RotateCcw size={18} aria-hidden />,
      run: () => void start('repeat', source, repeatDay?.d.day_of_week ?? null),
    };
  }

  if (!hero && otherDays.length === 0) return null;

  return (
    <>
      {hero && (
        <m.button type="button" onClick={hero.run} disabled={starting !== null}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
          whileTap={{ scale: 0.98 }}
          className="relative mb-3 flex w-full items-center gap-4 overflow-hidden rounded-[20px] p-4 text-left text-white disabled:opacity-80"
          style={{ background: `linear-gradient(135deg, ${MC.primary}, ${MC.primaryDeep})`, boxShadow: `0 12px 30px -12px ${rgba(MC.primary, 0.6)}` }}>
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>
            {starting === hero.key ? <Loader2 size={18} className="animate-spin" aria-hidden /> : hero.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-[820] tracking-[-0.01em]">{hero.label}</span>
            <span className="mt-0.5 block truncate text-[12.5px] font-[600] opacity-85">{hero.sub}</span>
          </span>
          <ChevronRight size={18} aria-hidden className="shrink-0 opacity-80" />
        </m.button>
      )}

      {error && (
        <p role="alert" className="mb-3 px-1 text-[12px] font-[650]" style={{ color: MC.dangerText }}>
          {error}
        </p>
      )}

      {otherDays.length > 0 && (
        <details className="group mb-4">
          <summary className="flex cursor-pointer list-none items-center gap-1 px-1 text-[12px] font-[700]" style={{ color: MC.primaryText }}>
            Train a different day
            <ChevronRight size={14} aria-hidden className="transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {otherDays.map(({ p, d }) => {
              const key = `${p.assignment_id}-${d.day_of_week}`;
              return (
                <button key={key} type="button" disabled={starting !== null}
                  onClick={() => void start(key, fromPlanDay(p, d), d.day_of_week)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-[700]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: MC.ink }}>
                  {starting === key ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Play size={11} aria-hidden />}
                  {DAY_NAMES[d.day_of_week] ?? `Day ${d.day_of_week}`}
                  {plans.length > 1 ? ` · ${p.name}` : ''}
                </button>
              );
            })}
          </div>
        </details>
      )}

      {open && (
        <GuidedWorkout initial={open} session={active} onClose={close} onSaved={() => { setSaved(null); onSaved(); }} />
      )}
    </>
  );
}
