import type { Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The studio owner seeded by `scripts/seed-e2e.js` in the backend repo.
 *
 * Alpha Studio's trainer. Bravo exists too and is what the isolation suite
 * uses; the form journeys only ever act as Alpha.
 */
export const ALPHA = {
  email: 'owner-a@e2e.test',
  password: 'E2ePassw0rd!seed',
  orgId: '0a000000-0000-4000-8000-000000000001',
  clientId: 'ptc-e2e-alpha',
  clientName: 'ALPHA-ONLY-CLIENT',
  // A SECOND client in the SAME studio. The isolation suite never needed one —
  // it asks whether Bravo can see Alpha's row. The form journeys need a
  // same-tenant pair, because the failure they exist to catch is the opposite
  // shape: a form carrying entity A's state into entity B.
  secondClientId: 'ptc-e2e-alpha-2',
  secondClientName: 'ALPHA-ONLY-CLIENT-TWO',
  trainerId: 'trn-e2e-alpha',
  trainerName: 'ALPHA-ONLY-TRAINER',
} as const;

export const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:5100';

/** Where auth.setup.ts leaves the signed-in session for every other journey. */
export const STORAGE_STATE = resolve(process.cwd(), 'e2e/.auth/alpha.json');
export const TOKEN_FILE = resolve(process.cwd(), 'e2e/.auth/token.json');

/**
 * Sign in through the real form and wait for the app shell.
 *
 * Deliberately through the UI rather than by injecting a token: the point of
 * these journeys is that a person can complete them, and a login that only
 * works when the test forges its own credentials proves nothing about the
 * screen people actually use.
 *
 * Most journeys do NOT call this — they inherit the session auth.setup.ts
 * established, because the backend's loginLimiter allows thirty logins per
 * fifteen minutes and a per-test login exhausts that before the suite ends.
 * It stays exported for the journeys that exercise the sign-in form itself,
 * and for gotoApp's recovery path.
 */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await submitSignInForm(page);
}

/**
 * Fill and submit the sign-in form on the page already open.
 *
 * Separate from signIn because navigating to a bare /login throws away the
 * `?redirect=` the proxy just wrote — which is precisely the thing the
 * return-trip journey is there to prove.
 */
export async function submitSignInForm(page: Page): Promise<void> {
  await page.getByLabel('Email address').fill(ALPHA.email);
  await page.getByLabel('Password', { exact: true }).fill(ALPHA.password);
  await page.getByRole('button', { name: /log in|sign in/i }).first().click();

  /*
   * Race the navigation against the one failure that is NOT the product's.
   *
   * The backend allows thirty logins per fifteen minutes per IP, and
   * /api/auth/refresh shares that budget. Running the suite two or three times
   * inside that window exhausts it, and what a bare waitForURL then reports is
   * a thirty-second navigation timeout — which reads exactly like a broken
   * sign-in form and sends the next person to debug one.
   *
   * Naming it costs one locator and saves that trip.
   */
  const navigated = page
    .waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
    .then(() => 'ok' as const);
  const rateLimited = page
    .getByText(/too many login attempts/i)
    .waitFor({ state: 'visible', timeout: 30_000 })
    .then(() => 'limited' as const);

  const outcome = await Promise.race([navigated, rateLimited.catch(() => navigated)]);
  if (outcome === 'limited') {
    throw new Error(
      'Sign-in was rate limited, not broken: the backend allows 30 logins per 15 minutes ' +
      'per IP and /api/auth/refresh shares that budget. Wait for the window to clear, or ' +
      'run fewer suites back to back.',
    );
  }
}

/**
 * Navigate to an app page, surviving an access token that expired mid-suite.
 *
 * The access cookie lives fifteen minutes and a full run can outlast it. When
 * it does, `proxy.ts` bounces to /login — and the journey that was about to
 * assert on a form instead fails on a sign-in screen, which reads like a
 * product defect and is not one. This notices the bounce and signs in again.
 *
 * It does NOT paper over an authorization failure: it only recovers from
 * landing on a sign-in page, and it asserts afterwards that the destination
 * was actually reached, so a genuine redirect (wrong portal, missing role)
 * still fails the test.
 */
export async function gotoApp(page: Page, path: string): Promise<void> {
  await page.goto(path);
  if (new URL(page.url()).pathname.endsWith('login')) {
    await signIn(page);
    await page.goto(path);
  }
}

let cached: { token: string; mintedAt: number } | null = null;
/** Access tokens live 15 minutes; re-mint comfortably before that. */
const TOKEN_TTL_MS = 12 * 60 * 1000;

/**
 * A raw API token for the same account.
 *
 * Used only to ASSERT persistence — never to perform the action under test.
 * A journey that writes through the API and reads back through the API would
 * prove the server works and say nothing about the form.
 *
 * Reads the one auth.setup.ts minted, and re-mints only when it is close to
 * expiring. Both halves matter: without the file each worker logs in again,
 * and without the expiry check a long run starts getting 401s on its
 * read-backs and reports them as persistence failures.
 */
