import type { PtSession, TodayClient } from '@/lib/api';

/** One line of the selected day's agenda: a roster client, a booking, or both. */
export type DayRow = { client: TodayClient | null; booking: PtSession | null };

/**
 * The day's four figures, counted from the same rows the agenda shows.
 *
 * A rest day is deliberately not "to do": the roster includes it so the
 * trainer can see the client, but the programme prescribes nothing, and
 * counting it would say there is work left when there is none.
 */
export function countDay(rows: DayRow[]) {
  return {
    total: rows.length,
    done: rows.filter((r) => r.client?.session_status === 'completed').length,
    toDo: rows.filter((r) => r.client && r.client.session_status !== 'completed' && !r.client.is_rest_day).length,
    missed: rows.filter((r) => r.booking
      && (r.booking.status === 'cancelled' || r.booking.status === 'no_show')).length,
  };
}
