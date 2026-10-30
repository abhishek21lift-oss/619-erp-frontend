// Weekly-availability rules shared by the trainer's editor and its test.
//
// The server re-checks all of this (WINDOWS_INVALID / WINDOWS_OVERLAP); these
// exist so the trainer sees which row is wrong before a round trip, not as the
// authority.

import type { AvailabilityWindow } from '@/lib/api';

export const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** `null` when the week can be published, otherwise one sentence to show. */
export function validateWindows(windows: AvailabilityWindow[]): string | null {
  for (const w of windows) {
    if (!Number.isInteger(w.weekday) || w.weekday < 0 || w.weekday > 6) {
      return 'Each window needs a weekday from Sunday to Saturday.';
    }
    if (!TIME_RE.test(w.start_time) || !TIME_RE.test(w.end_time)) {
      return 'Times must be HH:MM, 24-hour.';
    }
    if (toMinutes(w.end_time) <= toMinutes(w.start_time)) {
      return `${WEEKDAYS[w.weekday]} window ends before it starts.`;
    }
  }

  for (let weekday = 0; weekday < 7; weekday += 1) {
    const day = windows
      .filter((w) => w.weekday === weekday)
      .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
    for (let i = 1; i < day.length; i += 1) {
      if (toMinutes(day[i].start_time) < toMinutes(day[i - 1].end_time)) {
        return `${WEEKDAYS[weekday]} windows overlap.`;
      }
    }
  }

  return null;
}
