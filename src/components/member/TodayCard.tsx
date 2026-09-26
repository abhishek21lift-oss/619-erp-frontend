'use client';

/**
 * "Today" on the member's Home: what to do now, in at most three rows.
 *
 *   • Today's workout from the programme the trainer assigned — or a rest day
 *     when the programme has nothing on today.
 *   • This week's check-in: due, or sent.
 *   • The training streak, and whether this week still needs a session to
 *     keep it.
 *
 * It loads its own data, after the page: a slow or failed request costs only
 * its own row, never the dashboard. A row with nothing true to say is left out
 * rather than filled with a placeholder; with no rows at all, nothing renders.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { CheckCircle2, ChevronRight, ClipboardCheck, Dumbbell, Flame, Moon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EASE, MC } from './MemberUI';
import { api } from '@/lib/api';
import type { MeAchievements, MeWorkoutPlan } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';

type Row = { key: string; href: string; icon: LucideIcon; tone: string; title: string; sub: string; done?: boolean };

/** 1 = Monday … 7 = Sunday, matching the programme's day_of_week. */
function isoDow(d = new Date()): number {
  return ((d.getDay() + 6) % 7) + 1;
}

function workoutRow(plans: MeWorkoutPlan[]): Row | null {
  const plan = plans[0];
  if (!plan) return null;
  const day = plan.days.find((d) => d.day_of_week === isoDow());
  if (day && day.exercises.length > 0) {
    const first = day.exercises.slice(0, 2).map((e) => e.name).join(', ');
    return {
      key: 'workout', href: '/member/workout', icon: Dumbbell, tone: MC.primary,
      title: `${day.exercises.length} exercise${day.exercises.length === 1 ? '' : 's'} today`,
      sub: `${plan.name} · ${first}${day.exercises.length > 2 ? '…' : ''}`,
    };
  }
  // A programme that schedules days, with none today, is a rest day. One
  // with only unscheduled work (day 0) says nothing about today.
  if (plan.days.some((d) => d.day_of_week >= 1)) {
    return {
      key: 'workout', href: '/member/workout', icon: Moon, tone: palette.gray[500],
      title: 'Rest day', sub: `Recovery is part of ${plan.name}.`,
    };
  }
  return null;
}

function checkinRow(c: { this_week: string; sent: boolean }): Row {
  return c.sent
    ? { key: 'checkin', href: '/member/checkin', icon: CheckCircle2, tone: MC.success,
        title: 'Check-in sent', sub: 'Your trainer has this week\'s update.' }
    : { key: 'checkin', href: '/member/checkin', icon: ClipboardCheck, tone: MC.primary,
        title: 'Weekly check-in', sub: 'Two minutes: weight, sleep, energy and how the week went.' };
}

function streakRow(a: MeAchievements): Row | null {
  const { current, this_week: thisWeek } = a.training;
  if (current === 0 && a.totals.sessions === 0) return null;
  const weeks = `${current}-week streak`;
  return {
    key: 'streak', href: '/member/records', icon: Flame, tone: MC.primary, done: thisWeek,
    title: current > 0 ? weeks : 'Start a streak',
    sub: current === 0 ? 'Train this week to start one.'
      : thisWeek ? 'This week counts. See your records.'
        : 'Train this week to keep it going.',
  };
}

export default function TodayCard() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let live = true;
    Promise.allSettled([api.me.workout(), api.me.checkins(), api.me.achievements()]).then(([w, c, a]) => {
      if (!live) return;
      const out: Row[] = [];
      if (w.status === 'fulfilled') { const r = workoutRow(w.value.data ?? []); if (r) out.push(r); }
      if (c.status === 'fulfilled') {
        const { this_week: week, checkins } = c.value.data;
        out.push(checkinRow({ this_week: week, sent: checkins.some((x) => String(x.week_start_date).slice(0, 10) === week) }));
      }
      if (a.status === 'fulfilled') { const r = streakRow(a.value.data); if (r) out.push(r); }
      setRows(out);
    });
    return () => { live = false; };
  }, []);

  if (rows === null) {
    return <div aria-hidden className="mb-4 h-[148px] animate-pulse rounded-[18px]" style={{ background: 'var(--bg-subtle)' }} />;
  }
  if (rows.length === 0) return null;

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <m.section aria-label="Today"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
      className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[10px] font-[780] uppercase tracking-[0.13em]" style={{ color: MC.muted }}>Today</h2>
        <span className="text-[11px] font-[650]" style={{ color: MC.muted }}>{today}</span>
      </div>
      <ul className="overflow-hidden rounded-[18px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {rows.map(({ key, href, icon: Icon, tone, title, sub, done }, i) => (
          <li key={key} style={i === rows.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
            <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--bg-subtle)] active:bg-[var(--bg-subtle)]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]"
                style={{ background: rgba(tone, 0.12), color: tone }}>
                <Icon size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[14px] font-[760]" style={{ color: MC.ink }}>
                  {title}
                  {done && <CheckCircle2 size={13} aria-label="done" style={{ color: MC.success }} />}
                </span>
                <span className="block truncate text-[12px]" style={{ color: MC.muted }}>{sub}</span>
              </span>
              <ChevronRight size={16} aria-hidden style={{ color: MC.muted }} />
            </Link>
          </li>
        ))}
      </ul>
    </m.section>
  );
}
