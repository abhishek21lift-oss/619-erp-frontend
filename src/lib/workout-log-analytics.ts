// Date bucketing and totals for the Workout Log analytics view.
//
// Pure and React-free so the boundaries are testable on their own. The two
// places this can silently lie are the range edges — a "last 7 days" that is
// really 6, or a week bucket whose Monday starts before the range — so both
// are computed here once rather than in JSX.
import type { MuscleWeek, WorkoutPr, WorkoutSession } from './api/types';

export type RangePreset = '7d' | '30d' | '90d' | '6mo' | '1y' | 'custom';

export interface DateRange {
  /** Inclusive ISO day. */
  from: string;
  /** Inclusive ISO day. */
  to: string;
}

export interface WeekBucket {
  /** Monday, inclusive ISO day. */
  week_start: string;
  sessions: number;
  completed: number;
  volume: number;
  /** null when no session that week carried a duration. */
  avg_duration: number | null;
}

export interface HeatmapDay {
  date: string;
  sessions: number;
  volume: number;
  /** False for the padding days of the first/last week. */
  in_range: boolean;
}

export interface WorkoutAnalytics {
  total: number;
  completed: number;
  /** null when nothing was logged — 0% would claim a failure that did not happen. */
  completion_pct: number | null;
  total_volume: number;
  /** null when nothing was logged. */
  avg_volume: number | null;
  /** null when no session carried a duration. */
  avg_duration: number | null;
  completed_sets: number;
  active_days: number;
  /** Consecutive weeks with at least one session, ending at the latest week. */
  week_streak: number;
  pr_count: number;
  weeks: WeekBucket[];
  heatmap: HeatmapDay[];
}

const DAY = 86400000;

/** Local calendar day. toISOString() would be yesterday for an IST morning. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function validDay(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === value ? value : null;
}

export function addDays(key: string, days: number): string {
  return new Date(new Date(`${key}T12:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10);
}

function shiftMonths(key: string, months: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, d, 12));
  // 31 Jan minus a month is 2/3 March in JS. Pin the day to the target
  // month's last day so a range end never jumps into the next month.
  if (target.getUTCDate() !== d) target.setUTCDate(0);
  return target.toISOString().slice(0, 10);
}

/** Inclusive range for a preset. `today` is injectable so this is testable. */
export function rangeForPreset(
  preset: RangePreset,
  today = dayKey(new Date()),
  custom?: Partial<DateRange>,
): DateRange {
  const to = validDay(custom?.to) ?? today;
  if (preset === 'custom') {
    const from = validDay(custom?.from) ?? addDays(to, -29);
    return from <= to ? { from, to } : { from: to, to: from };
  }
  switch (preset) {
    case '7d': return { from: addDays(to, -6), to };
    case '90d': return { from: addDays(to, -89), to };
    case '6mo': return { from: shiftMonths(to, -6), to };
    case '1y': return { from: shiftMonths(to, -12), to };
    default: return { from: addDays(to, -29), to };
  }
}

export function sessionDay(session: WorkoutSession): string {
  return String(session.session_date).slice(0, 10);
}

export function within(date: string, range: DateRange): boolean {
  return date >= range.from && date <= range.to;
}

