import { test, expect, type Page } from '@playwright/test';
import {
  ALPHA, ALPHA_MEMBER, apiGet, apiPatch, apiPost, apiToken, memberApiToken,
} from './helpers/session';

/**
 * Journey — a member trains through the guided workout and submits it.
 *
 * This is the member's own write path: the sets it sends become the record the
 * trainer reviews, so the payload must arrive as the canonical log input
 * (weight_kg, reps) and the session must land submitted + pending review. The
 * backend suite pins the shape it receives; this pins that the form sends it.
 *
 * Arrangement is done through the API — enable the permission, write a
 * one-exercise programme and assign it — because the act under test is the
 * member's form, not those writes.
 */

type Plan = { id: string };
type Session = {
  id: string;
  status: string;
  program_name: string | null;
  review_status: string | null;
  exercises: { name: string; sets: { weight_kg: number | null; reps: number | null; completed: boolean | null }[] }[];
};

/** 1 = Monday … 7 = Sunday, the day_of_week the programme stores. */
const TODAY_DAY = new Date().getDay() === 0 ? 7 : new Date().getDay();

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Member — guided workout submit', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  let page: Page;
  let staffToken: string;
  let memberToken: string;
  let planId = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    staffToken = await apiToken();
    memberToken = await memberApiToken();
  });

  test.afterAll(async () => {
    // Leave the permission as the seed had it. The plan and its submitted
    // session stay: a submitted workout is immutable by design.
    await apiPatch(`/api/pt-os/clients/${ALPHA.clientId}/self-workout`, staffToken, {
      allow_self_workout: false,
    });
    await page?.close();
  });

  test('a logged set is stored as a submitted workout', async ({ browser }) => {
    const library = await apiGet<{ exercises: { id: string; name: string }[] }>(
      '/api/exercises?q=Squat', staffToken,
    );
    const squat = library.exercises.find((e) => e.name === 'Squat') ?? library.exercises[0];
    expect(squat, 'the exercise library must carry a Squat to programme').toBeTruthy();

    const created = await apiPost<{ plan: Plan }>('/api/workouts/plans', staffToken, {
      name: 'E2E guided workout',
      duration_weeks: 1,
      sessions_per_week: 1,
      exercises: [{
        exercise_id: squat.id,
        day_of_week: TODAY_DAY,
        sets: 2,
        reps: 8,
        target_weight: 40,
        rest_seconds: 60,
        sort_order: 0,
      }],
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    planId = created.body.plan.id;

    const assigned = await apiPost('/api/workouts/assign', staffToken, {
      workout_plan_id: planId,
      client_id: ALPHA.clientId,
    });
    expect(assigned.status, JSON.stringify(assigned.body)).toBe(201);

    const enabled = await apiPatch(
      `/api/pt-os/clients/${ALPHA.clientId}/self-workout`,
      staffToken,
      { allow_self_workout: true },
    );
    expect(enabled.status, JSON.stringify(enabled.body)).toBe(200);

    // Act as the member through the real form.
    page = await browser.newPage();
    await page.goto('/member-login');
    await page.getByLabel('Email address').fill(ALPHA_MEMBER.email);
    await page.getByLabel('Password', { exact: true }).fill(ALPHA_MEMBER.password);
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith('/member'), { timeout: 30_000 }),
      page.getByRole('button', { name: /log in|sign in/i }).first().click(),
    ]);

    await page.goto('/member/workout');
    // A retry after a failed attempt resumes the session it left open.
    await page.getByRole('button', { name: /start today's workout|resume your workout/i }).click({ timeout: 30_000 });

    const firstSet = page.getByRole('button', { name: /mark set 1 done/i });
    if (await firstSet.count()) await firstSet.click();
    await page.getByRole('button', { name: /submit workout/i }).click();

    await expect(page.getByRole('heading', { name: /workout done/i })).toBeVisible({ timeout: 30_000 });

    // Read back through the API: the form's values must be the stored record.
    const sessions = await apiGet<{ data: Session[] }>('/api/me/sessions', memberToken);
    const session = sessions.data.find((s) => s.program_name === 'E2E guided workout');
    if (!session) throw new Error('the submitted session is not in the member history');
    expect(session.status).toBe('completed');
    expect(session.review_status).toBe('pending');

    const set = session.exercises.flatMap((e) => e.sets)[0];
    expect(set).toMatchObject({ weight_kg: 40, reps: 8, completed: true });
  });
});
