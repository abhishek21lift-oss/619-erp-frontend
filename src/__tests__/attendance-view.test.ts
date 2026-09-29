import { describe, expect, it } from 'vitest';
import {
  todayYmd, shiftDay, lastDays, dayLabel, clockTime, ago, summarize,
  dailySeries, peakHours, dayCsv,
} from '@/lib/attendance-view';
import type { Attendance, Client } from '@/lib/api';

const client = (id: string, name = id) => ({ id, name } as Client);
const rec = (ref_id: string, status: string, extra: Partial<Attendance> = {}) =>
  ({ ref_id, status, ...extra } as Attendance);

describe('the day', () => {
  it('is the viewer\'s calendar day, not the UTC date', () => {
    // 1:00 AM local on the 29th; toISOString would say the 28th anywhere east of UTC.
    expect(todayYmd(new Date(2026, 8, 29, 1, 0))).toBe('2026-09-29');
  });

  it('shifts across month ends', () => {
    expect(shiftDay('2026-09-30', 1)).toBe('2026-10-01');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('a 7-day window ends on the day and is 7 days long', () => {
    expect(lastDays(7, '2026-09-29')).toEqual({ from: '2026-09-23', to: '2026-09-29' });
  });

  it('labels today and yesterday by name', () => {
    expect(dayLabel('2026-09-29', '2026-09-29')).toBe('Today');
    expect(dayLabel('2026-09-28', '2026-09-29')).toBe('Yesterday');
  });
});

describe('times', () => {
  it('reads the ISO timestamp the API sends, which the page used to turn into NaN', () => {
    const iso = new Date(2026, 8, 29, 5, 38).toISOString();
    expect(clockTime(iso)).toBe('5:38 AM');
  });

  it('accepts a bare time and refuses rubbish', () => {
    expect(clockTime('07:05')).toBe('7:05 AM');
    expect(clockTime('')).toBeNull();
    expect(clockTime('nope')).toBeNull();
  });

  it('says how long ago from a real timestamp', () => {
    const now = new Date(2026, 8, 29, 8, 0).getTime();
    expect(ago(new Date(2026, 8, 29, 7, 48).toISOString(), now)).toBe('12 min ago');
    expect(ago(new Date(2026, 8, 29, 5, 38).toISOString(), now)).toBe('2 h ago');
    expect(ago('07:48', now)).toBeNull();
  });
});

describe('the day\'s figures', () => {
  const roster = [client('a'), client('b'), client('c'), client('d')];

  it('count over the active roster, with unmarked the members who have no row', () => {
    const s = summarize(roster, [rec('a', 'present'), rec('b', 'late'), rec('c', 'absent')]);
    expect(s).toMatchObject({ present: 1, late: 1, absent: 1, unmarked: 1, total: 4, checkedIn: 2, rate: 50, offRoster: 0 });
  });

  it('a record for someone off the roster no longer eats an unmarked slot', () => {
    // The old `clients.length - records.length` read 2 here, and 0 with one more.
    const s = summarize(roster, [rec('a', 'present'), rec('zz-expired', 'present')]);
    expect(s.unmarked).toBe(3);
    expect(s.offRoster).toBe(1);
    expect(s.present).toBe(1);
  });
});

describe('trends', () => {
  it('one point per day in the window, zero where nobody came', () => {
    const series = dailySeries(
      [rec('a', 'present', { date: '2026-09-27' }), rec('b', 'late', { date: '2026-09-27' }),
        rec('c', 'absent', { date: '2026-09-28' })],
      '2026-09-26', '2026-09-28', 4);
    expect(series.map((p) => [p.date, p.checkedIn, p.pct])).toEqual([
      ['2026-09-26', 0, 0], ['2026-09-27', 2, 50], ['2026-09-28', 0, 0],
    ]);
  });

  it('peak hours bucket by the local hour of the timestamp', () => {
    const at = (h: number) => new Date(2026, 8, 29, h, 15).toISOString();
    const hours = peakHours([rec('a', 'present', { check_in: at(6) }), rec('b', 'present', { check_in: at(7) }), rec('c', 'present', { check_in: at(18) })]);
    expect(hours.find((h) => h.label === '5–8 AM')).toMatchObject({ count: 2, share: 67 });
    expect(hours.find((h) => h.label === '5–8 PM')).toMatchObject({ count: 1, share: 33 });
  });
});

describe('the export', () => {
  it('lists every active member for the day, marked or not', () => {
    const csv = dayCsv([client('a', 'Asha'), client('b', 'Bala "B"')], [rec('a', 'present', { method: 'qr' })], '2026-09-29');
    const lines = csv.split('\n');
    expect(lines[0]).toBe('"Date","Member","Member ID","Status","Check-in","Check-out","Method"');
    expect(lines[1]).toContain('"Asha"');
    expect(lines[1]).toContain('"present"');
    expect(lines[2]).toContain('"Bala ""B"""');
    expect(lines[2]).toContain('"unmarked"');
  });
});
