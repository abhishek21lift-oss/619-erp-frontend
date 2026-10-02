// The last day of a PT term is a valid day, all day (Phase 2).
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { termEnded } from '@/lib/term-dates';

afterEach(() => vi.useRealTimers());

describe('termEnded', () => {
  it('the server\'s days_left decides: only a negative count has ended', () => {
    expect(termEnded(5)).toBe(false);
    expect(termEnded(0)).toBe(false); // the last day
    expect(termEnded(-1)).toBe(true);
  });

  it('days_left wins over the end date', () => {
    expect(termEnded(0, '2026-10-01', '2026-10-02')).toBe(false);
  });

  it('without days_left, the end date compares with today as dates, never through UTC', () => {
    expect(termEnded(null, '2026-10-02', '2026-10-02')).toBe(false);
    expect(termEnded(null, '2026-10-01', '2026-10-02')).toBe(true);
    expect(termEnded(undefined, '2026-10-02T00:00:00.000Z', '2026-10-02')).toBe(false);
  });

  it('at 23:30 IST on the last day the term has not ended (the old check said it had from 05:30)', () => {
    vi.useFakeTimers();
    // 23:30 in India on 2 Oct = 18:00 UTC; the old check was new Date('2026-10-02') < now.
    vi.setSystemTime(new Date('2026-10-02T18:00:00Z'));
    expect(new Date('2026-10-02') < new Date()).toBe(true); // the bug, for the record
    expect(termEnded(null, '2026-10-02', '2026-10-02')).toBe(false);
  });

  it('no end date is not an ended term', () => {
    expect(termEnded(null, null)).toBe(false);
    expect(termEnded(null, 'soon')).toBe(false);
  });
});

describe('the screens use it', () => {
  const APP = path.join(__dirname, '..', 'app', '(chrome)', 'pt-os');
  const read = (rel: string) => fs.readFileSync(path.join(APP, rel), 'utf8');

  it('the profile no longer compares a bare date through new Date()', () => {
    const src = read('clients/[id]/page.tsx');
    expect(src).not.toMatch(/new Date\(pt_end_date\) < new Date\(\)/);
    expect(src).toMatch(/termEnded\(days_left, pt_end_date\)/);
  });

  it('the client list and balance sheet do not call the last day expired or overdue', () => {
    expect(read('clients/page.tsx')).not.toMatch(/days_left <= 0/);
    expect(read('balance-sheet/page.tsx')).not.toMatch(/days_left <= 0/);
    expect(read('balance-sheet/page.tsx')).toMatch(/'Last day'/);
  });
});
