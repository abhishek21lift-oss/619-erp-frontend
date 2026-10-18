import { test, expect } from '@playwright/test';
import { ALPHA, gotoApp, apiToken, apiGet, apiDelete } from './helpers/session';

/**
 * Journeys 13/14 — the two programme-writing screens.
 *
 * Both create rows through the normal plan endpoint: the macrocycle creates one
 * programme per phase, and the generator saves the reviewed draft as a plan.
 * The assertion with teeth is the read-back — a screen that reports success but
 * posts the wrong shape would pass every source-level check in the audit.
 */

type Plan = {
  id: string;
  name: string;
  goal: string;
  duration_weeks: number;
  sessions_per_week: number;
  exercises: unknown[];
};

const plans = (token: string) => apiGet<Plan[]>('/api/workouts/plans', token);
const idsOf = (rows: Plan[]) => new Set(rows.map((p) => p.id));

test.describe('Macrocycle — create one programme per phase', () => {
  let token: string;
  const created: string[] = [];

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    await gotoApp(page, '/pt-os/macrocycle');
    await expect(page.getByRole('heading', { name: 'Macrocycle' })).toBeVisible({ timeout: 25_000 });
  });

  test.afterAll(async () => {
    const t = await apiToken();
    for (const id of created) await apiDelete(`/api/workouts/plans/${id}`, t);
  });

  test('the phases reach the database with their own durations', async ({ page }) => {
    const before = idsOf(await plans(token));

    // Six weeks yields the three phases the engine promises: 4 + 1 + 1 weeks.
    await page.getByLabel('Total weeks').fill('6');
    await page.getByLabel('Days per week').fill('2');
    await page.getByLabel('Goal').selectOption('general_fitness');
    await page.getByRole('button', { name: /^Create \d+ programmes$/ }).click();

    await expect(page.getByRole('heading', { name: 'Programmes created' })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('link', { name: /open builder/ })).toHaveCount(3);

    const added = (await plans(token)).filter((p) => !before.has(p.id));
    for (const p of added) created.push(p.id);

    expect(added, 'one programme per phase').toHaveLength(3);
    expect(added.map((p) => p.duration_weeks).sort((a, b) => a - b)).toEqual([1, 1, 4]);
    for (const p of added) {
      expect(p.goal).toBe('general_fitness');
      expect(p.sessions_per_week).toBe(2);
    }
  });
});

test.describe('Workout generator — review a draft, then save it', () => {
  let token: string;
  const created: string[] = [];

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    await gotoApp(page, '/pt-os/workout-generator');
  });

  test.afterAll(async () => {
    const t = await apiToken();
    for (const id of created) await apiDelete(`/api/workouts/plans/${id}`, t);
  });

  test('the saved plan is the draft the trainer reviewed', async ({ page }) => {
    await page.getByRole('button', { name: ALPHA.clientName, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`client_id=${ALPHA.clientId}`));

    // The preview is requested on arrival; wait for the review surface, not
    // just the controls, so a failed generation is reported as such.
    const save = page.getByRole('button', { name: /Save as plan/ });
    await expect(save).toBeEnabled({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /Main work/ })).toBeVisible();

    await page.getByLabel('Cardio minutes').fill('10');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(save).toBeEnabled({ timeout: 30_000 });

    const before = idsOf(await plans(token));
    await save.click();
    await expect(page).toHaveURL(/\/pt-os\/workout-plans\/[^/]+\/builder/, { timeout: 30_000 });

    const added = (await plans(token)).filter((p) => !before.has(p.id));
    for (const p of added) created.push(p.id);

    expect(added, 'one saved plan').toHaveLength(1);
    const [plan] = added;
    expect(plan.name).toContain(`${ALPHA.clientName} —`);
    expect(plan.name).toContain('(generated)');
    expect(plan.goal).toBe('general_fitness');
    expect(plan.duration_weeks).toBe(4);
    expect(plan.sessions_per_week).toBe(1);
    expect(plan.exercises.length, 'the reviewed main work was persisted').toBeGreaterThan(0);
  });
});
