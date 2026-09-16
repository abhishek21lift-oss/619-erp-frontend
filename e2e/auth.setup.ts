import { test as setup, expect } from '@playwright/test';
import { ALPHA, STORAGE_STATE, TOKEN_FILE, mintApiToken } from './helpers/session';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Sign in once, for the whole browser suite.
 *
 * ── Why this project exists ─────────────────────────────────────────────────
 *
 * Each journey used to sign in twice in `beforeEach` — once through the form
 * for the browser, once through the API for the read-back assertions. At
 * fifteen journeys with several tests each that is sixty-plus logins in a run,
 * and the backend's loginLimiter allows thirty per fifteen minutes per IP. The
 * suite did not fail because the product was broken; it failed because it had
 * locked itself out, and the error it printed ("Too many login attempts")
 * looked for all the world like a product defect.
 *
 * Signing in once here and handing every journey the resulting cookies costs
 * exactly two logins per run — and leaves the limiter's remaining budget for
 * the journeys that deliberately exercise the sign-in form itself.
 *
 * The session is still a REAL one: a real form submission against the real API
 * producing the real cookies. Nothing is forged.
 */
// Generous: this is the first browser test of a run, so it pays for the dev
// server's cold compile of the login page AND of the first app route. A
// 30-second default made the whole suite fail on a slow machine for a reason
// that has nothing to do with the product.
setup.setTimeout(180_000);

setup('authenticate as the Alpha studio owner', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(ALPHA.email);
  await page.getByLabel('Password', { exact: true }).fill(ALPHA.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.getByRole('button', { name: /log in|sign in/i }).first().click(),
  ]);

  // Prove the session is genuinely usable before saving it, rather than
  // discovering in the first journey that the state file holds a dead cookie.
  await page.goto(`/pt-os/clients/${ALPHA.clientId}/payments`);
  await expect(page.getByRole('button', { name: 'Record Payment' }).first()).toBeVisible({ timeout: 30_000 });

  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });

  // The read-back token, minted once and shared the same way.
  //
  // mintApiToken rather than apiToken: the latter may return one it read from
  // this very file, and writing that back with a new timestamp resets its
  // apparent age without renewing the token. See the note on mintApiToken.
  const minted = await mintApiToken();
  writeFileSync(TOKEN_FILE, JSON.stringify(minted), 'utf8');
});
