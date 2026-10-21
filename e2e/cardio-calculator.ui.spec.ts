import { test, expect } from '@playwright/test';
import { gotoApp, apiToken, apiGet, apiPost, apiDelete } from './helpers/session';

/**
 * Cardio & FITT calculator → saved draft → builder → persisted prescription.
 *
 * The round trip is the point: a calculator that renders the right numbers but
 * posts a different shape, or a builder that reports "Prescribed" without the
 * server holding it, passes every component test and fails this one.
 */

type Exercise = { id: string; name: string };
type PlanDetail = {
  id: string;
  exercises: Array<{
    id: string;
    name: string;
    config: Record<string, unknown> | null;
  }>;
};

const DRAFT_KEY = 'ptos.cardio.plan-draft.v1';

let token: string;
let planId: string;

async function createCardioPlan(): Promise<PlanDetail> {
  const library = await apiGet<{ exercises: Exercise[] }>('/api/exercises?limit=200', token);
  const treadmill = library.exercises.find((exercise) => exercise.name === 'Treadmill Running');
  if (!treadmill) throw new Error('E2E library is missing Treadmill Running');

  const created = await apiPost<{ plan: { id: string } }>('/api/workouts/plans', token, {
    name: `Cardio calculator E2E ${Date.now()}`,
    exercises: [{
      exercise_id: treadmill.id,
      day_of_week: 1,
      sort_order: 0,
      sets: 1,
      reps: 1,
      config: { tracking_mode: 'TIME' },
    }],
  });
  expect(created.status).toBe(201);
  planId = created.body.plan.id;
  return apiGet<PlanDetail>(`/api/workouts/plans/${planId}`, token);
}

async function fillValidCalculator(page: import('@playwright/test').Page): Promise<void> {
  await page.getByLabel('Age (estimate only)').fill('40');
  await page.getByLabel('Resting HR').fill('60');
  await page.getByLabel('Modality', { exact: true }).fill('Running');
}

test.describe('Cardio & FITT calculator', () => {
  // The first Next dev compile of a route can outlast the default 30s.
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async () => {
    token = await apiToken();
    await createCardioPlan();
  });

  test.afterEach(async () => {
    if (planId) await apiDelete(`/api/workouts/plans/${planId}`, token);
  });

  test('saves a draft, applies it in the builder, persists it, and survives reload', async ({ page }) => {
    await gotoApp(page, '/pt-os/cardio-calculator');
    await expect(page.getByRole('heading', { name: 'Cardio & FITT' })).toBeVisible({ timeout: 25_000 });
    await fillValidCalculator(page);

    const save = page.getByRole('button', { name: /Save for plan builder/i });
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText(/Saved for the plan builder/i)).toBeVisible();
    await expect(page.getByText(/Saved: Moderate · 108–126 BPM/)).toBeVisible();

    // A reload must recover the draft from localStorage, not lose it.
    await page.reload();
    await expect(page.getByText(/Saved: Moderate · 108–126 BPM/)).toBeVisible({ timeout: 25_000 });

    await gotoApp(page, `/pt-os/workout-plans/${planId}/builder`);
    await expect(page.getByText('Treadmill Running').first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(/Saved: Moderate · 108–126 BPM/)).toBeVisible();
    await page.getByRole('button', { name: 'Apply', exact: true }).click();

    await expect.poll(async () => {
      const detail = await apiGet<PlanDetail>(`/api/workouts/plans/${planId}`, token);
      return (detail.exercises[0]?.config as Record<string, unknown> | null)?.cardio_source ?? null;
    }, { timeout: 15_000 }).toBe('k11');

    const persisted = await apiGet<PlanDetail>(`/api/workouts/plans/${planId}`, token);
    const config = persisted.exercises[0].config as Record<string, unknown>;
    expect(config).toMatchObject({
      target_heart_rate_min: 108,
      target_heart_rate_max: 126,
      target_heart_rate_basis: '% MHR',
      cardio_frequency_per_week: 3,
      cardio_main_work_minutes: 30,
      cardio_modality: 'Running',
      cardio_program_type: 'continuous-liss',
    });

    // Reload reads the server's copy, not the localStorage draft that Apply cleared.
    await page.reload();
    await expect(page.getByText(/Prescribed:.*108–126 BPM.*% MHR/)).toBeVisible({ timeout: 25_000 });
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY)).toBeNull();
  });

  test('dismissing a draft writes nothing and clears it across reloads', async ({ page }) => {
    await gotoApp(page, '/pt-os/cardio-calculator');
    await expect(page.getByRole('heading', { name: 'Cardio & FITT' })).toBeVisible({ timeout: 25_000 });
    await fillValidCalculator(page);
    await page.getByRole('button', { name: /Save for plan builder/i }).click();
    await expect(page.getByText(/Saved for the plan builder/i)).toBeVisible();

    await gotoApp(page, `/pt-os/workout-plans/${planId}/builder`);
    await expect(page.getByText('Treadmill Running').first()).toBeVisible({ timeout: 25_000 });
    await page.getByRole('button', { name: 'Dismiss saved cardio prescription' }).click();

    await expect(page.getByText(/^Saved:/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Apply', exact: true })).toHaveCount(0);
    await expect(page.getByText(/Prescribed:/)).toHaveCount(0);
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY)).toBeNull();

    await page.reload();
    await expect(page.getByText('Treadmill Running').first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(/Prescribed:/)).toHaveCount(0);

    const detail = await apiGet<PlanDetail>(`/api/workouts/plans/${planId}`, token);
    expect(detail.exercises[0].config).toMatchObject({ tracking_mode: 'TIME' });
    expect((detail.exercises[0].config as Record<string, unknown>).cardio_source).toBeUndefined();
  });

  test('invalid inputs and the 81st modality character block saving', async ({ page }) => {
    await gotoApp(page, '/pt-os/cardio-calculator');
    await expect(page.getByRole('heading', { name: 'Cardio & FITT' })).toBeVisible({ timeout: 25_000 });

    const save = page.getByRole('button', { name: /Save for plan builder/i });
    await page.getByLabel('Age (estimate only)').fill('200');
    await expect(page.getByText('Age must be between 1 and 120.').first()).toBeVisible();
    await expect(save).toBeDisabled();

    await page.getByLabel('Age (estimate only)').fill('40');
    await page.getByLabel('Resting HR').fill('60');
    const modality = page.getByLabel('Modality', { exact: true });

    await modality.fill('x'.repeat(80));
    await expect(save).toBeEnabled();
    await modality.fill('x'.repeat(81));
    await expect(page.getByText('Modality must be 80 characters or fewer.').first()).toBeVisible();
    await expect(save).toBeDisabled();
  });
});
