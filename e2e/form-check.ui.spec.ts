import { test, expect, type Page } from '@playwright/test';
import { ALPHA_MEMBER, apiGet, apiToken, memberApiToken } from './helpers/session';

/**
 * Journey — a member sends a lift, the trainer reviews it.
 *
 * The two halves of asynchronous form review in one file, because neither is
 * worth much alone: an upload nobody can review is storage, and a review of a
 * video that never arrived is a mock. The member half signs in as Alpha's
 * CLIENT (the studio session is a different person); the trainer half reuses
 * the studio owner's session from auth.setup.ts.
 *
 * The video is a real MP4 header with no frames. The server decides the type
 * from those bytes, stores them, and the journey reads the row back — playback
 * is the browser's job and not what this proves.
 */

/**
 * Unique per attempt. A serial group is retried as a whole, so a fixed name
 * would leave the first attempt's row behind and the retry's upload would
 * match two headings — a strict-mode failure that hides the real cause.
 */
let LIFT = 'E2E form check';
const NOTE = 'Third set — lower back felt tight.';
const COMMENT = 'Right knee tracks in on the way up.';
const AT_SECOND = '3';

type MeCheck = {
  id: string;
  exercise: string;
  note: string | null;
  video_url: string;
  status: 'pending' | 'reviewed';
  comments: { at_seconds: number; body: string }[];
};

type TrainerCheck = MeCheck & { client_name: string };

/** A 64-byte ISO base media header: size, "ftyp", brand "isom". */
function videoBuffer(): Buffer {
  const b = Buffer.alloc(64);
  b.writeUInt32BE(0x18, 0);
  b.write('ftyp', 4, 'ascii');
  b.write('isom', 8, 'ascii');
  return b;
}

async function memberChecks(token: string): Promise<MeCheck[]> {
  const body = await apiGet<{ data: MeCheck[] }>('/api/me/form-checks', token);
  return body.data;
}

test.describe.configure({ mode: 'serial' });

test.describe('Member — send a lift', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(90_000);

  let page: Page;
  let token: string;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    LIFT = `E2E form check ${Date.now()}`;
    page = await browser.newPage();
    await page.goto('/member-login');
    await page.getByLabel('Email address').fill(ALPHA_MEMBER.email);
    await page.getByLabel('Password', { exact: true }).fill(ALPHA_MEMBER.password);
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith('/member'), { timeout: 30_000 }),
      page.getByRole('button', { name: /log in|sign in/i }).first().click(),
    ]);
    token = await memberApiToken();
  });

  test.afterAll(async () => { await page.close(); });

  test('the video reaches storage and the member sees it pending', async () => {
    await page.goto('/member/form-check');
    await expect(page.getByRole('heading', { name: 'Form check', exact: true }))
      .toBeVisible({ timeout: 20_000 });

    // Hidden input: setInputFiles writes the bytes directly, as the picker
    // would. A visible-only upload would be a screen this journey cannot drive.
    await page.locator('#fc-video').setInputFiles({
      name: 'squat.mp4',
      mimeType: 'video/mp4',
      buffer: videoBuffer(),
    });
    await page.getByLabel('Lift').fill(LIFT);
    await page.getByLabel(/Anything they should know/).fill(NOTE);
    await page.getByRole('button', { name: 'Send to trainer' }).click();

    // The history card comes from a fresh read, so this is the server's answer.
    await expect(page.getByRole('heading', { name: LIFT })).toBeVisible({ timeout: 30_000 });

    const saved = (await memberChecks(token)).find((c) => c.exercise === LIFT);
    expect(saved, 'the uploaded check is in the member history').toBeTruthy();
    expect(saved!.note).toBe(NOTE);
    expect(saved!.status).toBe('pending');
    expect(saved!.video_url).toMatch(/^\/uploads\/form-checks\/[^/]+\.(mp4|mov)$/);
    expect(saved!.comments).toEqual([]);
  });

  test('nothing can be sent without a video', async () => {
    const before = (await memberChecks(token)).length;
    await page.goto('/member/form-check');
    // The lift name is filled so the browser's own required-field check does
    // not stop the submit: this test is about the video guard underneath it.
    await page.getByLabel('Lift').fill(LIFT);
    await page.getByRole('button', { name: 'Send to trainer' }).click();
    await expect(page.getByText('Choose the video first.')).toBeVisible();
    expect(await memberChecks(token)).toHaveLength(before);
  });
});

test.describe('Trainer — review the lift', () => {
  test.setTimeout(90_000);

  test('a timestamped comment and the reviewed mark reach the database', async ({ page }) => {
    const token = await apiToken();
    const list = await apiGet<{ data: TrainerCheck[] }>('/api/pt-os/form-checks?status=pending', token);
    const check = list.data.find((c) => c.exercise === LIFT);
    expect(check, 'the member upload is in the trainer queue').toBeTruthy();
    expect(check!.client_name).toBeTruthy();

    await page.goto('/pt-os/form-checks');
    await expect(page.getByRole('heading', { name: 'Form Checks', exact: true }))
      .toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: new RegExp(LIFT) }).first().click();
    await expect(page.getByRole('heading', { name: LIFT })).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('At second').fill(AT_SECOND);
    await page.getByLabel('Comment').fill(COMMENT);
    await page.getByRole('button', { name: 'Add comment' }).click();
    await expect(page.getByText(COMMENT)).toBeVisible({ timeout: 20_000 });

    const withComment = await apiGet<{ data: TrainerCheck }>(
      `/api/pt-os/form-checks/${check!.id}`, token,
    );
    expect(withComment.data.comments).toHaveLength(1);
    expect(withComment.data.comments[0].at_seconds).toBe(Number(AT_SECOND));
    expect(withComment.data.comments[0].body).toBe(COMMENT);

    await page.getByRole('button', { name: 'Mark reviewed' }).click();
    await expect(page.getByText('Reviewed').first()).toBeVisible({ timeout: 20_000 });

    await expect.poll(async () => {
      const after = await apiGet<{ data: TrainerCheck }>(
        `/api/pt-os/form-checks/${check!.id}`, token,
      );
      return after.data.status;
    }, { timeout: 15_000 }).toBe('reviewed');

    // The member sees the same state and the note, from their own endpoint.
    const memberToken = await memberApiToken();
    const mine = await memberChecks(memberToken);
    const reviewed = mine.find((c) => c.id === check!.id);
    expect(reviewed?.status).toBe('reviewed');
    expect(reviewed?.comments[0]?.body).toBe(COMMENT);
  });
});
