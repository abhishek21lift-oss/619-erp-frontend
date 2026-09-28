import { test, expect, type Page } from '@playwright/test';
import { gotoApp, apiToken, apiGet, apiPost, apiDelete } from './helpers/session';

/**
 * Journey — Programme details: editing a programme after it exists.
 *
 * There was no way to. The New programme sheet was the only place a name,
 * goal, difficulty or length was ever set, so a typo meant deleting the
 * programme and every assignment on it. The edit dialog sends only what
 * changed, and these journeys hold it to that: the field edited moves, the
 * fields beside it do not.
 *
 * The programme is arranged through the API — the act under test is the
 * dialog, not creation — and removed afterwards.
 */

type Plan = {
  id: string; name: string; goal: string | null; difficulty: string | null;
  duration_weeks: number; sessions_per_week: number;
};

const planById = (token: string, id: string) => apiGet<Plan>(`/api/workouts/plans/${id}`, token);

let seq = 0;
const uniqueName = () => `E2E-PROG-${Date.now().toString(36).toUpperCase()}-${++seq}`;

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Edit details' });

test.describe('Programme — edit details', () => {
  let token: string;
  let plan: Plan;
  const created: string[] = [];

  test.afterAll(async () => {
    const t = await apiToken();
    for (const id of created) await apiDelete(`/api/workouts/plans/${id}`, t);
  });

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    const res = await apiPost<{ plan: Plan }>('/api/workouts/plans', token, {
      name: uniqueName(), goal: 'muscle_gain', difficulty: 'intermediate',
      duration_weeks: 8, is_template: false,
    });
    expect(res.status, 'arranging the programme').toBe(201);
    plan = res.body.plan;
    created.push(plan.id);

    await gotoApp(page, `/pt-os/workout-plans/${plan.id}`);
    await expect(page.getByRole('button', { name: /Edit Details/ })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Edit Details/ }).click();
    await expect(dialog(page)).toBeVisible();
  });

  test('a rename, a new goal and a new length reach the database', async ({ page }) => {
    const renamed = `${plan.name}-R`;
    const d = dialog(page);

    await d.getByLabel('Programme name').fill(renamed);
    await d.getByRole('button', { name: 'Weight Loss' }).click();
    await d.getByLabel('Weeks').fill('10');
    await d.getByRole('button', { name: 'Save changes' }).click();

    await expect.poll(async () => (await planById(token, plan.id)).name, { timeout: 15_000 }).toBe(renamed);
    const after = await planById(token, plan.id);
    expect(after.goal).toBe('weight_loss');
    expect(Number(after.duration_weeks)).toBe(10);
    // Not touched, so not changed.
    expect(after.difficulty).toBe('intermediate');

    // The page shows what was saved without a reload.
    await expect(dialog(page)).toBeHidden();
    await expect(page.getByRole('heading', { name: renamed })).toBeVisible();
  });

  test('saving with nothing changed sends nothing', async ({ page }) => {
    let puts = 0;
    await page.route(`**/api/workouts/plans/${plan.id}`, (route) => {
      if (route.request().method() === 'PUT') puts += 1;
      return route.continue();
    });

    await dialog(page).getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog(page)).toBeHidden();
    expect(puts).toBe(0);

    const after = await planById(token, plan.id);
    expect(after.name).toBe(plan.name);
    expect(Number(after.duration_weeks)).toBe(8);
  });

  test('an empty name is refused and nothing is sent', async ({ page }) => {
    let puts = 0;
    await page.route(`**/api/workouts/plans/${plan.id}`, (route) => {
      if (route.request().method() === 'PUT') puts += 1;
      return route.continue();
    });

    await dialog(page).getByLabel('Programme name').fill('   ');
    await dialog(page).getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog(page)).toBeVisible();
    expect(puts).toBe(0);
    expect((await planById(token, plan.id)).name).toBe(plan.name);
  });
});
