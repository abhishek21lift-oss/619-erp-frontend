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
 * The interview is twenty counted selections across four sections: work,
 * training background, motivation & barriers, and the trainer's summary. It
 * owns all ten intake questions; the Lifestyle Assessment reads the occupation
 * from here and Goal Setting reads the barriers and motivation from here.
 *
 * What the controls store is the canonical value, not the label: a sitting
 * band is stored as its midpoint, and a barrier is its key ('time'), not
 * 'Time'. The free-text columns the form used to fill are still on the record
 * and must survive a save from this form.
 */

type Interview = {
  id: string;
  status: string;
  occupation_type: string | null;
  occupation_title: string | null;
  work_type: string | null;
  work_hours_band: string | null;
  daily_activity_level: string | null;
  job_details: string | null;
  training_history: string | null;
  previous_workout_experience: string | null;
  training_duration: string | null;
  sports_participation: string | null;
  sports_played: string[] | null;
  previous_activities: string[] | null;
  exercise_preferences: string[] | null;
  fitness_goals: string[] | null;
  motivation_factors: string[] | null;
  preferences: string | null;
  motivation: string | null;
  programme_readiness: number | string | null;
  training_challenges: string[] | null;
  challenge_other: string | null;
  important_client_statements: string | null;
  client_attitude: string | null;
  confidence_level: string | null;
  commitment_level: string | null;
  coaching_preference: string | null;
  initial_training_level: string | null;
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

  const stepTo = async (page: import('@playwright/test').Page, label: string) => {
    await page.getByRole('navigation', { name: 'Interview steps' })
      .getByRole('button', { name: label }).click();
  };

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

  test('the interview stores the twenty selections and completing continues to the server\'s next step', async ({ page }) => {
    await gotoApp(page, `/pt-os/interview?client_id=${clientId}`);
    const occupation = page.getByRole('button', { name: 'What is their occupation?' });
    await expect(occupation).toBeVisible({ timeout: 25_000 });

    // 1 · Work & Lifestyle. A label is never what gets stored: the occupation
    // keeps its canonical category, and "6 – 8 hours" sitting is 7.
    await occupation.click();
    await page.getByRole('button', { name: 'Software engineer' }).click();
    await page.getByRole('button', { name: /^Desk-based/ }).click();
    await page.getByLabel('How many hours do they work a day?').selectOption('8_10');
    await page.getByLabel('How many hours do they spend sitting at work?').selectOption('7');
    await page.getByRole('button', { name: /^Mostly seated/ }).click();
    await page.getByLabel('Role details').fill('Warehouse team lead, rotating shifts, on feet most of the day');
    await page.getByRole('button', { name: 'Continue' }).click();

    // 2 · Training Background.
    await page.getByRole('button', { name: /^Intermediate/ }).click();
    await page.getByLabel('How long have they trained?').selectOption('1_2_years');
    await page.getByRole('group', { name: 'Have they played any sports?' })
      .getByRole('button', { name: 'Previously' }).click();
    await page.getByRole('group', { name: 'Which sports have they played?' })
      .getByRole('button', { name: 'Football' }).click();
    await page.getByRole('group', { name: 'What physical activities have they done before?' })
      .getByRole('button', { name: 'Gym weights' }).click();
    await page.getByRole('group', { name: 'What exercise do they prefer?' })
      .getByRole('button', { name: 'Free weights' }).click();
    await page.getByLabel('Training history notes')
      .fill('Played football at college; nothing for two years.');
    await page.getByLabel('Anything they would rather avoid?')
      .fill('Likes free weights, hates running');
    await page.getByRole('button', { name: 'Continue' }).click();

    // 3 · Motivation & Barriers. Chips store their canonical keys.
    await page.getByRole('group', { name: 'What are their fitness goals?' })
      .getByRole('button', { name: 'Lose fat' }).click();
    await page.getByRole('group', { name: 'What are their biggest barriers to exercise?' })
      .getByRole('button', { name: 'Time' }).click();
    await page.getByRole('group', { name: 'What are their biggest barriers to exercise?' })
      .getByRole('button', { name: 'Other' }).click();
    await page.getByLabel('What else gets in the way?').fill('The gym closes before the shift ends');
    await page.getByRole('group', { name: 'What motivates them to train?' })
      .getByRole('button', { name: 'Health' }).click();
    await page.getByLabel('Anything else about their motivation?').fill('Keep up with the kids');
    await page.getByRole('button', { name: '8 out of 10' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // 4 · Trainer Summary.
    await page.getByRole('group', { name: 'How would you describe their attitude?' })
      .getByRole('button', { name: /^Motivated/ }).click();
    await page.getByRole('group', { name: 'How confident are they?' })
      .getByRole('button', { name: 'High' }).click();
    await page.getByRole('group', { name: 'How committed are they?' })
      .getByRole('button', { name: 'Moderate' }).click();
    await page.getByRole('group', { name: 'What coaching style suits them?' })
      .getByRole('button', { name: 'Balanced' }).click();
    await page.getByRole('group', { name: 'What level should they start at?' })
      .getByRole('button', { name: 'Beginner' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByText(/Review · 20 of 20 answered/)).toBeVisible();
    await page.getByRole('button', { name: 'Complete' }).click();

    // The UI's own success state — the banner, not the toast, which reads
    // "Interview completed." and would match a substring.
    await expect(page.getByText('Interview completed', { exact: true })).toBeVisible({ timeout: 20_000 });

    // The assertion with teeth: the row, in the canonical vocabulary.
    await expect.poll(async () => (await interviews()).length, { timeout: 15_000 }).toBe(1);
    const [row] = await interviews();
    expect(row.status).toBe('completed');
    expect(row.completed_at).toBeTruthy();
    expect(row.occupation_title).toBe('Software engineer');
    expect(row.occupation_type).toBe('desk_job');
    expect(row.work_type).toBe('desk');
    expect(row.work_hours_band).toBe('8_10');
    expect(row.daily_activity_level).toBe('mostly_seated');
    expect(row.job_details).toBe('Warehouse team lead, rotating shifts, on feet most of the day');
    expect(Number(row.lifestyle_sitting_hours)).toBe(7);
    expect(row.previous_workout_experience).toBe('intermediate');
    expect(row.training_duration).toBe('1_2_years');
    expect(row.sports_participation).toBe('previously');
    expect(row.sports_played?.sort()).toEqual(['football']);
    expect(row.previous_activities?.sort()).toEqual(['gym_weights']);
    expect(row.exercise_preferences?.sort()).toEqual(['free_weights']);
    expect(row.training_history).toBe('Played football at college; nothing for two years.');
    expect(row.preferences).toBe('Likes free weights, hates running');
    expect(row.fitness_goals?.sort()).toEqual(['fat_loss']);
    expect(row.training_challenges?.sort()).toEqual(['other', 'time']);
    expect(row.challenge_other).toBe('The gym closes before the shift ends');
    expect(row.motivation_factors?.sort()).toEqual(['health']);
    expect(row.motivation).toBe('Keep up with the kids');
    expect(Number(row.programme_readiness)).toBe(8);
    expect(row.client_attitude).toBe('motivated');
    expect(row.confidence_level).toBe('high');
    expect(row.commitment_level).toBe('moderate');
    expect(row.coaching_preference).toBe('balanced');
    expect(row.initial_training_level).toBe('beginner');
    // Questions this form no longer asks stay empty, not blank-written.
    expect(row.lifestyle_meal_regularity).toBeNull();
    expect(row.lifestyle_training_days).toBeNull();

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
    // An interview that predates this form: legacy free-text answers already saved.
    const seeded = await apiPost<{ data: { id: string } }>(
      `/api/pt-os/clients/${clientId}/interviews`, token,
      {
        training_history: 'Played football at college; nothing for two years.',
        lifestyle_meal_regularity: 'irregular',
        status: 'draft',
      },
    );
    expect(seeded.status, JSON.stringify(seeded.body)).toBe(201);

    await gotoApp(page, `/pt-os/interview?client_id=${clientId}`);
    const occupation = page.getByRole('button', { name: 'What is their occupation?' });
    await expect(occupation).toBeVisible({ timeout: 25_000 });
    await occupation.click();
    await page.getByRole('button', { name: 'Accountant' }).click();
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect.poll(async () => (await interviews())[0]?.status, { timeout: 15_000 }).toBe('draft');

    // Still the only interview, and the old answers survived a save from the
    // new form — including one the form no longer asks.
    let rows = await interviews();
    expect(rows).toHaveLength(1);
    expect(rows[0].occupation_title).toBe('Accountant');
    expect(rows[0].occupation_type).toBe('desk_job');
    expect(rows[0].lifestyle_meal_regularity).toBe('irregular');
    expect(rows[0].training_history).toBe('Played football at college; nothing for two years.');

    await page.reload();
    await expect(page.getByRole('button', { name: 'What is their occupation?' })).toContainText('Accountant', { timeout: 25_000 });
    await stepTo(page, 'Review');
    await page.getByRole('button', { name: 'Complete' }).click();
    await expect(page.getByText('Interview completed', { exact: true })).toBeVisible({ timeout: 20_000 });

    rows = await interviews();
    expect(rows, 'the draft was completed, not duplicated').toHaveLength(1);
    expect(rows[0].status).toBe('completed');
    expect(rows[0].lifestyle_meal_regularity).toBe('irregular');
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
    await expect(page.getByRole('button', { name: 'What is their occupation?' })).toBeVisible({ timeout: 25_000 });
    await stepTo(page, 'Trainer Summary');
    await expect(page.getByLabel('Trainer observation')).toHaveValue('Knees flare on deep lunges');
    await stepTo(page, 'Work & Lifestyle');
    await page.getByRole('button', { name: 'What is their occupation?' }).click();
    await page.getByRole('button', { name: 'Software engineer' }).click();
    await stepTo(page, 'Review');
    await page.getByRole('button', { name: 'Complete' }).click();
    await expect(page.getByText('Interview completed', { exact: true })).toBeVisible({ timeout: 20_000 });

    // The trainer's summary and the client's own words appear under their own
    // headings, not merged into one "notes" block.
    const summary = page.locator('section').filter({ has: page.getByRole('heading', { name: 'What should the team remember?' }) });
    await expect(summary.getByText('Trainer observation', { exact: true })).toBeVisible();
    await expect(summary.getByText('Knees flare on deep lunges')).toBeVisible();
    const barriers = page.locator('section').filter({ has: page.getByRole('heading', { name: 'What gets in the way, and what pulls them forward?' }) });
    await expect(barriers.getByText('In the client’s words')).toBeVisible();
    await expect(barriers.getByText('"I want to keep up with my kids."')).toBeVisible();

    await page.getByRole('button', { name: 'Edit answers' }).click();
    await stepTo(page, 'Trainer Summary');
    await page.getByLabel('Trainer observation').fill('Knees flare on deep lunges; use a box.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Interview completed', { exact: true })).toBeVisible({ timeout: 20_000 });

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
    await expect(page.getByRole('button', { name: 'What is their occupation?' })).toBeVisible({ timeout: 25_000 });
    await stepTo(page, 'Review');
    await expect(page.getByRole('button', { name: 'Complete' })).toBeDisabled();
    expect(await interviews()).toHaveLength(0);
  });
});
