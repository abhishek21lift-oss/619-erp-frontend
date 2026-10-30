import { test, expect } from '@playwright/test';
import {
  apiToken, memberApiToken, apiGet, apiPost, apiPut, apiDelete,
} from './helpers/session';

/**
 * The booking loop, end to end, against a real database.
 *
 * What only this spec can prove: the trainer's published week is the same fact
 * the member's slot list is built from, the member's booking is the row the
 * trainer then sees, and cancelling it is visible on both sides. The Jest and
 * Vitest suites each mock the other side of that boundary.
 *
 * ── Why it moves the trainer's own availability ───────────────────────────
 *
 * Booking has to happen inside published hours, and the seeded studio has no
 * weekly availability (it was not a product feature until now). So the spec
 * publishes a week, and restores the previous one in `finally` — a failing
 * assertion must not leave every later journey with a one-hour studio.
 */

/** Days from today as YYYY-MM-DD, in UTC (the server stores plain dates). */
function inDays(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
}

const DAY = inDays(3); // comfortably past any minimum-notice setting
const WEEKDAY = new Date(`${DAY}T00:00:00Z`).getUTCDay();

test('trainer publishes a slot, member books it, trainer sees it, member cancels', async () => {
  const trainer = await apiToken();
  const member = await memberApiToken();

  const settingsBefore = (await apiGet<{ data: Record<string, unknown> }>(
    '/api/pt-os/booking-settings', trainer,
  )).data;
  const availabilityBefore = (await apiGet<{ data: { windows: unknown[] } }>(
    '/api/pt-os/availability', trainer,
  )).data.windows;

  try {
    const settings = await apiPut('/api/pt-os/booking-settings', trainer, {
      slot_minutes: 60,
      buffer_minutes: 0,
      min_notice_hours: 12,
      horizon_days: 30,
      cancel_cutoff_hours: 12,
    });
    expect(settings.status).toBe(200);

    const published = await apiPut('/api/pt-os/availability', trainer, {
      windows: [{ weekday: WEEKDAY, start_time: '07:00', end_time: '11:00' }],
    });
    expect(published.status).toBe(200);

    // The member sees the trainer's week as bookable slots.
    const availability = await apiGet<{ data: { days: { date: string; slots: { start: string }[] }[] } }>(
      '/api/me/booking/availability', member,
    );
    const slots = availability.data.days.find((d) => d.date === DAY)?.slots ?? [];
    expect(slots.length).toBeGreaterThan(0);

    const booked = await apiPost<{ data: { id: string; session_date: string; start_time: string } }>(
      '/api/me/booking', member, { date: DAY, start: slots[0].start },
    );
    expect(booked.status).toBe(201);

    // It is a pt_sessions row the trainer's own list now returns.
    const sessions = await apiGet<{ data: { id: string; status: string }[] }>(
      `/api/pt-os/sessions?date=${DAY}`, trainer,
    );
    expect(sessions.data.some((s) => s.id === booked.body.data.id)).toBe(true);

    // ...and the member's list marks it movable this far out.
    const mine = await apiGet<{ data: { id: string; can_cancel: boolean }[] }>('/api/me/booking', member);
    expect(mine.data.find((s) => s.id === booked.body.data.id)?.can_cancel).toBe(true);

    expect(await apiDelete(`/api/me/booking/${booked.body.data.id}`, member)).toBe(200);

    const after = await apiGet<{ data: { id: string; status: string }[] }>(
      `/api/pt-os/sessions?date=${DAY}`, trainer,
    );
    expect(after.data.find((s) => s.id === booked.body.data.id)?.status).toBe('cancelled');
  } finally {
    await apiPut('/api/pt-os/availability', trainer, { windows: availabilityBefore });
    await apiPut('/api/pt-os/booking-settings', trainer, {
      slot_minutes: settingsBefore.slot_minutes,
      buffer_minutes: settingsBefore.buffer_minutes,
      min_notice_hours: settingsBefore.min_notice_hours,
      horizon_days: settingsBefore.horizon_days,
      cancel_cutoff_hours: settingsBefore.cancel_cutoff_hours,
    });
  }
});
