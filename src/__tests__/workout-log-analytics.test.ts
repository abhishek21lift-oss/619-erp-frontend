import { describe, expect, it } from 'vitest';
import type { WorkoutPr, WorkoutSession } from '@/lib/api/types';
import {
  computeWorkoutAnalytics, heatmapDays, muscleDistribution, rangeForPreset,
  weekBuckets, weekStart,
} from '@/lib/workout-log-analytics';

const session = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's1',
  client_id: 'c1',
  session_date: '2026-11-04',
  status: 'completed',
  created_at: '2026-11-04T06:00:00Z',
  updated_at: '2026-11-04T07:00:00Z',
  ...over,
});

const pr = (over: Partial<WorkoutPr> = {}): WorkoutPr => ({
  session_date: '2026-11-04',
  exercise_name: 'Bench Press',
  weight_kg: 80,
  reps: 5,
  kinds: ['weight'],
  ...over,
});

describe('date ranges', () => {
  it('counts today inside a 7-day range', () => {
    // "Last 7 days" is 7 days, not 8 and not 6.
    expect(rangeForPreset('7d', '2026-11-04')).toEqual({ from: '2026-10-29', to: '2026-11-04' });
  });

  it('uses calendar months for 6 months and a year', () => {
    expect(rangeForPreset('6mo', '2026-11-04')).toEqual({ from: '2026-05-04', to: '2026-11-04' });
    expect(rangeForPreset('1y', '2026-11-04')).toEqual({ from: '2025-11-04', to: '2026-11-04' });
  });

  it('does not roll a month-end into the next month', () => {
    // 31 May minus 6 months is 30 November, not 1 December.
    expect(rangeForPreset('6mo', '2026-05-31').from).toBe('2025-11-30');
  });

  it('keeps a custom range inclusive and in order', () => {
    expect(rangeForPreset('custom', '2026-11-04', { from: '2026-11-01', to: '2026-11-04' }))
      .toEqual({ from: '2026-11-01', to: '2026-11-04' });
    expect(rangeForPreset('custom', '2026-11-04', { from: '2026-11-10', to: '2026-11-01' }))
      .toEqual({ from: '2026-11-01', to: '2026-11-10' });
  });

  it('falls back rather than trusting a malformed custom date', () => {
    expect(rangeForPreset('custom', '2026-11-04', { from: '2026-02-30', to: 'nope' }))
      .toEqual({ from: '2026-10-06', to: '2026-11-04' });
  });
});

