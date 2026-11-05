import { test, expect, type Page } from '@playwright/test';
import {
  ALPHA, ALPHA_MEMBER, apiGet, apiPatch, apiPost, apiToken, memberApiToken,
} from './helpers/session';

/**
 * Journey — a member rates a completed session.
 *
 * The four answers, the stars and the note are what the studio's analytics and
 * its low-rating alert are built from. Only a real submit proves the backend
 * stored them instead of dropping a field, and only a read-back proves the
 * weighted score the trainer sees is the one computed from those answers.
 *
 * Acts as Alpha's CLIENT, not the studio owner: the request is created the way
 * it is in production — the trainer completes a session — then the member
 * answers it through the member app.
 */

type SessionFeedback = {
  id: string;
  session_id: string;
  status: 'pending' | 'submitted';
  score: number | string | null;
  overall_stars: number | null;
  additional_feedback: string | null;
};

/** Today as YYYY-MM-DD, the plain date the sessions API takes. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Member — session feedback', () => {
  test.describe.configure({ mode: 'serial' });
  // First visit pays for the dev server compiling the member pages.
  test.setTimeout(90_000);
  let page: Page;
  let memberToken: string;
  let sessionId: string;
  let feedbackId: string;
  const title = `E2E feedback session ${Date.now()}`;
  const note = `E2E feedback note ${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);

    // Arrange: the trainer's completion is what creates the request, exactly
    // as it does in production. Writing this row through the API is allowed
    // because it is the precondition, not the act under test.
    const owner = await apiToken();
    const created = await apiPost<{ data: { id: string } }>('/api/pt-os/sessions', owner, {
      client_id: ALPHA.clientId,
      title,
      date: today(),
      start_time: '06:00',
      duration_minutes: 60,
      session_type: '1-on-1',
    });
    expect(created.status).toBe(201);
    sessionId = created.body.data.id;

    const completed = await apiPatch(`/api/pt-os/sessions/${sessionId}`, owner, { status: 'completed' });
    expect(completed.status).toBe(200);

    memberToken = await memberApiToken();
    const pending = await apiGet<{ data: SessionFeedback[] }>('/api/me/feedback?status=pending', memberToken);
    const request = pending.data.find((f) => f.session_id === sessionId);
    expect(request, 'completing the session creates one pending request').toBeTruthy();
    feedbackId = request!.id;

    page = await browser.newPage();
    await page.goto('/member-login');
    await page.getByLabel('Email address').fill(ALPHA_MEMBER.email);
    await page.getByLabel('Password', { exact: true }).fill(ALPHA_MEMBER.password);
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith('/member'), { timeout: 30_000 }),
      page.getByRole('button', { name: /log in|sign in/i }).first().click(),
    ]);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('the four answers, the stars and the note are what the database holds', async () => {
    await page.goto('/member/feedback');
    await expect(page.getByRole('heading', { name: 'Session feedback' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: new RegExp(title) }).click();

    await page.getByRole('button', { name: 'Excellent', exact: true }).click();
    await page.getByRole('button', { name: 'Mostly', exact: true }).click();
    await page.getByRole('button', { name: 'Perfect', exact: true }).click();
    await page.getByRole('button', { name: 'Absolutely', exact: true }).click();
    await page.getByRole('button', { name: '4 stars' }).click();
    await page.getByLabel('Anything else? (optional)').fill(note);
    await page.getByRole('button', { name: 'Send feedback' }).click();

    await expect(page.getByText('Thanks — your trainer will see this')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Your ratings \(\d+\)/)).toBeVisible({ timeout: 15_000 });

    const submitted = await apiGet<{ data: SessionFeedback[] }>('/api/me/feedback?status=submitted', memberToken);
    const stored = submitted.data.find((f) => f.id === feedbackId);
    expect(stored, 'the request moved to submitted rather than being duplicated').toBeTruthy();
    expect(stored!.session_id).toBe(sessionId);
    expect(stored!.status).toBe('submitted');
    expect(stored!.overall_stars).toBe(4);
    expect(stored!.additional_feedback).toBe(note);
    // excellent 5×.20 + mostly 3.33×.25 + perfect 5×.20 + absolutely 5×.15
    // + four stars 3.75×.20 = 4.33.
    expect(Number(stored!.score)).toBeCloseTo(4.33, 2);

    const pending = await apiGet<{ data: SessionFeedback[] }>('/api/me/feedback?status=pending', memberToken);
    expect(pending.data.some((f) => f.id === feedbackId)).toBe(false);
  });
});
