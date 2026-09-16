import type { Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The studio owner seeded by `scripts/seed-e2e.js` in the backend repo.
 *
 * Alpha Studio, an admin. Bravo exists too and is what the isolation suite
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
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.getByRole('button', { name: /log in|sign in/i }).first().click(),
  ]);
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

  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ALPHA.email, password: ALPHA.password }),
  });
  const body = await res.json();
  if (!body.token) throw new Error(`E2E login failed: ${JSON.stringify(body).slice(0, 200)}`);
  cached = { token: body.token as string, mintedAt: Date.now() };
  return cached.token;
}

/** Read straight from the API, to prove what the form actually persisted. */
export async function apiGet<T = unknown>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  return (await res.json()) as T;
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
