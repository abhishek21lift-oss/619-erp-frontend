/**
 * Monthly recap — turning GET /api/me/recap into the slides and the share
 * card. Pure functions only; RecapStory.tsx and the page draw them.
 *
 * A slide exists only when its figure does: a month with no weigh-ins has no
 * weight slide, a month with no records broken has no records slide. Nothing
 * is padded to make a thin month look fuller.
 */

import type { MeRecap } from '@/lib/api';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** "September", or "September 2025" when it is not this year. */
export function monthName(month: string, now: Date = new Date()): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  const name = d.toLocaleDateString('en-IN', { month: 'long', timeZone: 'UTC' });
  return y === now.getFullYear() ? name : `${name} ${y}`;
}

/** 18420 → "18.4 t", 950 → "950 kg". */
export function weightTotal(kg: number): { value: string; unit: string } {
  if (kg >= 1000) return { value: (Math.round(kg / 100) / 10).toLocaleString('en-IN'), unit: 'tonnes' };
  return { value: Math.round(kg).toLocaleString('en-IN'), unit: 'kg' };
}

export const kg = (n: number | null | undefined) => (n === null || n === undefined ? '' : `${Math.round(n * 10) / 10} kg`);

/** "+4 vs August", "Same as August", or null when last month had nothing. */
export function versus(now: number, before: number, previousMonth: string, unit = ''): string | null {
  if (before <= 0) return null;
  const diff = now - before;
  const prev = monthName(previousMonth);
  if (diff === 0) return `Same as ${prev}`;
  return `${diff > 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('en-IN')}${unit} vs ${prev}`;
}

export function previousMonthOf(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** The weekday trained most, or null when no day stands out (a tie, or nothing). */
export function favouriteDay(weekdays: number[]): string | null {
  const max = Math.max(0, ...weekdays);
  if (max === 0) return null;
  const top = weekdays.map((n, i) => (n === max ? i : -1)).filter((i) => i >= 0);
  return top.length === 1 ? WEEKDAYS[top[0]] : null;
}

/** Nothing trained or visited — the page shows a gentle empty state instead. */
export function isEmptyMonth(r: MeRecap): boolean {
  return r.totals.sessions === 0 && r.totals.visits === 0 && r.totals.sets === 0;
}

export type SlideKind = 'intro' | 'sessions' | 'rhythm' | 'volume' | 'top' | 'records' | 'favourite' | 'body' | 'summary';

/** The slides this month earns, in order. */
export function slidesFor(r: MeRecap): SlideKind[] {
  const out: SlideKind[] = ['intro'];
  if (r.totals.sessions > 0 || r.totals.visits > 0) out.push('sessions');
  if (r.weekdays.filter((n) => n > 0).length >= 2) out.push('rhythm');
  if (r.totals.sets > 0) out.push('volume');
  if (r.top_lift) out.push('top');
  if (r.records.length > 0) out.push('records');
  if (r.favourite && r.favourite.sets >= 3) out.push('favourite');
  if (r.weight && r.weight.change_kg !== null) out.push('body');
  out.push('summary');
  return out;
}

/** The four figures the share card and summary lead with — the strongest first. */
export function headlineStats(r: MeRecap): { label: string; value: string }[] {
  const t = r.totals;
  const vol = weightTotal(t.volume_kg);
  const stats: { label: string; value: string }[] = [];
  if (t.sessions > 0) stats.push({ label: t.sessions === 1 ? 'Session' : 'Sessions', value: String(t.sessions) });
  else if (t.visits > 0) stats.push({ label: t.visits === 1 ? 'Visit' : 'Visits', value: String(t.visits) });
  if (t.volume_kg > 0) stats.push({ label: vol.unit === 'tonnes' ? 'Tonnes lifted' : 'Kg lifted', value: vol.value });
  if (r.records.length > 0) stats.push({ label: r.records.length === 1 ? 'Record broken' : 'Records broken', value: String(r.records.length) });
  if (t.sets > 0) stats.push({ label: 'Sets', value: t.sets.toLocaleString('en-IN') });
  if (t.active_weeks > 0 && stats.length < 4) stats.push({ label: t.active_weeks === 1 ? 'Active week' : 'Active weeks', value: String(t.active_weeks) });
  if (r.weight?.change_kg != null && stats.length < 4) {
    const c = r.weight.change_kg;
    stats.push({ label: 'Weight change', value: `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)} kg` });
  }
  return stats.slice(0, 4);
}
