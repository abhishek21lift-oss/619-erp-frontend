import { test, expect } from '@playwright/test';
import { ALPHA, gotoApp } from './helpers/session';

/**
 * The generator's cardio controls must reach the API and come back labelled:
 * FITT fields, the K11 intensity, and a target only when HR inputs exist.
 */
test.describe('Workout generator — cardio prescription', () => {
  test.describe.configure({ timeout: 120_000 });

  test('shows FITT and uses measured MHR when supplied', async ({ page }) => {
    await gotoApp(page, `/pt-os/workout-generator?client_id=${ALPHA.clientId}`);
    await expect(page.getByRole('heading', { name: 'Workout Generator' })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('heading', { name: 'Conditioning' })).toBeVisible({ timeout: 40_000 });

    // No heart-rate inputs on first load: structure only, no invented BPM.
    await expect(page.getByText(/Not set\. Supply age or measured max HR/)).toBeVisible();
    await expect(page.getByText(/application defaults, not K11 limits/)).toBeVisible();

    await page.getByLabel('K11 intensity').selectOption('high');
    await page.getByLabel('Target calculation').selectOption('mhr');
    await page.getByLabel('Frequency per week').fill('4');
    await page.getByLabel('Programme type').selectOption('hiit');
    await page.getByLabel('Age (MHR estimate)').fill('40');
    await page.getByLabel('Resting HR').fill('60');
    await page.getByLabel('Measured max HR').fill('200');
    await page.getByRole('button', { name: 'Generate' }).click();

    await expect(page.getByText('4×/week')).toBeVisible();
    await expect(page.getByRole('definition').filter({ hasText: /^HIIT$/ })).toBeVisible();
    // Measured 200 wins over the age estimate of 180: 70–85% MHR is 140–170.
    await expect(page.getByText(/140–170 BPM.*% MHR.*MHR method/)).toBeVisible();
    await expect(page.getByText(/application defaults, not K11 limits/)).toHaveCount(0);
  });
});
