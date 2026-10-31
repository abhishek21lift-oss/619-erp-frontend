import { test, expect } from '@playwright/test';
import { gotoApp, apiToken, apiGet, apiPost, apiDelete } from './helpers/session';

/**
 * Journey — the Client Interview, and the intake journey around it (Phase 2).
 *
 *   Welcome & Gym Tour → PT Enrolment → Informed Consent → PAR-Q →
 *   Client Interview → Goals → Fitness Assessment → Program Design
 *
 * Real browser, real API, real Postgres. The client is arranged through the
 * API (registration is client-create.ui.spec's journey); everything under test
 * is done through the screens, and every outcome is read back from the API.
 *
 * The interview is three topics of selects since 2026-10-31: sitting hours,
 * meal pattern and training days. Occupation, screen time, sleep, smoking and
 * alcohol moved to the Lifestyle Assessment, which owns those columns. What
 * the selects store is the canonical value, not the label: a band is stored as
 * its midpoint. The free-text columns the form used to fill are still on the
 * record and must survive a save from this form.
 */

type Interview = {
  id: string;
  status: string;
  training_history: string | null;
  lifestyle_sitting_hours: number | string | null;
  lifestyle_meal_regularity: string | null;
  lifestyle_training_days: number | string | null;
  completed_at: string | null;
};
type Journey = { steps: { key: string; state: string }[]; next: string | null };

let seq = 0;
const uniqueName = () => `E2E-INTERVIEW-${Date.now().toString(36).toUpperCase()}-${++seq}`;
const uniqueMobile = () => `9${String(Date.now() + ++seq).slice(-9)}`;

test.describe('Client interview and journey', () => {
  let token: string;
  let clientId: string;
  const created: string[] = [];

  test.beforeEach(async () => {
    token = await apiToken();
    const res = await apiPost<{ data: { id: string } }>('/api/pt-os/clients', token, { name: uniqueName(), mobile: uniqueMobile(), gender: 'male' });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    clientId = res.body.data.id;
    created.push(clientId);
  });

  test.afterAll(async () => {
    const t = await apiToken();
    for (const id of created) await apiDelete(`/api/pt-os/clients/${id}`, t);
  });

  const interviews = async () =>
    (await apiGet<{ data: Interview[] }>(`/api/pt-os/clients/${clientId}/interviews`, token)).data;

  test('a new client\'s profile shows the K11 journey, with the welcome tour next', async ({ page }) => {
    await gotoApp(page, `/pt-os/clients/${clientId}`);
    await expect(page.getByRole('progressbar', { name: 'Client journey progress' })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('link', { name: /Next: Welcome & Gym Tour/ })).toBeVisible();
    // Enrolment is its own step now, and screening no longer stands in front
    // of it: it is a warning on the enrolment screen, not a block.
    await expect(page.getByRole('link', { name: /PT Enrolment.*To do/ })).toBeVisible();
  });

  test('the enrolment screen warns an unscreened client and offers the missing steps', async ({ page }) => {
    await gotoApp(page, `/pt-os/clients/${clientId}/enroll`);
    await expect(page.getByText(/Screening is incomplete/)).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('button', { name: /Complete Informed Consent/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Complete PAR-Q/ })).toBeVisible();
  });

  test('the selects store canonical values, and completing continues to the server\'s next step', async ({ page }) => {
    await gotoApp(page, `/pt-os/interview?client_id=${clientId}`);
    const sitting = page.getByLabel('Sitting hours');
    await expect(sitting).toBeVisible({ timeout: 25_000 });

    // A label is never what gets stored: "6 – 8 hours" is 7, "Frequently
    // skipped" is inconsistent.
    await sitting.selectOption('7');
    await page.getByLabel('Meal regularity').selectOption('inconsistent');
    await page.getByLabel('Days a week', { exact: true }).selectOption('4');
    await page.getByRole('button', { name: 'Complete interview' }).click();

    // The UI's own success state.
    await expect(page.getByRole('heading', { name: 'Interview complete' })).toBeVisible({ timeout: 20_000 });

    // The assertion with teeth: the row, in the canonical vocabulary.
    await expect.poll(async () => (await interviews()).length, { timeout: 15_000 }).toBe(1);
    const [row] = await interviews();
    expect(row.status).toBe('completed');
    expect(row.completed_at).toBeTruthy();
    expect(String(row.lifestyle_sitting_hours)).toBe('7');
    expect(row.lifestyle_meal_regularity).toBe('inconsistent');
    expect(String(row.lifestyle_training_days)).toBe('4');
    // This form never writes the free-text columns.
    expect(row.training_history).toBeNull();

    const journey = (await apiGet<{ data: Journey }>(`/api/pt-os/clients/${clientId}/journey`, token)).data;
    expect(journey.steps.find((s) => s.key === 'interview')?.state).toBe('done');

    await page.getByRole('button', { name: /Continue to Welcome & Gym Tour/ }).click();
    // The click's promise is a client-side push; the URL commits once the
    // destination's payload arrives. CI runs the production bundle rather than
    // a compiling dev server precisely so this is not a race — see the
    // webServer note in playwright.config.ts before touching this timeout.
    await expect(page).toHaveURL(new RegExp(`/pt-os/welcome-tour\\?client_id=${clientId}`));
  });

  test('a draft is saved, resumed on reload, and completed without erasing older answers', async ({ page }) => {
    // An interview that predates this form: a free-text answer already saved.
    const seeded = await apiPost<{ data: { id: string } }>(
      `/api/pt-os/clients/${clientId}/interviews`, token,
      { training_history: 'Played football at college; nothing for two years.', status: 'draft' },
    );
    expect(seeded.status, JSON.stringify(seeded.body)).toBe(201);

    await gotoApp(page, `/pt-os/interview?client_id=${clientId}`);
    const meal = page.getByLabel('Meal regularity');
    await expect(meal).toBeVisible({ timeout: 25_000 });
    await meal.selectOption('irregular');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect.poll(async () => (await interviews())[0]?.status, { timeout: 15_000 }).toBe('draft');

    // Still the only interview, and the old free-text answer survived a save
    // from the new form.
    let rows = await interviews();
    expect(rows).toHaveLength(1);
    expect(rows[0].lifestyle_meal_regularity).toBe('irregular');
    expect(rows[0].training_history).toBe('Played football at college; nothing for two years.');

    await page.reload();
    await expect(page.getByLabel('Meal regularity')).toHaveValue('irregular', { timeout: 25_000 });
    await page.getByRole('button', { name: 'Complete interview' }).click();
    await expect(page.getByRole('heading', { name: 'Interview complete' })).toBeVisible({ timeout: 20_000 });

    rows = await interviews();
    expect(rows, 'the draft was completed, not duplicated').toHaveLength(1);
    expect(rows[0].status).toBe('completed');
    expect(rows[0].training_history).toBe('Played football at college; nothing for two years.');
  });

  test('an empty interview cannot be completed', async ({ page }) => {
    await gotoApp(page, `/pt-os/interview?client_id=${clientId}`);
    await expect(page.getByLabel('Sitting hours')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('button', { name: 'Complete interview' })).toBeDisabled();
    expect(await interviews()).toHaveLength(0);
  });
});
