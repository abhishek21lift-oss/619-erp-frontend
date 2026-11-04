// The pure helpers behind the Week 3–4 charts.
//
// What they must not do: turn a day without an entry into a zero, shift a
// date by a day outside UTC, or claim a failed week for a check-in that never
// recorded an adherence percentage.

import { describe, expect, it } from 'vitest';
import {
  addDays, journalHeatLevel, journalHeatmap, mondayOf,
} from '@/components/member/journal';
import { weekdayBars } from '@/components/member/recap';
import { adherenceTrend } from '@/lib/insights/metrics';
import type { ProgressHabitLog } from '@/lib/api';

function log(log_date: string, fields: Partial<ProgressHabitLog> = {}): ProgressHabitLog {
  return {
    id: log_date, log_date,
    sleep_hours: null, sleep_quality: null, water_ml: null, electrolytes: null,
    steps: null, steps_source: null, stress_level: null, energy_level: null,
    fatigue_level: null, soreness_level: null, recovery_level: null,
    notes: null, source: 'manual', updated_at: `${log_date}T00:00:00Z`,
    ...fields,
  };
}

describe('journal heatmap date math', () => {
  it('walks days and weeks in UTC, never shifting in IST', () => {
    expect(addDays('2026-03-01', 1)).toBe('2026-03-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(mondayOf('2026-03-01')).toBe('2026-02-23'); // a Sunday
    expect(mondayOf('2026-03-02')).toBe('2026-03-02'); // a Monday
  });

  it('pads the range to whole Monday-first weeks', () => {
    // Wed 4 Mar → Tue 10 Mar: one in-range week, but two calendar weeks.
    const days = journalHeatmap([], '2026-03-04', '2026-03-10');
    expect(days).toHaveLength(14);
    expect(days[0].date).toBe('2026-03-02');
    expect(days[days.length - 1].date).toBe('2026-03-15');
    expect(days.filter((d) => d.inRange)).toHaveLength(7);
    expect(days[0].inRange).toBe(false);
    expect(days[days.length - 1].inRange).toBe(false);
  });

  it('rejects an inverted range instead of drawing it', () => {
    expect(journalHeatmap([], '2026-03-10', '2026-03-04')).toEqual([]);
  });
});

describe('journal heat levels', () => {
  it('a blank day is no entry, not a zero entry', () => {
    const days = journalHeatmap([], '2026-03-02', '2026-03-02');
    expect(days[0]).toMatchObject({ logged: false, filled: 0 });
    expect(journalHeatLevel(days[0])).toBe(0);
  });

  it('lightens a day that filled fewer fields', () => {
    const sparse = journalHeatmap([log('2026-03-02', { sleep_hours: 7 })], '2026-03-02', '2026-03-02')[0];
    const fuller = journalHeatmap([log('2026-03-02', {
      sleep_hours: 7, water_ml: 2500, steps: 8000,
    })], '2026-03-02', '2026-03-02')[0];
    expect(sparse.filled).toBe(1);
    expect(fuller.filled).toBe(3);
    expect(journalHeatLevel(sparse)).toBe(1);
    expect(journalHeatLevel(fuller)).toBe(3);
  });

  it('caps a fully filled journal at level 4', () => {
    const day = journalHeatmap([log('2026-03-02', {
      sleep_hours: 7, sleep_quality: 4, water_ml: 2500, electrolytes: true,
      steps: 8000, stress_level: 2, energy_level: 4, fatigue_level: 2,
      soreness_level: 2, recovery_level: 4, notes: 'good day',
    })], '2026-03-02', '2026-03-02')[0];
    expect(day.filled).toBe(11);
    expect(journalHeatLevel(day)).toBe(4);
  });
});

describe('weekdayBars', () => {
  it('maps the server’s Monday-first counts onto weekday labels', () => {
    const bars = weekdayBars([3, 0, 2, 1, 0, 0, 4]);
    expect(bars.map((b) => b.day)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(bars.map((b) => b.sessions)).toEqual([3, 0, 2, 1, 0, 0, 4]);
  });

  it('treats a missing weekday as no sessions, never undefined', () => {
    expect(weekdayBars([2]).map((b) => b.sessions)).toEqual([2, 0, 0, 0, 0, 0, 0]);
  });
});

describe('adherenceTrend', () => {
  it('drops check-ins without a percentage rather than plotting 0%', () => {
    const points = adherenceTrend([
      { week_start_date: '2026-03-09', adherence_pct: 80 },
      { week_start_date: '2026-03-02', adherence_pct: null },
      { week_start_date: '2026-03-16' },
      { week_start_date: '2026-03-23', adherence_pct: 0 },
    ]);
    expect(points).toEqual([
      { week: '2026-03-09', pct: 80 },
      { week: '2026-03-23', pct: 0 },
    ]);
  });

  it('orders the rows oldest first and normalises strings and timestamps', () => {
    const points = adherenceTrend([
      { week_start_date: '2026-03-16T00:00:00Z', adherence_pct: '65' },
      { week_start_date: '2026-03-02', adherence_pct: 40 },
      { week_start_date: '2026-03-09', adherence_pct: 'not a number' },
    ]);
    expect(points).toEqual([
      { week: '2026-03-02', pct: 40 },
      { week: '2026-03-16', pct: 65 },
    ]);
  });
});
