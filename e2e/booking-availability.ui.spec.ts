import { test, expect } from '@playwright/test';
import { gotoApp, apiToken, apiGet, apiPut } from './helpers/session';

/**
 * Journey — the trainer edits the booking settings the whole booking loop uses.
 *
 * The screen decides how a published window becomes a slot, so a control that
 * renders the right number but saves a different one is a scheduling bug the
 * trainer would only notice when a client cannot book. Read the five values
 * back through the API after the UI says it saved.
 *
 * The seeded studio is shared with the other journeys, so the original values
 * are restored afterwards.
 */

type Settings = {
  slot_minutes: number;
  buffer_minutes: number;
  min_notice_hours: number;
  horizon_days: number;
  cancel_cutoff_hours: number;
  ics_token: string | null;
};

type SettingsResponse = { data: Settings };

const read = async (token: string) =>
  (await apiGet<SettingsResponse>('/api/pt-os/booking-settings', token)).data;

const payload = (s: Settings) => ({
  slot_minutes: s.slot_minutes,
  buffer_minutes: s.buffer_minutes,
  min_notice_hours: s.min_notice_hours,
  horizon_days: s.horizon_days,
  cancel_cutoff_hours: s.cancel_cutoff_hours,
});

test.describe('Availability — booking settings', () => {
  test.setTimeout(90_000);
  let token: string;
  let original: Settings;
  let next: ReturnType<typeof payload>;

  test.beforeAll(async () => {
    token = await apiToken();
    original = await read(token);
    next = {
      slot_minutes: original.slot_minutes === 45 ? 60 : 45,
      buffer_minutes: original.buffer_minutes === 5 ? 0 : 5,
      min_notice_hours: original.min_notice_hours === 24 ? 12 : 24,
      horizon_days: original.horizon_days === 45 ? 30 : 45,
      cancel_cutoff_hours: original.cancel_cutoff_hours === 24 ? 12 : 24,
    };
  });

  test.afterAll(async () => {
    if (!original) return;
    const restored = await apiPut('/api/pt-os/booking-settings', token, payload(original));
    expect(restored.status, 'the original settings are restored').toBe(200);
  });

  test('the values typed into the form are the values the API reads back', async ({ page }) => {
    // `next dev` compiles a route on its first request; CI serves the build.
    page.setDefaultNavigationTimeout(90_000);
    await gotoApp(page, '/pt-os/availability');
    await expect(page.getByRole('heading', { name: 'Booking settings' }))
      .toBeVisible({ timeout: 60_000 });

    await page.getByLabel('Session length (min)').fill(String(next.slot_minutes));
    await page.getByLabel('Buffer after (min)').fill(String(next.buffer_minutes));
    await page.getByLabel('Minimum notice (h)').fill(String(next.min_notice_hours));
    await page.getByLabel('Book up to (days ahead)').fill(String(next.horizon_days));
    await page.getByLabel('Cancel/reschedule cutoff (h)').fill(String(next.cancel_cutoff_hours));

    await page.getByRole('button', { name: 'Save settings' }).click();

    await expect.poll(async () => {
      const saved = await read(token);
      return [
        saved.slot_minutes,
        saved.buffer_minutes,
        saved.min_notice_hours,
        saved.horizon_days,
        saved.cancel_cutoff_hours,
      ];
    }, { timeout: 15_000 }).toEqual([
      next.slot_minutes,
      next.buffer_minutes,
      next.min_notice_hours,
      next.horizon_days,
      next.cancel_cutoff_hours,
    ]);

    await expect(page.getByLabel('Session length (min)')).toHaveValue(String(next.slot_minutes));
  });
});
