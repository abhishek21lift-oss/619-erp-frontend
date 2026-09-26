/**
 * The member's package dates, as the dashboard and the membership card show
 * them. One copy, so the two screens can never disagree about days left.
 */

/** Whole days until the end of `end`'s day, never negative; null when unknown. */
export function daysLeft(end: string | null | undefined): number | null {
  if (!end) return null;
  const d = new Date(end);
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.setHours(23, 59, 59, 999) - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Share of the package elapsed, 0–100. Null unless BOTH ends are known — a
 * bar with one endpoint guessed is a bar that lies about how much time is left.
 */
export function elapsedPct(start: string | null | undefined, end: string | null | undefined): number | null {
  const s = start ? new Date(start).getTime() : NaN;
  const e = end ? new Date(end).getTime() : NaN;
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null;
  return Math.min(100, Math.max(0, ((Date.now() - s) / (e - s)) * 100));
}
