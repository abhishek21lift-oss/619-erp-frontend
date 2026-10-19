import { defineConfig, devices } from '@playwright/test';

// End-to-end tests. Audit finding H-10: there were none.
//
// Everything that existed tested one side of a boundary — Jest with a mocked
// pg pool on the backend, Vitest with a mocked fetch on the frontend. Nothing
// exercised a real browser against a real API against a real database, so the
// product this actually sells — that one studio cannot see another's data — had never been checked end to end. It was asserted by unit tests that
// mock away the very layer where it could fail.
//
// ── The stack these tests need ─────────────────────────────────────────────
//
// A Postgres with the real migrations applied and two studios seeded, plus the
// backend. `npm run e2e:setup` in the BACKEND repo does that; see
// scripts/e2e-setup.sh there. This config starts the frontend itself.
//
// Kept out of `npm test` on purpose: Vitest is the fast inner loop and must
// stay runnable with no database. E2E runs as its own CI job.

const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:5100';
const APP_URL = process.env.E2E_APP_URL ?? 'http://127.0.0.1:3101';
const APP_PORT = new URL(APP_URL).port;

// The image ships Chromium at PLAYWRIGHT_BROWSERS_PATH and the headless shell
// is not always the build Playwright expects, so the path is honoured when
// given rather than triggering a download that this environment forbids.
const CHROMIUM_LAUNCH = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {};

// Written by e2e/auth.setup.ts, replayed by every browser project.
const STORAGE_STATE = 'e2e/.auth/alpha.json';

// In CI the journeys run against the artifact the deploy ships, not a dev
// server. `E2E_WEB_SERVER=prod` (set by the workflow) serves `.next/standalone`
// the way the Dockerfile does — with `output: 'standalone'`, `next start` is not
// the same thing and Next says so at boot.
//
// `next dev` is worse than either: it compiles a route on that route's first
// request, and a client-side transition does not commit its URL until the
// destination's RSC payload resolves. The click in client-interview.ui.spec.ts
// is the first request in the whole suite to touch /pt-os/assessment, so it was
// racing that compile inside `expect(page).toHaveURL()`: it lost at 10s on a
// loaded runner, then passed in 6.8s on the retry, when the route was already
// compiled. Whether that assertion held therefore depended on how busy the
// runner was, which is a property of the dev server and not of the app — and no
// timeout can fix it. Serving the built artifact removes the compile from the
// test path: the same request measures 0.13s there against 8–12s cold here.
//
// The directory has to be assembled first, exactly as the Dockerfile assembles
// it: the standalone bundle omits public/ and .next/static. PORT and HOSTNAME
// are pinned because the CI runner sets both for its own purposes (its own
// hostname, and the API's port) and the server binds to whatever it finds.
const WEB_SERVER_COMMAND =
  process.env.E2E_WEB_SERVER === 'prod'
    ? `sh -c 'cp -r public .next/standalone/ 2>/dev/null; mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/ && PORT=${APP_PORT} HOSTNAME=0.0.0.0 node .next/standalone/server.js'`
    : `npx next dev --webpack -p ${APP_PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Isolation tests assert on shared seeded rows, so they must not race each
  // other. Correctness over speed here — the suite is small.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // `github` annotates failures inline, `list` is the live log, and `html` is
  // what the CI artifact step uploads. It was missing, so every run warned that
  // `frontend/playwright-report/` did not exist and attached nothing but the
  // log — no screenshots, no traces, no error-context. Locally `list` stays on
  // its own: the report is written for whoever has to debug a CI run.
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list']],

  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: APP_URL,
    // The API tests talk to the backend directly rather than through the app,
    // because a leak has to be impossible at the source, not merely unrendered.
    extraHTTPHeaders: { Accept: 'application/json' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: { baseURL: API_URL },
    },
    // Sign in once for the whole browser suite.
    //
    // The backend's loginLimiter allows thirty logins per fifteen minutes per
    // IP, and /api/auth/refresh shares that budget. A per-test login exhausted
    // it two thirds of the way through the run and the suite then failed with
    // "Too many login attempts" — which reads exactly like a product defect and
    // is not one. One real sign-in, saved and replayed, costs two.
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: CHROMIUM_LAUNCH,
      },
    },
    {
      name: 'chromium',
      testMatch: /.*\.ui\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        // The image ships Chromium at PLAYWRIGHT_BROWSERS_PATH; never download.
        launchOptions: CHROMIUM_LAUNCH,
        storageState: STORAGE_STATE,
      },
    },
    // The same journeys on a phone-sized viewport with touch input.
    //
    // Not a duplicate suite: `mobile` is what the tagged journeys run as, and
    // only those tagged @mobile run here. A studio owner recording a payment
    // does it on a phone at the desk far more often than on a laptop, and a
    // sheet that fits at 1280px can put its submit button under the keyboard
    // at 390px.
    {
      name: 'mobile',
      testMatch: /.*\.ui\.spec\.ts/,
      grep: /@mobile/,
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 7'],
        launchOptions: CHROMIUM_LAUNCH,
        storageState: STORAGE_STATE,
      },
    },
  ],

  // Only the frontend, and only when a browser project is actually running.
  //
  // The backend and its database are prerequisites rather than something this
  // config starts, because a server that silently points at the wrong database
  // is exactly how an isolation test passes for the wrong reason.
  //
  // The `api` project talks straight to the backend and needs no UI at all, so
  // booting Next for it would add a minute to the run and a second thing that
  // can fail for reasons unrelated to what is being tested.
  //
  // `--webpack` is explicit because Next 16 defaults to Turbopack and this app
  // still carries a webpack config; without the flag `next dev` exits 1 rather
  // than picking one.
  webServer: true
    ? {
        command: WEB_SERVER_COMMAND,
        url: APP_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: { NEXT_PUBLIC_API_URL: API_URL, OUTPUT_FILE_TRACING_ROOT: '.' },
      }
    : undefined,
});