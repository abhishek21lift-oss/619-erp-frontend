import { describe, expect, it } from 'vitest';
import { countDay, type DayRow } from '@/lib/schedule-stats';
import type { TodayClient } from '@/lib/api';

function client(over: Partial<TodayClient> = {}): TodayClient {
  return {
    assignment_id: 'a1',
    client_id: 'c1',
    client_name: 'Rashi Bhatia',
    client_photo: null,
    plan_id: 'p1',
    plan_name: 'Advanced Level 6 Day Split',
    progress_pct: 40,
    planned_exercises: 6,
    start_time: '09:00',
    source: 'programme',
    is_rest_day: false,
    session_id: null,
    session_status: null,
    ...over,
  };
}

describe('countDay', () => {
  it('does not count a rest day as work left to do', () => {
    const rows: DayRow[] = [
      { client: client({ is_rest_day: true, planned_exercises: 0 }), booking: null },
    ];

    expect(countDay(rows).toDo).toBe(0);
    expect(countDay(rows).total).toBe(1);
  });

  it('counts an unfinished training day, and not a completed one', () => {
    const rows: DayRow[] = [
      { client: client({ client_id: 'c1' }), booking: null },
      { client: client({ client_id: 'c2', session_status: 'completed' }), booking: null },
    ];

    expect(countDay(rows).toDo).toBe(1);
    expect(countDay(rows).done).toBe(1);
  });

  it('shows a booking whose client left the roster, and counts its cancellation', () => {
    const rows: DayRow[] = [{
      client: null,
      booking: {
        id: 's1', client_id: 'gone', client_name: 'Gone Client', trainer_id: 't1',
        session_date: '2026-11-10', start_time: '10:00:00', duration_minutes: 60,
        session_type: '1-on-1', status: 'cancelled', notes: '',
      } as DayRow['booking'],
    }];

    expect(countDay(rows).total).toBe(1);
    expect(countDay(rows).missed).toBe(1);
    expect(countDay(rows).toDo).toBe(0);
  });
});
