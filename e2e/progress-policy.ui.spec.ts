import { test, expect } from '@playwright/test';
import { ALPHA, gotoApp, apiToken, apiGet, apiPut } from './helpers/session';

/**
 * Journey — a trainer changes the studio's re-test cadence.
 *
 * The policy decides every future re-test date, so a form that looks right but
 * posts a stale value is a scheduling bug with a four-month delay before anyone
 * notices. Read the policy back through the API after the UI says it saved.
 *
 * The setting is restored afterwards: the seeded studio is shared with the
 * other journeys, and a cadence left behind would make their dates depend on
 * which spec ran first.
 */

type Settings = {
  cadence_months: number;
  reminder_days: number[];
  is_enabled: boolean;
};

type SettingsResponse = { data: Settings };

const settings = async (token: string) =>
  (await apiGet<SettingsResponse>('/api/progress/module5/settings', token)).data;

test.describe('Progress hub — studio re-test policy', () => {
  test.setTimeout(90_000);
  let token: string;
  let original: Settings;
  let nextCadence: number;

  test.beforeAll(async () => {
    token = await apiToken();
    original = await settings(token);
    nextCadence = original.cadence_months === 4 ? 5 : 4;
  });

  test.afterAll(async () => {
    if (!original) return;
    const restored = await apiPut('/api/progress/module5/settings', token, {
      cadence_months: original.cadence_months,
      reminder_days: original.reminder_days,
      is_enabled: original.is_enabled,
    });
    expect(restored.status, 'the original policy is restored').toBe(200);
  });

  test('the saved cadence survives the journey and is read back from the API', async ({ page }) => {
    await gotoApp(page, `/pt-os/progress?client_id=${ALPHA.clientId}`);
    await expect(page.getByRole('heading', { name: 'Progress Hub' })).toBeVisible({ timeout: 30_000 });

    await page.getByRole('tab', { name: 'Re-Testing Calendar' }).click();
    await expect(page.getByText('Studio re-test policy')).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('Cadence').selectOption(String(nextCadence));
    await page.getByRole('button', { name: 'Save policy' }).click();

    await expect.poll(async () => (await settings(token)).cadence_months, { timeout: 15_000 })
      .toBe(nextCadence);
    await expect(page.getByLabel('Cadence')).toHaveValue(String(nextCadence));
  });
});
