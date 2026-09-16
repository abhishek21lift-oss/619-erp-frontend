/**
 * A manual attendance correction.
 *
 * The ordinary path is the QR check-in or the day's Mark Present grid; this
 * modal fixes what those got wrong. The write is an upsert on
 * `(ref_id, ref_type, date)`, which makes a double-tap harmless — and makes
 * `date` the field that must be right: a wrong date does not correct a record,
 * it writes a second one on a different day and leaves the wrong one standing.
 *
 * Nothing on either side validated it. `max={date}` on the input is a browser
 * hint, and an empty box posted `date: ''` for the server's own `!d.date`
 * check to answer with a message about a field the user could not see.
 */

import { describe, it, expect } from 'vitest';
import {
  attendanceEntrySchema, blankAttendanceEntry, attendanceDateIssue,
  ATTENDANCE_STATUSES,
} from '@/lib/forms/schemas/attendance';

const valid = { ...blankAttendanceEntry('2026-06-01'), checkIn: '09:30' };

describe('the entry', () => {
  it('accepts a sound correction', () => {
    const r = attendanceEntrySchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.success && r.data.checkIn).toBe('09:30');
  });

  it('requires a date', () => {
    const r = attendanceEntrySchema.safeParse({ ...valid, entryDate: '' });
    expect(r.success).toBe(false);
    expect(r.success === false && r.error.issues[0].path[0]).toBe('entryDate');
  });

  it('keeps the check-in optional — "they were here" is a complete record', () => {
    const r = attendanceEntrySchema.safeParse({ ...valid, checkIn: '' });
    expect(r.success).toBe(true);
    // null here, omitted on the wire: the server concatenates it into a
    // timestamp and `new Date('2026-06-01T')` is an Invalid Date.
    expect(r.success && r.data.checkIn).toBeNull();
  });

  it('refuses a check-in that is not a time', () => {
    // `new Date('2026-06-01T' + 'abc').toISOString()` throws a RangeError on
    // the server, which is a 500 rather than a message.
    for (const bad of ['abc', '25:00', '09:60', '9:30am']) {
      expect(attendanceEntrySchema.safeParse({ ...valid, checkIn: bad }).success, bad).toBe(false);
    }
  });

  it('accepts midnight and the last minute of the day', () => {
    expect(attendanceEntrySchema.safeParse({ ...valid, checkIn: '00:00' }).success).toBe(true);
    expect(attendanceEntrySchema.safeParse({ ...valid, checkIn: '23:59' }).success).toBe(true);
  });

  it('offers exactly the statuses the route accepts', () => {
    expect(ATTENDANCE_STATUSES).toEqual(['present', 'late', 'absent']);
    for (const s of ATTENDANCE_STATUSES) {
      expect(attendanceEntrySchema.safeParse({ ...valid, status: s }).success).toBe(true);
    }
  });

  it('refuses a status outside that set', () => {
    expect(attendanceEntrySchema.safeParse({ ...valid, status: 'maybe' }).success).toBe(false);
  });

  it('defaults a blank entry to present on the shown day', () => {
    expect(blankAttendanceEntry('2026-06-01')).toEqual({
      entryDate: '2026-06-01', checkIn: '', status: 'present', notes: '',
    });
  });
});

describe('the future-date rule', () => {
  it('refuses a day that has not happened', () => {
    // Attendance is a record of what happened. A future date is a booking, and
    // this screen is not where a studio makes one.
    expect(attendanceDateIssue('2026-06-02', '2026-06-01')).toMatch(/future/i);
  });

  it('allows today and any past day', () => {
    expect(attendanceDateIssue('2026-06-01', '2026-06-01')).toBeNull();
    expect(attendanceDateIssue('2025-01-01', '2026-06-01')).toBeNull();
  });

  it('says nothing about an empty box — that is the required rule\'s job', () => {
    expect(attendanceDateIssue('', '2026-06-01')).toBeNull();
  });
});
