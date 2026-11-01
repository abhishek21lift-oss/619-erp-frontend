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
 * The interview is four sections since 2026-11-01: work & lifestyle, training
 * background, training challenges, and a summary. Occupation, screen time and
 * activity live on the Lifestyle Assessment, which owns those columns; this
 * form shows them read-only and never writes a second copy.
 *
 * What the controls store is the canonical value, not the label: a sitting
 * band is stored as its midpoint, and a barrier is its key ('time'), not
 * 'Time'. The free-text columns the form used to fill are still on the record
 * and must survive a save from this form.
 */

type Interview = {
  id: string;
  status: string;
  job_details: string | null;
  training_history: string | null;
  previous_workout_experience: string | null;
  training_challenges: string[] | null;
  challenge_other: string | null;
  important_client_statements: string | null;
  notes: string | null;
  lifestyle_sitting_hours: number | string | null;
  lifestyle_meal_regularity: string | null;
  lifestyle_training_days: number | string | null;
  completed_at: string | null;
  created_at: string;
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

  test('the interview stores canonical answers and completing continues to the server\'s next step', async ({ page }) => {
    await gotoApp(page, `/pt-os/interview?client_id=${clientId}`);
    const sitting = page.getByLabel('Sitting hours');
    await expect(sitting).toBeVisible({ timeout: 25_000 });

    // A label is never what gets stored: "6 – 8 hours" is 7, "Frequently
    // skipped" is inconsistent, "Intermediate" is intermediate.
    await sitting.selectOption('7');
    await page.getByLabel('Meal regularity').selectOption('inconsistent');
    await page.getByLabel('Days a week they can train').selectOption('4');
    await page.getByLabel('Previous experience').selectOption('intermediate');
    await page.getByLabel('Job details').fill('Warehouse team lead, rotating shifts, on feet most of the day');

    // The barrier chips store their canonical keys.
    await page.getByRole('button', { name: 'Time', exact: true }).click();
    await page.getByRole('button', { name: 'Other', exact: true }).click();
    await page.getByLabel('What else gets in the way?').fill('The gym closes before the shift ends');

    await page.getByRole('button', { name: 'Complete interview' }).click();

    // The UI's own success state.
    await expect(page.getByText('Interview completed')).toBeVisible({ timeout: 20_000 });

    // The assertion with teeth: the row, in the canonical vocabulary.
    await expect.poll(async () => (await interviews()).length, { timeout: 15_000 }).toBe(1);
    const [row] = await interviews();
    expect(row.status).toBe('completed');
    expect(row.completed_at).toBeTruthy();
    expect(Number(row.lifestyle_sitting_hours)).toBe(7);
    expect(row.lifestyle_meal_regularity).toBe('inconsistent');
    expect(Number(row.lifestyle_training_days)).toBe(4);
    expect(row.previous_workout_experience).toBe('intermediate');
    expect(row.job_details).toBe('Warehouse team lead, rotating shifts, on feet most of the day');
    expect(row.training_challenges?.sort()).toEqual(['other', 'time']);
    expect(row.challenge_other).toBe('The gym closes before the shift ends');
    // A question this form did not ask stays empty, not blank-written.
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
    await expect(page.getByText('Interview completed')).toBeVisible({ timeout: 20_000 });

    rows = await interviews();
    expect(rows, 'the draft was completed, not duplicated').toHaveLength(1);
    expect(rows[0].status).toBe('completed');
    expect(rows[0].training_history).toBe('Played football at college; nothing for two years.');
  });

  test('a completed interview is corrected in place, and a new one leaves it untouched', async ({ page }) => {
    const seeded = await apiPost<{ data: { id: string } }>(
      `/api/pt-os/clients/${clientId}/interviews`, token,
      {
        status: 'draft',
        notes: 'Knees flare on deep lunges',
        important_client_statements: '"I want to keep up with my kids."',
      },
    );
    expect(seeded.status, JSON.stringify(seeded.body)).toBe(201);

    await gotoApp(page, `/pt-os/interview?client_id=${clientId}`);
    await expect(page.getByLabel('Trainer summary')).toHaveValue('Knees flare on deep lunges', { timeout: 25_000 });
    await page.getByRole('button', { name: 'Complete interview' }).click();
    await expect(page.getByText('Interview completed')).toBeVisible({ timeout: 20_000 });

    // The client's words and the trainer's summary are shown under their own
    // labels, not merged into one "notes" block.
    const summary = page.locator('section').filter({ has: page.getByRole('heading', { name: 'What should the team remember?' }) });
    await expect(summary.getByText('In their words')).toBeVisible();
    await expect(summary.getByText('Trainer summary')).toBeVisible();

    await page.getByRole('button', { name: 'Edit answers' }).click();
    await page.getByLabel('Trainer summary').fill('Knees flare on deep lunges; use a box.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Interview completed')).toBeVisible({ timeout: 20_000 });

    await expect.poll(async () => (await interviews())[0]?.notes, { timeout: 15_000 })
      .toBe('Knees flare on deep lunges; use a box.');

    // A second interview is a second record; the first keeps its status.
    await page.getByRole('button', { name: 'Start new interview' }).click();
    await expect(page.getByRole('button', { name: 'Save draft' })).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await interviews()).length, { timeout: 15_000 }).toBe(2);
    const rows = await interviews();
    const first = rows.find((r) => r.id === seeded.body.data.id)!;
    expect(first.status).toBe('completed');
    expect(first.notes).toBe('Knees flare on deep lunges; use a box.');
    expect(rows.filter((r) => r.status === 'draft')).toHaveLength(1);
  });

  test('an empty interview cannot be completed', async ({ page }) => {
    await gotoApp(page, `/pt-os/interview?client_id=${clientId}`);
    await expect(page.getByLabel('Sitting hours')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('button', { name: 'Complete interview' })).toBeDisabled();
    expect(await interviews()).toHaveLength(0);
  });
});
