/**
 * Daily-journal heatmap data.
 *
 * The journal is a set of optional measurements, so "logged" is not a
 * boolean the server stores — it is the presence of a row. Intensity is how
 * many of those measurements that row actually filled in, which is why a
 * day with only sleep logged looks lighter than a full entry. A day with no
 * row stays blank; it is never drawn as a zero.
 *
 * Pure and date-only (UTC), so the grid cannot shift by a day in IST.
 */

import type { ProgressHabitLog } from '@/lib/api';

export interface JournalHeatDay {
  date: string;
  /** False for the padding days of the first/last week. */
  inRange: boolean;
  logged: boolean;
  filled: number;
}

const FIELDS: (keyof ProgressHabitLog)[] = [
  'sleep_hours', 'sleep_quality', 'water_ml', 'electrolytes', 'steps',
  'stress_level', 'energy_level', 'fatigue_level', 'soreness_level',
  'recovery_level', 'notes',
];

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The Monday on or before `date`. */
export function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function journalHeatmap(
  logs: ProgressHabitLog[],
  from: string,
  to: string,
): JournalHeatDay[] {
  if (!from || !to || from > to) return [];
  const byDate = new Map(logs.map((log) => [log.log_date, log]));
  const days: JournalHeatDay[] = [];
  const last = addDays(mondayOf(to), 6);
  for (let date = mondayOf(from); date <= last; date = addDays(date, 1)) {
    const log = byDate.get(date);
    days.push({
      date,
      inRange: date >= from && date <= to,
      logged: log != null,
      filled: log
        ? FIELDS.filter((key) => log[key] != null && log[key] !== '').length
        : 0,
    });
  }
  return days;
}

/** 0 = no entry, 4 = most of the journal filled in. */
export function journalHeatLevel(day: JournalHeatDay): 0 | 1 | 2 | 3 | 4 {
  if (!day.logged) return 0;
  if (day.filled >= 6) return 4;
  if (day.filled >= 3) return 3;
  if (day.filled >= 2) return 2;
  return 1;
}