describe('week buckets', () => {
  it('starts a week on Monday', () => {
    expect(weekStart('2026-11-04')).toBe('2026-11-02');
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
    expect(weekStart('2026-11-08')).toBe('2026-11-02');
  });

  it('fills empty weeks instead of dropping them', () => {
    // A chart that skips a zero week draws a straight line through a gap and
    // claims training that did not happen.
    const buckets = weekBuckets([session({ session_date: '2026-11-04' })], {
      from: '2026-11-04', to: '2026-11-18',
    });
    expect(buckets.map((b) => b.week_start)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
    expect(buckets.map((b) => b.sessions)).toEqual([1, 0, 0]);
  });

  it('counts the range edges, not the whole week around them', () => {
    const buckets = weekBuckets([
      session({ id: 'a', session_date: '2026-11-01' }), // Sunday before
      session({ id: 'b', session_date: '2026-11-02' }), // first day
      session({ id: 'c', session_date: '2026-11-08' }), // last day
      session({ id: 'd', session_date: '2026-11-09' }), // Monday after
    ], { from: '2026-11-02', to: '2026-11-08' });
    expect(buckets).toHaveLength(1);
    expect(buckets[0].sessions).toBe(2);
  });

  it('leaves abandoned logs out of every count', () => {
    const buckets = weekBuckets([
      session({ id: 'a', session_date: '2026-11-03', status: 'abandoned' }),
      session({ id: 'b', session_date: '2026-11-04' }),
    ], { from: '2026-11-02', to: '2026-11-08' });
    expect(buckets[0]).toMatchObject({ sessions: 1, completed: 1 });
  });

  it('averages duration from the sessions that carried one', () => {
    const buckets = weekBuckets([
      session({ id: 'a', session_date: '2026-11-03', duration_minutes: 40 }),
      session({ id: 'b', session_date: '2026-11-04', duration_minutes: null }),
      session({ id: 'c', session_date: '2026-11-05', duration_minutes: 60 }),
    ], { from: '2026-11-02', to: '2026-11-08' });
    expect(buckets[0].avg_duration).toBe(50);
  });
});

describe('totals', () => {
  const range = { from: '2026-11-01', to: '2026-11-30' };

  it('measures completion over real logs only', () => {
    const out = computeWorkoutAnalytics([
      session({ id: 'a', status: 'completed', volume: 1000, duration_minutes: 45, completed_set_count: 12 }),
      session({ id: 'b', status: 'in_progress', volume: 500, duration_minutes: 30, completed_set_count: 6 }),
      session({ id: 'c', status: 'abandoned', volume: 900 }),
    ], [], range);
    expect(out.total).toBe(2);
    expect(out.completed).toBe(1);
    expect(out.completion_pct).toBe(50);
    expect(out.total_volume).toBe(1500);
    expect(out.avg_volume).toBe(750);
    expect(out.avg_duration).toBe(38); // (45 + 30) / 2, rounded
    expect(out.completed_sets).toBe(18);
    expect(out.active_days).toBe(1);
  });

  it('says null rather than zero when there is no basis', () => {
    const out = computeWorkoutAnalytics([], [], range);
    expect(out.completion_pct).toBeNull();
    expect(out.avg_duration).toBeNull();
    expect(out.avg_volume).toBeNull();
    expect(out.total).toBe(0);
  });

  it('ignores an unset duration instead of averaging it in as zero', () => {
    const out = computeWorkoutAnalytics([
      session({ id: 'a', duration_minutes: null }),
      session({ id: 'b', duration_minutes: 40 }),
    ], [], range);
    expect(out.avg_duration).toBe(40);
  });

  it('counts only personal records inside the range', () => {
    const out = computeWorkoutAnalytics([], [
      pr({ session_date: '2026-11-04' }),
      pr({ session_date: '2026-10-31' }),
    ], range);
    expect(out.pr_count).toBe(1);
  });

  it('counts a weekly streak back through the latest empty current week', () => {
    // Three previous weeks trained, this week not yet: Monday morning must not
    // report that the streak ended on Sunday night.
    const out = computeWorkoutAnalytics([
      session({ id: 'a', session_date: '2026-10-14' }),
      session({ id: 'b', session_date: '2026-10-21' }),
      session({ id: 'c', session_date: '2026-10-28' }),
    ], [], { from: '2026-10-12', to: '2026-11-04' });
    expect(out.weeks.map((w) => w.sessions)).toEqual([1, 1, 1, 0]);
    expect(out.week_streak).toBe(3);
  });

  it('breaks the streak on a genuinely empty week', () => {
    const out = computeWorkoutAnalytics([
      session({ id: 'a', session_date: '2026-10-14' }),
      session({ id: 'b', session_date: '2026-10-28' }),
    ], [], { from: '2026-10-12', to: '2026-11-04' });
    expect(out.week_streak).toBe(1);
  });
});

describe('calendar heatmap', () => {
  it('spans whole weeks so the grid has square corners', () => {
    const days = heatmapDays([], { from: '2026-11-04', to: '2026-11-11' });
    expect(days[0].date).toBe('2026-11-02');
    expect(days[days.length - 1].date).toBe('2026-11-15');
    expect(days).toHaveLength(14);
  });

  it('puts a day in exactly one cell and keeps zeros as days', () => {
    const days = heatmapDays([session({ session_date: '2026-11-04', volume: 800 })], {
      from: '2026-11-04', to: '2026-11-04',
    });
    const hit = days.filter((d) => d.date === '2026-11-04');
    expect(hit).toHaveLength(1);
    expect(hit[0]).toMatchObject({ sessions: 1, volume: 800 });
    expect(days.filter((d) => d.sessions === 0)).toHaveLength(6);
  });
});

describe('muscle distribution', () => {
  it('drops muscles with no hard sets and sorts the rest', () => {
    const out = muscleDistribution([
      { target_muscle: 'chest', sets: 8, last_trained: null, days_since: null, mev_sets: null, mrv_sets: null, status: null },
      { target_muscle: 'back', sets: 12, last_trained: null, days_since: null, mev_sets: null, mrv_sets: null, status: null },
      { target_muscle: 'calves', sets: 0, last_trained: null, days_since: null, mev_sets: null, mrv_sets: null, status: null },
    ]);
    expect(out).toEqual([{ name: 'Back', value: 12 }, { name: 'Chest', value: 8 }]);
  });
});
