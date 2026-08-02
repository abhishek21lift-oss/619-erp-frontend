// Turning what the sessions API actually sends into what the calendar reads.
//
// Booking a PT session appeared to do nothing. Two separate faults stacked up.
// The first was in the database — pt_sessions.trainer_id referenced
// pt_trainers, a table that has never held a row, so every INSERT was rejected
// (fixed by backend migration 145). This file covers the second one, which
// would have kept the screen looking broken even once rows started saving.
//
// session_date is a Postgres DATE. node-postgres parses those into a JS Date,
// so res.json() puts "2026-08-02T00:00:00.000Z" on the wire — verified against
// a real Postgres instance, not assumed. Every day cell on the calendar builds
// a plain "2026-08-02" and compares with ===, so the raw value matched no day
// on the grid and the session was invisible.
//
// start_time is a Postgres TIME and arrives as "06:00:00", while the time
// input and the conflict check both speak "06:00" — which is why the
// duplicate-booking guard had never once fired.
import { describe, expect, it } from 'vitest';
import { toInputDate, toHHMM } from '@/lib/format';

// Exactly what `SELECT s.* FROM pt_sessions s` serialises to over res.json().
// Captured from a live Postgres, not hand-written to suit the test.
const API_ROW = {
  session_date: '2026-08-02T00:00:00.000Z',
  start_time: '06:00:00',
  duration_minutes: 60,
};

describe('session_date → calendar day', () => {
  it('lands on the day the trainer booked', () => {
    // The bug in one line: the raw value is not the day cell's string.
    expect(API_ROW.session_date).not.toBe('2026-08-02');
    expect(toInputDate(API_ROW.session_date)).toBe('2026-08-02');
  });

  it('matches the string the calendar grid builds for that cell', () => {
    // Same construction the day buttons use: year/month/day, zero-padded.
    const year = 2026, month = 7, day = 2; // month is 0-indexed
    const cell = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    expect(toInputDate(API_ROW.session_date)).toBe(cell);
  });

  it('passes an already-plain date through untouched', () => {
    // Not every row arrives with a time component; both shapes must work.
    expect(toInputDate('2026-08-02')).toBe('2026-08-02');
  });

  it('is empty rather than "Invalid Date" when there is no date', () => {
    expect(toInputDate(null)).toBe('');
    expect(toInputDate('')).toBe('');
  });
});

describe('start_time → HH:MM', () => {
  it('drops the seconds the database sends', () => {
    expect(API_ROW.start_time).not.toBe('06:00');
    expect(toHHMM(API_ROW.start_time)).toBe('06:00');
  });

  it('lets the duplicate-booking guard actually match', () => {
    // The guard compares a stored session's time against the form's value.
    // "06:00:00" === "06:00" is false, so it never fired and two sessions
    // could be booked into one slot with no warning.
    const stored = toHHMM(API_ROW.start_time);
    const fromTimeInput = '06:00';
    expect(stored).toBe(fromTimeInput);
  });

  it('pads a single-digit hour so comparisons stay string-safe', () => {
    // "6:00" and "06:00" are the same minute but not the same string.
    expect(toHHMM('6:00:00')).toBe('06:00');
  });

  it('keeps a value that is already HH:MM', () => {
    expect(toHHMM('18:30')).toBe('18:30');
  });

  it('is empty rather than garbage for missing or unparseable input', () => {
    expect(toHHMM(null)).toBe('');
    expect(toHHMM('')).toBe('');
    expect(toHHMM('not a time')).toBe('');
  });
});