export async function apiToken(): Promise<string> {
  if (cached && Date.now() - cached.mintedAt < TOKEN_TTL_MS) return cached.token;

  if (!cached && existsSync(TOKEN_FILE)) {
    try {
      const saved = JSON.parse(readFileSync(TOKEN_FILE, 'utf8')) as { token: string; mintedAt: number };
      if (saved.token && Date.now() - saved.mintedAt < TOKEN_TTL_MS) {
        cached = saved;
        return saved.token;
      }
    } catch { /* fall through and mint a fresh one */ }
  }

  return (await mintApiToken()).token;
}

/**
 * Log in and return a genuinely new token, ignoring anything cached.
 *
 * auth.setup.ts must use THIS rather than apiToken(). It used apiToken() and
 * wrote the result back with `mintedAt: Date.now()` — so a token read from the
 * file at eleven minutes old was stamped as new, and the next run stamped it
 * again. The age reset every run while the token itself kept ageing, until the
 * read-backs started returning {"error":"Session expired"}. apiGet then
 * returned an error object with no `data`, every persistence assertion read it
 * as "nothing was saved", and a suite that was working reported that the forms
 * had stopped writing to the database.
 */
export async function mintApiToken(): Promise<{ token: string; mintedAt: number }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ALPHA.email, password: ALPHA.password }),
  });
  const body = await res.json();
  if (!body.token) throw new Error(`E2E login failed: ${JSON.stringify(body).slice(0, 200)}`);
  cached = { token: body.token as string, mintedAt: Date.now() };
  return cached;
}

/**
 * Read straight from the API, to prove what the form actually persisted.
 *
 * Throws on a non-2xx rather than returning the error body. A read-back that
 * quietly hands `{"error":"Session expired"}` to a caller looking for `data`
 * reports "the row is not there" — which is indistinguishable from the form
 * having failed to save it, and sends whoever is reading the failure to debug
 * the wrong half of the system.
 */
export async function apiGet<T = unknown>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`E2E read-back failed: GET ${path} → ${res.status} ${text.slice(0, 200)}`);
  }
  return JSON.parse(text) as T;
}

/** Write through the API — for arranging preconditions only, never the act under test. */
export async function apiPost<T = unknown>(
  path: string,
  token: string,
  body: unknown,
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: res.status, body: parsed as T };
}

/** Delete through the API — cleanup for rows a journey created. */
export async function apiDelete(path: string, token: string): Promise<number> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  return res.status;
}

/**
 * Text that must never reach a screen.
 *
 * Every journey that forces a 5xx asserts against this list rather than
 * inventing its own, so a new leak vector is added in one place and every
 * journey starts checking for it at once.
 */
export const NEVER_ON_SCREEN = [
  'not-null constraint',
  '/srv/api/src',
  'at Object.<anonymous>',
  'SequelizeDatabaseError',
  'pg_catalog',
  'JWT_SECRET',
] as const;

/**
 * Two clicks in ONE frame — an actual double-tap.
 *
 * `Promise.all([btn.click(), btn.click()])` does not reproduce this. Playwright's
 * click waits for actionability first, so the second one sits waiting for a
 * button the first click has just disabled, and the test times out measuring
 * Playwright rather than the product. Worse, it can pass for the wrong reason:
 * a form with NO guard at all still looks fine, because the second click never
 * lands.
 *
 * Dispatching both synchronously is what a thumb on a phone does. React batches
 * state updates, so an `isSubmitting` flag held in state is still false when the
 * second handler runs — which is exactly why the guard has to be a ref.
 */
export async function doubleTap(locator: import('@playwright/test').Locator): Promise<void> {
  await locator.evaluate((el) => { (el as HTMLElement).click(); (el as HTMLElement).click(); });
}

/**
 * The platform operator seeded alongside the two studios.
 *
 * A different PORTAL, not merely a different role: /platform has its own door,
 * its own session audience and its own route group, and `mayEnterPortal`
 * refuses a studio account there. So the Command Center journeys cannot reuse
 * Alpha's session — they need this one, saved separately.
 */
export const PLATFORM = {
  email: 'platform@e2e.test',
  password: 'E2ePassw0rd!seed',
} as const;

/** Where auth.setup.ts leaves the operator's session. */
export const PLATFORM_STORAGE_STATE = resolve(process.cwd(), 'e2e/.auth/platform.json');

/** Sign in at the Command Center's own door. */
export async function signInPlatform(page: Page): Promise<void> {
  await page.goto('/platform-login');
  await page.getByLabel('Email address').fill(PLATFORM.email);
  await page.getByLabel('Password', { exact: true }).fill(PLATFORM.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/platform-login'), { timeout: 30_000 }),
    page.getByRole('button', { name: /log in|sign in/i }).first().click(),
  ]);
}
