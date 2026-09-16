import { test, expect } from '@playwright/test';
import { ALPHA, submitSignInForm } from './helpers/session';

/**
 * The session, at the two moments it is most easily lost.
 *
 * Both journeys here exist because a real defect was found at each point, and
 * both defects had the same shape: a person who WAS signed in was treated as
 * though they were not.
 */

test.describe('Session', () => {
  test('a deep link opens directly, without a detour through sign-in', async ({ page }) => {
    // A fresh browser context with the session cookie and nothing else — no
    // sessionStorage, so nothing masks a failure to resolve the session from
    // the cookie alone. This is what a person gets when they open a link from
    // WhatsApp on a phone that already has the app signed in.
    //
    // It used to land on /login. AuthProvider aborts its /api/auth/me on effect
    // cleanup, http() shared that cancelled promise with the remount, and the
    // remount read the rejection as "no session".
    await page.goto(`/pt-os/clients/${ALPHA.clientId}/payments`);

    await expect(page.getByRole('button', { name: 'Record Payment' }).first()).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).pathname).toBe(`/pt-os/clients/${ALPHA.clientId}/payments`);
  });

  test('signing in again returns you to the page your session expired on', async ({ context, page }) => {
    // proxy.ts has always written ?redirect= onto the sign-in URL. Nothing read
    // it, so a trainer whose 15-minute access token lapsed mid-entry signed
    // back in and arrived at the client list.
    await context.clearCookies();

    const deep = `/pt-os/clients/${ALPHA.clientId}/payments`;
    await page.goto(deep);

    // The proxy bounced us, and recorded where we were going.
    await page.waitForURL(/\/login/, { timeout: 30_000 });
    expect(new URL(page.url()).searchParams.get('redirect')).toBe(deep);

    await submitSignInForm(page);

    await expect(page.getByRole('button', { name: 'Record Payment' }).first()).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).pathname, 'back where the session was lost').toBe(deep);
  });
});
