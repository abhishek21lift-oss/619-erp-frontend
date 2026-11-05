import { test, expect, type Page } from '@playwright/test';
import { ALPHA, ALPHA_MEMBER, apiGet, apiPatch, apiToken, memberApiToken } from './helpers/session';

/**
 * Journey — a member asks the studio to pause their plan.
 *
 * The source-level audit can prove the card binds the canonical controls; only
 * a real submit proves the request became a notification a trainer will see.
 * The value with teeth is the read-back through `/api/me/pause`: it is answered
 * from the notifications table, not from anything the browser kept in memory.
 *
 * The journey cleans up after itself by marking the notification it created as
 * read, so a second run still starts from the form rather than the waiting
 * state. Without that, CI would pass once and then fail for a reason that has
 * nothing to do with the code.
 */

type PauseState = { data: { requested_at: string | null } };

type InboxItem = { id: string; type: string; link: string | null };
type Inbox = { data: InboxItem[] };

function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Member — pause request', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);
  let page: Page;
  let memberAuth: string;
  let trainerAuth: string;

  const start = inDays(7);
  const end = inDays(21);
  const reason = `E2E pause ${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    page = await browser.newPage();
    await page.goto('/member-login');
    await page.getByLabel('Email address').fill(ALPHA_MEMBER.email);
    await page.getByLabel('Password', { exact: true }).fill(ALPHA_MEMBER.password);
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith('/member'), { timeout: 30_000 }),
      page.getByRole('button', { name: /log in|sign in/i }).first().click(),
    ]);
    memberAuth = await memberApiToken();
    trainerAuth = await apiToken();
  });

  test.afterAll(async () => {
    // Mark only the requests this journey made, so an unrelated unread
    // notification in the same seeded studio is left alone.
    const inbox = await apiGet<Inbox>('/api/v1/notifications?unread=1', trainerAuth);
    await Promise.all(
      inbox.data
        .filter((n) => n.type === 'pause_request' && (n.link ?? '').includes(ALPHA.clientId))
        .map((n) => apiPatch(`/api/v1/notifications/${n.id}/read`, trainerAuth, {})),
    );
    await page.close();
  });

  test('the request reaches the trainer and the member sees it waiting', async () => {
    await page.goto('/member/renew');
    await expect(page.getByRole('heading', { name: 'Pause your plan' })).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('From').fill(start);
    await page.getByLabel('Until (optional)').fill(end);
    await page.getByLabel('Reason (optional)').fill(reason);
    await page.getByRole('button', { name: 'Request pause' }).click();

    await expect(page.getByText('Pause requested')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Request pause' })).toHaveCount(0);

    const state = await apiGet<PauseState>('/api/me/pause', memberAuth);
    expect(state.data.requested_at, 'the request is on the member\'s record').toBeTruthy();

    const inbox = await apiGet<Inbox>('/api/v1/notifications?unread=1', trainerAuth);
    const mine = inbox.data.filter((n) => n.type === 'pause_request' && (n.link ?? '').includes(ALPHA.clientId));
    expect(mine.length, 'the trainer has an unread pause request').toBeGreaterThan(0);
  });
});
