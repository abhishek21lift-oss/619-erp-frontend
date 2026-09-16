import { test, expect, type Page } from '@playwright/test';
import { gotoApp, apiToken, apiGet, apiDelete, doubleTap } from './helpers/session';

/**
 * Journey 12 — Diet: creating and saving a meal.
 *
 * Calories and macros are what every plan, target and chart in the nutrition
 * side is computed from, so a number that arrives wrong here is wrong
 * everywhere afterwards and nothing downstream can tell.
 */

type Meal = {
  id: string; name?: string; meal_type?: string;
  calories?: number | string; protein_g?: number | string;
  carbs_g?: number | string; fats_g?: number | string;
};

async function meals(token: string): Promise<Meal[]> {
  const body = await apiGet<{ data?: Meal[] }>('/api/diet/meals', token);
  return body.data ?? [];
}

const byName = async (token: string, name: string) =>
  (await meals(token)).filter((m) => m.name === name);

// A counter as well as the clock: two calls in the same millisecond
// produced the SAME "unique" name, and a test that then counted rows by
// that name found two where it expected one — reported as a duplicate
// submit, which is exactly the defect these journeys exist to catch.
let seq = 0;
function uniqueName(): string {
  seq += 1;
  return `E2E-MEAL-${Date.now().toString(36).toUpperCase()}-${seq}`;
}

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Add Meal' });

async function openAdd(page: Page) {
  await page.getByRole('button', { name: 'Add Meal' }).first().click();
  await expect(dialog(page)).toBeVisible();
}

const save = (page: Page) => dialog(page).getByRole('button', { name: /^(Save|Add Meal|Create)/ }).last();

test.describe('Diet — add a meal', () => {
  let token: string;
  const created: string[] = [];

  test.afterAll(async () => {
    const t = await apiToken();
    for (const id of created) await apiDelete(`/api/diet/meals/${id}`, t);
  });

  test.beforeEach(async ({ page }) => {
    token = await apiToken();
    await gotoApp(page, '/pt-os/diet-plans');
    await expect(page.getByRole('button', { name: 'Add Meal' }).first()).toBeVisible({ timeout: 20_000 });
  });

  test('a meal reaches the database with its macros intact', async ({ page }) => {
    const name = uniqueName();
    const d = () => dialog(page);

    await openAdd(page);
    await d().getByLabel(/^Meal name/).fill(name);
    await d().getByLabel(/^Calories/).fill('520');
    await d().getByLabel(/^Protein/).fill('32.5');
    await d().getByLabel(/^Carbs/).fill('48');
    await d().getByLabel(/^Fats/).fill('18.2');
    await save(page).click();

    await expect.poll(async () => (await byName(token, name)).length, { timeout: 15_000 }).toBe(1);
    const [meal] = await byName(token, name);
    created.push(meal.id);

    expect(Number(meal.calories)).toBe(520);
    // Decimals survive: a macro rounded to an integer at the boundary is a
    // daily total that drifts by grams across six meals.
    expect(Number(meal.protein_g)).toBe(32.5);
    expect(Number(meal.fats_g)).toBe(18.2);
  });

  test('a meal with no calories is refused rather than logged as zero', async ({ page }) => {
    // A 0 kcal meal counts as eaten in every total and moves nothing, so a
    // member's day reads as under target for a meal they actually ate.
    const name = uniqueName();
    let posted = 0;
    await page.route('**/api/diet/meals', (route) => {
      if (route.request().method() === 'POST') posted += 1;
      return route.continue();
    });

    await openAdd(page);
    await dialog(page).getByLabel(/^Meal name/).fill(name);
    await save(page).click();

    await page.waitForTimeout(1200);
    expect(posted, 'nothing was sent').toBe(0);
    expect((await byName(token, name)).length).toBe(0);
  });

  test('a non-numeric macro is refused, not truncated', async ({ page }) => {
    const name = uniqueName();
    await openAdd(page);
    const d = dialog(page);
    await d.getByLabel(/^Meal name/).fill(name);
    await d.getByLabel(/^Calories/).fill('300');
    await d.getByLabel(/^Protein/).fill('20g');
    await save(page).click();

    // Either the field refuses the letters outright or the schema does; what
    // must NOT happen is a silent 20 with the 'g' dropped and no other check.
    await expect(dialog(page)).toBeVisible();
  });

  test('a double-tap adds one meal, not two', async ({ page }) => {
    const name = uniqueName();
    await openAdd(page);
    const d = dialog(page);
    await d.getByLabel(/^Meal name/).fill(name);
    await d.getByLabel(/^Calories/).fill('410');
    await doubleTap(save(page));

    await page.waitForTimeout(3000);
    const found = await byName(token, name);
    for (const m of found) created.push(m.id);
    expect(found.length, 'exactly one meal').toBe(1);
  });

  test('a server failure is reported, leaks nothing, and persists nothing', async ({ page }) => {
    const name = uniqueName();
    await page.route('**/api/diet/meals', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"error":"ERROR: value too long for type character varying(120) at /srv/api/src/routes/diet.js:61"}',
          })
        : route.continue());

    await openAdd(page);
    const d = dialog(page);
    await d.getByLabel(/^Meal name/).fill(name);
    await d.getByLabel(/^Calories/).fill('300');
    await save(page).click();

    await expect(d.getByRole('alert').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('body')).not.toContainText('character varying');
    await expect(page.locator('body')).not.toContainText('/srv/api/src');

    await page.unroute('**/api/diet/meals');
    expect((await byName(token, name)).length).toBe(0);
  });

  test('cancelling and reopening shows an empty form', async ({ page }) => {
    await openAdd(page);
    const d = dialog(page);
    await d.getByLabel(/^Meal name/).fill(uniqueName());
    await d.getByLabel(/^Calories/).fill('999');
    await d.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog(page)).toBeHidden();

    await openAdd(page);
    await expect(dialog(page).getByLabel(/^Meal name/)).toHaveValue('');
    await expect(dialog(page).getByLabel(/^Calories/)).toHaveValue('');
  });
});
