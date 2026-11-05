import { test, expect } from '@playwright/test';
import { gotoApp, apiToken, apiGet, apiPut } from './helpers/session';

/**
 * Journey — the trainer publishes the studio's contact details.
 *
 * The card is a whole-block save, and the member's profile only shows a row when
 * its value is truthy. So the failure worth catching is a form that reports
 * "saved" while storing an empty string, or one that trims nothing and leaves
 * whitespace behind: both read back as published to the API and as blank to the
 * member. The read-back goes through `GET /api/profile/studio` for that reason.
 *
 * The seeded studio is shared with the other journeys, so the original values
 * are restored afterwards.
 */

type StudioContact = {
  name: string;
  phone: string | null;
  address: string | null;
  hours: string | null;
};

const read = (token: string) => apiGet<StudioContact>('/api/profile/studio', token);

test.describe('Profile — studio contact details', () => {
  test.setTimeout(90_000);
  let token: string;
  let original: StudioContact;

  test.beforeAll(async () => {
    token = await apiToken();
    original = await read(token);
  });

  test.afterAll(async () => {
    if (!original) return;
    const restored = await apiPut('/api/profile/studio', token, {
      phone: original.phone, address: original.address, hours: original.hours,
    });
    expect(restored.status, 'the original details are restored').toBe(200);
  });

  test('the values typed into the card are the values the API reads back', async ({ page }) => {
    page.setDefaultNavigationTimeout(90_000);
    await gotoApp(page, '/settings/profile');
    await expect(page.getByRole('heading', { name: 'Studio details' }))
      .toBeVisible({ timeout: 60_000 });

    const phone = `90000${String(Date.now()).slice(-5)}`;
    const address = '2nd floor, E2E Road';
    const hours = 'Mon–Sat 6am–9pm';

    await page.getByLabel('Phone').fill(`  ${phone}  `);
    await page.getByLabel('Address').fill(address);
    await page.getByLabel('Opening hours').fill(hours);
    await page.getByRole('button', { name: 'Save studio details' }).click();

    await expect.poll(async () => {
      const saved = await read(token);
      return [saved.phone, saved.address, saved.hours];
    }, { timeout: 15_000 }).toEqual([phone, address, hours]);

    // A cleared field is erased, not stored as spaces: the member card drops a
    // row on truthiness, so '' would render as an empty line.
    await page.getByLabel('Phone').fill('   ');
    await page.getByRole('button', { name: 'Save studio details' }).click();
    await expect.poll(async () => (await read(token)).phone, { timeout: 15_000 }).toBeNull();
  });
});
