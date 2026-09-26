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
 * Opening the guided screen pushes a history entry, so the phone's Back
 * button closes it (keeping the workout for later) instead of leaving the app.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import { ChevronRight, Loader2, Play, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import type { MeSession, MeWorkoutPlan } from '@/lib/api';
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

export default function WorkoutLauncher({ plans, sessions, onSaved }: {
  plans: MeWorkoutPlan[];
  sessions: MeSession[];
  /** A workout was saved — the page refreshes its session history. */
  onSaved: () => void;
}) {
  const [open, setOpen] = useState<WorkoutDraft | null>(null);
  const [saved, setSaved] = useState<WorkoutDraft | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
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

  const show = (draft: WorkoutDraft) => {
    window.history.pushState({ guidedWorkout: true }, '');
    pushed.current = true;
    setOpen(draft);
  };

  const start = async (key: string, source: Source) => {
    if (source.exercises.length === 0) return;
    setStarting(key);
    let last = {};
    try {
      last = (await api.me.lastPerformance(source.exercises.map((x) => x.name))).data ?? {};
    } catch {
      // Without history the sets start from the plan's targets — still a workout.
      last = {};
    }
    setStarting(null);
    show(newDraft({ ...source, last }));
  };

  const today = todayIso();
  const plan = plans.find((p) => p.days.some((d) => d.day_of_week === today || d.day_of_week === 0)) ?? null;
  const todayDay = plan?.days.find((d) => d.day_of_week === today) ?? plan?.days.find((d) => d.day_of_week === 0) ?? null;
  const lastSession = sessions.find((s) => s.exercises.some((e) => e.sets.length > 0)) ?? null;
  const otherDays = plans.flatMap((p) => p.days.filter((d) => d !== todayDay && d.exercises.length > 0).map((d) => ({ p, d })));

  let hero: { key: string; label: string; sub: string; icon: ReactNode; run: () => void } | null = null;
  if (saved) {
    const n = loggedSetCount(saved);
    hero = {
      key: 'resume', label: 'Resume your workout',
      sub: `${saved.title} · ${n} set${n === 1 ? '' : 's'} logged`,
      icon: <Play size={18} fill="currentColor" aria-hidden />, run: () => show(saved),
    };
  } else if (plan && todayDay && todayDay.exercises.length > 0) {
    hero = {
      key: 'today', label: 'Start today\'s workout',
      sub: `${todayDay.exercises.length} exercise${todayDay.exercises.length === 1 ? '' : 's'} · ${plan.name}`,
      icon: <Play size={18} fill="currentColor" aria-hidden />, run: () => void start('today', fromPlanDay(plan, todayDay)),
    };
  } else if (lastSession) {
    hero = {
      key: 'repeat', label: 'Repeat your last session',
      sub: `${longDate(lastSession.session_date) ?? ''} · ${lastSession.exercises.length} exercise${lastSession.exercises.length === 1 ? '' : 's'}`,
      icon: <RotateCcw size={18} aria-hidden />, run: () => void start('repeat', fromSession(lastSession)),
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

      {otherDays.length > 0 && (
        <details className="group mb-4">
          <summary className="flex cursor-pointer list-none items-center gap-1 px-1 text-[12px] font-[700]" style={{ color: MC.primary }}>
            Train a different day
            <ChevronRight size={14} aria-hidden className="transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {otherDays.map(({ p, d }) => {
              const key = `${p.assignment_id}-${d.day_of_week}`;
              return (
                <button key={key} type="button" disabled={starting !== null}
                  onClick={() => void start(key, fromPlanDay(p, d))}
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
        <GuidedWorkout initial={open} onClose={close} onSaved={() => { setSaved(null); onSaved(); }} />
      )}
    </>
  );
}
