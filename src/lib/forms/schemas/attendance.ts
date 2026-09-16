/**
 * A manual attendance correction.
 *
 * The ordinary path is the check-in QR or the day's Mark Present grid; this
 * modal is the one that fixes what those got wrong — somebody trained and the
 * scanner was down, somebody was marked present who was not there.
 *
 * ── What the server does with these three values ────────────────────────────
 *
 *     const checkIn = d.check_in
 *       ? new Date(d.date + 'T' + d.check_in).toISOString()
 *       : null;
 *
 * so `date` and `check_in` are concatenated into a timestamp. The write is an
 * upsert on `(ref_id, ref_type, date)`, which is why a double-tap here is
 * harmless — and also why `date` is the one field that must be right: a wrong
 * date does not correct a record, it creates a second one on a different day
 * and leaves the wrong one standing.
 *
 * Nothing on either side validated it. `max={date}` on the input is a browser
 * hint, not a rule, and an empty box posted `date: ''` for the server's
 * `!d.date` check to reject with a message about a field the user cannot see.
 */

import { z } from 'zod';
import { textField, dateField, enumField } from '../primitives';

/** The statuses the route accepts; it defaults to 'present' when absent. */
export const ATTENDANCE_STATUSES = ['present', 'late', 'absent'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * A check-in time, or null.
 *
 * Optional and kept that way: "they were here" is a complete record on its
 * own, and a studio correcting a missed scan often does not know the minute.
 * When it IS given it must be `HH:MM`, because the server concatenates it into
 * a timestamp — `new Date('2026-06-01T' + 'abc')` is an Invalid Date and
 * `.toISOString()` throws on one.
 */
const checkInField = z.unknown().transform((raw, ctx): string | null => {
  const s = typeof raw === 'string' ? raw.trim() : raw == null ? '' : String(raw).trim();
  if (s === '') return null;
  if (!TIME_RE.test(s)) {
    ctx.addIssue({ code: 'custom', message: 'Use a time like 09:30.' });
    return z.NEVER;
  }
  return s;
});

export const attendanceEntrySchema = z.object({
  entryDate: dateField({ label: 'Date', required: true }),
  checkIn: checkInField,
  status: enumField(ATTENDANCE_STATUSES, { label: 'Status', required: true }),
  notes: textField({ label: 'Notes', maxLength: 500 }),
});

export type AttendanceEntryValues = z.output<typeof attendanceEntrySchema>;

/** The form's raw state — one string per control. See the note in campaign.ts. */
export type AttendanceEntryState = {
  entryDate: string;
  checkIn: string;
  status: AttendanceStatus;
  notes: string;
};

export function blankAttendanceEntry(entryDate: string): AttendanceEntryState {
  return { entryDate, checkIn: '', status: 'present', notes: '' };
}

/**
 * Whether a correction may be filed for this date.
 *
 * Attendance is a record of what happened. A future date is not a correction,
 * it is a booking, and this screen is not where a studio makes one — so it is
 * refused here rather than stored as an attendance that has not occurred.
 */
export function attendanceDateIssue(entryDate: string, today: string): string | null {
  if (!entryDate) return null;
  return entryDate > today ? 'Attendance cannot be recorded for a future date.' : null;
}
