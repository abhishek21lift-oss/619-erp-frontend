/**
 * The attendance page's arithmetic, out of the page so it can be tested.
 *
 * Every function here fixes something the page used to get wrong while still
 * rendering a plausible number:
 *
 *   · "today" was `new Date().toISOString()` — the UTC date, so between
 *     midnight and 5:30 AM in India the page opened on yesterday.
 *   · `check_in` is a TIMESTAMPTZ on the wire (an ISO string), and the page
 *     glued it onto '1970-01-01T', which is an Invalid Date: the live feed's
 *     "N min ago" and the peak-hours chart were computed from NaN.
 *   · Unmarked was `clients.length - records.length`. A record for someone not
 *     on the active roster (an expired client who still checked in) made it
 *     undercount, and could take it below zero.
 *   · The "weekly" chart was built from ONE day's records.
 */

import type { Attendance, Client } from '@/lib/api';

export type DayStatus = 'present' | 'late' | 'absent';
export const STATUSES: readonly DayStatus[] = ['present', 'late', 'absent'];

/** 'YYYY-MM-DD' for a Date in the viewer's own calendar (the studio's, on its devices). */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Today in the viewer's calendar. */
export function todayYmd(now: Date = new Date()): string {
  return ymd(now);
}

/** A date `n` days after `day` (negative for before). Noon avoids DST edges. */
export function shiftDay(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return ymd(new Date(y, m - 1, d + n, 12));
}

/** The inclusive window of the last `days` days ending on `to`. */
export function lastDays(days: number, to: string): { from: string; to: string } {
  return { from: shiftDay(to, -(Math.max(1, days) - 1)), to };
}

/** "Mon 29 Sep" / "Today" / "Yesterday" for the date strip. */
export function dayLabel(day: string, today: string): string {
  if (day === today) return 'Today';
  if (day === shiftDay(today, -1)) return 'Yesterday';
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * A check-in instant as a time of day: "5:38 AM". Accepts the ISO timestamp
 * the API returns and, defensively, a bare 'HH:MM[:SS]'.
 */
export function clockTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const bare = /^(\d{1,2}):(\d{2})/.exec(value);
  const d = bare && !value.includes('T')
    ? new Date(2000, 0, 1, Number(bare[1]), Number(bare[2]))
    : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
}

/** "Just now", "12 min ago", "3 h ago" — or null when the time is unknown. */
export function ago(value: string | null | undefined, now: number = Date.now()): string | null {
  if (!value || !value.includes('T')) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
}

export type DaySummary = {
  present: number; late: number; absent: number; unmarked: number;
  /** Active members on the roster. */
  total: number;
  /** Came in (present or late), as a share of the roster. */
  checkedIn: number;
  rate: number;
  /** Records for people not on the active roster, counted nowhere above. */
  offRoster: number;
};

/** Today's figures, over the active roster. */
export function summarize(clients: Pick<Client, 'id'>[], records: Attendance[]): DaySummary {
  const byId = new Map(records.map((r) => [String(r.ref_id), r]));
  let present = 0, late = 0, absent = 0, unmarked = 0;
  for (const c of clients) {
    const s = byId.get(String(c.id))?.status;
    if (s === 'present') present++;
    else if (s === 'late') late++;
    else if (s === 'absent') absent++;
    else unmarked++;
  }
  const roster = new Set(clients.map((c) => String(c.id)));
  const offRoster = records.filter((r) => !roster.has(String(r.ref_id))).length;
  const total = clients.length;
  const checkedIn = present + late;
  return { present, late, absent, unmarked, total, checkedIn, rate: total ? Math.round((checkedIn / total) * 100) : 0, offRoster };
}

export type DayPoint = { date: string; label: string; checkedIn: number; pct: number };

/**
 * One point per day across [from, to], including days nobody came — a gap in
 * the data is a day, not a missing bar. `rosterSize` is today's active count,
 * the only denominator the page has; it is labelled as such where drawn.
 */
export function dailySeries(records: Attendance[], from: string, to: string, rosterSize: number): DayPoint[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    if (r.status !== 'present' && r.status !== 'late') continue;
    const d = String(r.date ?? '').slice(0, 10);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const out: DayPoint[] = [];
  for (let d = from; d <= to; d = shiftDay(d, 1)) {
    const n = counts.get(d) ?? 0;
    const [y, m, dd] = d.split('-').map(Number);
    out.push({
      date: d,
      label: new Date(y, m - 1, dd, 12).toLocaleDateString('en-IN', { weekday: 'short' }),
      checkedIn: n,
      pct: rosterSize ? Math.min(100, Math.round((n / rosterSize) * 100)) : 0,
    });
    if (out.length > 400) break;
  }
  return out;
}

export const HOUR_BUCKETS = [
  { label: '5–8 AM', from: 5, to: 8 },
  { label: '8–11 AM', from: 8, to: 11 },
  { label: '11 AM–2 PM', from: 11, to: 14 },
  { label: '2–5 PM', from: 14, to: 17 },
  { label: '5–8 PM', from: 17, to: 20 },
  { label: '8–11 PM', from: 20, to: 23 },
] as const;

/** Check-ins per time-of-day bucket, in the viewer's hours. */
export function peakHours(records: Attendance[]): { label: string; count: number; share: number }[] {
  const counts = HOUR_BUCKETS.map(() => 0);
  let timed = 0;
  for (const r of records) {
    if (!r.check_in || !r.check_in.includes('T')) continue;
    const h = new Date(r.check_in).getHours();
    const i = HOUR_BUCKETS.findIndex((b) => h >= b.from && h < b.to);
    if (i >= 0) { counts[i]++; timed++; }
  }
  return HOUR_BUCKETS.map((b, i) => ({ label: b.label, count: counts[i], share: timed ? Math.round((counts[i] / timed) * 100) : 0 }));
}

/** The day's register as CSV: every active member, marked or not. */
export function dayCsv(clients: Client[], records: Attendance[], day: string): string {
  const byId = new Map(records.map((r) => [String(r.ref_id), r]));
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = clients.map((c) => {
    const r = byId.get(String(c.id));
    return [day, c.name, c.client_id ?? '', r?.status ?? 'unmarked', clockTime(r?.check_in) ?? '', clockTime(r?.check_out) ?? '', r?.method ?? ''];
  });
  return [['Date', 'Member', 'Member ID', 'Status', 'Check-in', 'Check-out', 'Method'], ...rows]
    .map((row) => row.map(esc).join(','))
    .join('\n');
}

/** Save a CSV string as a file. */
export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
