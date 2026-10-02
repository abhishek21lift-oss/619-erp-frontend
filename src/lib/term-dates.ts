// When a PT term has ended.
//
// A term's end date is its LAST valid day: the client trains on it. Three
// screens got that wrong:
//   * the client profile compared `new Date('YYYY-MM-DD') < new Date()`. A bare
//     date parses as midnight UTC, which is 05:30 in India, so from 05:30 on the
//     final day the profile already said "Inactive";
//   * the profile's fallback and the client list both treated days_left === 0
//     — the last day itself — as ended;
//   * the balance sheet showed the last day as "0d overdue".
//
// The server's days_left is `pt_end_date - CURRENT_DATE` in the studio's time
// zone (the database session's), so it is the authority: the term has ended
// only when it is NEGATIVE. Without it, the end date is compared as a string
// with today in the viewer's own calendar — never through a UTC Date.

import { todayISO } from '@/lib/forms/domain';

export function termEnded(
  daysLeft: number | null | undefined,
  ptEndDate?: string | null,
  today: string = todayISO(),
): boolean {
  if (typeof daysLeft === 'number' && Number.isFinite(daysLeft)) return daysLeft < 0;
  const end = String(ptEndDate ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
  return end < today;
}
