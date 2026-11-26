import { test, expect } from '@playwright/test';
import { ALPHA_MEMBER, apiGet, memberApiToken } from './helpers/session';

/**
 * Journey — a member turns an AI answer into a real message to their trainer.
 *
 * The member AI screen is a critical form because its draft card is a write
 * path: the member edits what the model proposed and presses "Send to trainer".
 * That press goes through the ordinary member message API, so the thing worth
 * proving end to end is that the edited text reaches the database — not that a
 * model can be reached from CI.
 *
 * Only the SSE response is mocked. No OpenRouter key exists in the E2E
 * environment, and a journey that needs a live model would be a journey that
 * fails for reasons unrelated to this product. Everything after the stream —
 * the draft card, the confirmation, the POST and the read-back — is real.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Member — AI coach draft', () => {
  test('streams an answer, edits the draft and sends it to the trainer', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/member-login');
    await page.getByLabel('Email address').fill(ALPHA_MEMBER.email);
    await page.getByLabel('Password', { exact: true }).fill(ALPHA_MEMBER.password);
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith('/member'), { timeout: 30_000 }),
      page.getByRole('button', { name: /log in|sign in/i }).first().click(),
    ]);

    // Unique per run: the thread is append-only, so the read-back must be able
    // to name the exact row this journey created.
    const proposed = `Can we move Thursday? ${Date.now()}`;
    const edited = `${proposed} — edited by the member`;

    await page.route('**/api/me/ai/chat', async (route) => {
      const events = [
        { type: 'start', toolsUsed: [], toolsUnavailable: [] },
        { type: 'chunk', content: 'Here is a message you can send.' },
        {
          type: 'done',
          message: 'Here is a message you can send.',
          toolsUsed: [],
          toolsUnavailable: [],
          proposedMessage: proposed,
          requiresConfirmation: true,
        },
      ];
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        body: events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''),
      });
    });

    await page.goto('/member/ai');
    await page.getByLabel('Message your AI coach').fill('Draft a message to my trainer');
    await page.getByLabel('Send', { exact: true }).click();

    await expect(page.getByText('Here is a message you can send.')).toBeVisible();

    // The model's proposal is an editable draft, not a send. The member changes
    // it before it leaves the screen; the stored body must be the edit.
    const draft = page.getByLabel('Message to your trainer');
    await expect(draft).toHaveValue(proposed);
    await draft.fill(edited);
    await page.getByRole('button', { name: 'Send to trainer' }).click();

    await expect(page.getByText('Sent to your trainer')).toBeVisible();

    const token = await memberApiToken();
    const thread = await apiGet<{ data: { messages: { body: string }[] } }>(
      '/api/me/messages',
      token,
    );
    const bodies = thread.data.messages.map((message) => message.body);
    expect(bodies, 'the edited draft reached the member ↔ studio thread').toContain(edited);
    expect(bodies, 'the unedited proposal was not what got sent').not.toContain(proposed);
  });
});
