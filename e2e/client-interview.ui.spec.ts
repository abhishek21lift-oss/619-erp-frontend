import { test, expect } from '@playwright/test';
import { gotoApp, apiToken, apiGet, apiPost, apiDelete } from './helpers/session';

/**
 * Journey — the Client Interview, and the intake journey around it (Phase 2).
 *
 *   Registration → Informed Consent → PAR-Q → Client Interview →
 *   Fitness Assessment → Goals → PT Enrolment → Workout Plan
 *
 * Real browser, real API, real Postgres. The client is arranged through the
 * API (registration is client-create.ui.spec's journey); everything under test
 * is done through the screens, and every outcome is read back from the API.
 *
 * The interview is seven topics of selects since 2026-10-19, and what the
 * selects store is the canonical value, not the label: a band is stored as
 * its midpoint, and the smoking/drinking columns hold their own tokens. The
 * free-text columns the form used to fill are still on the record and must
 * survive a save from this form.
 */

type Interview = {
  id: string;
  status: string;
  training_history: string | null;
  lifestyle_occupation: string | null;
  lifestyle_sleep_hours: string | number | null;
  lifestyle_smoking: string | null;
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

  test('a new client\'s profile shows the journey, with consent next and enrolment blocked', async ({ page }) => {
    await gotoApp(page, `/pt-os/clients/${clientId}`);
    await expect(page.getByRole('progressbar', { name: 'Client journey progress' })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('button', { name: /Next: Informed Consent/ })).toBeVisible();
    // The enrolment step says what is in the way, in the server's words.
    await expect(page.getByText('Complete the Informed Consent and PAR-Q before enrolling.')).toBeVisible();
  });

  test('the enrolment screen refuses an unscreened client and offers the missing steps', async ({ page }) => {
    await gotoApp(page, `/pt-os/clients/${clientId}/enroll`);
    await expect(page.getByRole('button', { name: /Complete Informed Consent/ })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('button', { name: /Complete PAR-Q/ })).toBeVisible();
  });

  test('the selects store canonical values, and completing continues to the assessment', async ({ page }) => {
    await gotoApp(page, `/pt-os/interview?client_id=${clientId}`);
    const occupation = page.getByLabel('Type of work');
    await expect(occupation).toBeVisible({ timeout: 25_000 });

    // A label is never what gets stored: "7 – 8 hours" is 7.5, "Active job"
    // is active_job.
    await occupation.selectOption('active_job');
    await page.getByLabel('Sleep per night').selectOption('7.5');
    await page.getByLabel('Alcohol').selectOption('weekly');
    await page.getByRole('button', { name: 'Complete interview' }).click();

    // The UI's own success state.
    await expect(page.getByRole('heading', { name: 'Interview complete' })).toBeVisible({ timeout: 20_000 });

    // The assertion with teeth: the row, in the canonical vocabulary.
    await expect.poll(async () => (await interviews()).length, { timeout: 15_000 }).toBe(1);
    const [row] = await interviews();
    expect(row.status).toBe('completed');
    expect(row.completed_at).toBeTruthy();
    expect(row.lifestyle_occupation).toBe('active_job');
    expect(String(row.lifestyle_sleep_hours)).toBe('7.5');
    expect(row.lifestyle_smoking).toBeNull();
    // This form never writes the free-text columns.
    expect(row.training_history).toBeNull();

    const journey = (await apiGet<{ data: Journey }>(`/api/pt-os/clients/${clientId}/journey`, token)).data;
    expect(journey.steps.find((s) => s.key === 'interview')?.state).toBe('done');

    await page.getByRole('button', { name: /Continue to Fitness Assessment/ }).click();
    await expect(page).toHaveURL(new RegExp(`/pt-os/assessment\\?client_id=${clientId}`));
  });

  test('a draft is saved, resumed on reload, and completed without erasing older answers', async ({ page }) => {
    // An interview that predates this form: a free-text answer already saved.
    const seeded = await apiPost<{ data: { id: string } }>(
      `/api/pt-os/clients/${clientId}/interviews`, token,
      { training_history: 'Played football at college; nothing for two years.', status: 'draft' },
    );
    expect(seeded.status, JSON.stringify(seeded.body)).toBe(201);

    await gotoApp(page, `/pt-os/interview?client_id=${clientId}`);
    const smoking = page.getByLabel('Smoking');
    await expect(smoking).toBeVisible({ timeout: 25_000 });
    await smoking.selectOption('daily');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect.poll(async () => (await interviews())[0]?.status, { timeout: 15_000 }).toBe('draft');

    // Still the only interview, and the old free-text answer survived a save
    // from the new form.
    let rows = await interviews();
    expect(rows).toHaveLength(1);
    expect(rows[0].lifestyle_smoking).toBe('daily');
    expect(rows[0].training_history).toBe('Played football at college; nothing for two years.');

    await page.reload();
    await expect(page.getByLabel('Smoking')).toHaveValue('daily', { timeout: 25_000 });
    await page.getByRole('button', { name: 'Complete interview' }).click();
    await expect(page.getByRole('heading', { name: 'Interview complete' })).toBeVisible({ timeout: 20_000 });

    rows = await interviews();
    expect(rows, 'the draft was completed, not duplicated').toHaveLength(1);
    expect(rows[0].status).toBe('completed');
    expect(rows[0].training_history).toBe('Played football at college; nothing for two years.');
  });

  test('an empty interview cannot be completed', async ({ page }) => {
    await gotoApp(page, `/pt-os/interview?client_id=${clientId}`);
    await expect(page.getByLabel('Type of work')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('button', { name: 'Complete interview' })).toBeDisabled();
    expect(await interviews()).toHaveLength(0);
  });
});
