/**
 * A trainer's leave request, and the type that could never be filed.
 *
 * Three lists name the leave types a studio may file, and until backend
 * migration 204 they disagreed. The database's CHECK allowed six values;
 * `routes/leave.js` validated against seven and this page's dropdown offered
 * the same seven. The extra one was `personal` — the natural choice for the
 * very example the Reason box suggests, "personal emergency". Picking it
 * passed the browser, passed the route's own validation, and then violated
 * the constraint on the INSERT: a Postgres error surfacing as a 500, with no
 * field marked and nothing to correct.
 *
 * `leaveTypeVocabulary.test.js` on the server pins the other two lists. This
 * is the third.
 */

import { describe, it, expect } from 'vitest';
import {
  leaveRequestSchema, blankLeaveRequest, toLeaveRequestPayload, leaveDays,
  LEAVE_TYPES, LEAVE_TYPE_OPTIONS, MAX_LEAVE_DAYS,
} from '@/lib/forms/schemas/leave';

const draft = blankLeaveRequest();
const valid = { ...draft, trainerId: 't1', fromDate: '2026-06-01', toDate: '2026-06-03' };

describe('the leave-type vocabulary', () => {
  it('matches VALID_LEAVE_TYPES in routes/leave.js and the CHECK in migration 204', () => {
    expect([...LEAVE_TYPES].sort()).toEqual(
      ['casual', 'earned', 'emergency', 'other', 'personal', 'sick', 'unpaid'],
    );
  });

  it('offers personal, which the constraint used to refuse', () => {
    expect(leaveRequestSchema.safeParse({ ...valid, leaveType: 'personal' }).success).toBe(true);
  });

  it('refuses a type no list contains', () => {
    expect(leaveRequestSchema.safeParse({ ...valid, leaveType: 'sabbatical' }).success).toBe(false);
  });

  it('offers every type in the dropdown', () => {
    expect(LEAVE_TYPE_OPTIONS.map((o) => o.value)).toEqual([...LEAVE_TYPES]);
  });
});

describe('counting the days', () => {
  it('counts both ends', () => {
    expect(leaveDays('2026-06-01', '2026-06-03')).toBe(3);
    expect(leaveDays('2026-06-01', '2026-06-01')).toBe(1);
  });

  it('survives a range crossing a daylight-saving boundary', () => {
    // The old `new Date('2026-03-28')` reads a bare date as UTC MIDNIGHT, so a
    // subtraction across a DST change came out an hour short and floored to a
    // day fewer. Parsing the parts at UTC noon puts both ends far enough from
    // either edge that no offset in use can cross it.
    expect(leaveDays('2026-03-28', '2026-03-30')).toBe(3);
    expect(leaveDays('2026-10-24', '2026-10-26')).toBe(3);
  });

  it('spans a month and a leap day correctly', () => {
    expect(leaveDays('2026-01-31', '2026-02-02')).toBe(3);
    expect(leaveDays('2028-02-28', '2028-03-01')).toBe(3);
  });

  it('returns null rather than a number for a backwards or unparseable range', () => {
    expect(leaveDays('2026-06-03', '2026-06-01')).toBeNull();
    expect(leaveDays('', '2026-06-01')).toBeNull();
    expect(leaveDays('yesterday', 'today')).toBeNull();
  });
});

describe('filing a request', () => {
  it('accepts a sound request', () => {
    expect(leaveRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('requires a trainer', () => {
    const r = leaveRequestSchema.safeParse({ ...valid, trainerId: '' });
    expect(r.success).toBe(false);
    expect(r.success === false && r.error.issues[0].path[0]).toBe('trainerId');
  });

  it('requires both dates', () => {
    expect(leaveRequestSchema.safeParse({ ...valid, fromDate: '' }).success).toBe(false);
    expect(leaveRequestSchema.safeParse({ ...valid, toDate: '' }).success).toBe(false);
  });

  it('refuses an end before the start', () => {
    const r = leaveRequestSchema.safeParse({ ...valid, fromDate: '2026-06-03', toDate: '2026-06-01' });
    expect(r.success).toBe(false);
    expect(r.success === false && r.error.issues[0].path[0]).toBe('toDate');
  });

  it('allows a single day, which is the common case', () => {
    expect(leaveRequestSchema.safeParse({ ...valid, fromDate: '2026-06-01', toDate: '2026-06-01' }).success)
      .toBe(true);
  });

  it('catches a mistyped year rather than filing a year of absence', () => {
    // Neither the server nor the column bounds this, and an approver sees a
    // 365-day request as one line in a list.
    const r = leaveRequestSchema.safeParse({ ...valid, fromDate: '2026-06-01', toDate: '2027-06-03' });
    expect(r.success).toBe(false);
    expect(r.success === false && r.error.issues[0].message).toMatch(/check the year/i);
  });

  it('allows a request right up to the limit', () => {
    const r = leaveRequestSchema.safeParse({ ...valid, fromDate: '2026-01-01', toDate: '2026-12-31' });
    expect(leaveDays('2026-01-01', '2026-12-31')).toBeLessThanOrEqual(MAX_LEAVE_DAYS);
    expect(r.success).toBe(true);
  });

  it('keeps the reason optional and omits it when blank', () => {
    const r = leaveRequestSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(toLeaveRequestPayload(r.data).reason).toBeUndefined();
  });

  it('sends the field names the route reads', () => {
    const r = leaveRequestSchema.safeParse({ ...valid, reason: 'Wedding' });
    if (r.success) {
      expect(toLeaveRequestPayload(r.data)).toEqual({
        trainer_id: 't1',
        leave_type: 'sick',
        from_date: '2026-06-01',
        to_date: '2026-06-03',
        reason: 'Wedding',
      });
    }
  });
});