/** Monday on or before an ISO day. */
export function weekStart(key: string): string {
  const date = new Date(`${key}T12:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return addDays(key, -mondayOffset);
}

/** One inclusive bucket per calendar week the range touches, zeros included. */
export function weekBuckets(sessions: WorkoutSession[], range: DateRange): WeekBucket[] {
  const byWeek = new Map<string, WeekBucket & { durationSum: number; durationCount: number }>();
  for (let week = weekStart(range.from); week <= weekStart(range.to); week = addDays(week, 7)) {
    byWeek.set(week, {
      week_start: week, sessions: 0, completed: 0, volume: 0, avg_duration: null,
      durationSum: 0, durationCount: 0,
    });
  }
  for (const session of sessions) {
    if (session.status === 'abandoned') continue;
    const day = sessionDay(session);
    if (!within(day, range)) continue;
    const bucket = byWeek.get(weekStart(day));
    if (!bucket) continue;
    bucket.sessions += 1;
    if (session.status === 'completed') bucket.completed += 1;
    bucket.volume += Number(session.volume || 0);
    const duration = Number(session.duration_minutes);
    if (Number.isFinite(duration) && duration > 0) {
      bucket.durationSum += duration;
      bucket.durationCount += 1;
    }
  }
  return [...byWeek.values()].map(({ durationSum, durationCount, ...bucket }) => ({
    ...bucket,
    avg_duration: durationCount > 0 ? Math.round(durationSum / durationCount) : null,
  }));
}

/** Every day in the range's weeks, including days with no training. */
export function heatmapDays(sessions: WorkoutSession[], range: DateRange): HeatmapDay[] {
  const byDay = new Map<string, HeatmapDay>();
  const first = weekStart(range.from);
  const last = addDays(weekStart(range.to), 6);
  for (let day = first; day <= last; day = addDays(day, 1)) {
    byDay.set(day, { date: day, sessions: 0, volume: 0, in_range: within(day, range) });
  }
  for (const session of sessions) {
    if (session.status === 'abandoned') continue;
    const day = sessionDay(session);
    if (!within(day, range)) continue;
    const bucket = byDay.get(day);
    if (!bucket) continue;
    bucket.sessions += 1;
    bucket.volume += Number(session.volume || 0);
  }
  return [...byDay.values()];
}

export function computeWorkoutAnalytics(
  sessions: WorkoutSession[],
  prs: WorkoutPr[],
  range: DateRange,
): WorkoutAnalytics {
  // An abandoned log is an empty session the sweep closed, not training.
  const real = sessions.filter((s) => s.status !== 'abandoned' && within(sessionDay(s), range));
  const completed = real.filter((s) => s.status === 'completed');
  const durations = real
    .map((s) => Number(s.duration_minutes))
    .filter((n) => Number.isFinite(n) && n > 0);
  const volume = real.reduce((sum, s) => sum + Number(s.volume || 0), 0);
  const days = new Set(real.map(sessionDay));
  const weeks = weekBuckets(real, range);

  // A streak is measured in weeks, not days: a Mon/Wed/Fri client is not on a
  // one-day streak every Tuesday. An empty current week is skipped rather than
  // resetting the streak, so Monday morning still shows last week's run.
  let cursor = weeks.length - 1;
  if (weeks[cursor]?.sessions === 0) cursor -= 1;
  let weekStreak = 0;
  while (cursor >= 0 && weeks[cursor].sessions > 0) {
    weekStreak += 1;
    cursor -= 1;
  }

  return {
    total: real.length,
    completed: completed.length,
    completion_pct: real.length > 0 ? Math.round((completed.length / real.length) * 100) : null,
    total_volume: Math.round(volume),
    avg_volume: real.length > 0 ? Math.round(volume / real.length) : null,
    avg_duration: durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null,
    completed_sets: real.reduce((sum, s) => sum + Number(s.completed_set_count || 0), 0),
    active_days: days.size,
    week_streak: weekStreak,
    pr_count: prs.filter((pr) => within(String(pr.session_date).slice(0, 10), range)).length,
    weeks,
    heatmap: heatmapDays(real, range),
  };
}

/** Sets per muscle, descending. Muscles with zero hard sets are not a slice. */
export function muscleDistribution(muscles: MuscleWeek[]): Array<{ name: string; value: number }> {
  return muscles
    .filter((m) => Number(m.sets) > 0)
    .map((m) => ({
      name: m.target_muscle
        ? m.target_muscle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Unattributed',
      value: Number(m.sets),
    }))
    .sort((a, b) => b.value - a.value);
}
